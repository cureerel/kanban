const API_BASE = '/tasks';


const root = document.getElementById('root');

const themeSwitcher = document.createElement('button');
themeSwitcher.className = 'switcher';
document.body.appendChild(themeSwitcher);

function updateThemeUI(isDark) {
  themeSwitcher.textContent = isDark ? ' Light' : ' Dark';
}

// Load saved theme
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

// popup
const modalOverlay = document.createElement('div');
modalOverlay.className = 'modal-overlay';
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

// show/hide modal
function showModal(title, showDeleteOption = false) {
  const modalTitle = modalOverlay.querySelector('#modal-title');
  const titleInput = modalOverlay.querySelector('#modal-task-title');
  const descTextarea = modalOverlay.querySelector('#modal-task-desc');
  const saveBtn = modalOverlay.querySelector('.save-btn');
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
  
  modalOverlay.classList.add('active');
}

function hideModal() {
  modalOverlay.classList.remove('active');
  pendingAction = null;
  deleteTaskId = null;
}


modalOverlay.addEventListener('click', async (e) => {
  if (e.target.classList.contains('cancel-btn')) {
    hideModal();
  }
  else if (e.target.classList.contains('save-btn')) {
    // Edit save
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
        if (res.ok) {
          renderBoard();
          hideModal();
        } else {
          console.error('Update failed');
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
  else if (e.target.classList.contains('confirm-delete')) {
    // Delete confirm
    if (deleteTaskId) {
      try {
        const res = await fetch(`${API_BASE}/${deleteTaskId}`, { method: 'DELETE' });
        if (res.ok) {
          renderBoard();
          hideModal();
        } else {
          console.error('Delete failed');
        }
      } catch (err) {
        console.error(err);
      }
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


// form
const form = document.createElement('div');
form.classList.add('form');
form.append(inputTitle, inputDesc, selectStatus, addBtn);
root.appendChild(form);

addBtn.addEventListener('click', async () => {
  const title = inputTitle.value.trim();
  if (!title) {
    alert('Please enter a task title');
    return;
  }
  const status = selectStatus.value;
  const desc = inputDesc.value.trim();
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status, desc })
    });
    if (res.ok) {
      inputTitle.value = '';
      inputDesc.value = '';
      renderBoard();
    }
  } catch (err) {
    console.error(err);
  }
});

// Drag & Drop state
let draggedTaskId = null;

document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.card');
  if (!card) {
    e.preventDefault();
    return false;
  }
  draggedTaskId = card.dataset.id;
  e.dataTransfer.setData('text/plain', draggedTaskId);
  e.dataTransfer.effectAllowed = 'move';
});

document.addEventListener('dragover', (e) => {
  const column = e.target.closest('.column');
  if (!column) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});

document.addEventListener('drop', async (e) => {
  const column = e.target.closest('.column');
  if (!column || !draggedTaskId) return;
  e.preventDefault();
  const newStatus = column.dataset.status;
  try {
    const res = await fetch(`${API_BASE}/${draggedTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) renderBoard();
  } catch (err) {
    console.error(err);
  } finally {
    draggedTaskId = null;
  }
});

// Global eventListener
document.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.delete-btn');
  const editBtn = e.target.closest('.edit-btn');
  
  if (deleteBtn) {
    e.stopPropagation();
    const card = deleteBtn.closest('.card');
    if (!card) return;
    deleteTaskId = card.dataset.id;
    showModal('Delete Task?', true);
  }
  else if (editBtn) {
    e.stopPropagation();
    const card = editBtn.closest('.card');
    if (!card) return;
    const taskId = card.dataset.id;
    const currentTitle = card.querySelector('h4')?.innerText || '';
    const currentDesc = card.querySelector('p')?.innerText || '';
    
    // Set modal input values
    modalOverlay.querySelector('#modal-task-title').value = currentTitle;
    modalOverlay.querySelector('#modal-task-desc').value = currentDesc;
    
    pendingAction = { type: 'edit', taskId, currentTitle, currentDesc };
    showModal('Edit Task', false);
  }
});

// -Render Board 
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
      tasksByStatus[colName].forEach(task => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', task.id);
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
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

renderBoard();