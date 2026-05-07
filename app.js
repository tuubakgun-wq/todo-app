const SUPABASE_URL = 'https://bnkdftythbyacvggpxgl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2RmdHl0aGJ5YWN2Z2dweGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzY0NTIsImV4cCI6MjA5Mzc1MjQ1Mn0.h02GtINyRDSiI9Hn3VhPD4FBQNJ2t_ooUGpQJLJwYEg';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const input = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const filterBtns = document.querySelectorAll('.filter-btn');
const remainingCount = document.getElementById('remainingCount');
const clearCompleted = document.getElementById('clearCompleted');
const footer = document.getElementById('footer');

let todos = [];
let currentFilter = 'all';

async function fetchTodos() {
  setLoading(true);
  const res = await fetch(`${API}?order=created_at.asc`, { headers: HEADERS });
  todos = await res.json();
  render();
  setLoading(false);
}

async function addTodo(text) {
  text = text.trim();
  if (!text) return;
  input.disabled = true;
  addBtn.disabled = true;
  const res = await fetch(API, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ text, completed: false }),
  });
  const [created] = await res.json();
  todos.push(created);
  input.value = '';
  input.disabled = false;
  addBtn.disabled = false;
  render();
  input.focus();
}

async function toggleTodo(id, completed) {
  const res = await fetch(`${API}?id=eq.${id}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ completed }),
  });
  const [updated] = await res.json();
  todos = todos.map(t => t.id === id ? updated : t);
  render();
}

async function deleteTodo(id) {
  await fetch(`${API}?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
  todos = todos.filter(t => t.id !== id);
  render();
}

async function clearCompletedTodos() {
  await fetch(`${API}?completed=eq.true`, { method: 'DELETE', headers: HEADERS });
  todos = todos.filter(t => !t.completed);
  render();
}

function filteredTodos() {
  if (currentFilter === 'active') return todos.filter(t => !t.completed);
  if (currentFilter === 'completed') return todos.filter(t => t.completed);
  return todos;
}

function setLoading(on) {
  todoList.innerHTML = on ? '<li class="empty-msg">Yükleniyor...</li>' : '';
}

function render() {
  const list = filteredTodos();
  todoList.innerHTML = '';

  if (list.length === 0) {
    todoList.innerHTML = '<li class="empty-msg">Görev yok</li>';
  } else {
    list.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (todo.completed ? ' completed' : '');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = todo.completed;
      checkbox.addEventListener('change', () => toggleTodo(todo.id, checkbox.checked));

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = todo.text;

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Sil';
      delBtn.addEventListener('click', () => deleteTodo(todo.id));

      li.append(checkbox, span, delBtn);
      todoList.appendChild(li);
    });
  }

  const activeCount = todos.filter(t => !t.completed).length;
  remainingCount.textContent = `${activeCount} görev kaldı`;
  footer.classList.toggle('hidden', todos.length === 0);
}

addBtn.addEventListener('click', () => addTodo(input.value));
input.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(input.value); });

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

clearCompleted.addEventListener('click', clearCompletedTodos);

fetchTodos();
