const API_BASE = '/tasks';


const root = document.getElementById('root');

const themeSwitcher = document.createElement('button');
themeSwitcher.className = 'switcher';
document.body.appendChild(themeSwitcher);

function updateThemeUI(isDark) {
  themeSwitcher.textContent = isDark ? ' Light' : ' Dark';
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme');
  updateThemeUI(true);
} else {
  updateThemeUI(false);
}

themeSwitcher.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-theme');
  updateThemeUI(isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

const modalOverlay = document.createElement('div');
modalOverlay.className = 'modal-overlay';
modalOverlay.style.pointerEvents = 'none'; 
modalOverlay.innerHTML = `
  <div class="modal">
    <h3 id="modal-title">Edit Task</h3>
    <input type="text" id="modal-task-title" placeholder="Task title" />
    <textarea id="modal-task-desc" rows="3" placeholder="Description"></textarea>
    <div class="modal-buttons">
      <button class="cancel-btn">Cancel</button>
      <button class="save-btn">Save</button>
    </div>
  </div>
`;
document.body.appendChild(modalOverlay);

let pendingAction = null;
let deleteTaskId = null;

function showModal(title, showDeleteOption = false) {
  const modalTitle = modalOverlay.querySelector('#modal-title');
  const titleInput = modalOverlay.querySelector('#modal-task-title');
  const descTextarea = modalOverlay.querySelector('#modal-task-desc');
  const buttonsDiv = modalOverlay.querySelector('.modal-buttons');

  modalTitle.textContent = title;

  if (showDeleteOption) {
    buttonsDiv.innerHTML = `
      <button class="cancel-btn">Cancel</button>
      <button class="confirm-delete">Delete</button>
    `;
    titleInput.style.display = 'none';
    descTextarea.style.display = 'none';
  } else {
    buttonsDiv.innerHTML = `
      <button class="cancel-btn">Cancel</button>
      <button class="save-btn">Save</button>
    `;
    titleInput.style.display = 'block';
    descTextarea.style.display = 'block';
  }

  modalOverlay.style.pointerEvents = 'auto'; 
  modalOverlay.classList.add('active');
}

function hideModal() {
  modalOverlay.classList.remove('active');
  modalOverlay.style.pointerEvents = 'none'; 
  pendingAction = null;
  deleteTaskId = null;
}

modalOverlay.addEventListener('click', async (e) => {
  if (e.target.classList.contains('cancel-btn')) {
    hideModal();
  } else if (e.target.classList.contains('save-btn')) {
    if (pendingAction && pendingAction.type === 'edit') {
      const newTitle = modalOverlay.querySelector('#modal-task-title').value.trim();
      const newDesc = modalOverlay.querySelector('#modal-task-desc').value.trim();
      if (!newTitle) {
        alert('Title cannot be empty');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/${pendingAction.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, desc: newDesc })
        });
        if (res.ok) { renderBoard(); hideModal(); }
        else console.error('Update failed');
      } catch (err) { console.error(err); }
    }
  } else if (e.target.classList.contains('confirm-delete')) {
    if (deleteTaskId) {
      try {
        const res = await fetch(`${API_BASE}/${deleteTaskId}`, { method: 'DELETE' });
        if (res.ok) { renderBoard(); hideModal(); }
        else console.error('Delete failed');
      } catch (err) { console.error(err); }
    }
  }
});

const heading = document.createElement('h2');
heading.classList.add('title');
heading.textContent = 'Kanban Dashboard';
root.appendChild(heading);

const inputTitle = document.createElement('input');
inputTitle.placeholder = 'Task title';
const inputDesc = document.createElement('input');
inputDesc.placeholder = 'Description';
const selectStatus = document.createElement('select');
['Start', 'Process', 'Testing', 'Complete'].forEach(s => {
  const opt = document.createElement('option');
  opt.value = s;
  opt.textContent = s;
  selectStatus.appendChild(opt);
});
const addBtn = document.createElement('button');
addBtn.textContent = 'Add Task';

const form = document.createElement('div');
form.classList.add('form');
form.append(inputTitle, inputDesc, selectStatus, addBtn);
root.appendChild(form);

addBtn.addEventListener('click', async () => {
  const title = inputTitle.value.trim();
  if (!title) { alert('Please enter a task title'); return; }
  const status = selectStatus.value;
  const desc = inputDesc.value.trim();
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status, desc })
    });
    if (res.ok) { inputTitle.value = ''; inputDesc.value = ''; renderBoard(); }
  } catch (err) { console.error(err); }
});

// Picked Card state
let sourceCardId       = null;
let sourceCardPosition = null;
let sourceColumnStatus = null;

document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.card');
  if (!card) {
    e.preventDefault();
    return;
  }
  
  sourceCardId       = card.dataset.id;
  sourceCardPosition = parseFloat(card.dataset.position);
  
  const sourceColumn = card.closest('.column');
  sourceColumnStatus = sourceColumn ? sourceColumn.dataset.status : null;
  
  e.dataTransfer.setData('text/plain', sourceCardId);
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => card.classList.add('dragging'), 0);
});

document.addEventListener('dragend', (e) => {
  const card = e.target.closest('.card');
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.column.drag-over').forEach(col => col.classList.remove('drag-over'));
});

document.addEventListener('dragover', (e) => {
  const column = e.target.closest('.column');
  if (!column) return;
  e.preventDefault(); 
  e.dataTransfer.dropEffect = 'move';
  

  document.querySelectorAll('.column.drag-over').forEach(col => col.classList.remove('drag-over'));
  if (column) column.classList.add('drag-over');
});
document.addEventListener('drop', async (e) => {
  e.preventDefault(); // Prevent 

  const dropColumn = e.target.closest('.column');
  if (!dropColumn || !sourceCardId) return;


  console.log("Dropping card with ID:", sourceCardId, "Type:", typeof sourceCardId);

  dropColumn.classList.remove('drag-over');

  const dropColumnStatus = dropColumn.dataset.status;

  // position reordering
  const cardsInColumn = Array.from(
    dropColumn.querySelectorAll(`.card:not([data-id="${sourceCardId}"])`)
  ).sort((a, b) => parseFloat(a.dataset.position) - parseFloat(b.dataset.position));

  let beforeCard = null;
  let afterCard  = null;

  for (let i = 0; i < cardsInColumn.length; i++) {
    const { top, height } = cardsInColumn[i].getBoundingClientRect();
    if (e.clientY < top + height / 2) {
      afterCard  = cardsInColumn[i];
      beforeCard = cardsInColumn[i - 1] ?? null;
      break;
    }
    beforeCard = cardsInColumn[i];
  }

  const INITIAL_SPACING = 1024;
  const prevPos = beforeCard ? parseFloat(beforeCard.dataset.position) : 0;
  const nextPos = afterCard  ? parseFloat(afterCard.dataset.position)  : prevPos + INITIAL_SPACING;
  const newPosition  = (prevPos + nextPos) / 2; 

  const sameColumn = sourceColumnStatus === dropColumnStatus;
  if (sameColumn && Math.abs(newPosition - sourceCardPosition) < Number.EPSILON) {
    sourceCardId = sourceCardPosition = sourceColumnStatus = null;
    return; 
  }

  // update db
  try {
    const res = await fetch(`${API_BASE}/${sourceCardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: dropColumnStatus, 
        position: newPosition
      })
    });
    
    if (res.ok) {
      renderBoard();
    } else {
      const errorData = await res.json();
      console.error('Failed to move task - Backend says:', errorData);
      renderBoard(); 
    }
  } catch (err) {
    console.error('Network error on drop:', err);
    renderBoard(); 
  } finally {
    sourceCardId = sourceCardPosition = sourceColumnStatus = null;
  }
});

//  Render Board 
async function renderBoard() {
  const oldBoard = document.querySelector('.board');
  if (oldBoard) oldBoard.remove();
  try {
    const res = await fetch(API_BASE);
    const tasks = await res.json();
    const board = document.createElement('div');
    board.classList.add('board');
    
    const columns = ['Start', 'Process', 'Testing', 'Complete'];
    const tasksByStatus = {};
    columns.forEach(col => (tasksByStatus[col] = []));
    tasks.forEach(task => {
      if (tasksByStatus[task.status]) tasksByStatus[task.status].push(task);
    });
    
    columns.forEach(colName => {
      const columnDiv = document.createElement('div');
      columnDiv.classList.add('column');
      columnDiv.setAttribute('data-status', colName);
      columnDiv.innerHTML = `<h3>${colName}</h3>`;
      
      const sortedTasks = [...tasksByStatus[colName]].sort((a, b) => (a.position || 0) - (b.position || 0));

      sortedTasks.forEach(task => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', task.id);
        card.setAttribute('data-position', task.position || 0); 
        
        card.innerHTML = `
          <div class="card-buttons">
            <button class="edit-btn">✎ Edit</button>
            <button class="delete-btn">✖ Delete</button>
          </div>
          <h4>${escapeHtml(task.title)}</h4>
          <p>${escapeHtml(task.desc || '')}</p>
        `;
        columnDiv.appendChild(card);
      });
      board.appendChild(columnDiv);
    });
    root.appendChild(board);
  } catch (err) {
    console.error(err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

renderBoard();