import express from 'express';
import { Database } from 'bun:sqlite';
import path from 'path';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('./kanban.db');

db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    title    TEXT    NOT NULL,
    status   TEXT    NOT NULL,
    position REAL    DEFAULT 0,
    desc     TEXT
  )
`);

// GET all tasks
app.get('/tasks', (req, res) => {
  const rows = db.query('SELECT * FROM tasks ORDER BY status, position').all();
  res.json(rows);
});

// CREATE — new task goes to end of its column with +1024 spacing
app.post('/tasks', (req, res) => {
  const { title, status, desc } = req.body;
  const maxPos = db.query('SELECT MAX(position) as max FROM tasks WHERE status = ?').get(status)?.max ?? 0;
  const newPosition = maxPos + 1024;
  db.prepare('INSERT INTO tasks (title, status, desc, position) VALUES (?, ?, ?, ?)')
    .run(title, status, desc, newPosition);
  res.json({ success: true });
});

// UPDATE (Move/Drag) — O(1), touches exactly one row
app.put('/tasks/:id', (req, res) => {
  // FIX 1: Convert string ID from URL to an Integer!
  const id = parseInt(req.params.id, 10);
  const { status: newStatus, position: newPos, rebalance } = req.body;

  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  // FIX 2: Correct bun:sqlite syntax -> .get(id)
  const task = db.query('SELECT status, position FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // FIX 3: Correct bun:sqlite syntax -> .run(...)
  db.prepare('UPDATE tasks SET status = ?, position = ? WHERE id = ?')
    .run(newStatus, newPos, id);

  if (rebalance) {
    setImmediate(() => rebalanceColumn(newStatus));
  }

  res.json({ success: true });
});

// Rebalance — reassigns clean 1024-spaced positions
function rebalanceColumn(status) {
  const rows = db.query('SELECT id FROM tasks WHERE status = ? ORDER BY position').all(status);
  const stmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
  const updateMany = db.transaction(() => {
    rows.forEach((row, i) => stmt.run((i + 1) * 1024, row.id));
  });
  updateMany();
}

// DELETE
app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.json({ success: true });
});

// PATCH — update title and description only
app.patch('/tasks/:id', (req, res) => {
  // FIX: Convert to integer here too!
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const { title, desc } = req.body;
  const task = db.query('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const updates = [];
  const values  = [];

  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (desc  !== undefined) { updates.push('desc = ?');  values.push(desc);  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));