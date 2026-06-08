import express from 'express';
import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// serve html
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('./kanban.db');
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    desc TEXT
  )
`);

// fetch task
app.get('/tasks', (req, res) => {
  const rows = db.query('SELECT * FROM tasks').all();
  res.json(rows);
});

app.post('/tasks', (req, res) => {
  const { title, status, desc } = req.body;
  const stmt = db.prepare('INSERT INTO tasks (title, status, desc) VALUES (?, ?, ?)');
  stmt.run(title, status, desc);
  res.json({ success: true });
});

// update task status
app.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const stmt = db.prepare('UPDATE tasks SET status = ? WHERE id = ?');
  stmt.run(status, id);
  res.json({ success: true });
});

// delete a task
app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});


// update field
app.patch('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, desc } = req.body;
  const updates = [];
  const values = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (desc !== undefined) {
    updates.push('desc = ?');
    values.push(desc);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});