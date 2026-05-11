const SUPABASE_URL = 'https://bnkdftythbyacvggpxgl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2RmdHl0aGJ5YWN2Z2dweGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzY0NTIsImV4cCI6MjA5Mzc1MjQ1Mn0.h02GtINyRDSiI9Hn3VhPD4FBQNJ2t_ooUGpQJLJwYEg';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const AUTH = `${SUPABASE_URL}/auth/v1`;

function baseHeaders(token) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

// ── Session ──────────────────────────────────────────────
let session = JSON.parse(localStorage.getItem('sb_session') || 'null');

function saveSession(s) {
  session = s;
  if (s) localStorage.setItem('sb_session', JSON.stringify(s));
  else localStorage.removeItem('sb_session');
}

// ── Auth API ─────────────────────────────────────────────
async function apiSignUp(email, password) {
  const res = await fetch(`${AUTH}/signup`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function apiSignIn(email, password) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function apiVerifyOtp(email, token) {
  const res = await fetch(`${AUTH}/verify`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ email, token, type: 'signup' }),
  });
  return res.json();
}

async function apiResendOtp(email) {
  const res = await fetch(`${AUTH}/resend`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ email, type: 'signup' }),
  });
  return res.json();
}

async function apiSignOut() {
  await fetch(`${AUTH}/logout`, {
    method: 'POST',
    headers: baseHeaders(session?.access_token),
  });
}

// ── DOM refs ─────────────────────────────────────────────
const authWrapper      = document.getElementById('authWrapper');
const appWrapper       = document.getElementById('appWrapper');
const authTabs         = document.getElementById('authTabs');

const loginForm        = document.getElementById('loginForm');
const loginEmail       = document.getElementById('loginEmail');
const loginPassword    = document.getElementById('loginPassword');
const loginError       = document.getElementById('loginError');

const registerForm     = document.getElementById('registerForm');
const registerEmail    = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerError    = document.getElementById('registerError');

const otpForm          = document.getElementById('otpForm');
const otpInfo          = document.getElementById('otpInfo');
const otpCode          = document.getElementById('otpCode');
const otpError         = document.getElementById('otpError');
const resendBtn        = document.getElementById('resendBtn');

const currentUserEmail = document.getElementById('currentUserEmail');
const logoutBtn        = document.getElementById('logoutBtn');

const todoInput        = document.getElementById('todoInput');
const addBtn           = document.getElementById('addBtn');
const todoList         = document.getElementById('todoList');
const filterBtns       = document.querySelectorAll('.filter-btn');
const remainingCount   = document.getElementById('remainingCount');
const clearCompleted   = document.getElementById('clearCompleted');
const footer           = document.getElementById('footer');

// ── State ─────────────────────────────────────────────────
let todos = [];
let currentFilter = 'all';
let pendingEmail = '';

// ── UI helpers ────────────────────────────────────────────
function showAuth(form) {
  [loginForm, registerForm, otpForm].forEach(f => f.classList.add('hidden'));
  authTabs.classList.toggle('hidden', form === otpForm);
  form.classList.remove('hidden');
  authWrapper.classList.remove('hidden');
  appWrapper.classList.add('hidden');
}

function showApp() {
  authWrapper.classList.add('hidden');
  appWrapper.classList.remove('hidden');
  currentUserEmail.textContent = session.user.email;
  fetchTodos();
}

function setError(el, msg) { el.textContent = msg; }
function clearError(el)    { el.textContent = ''; }

function setSubmitLoading(form, on) {
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = on;
  btn.textContent = on ? 'Lütfen bekleyin...' : btn.dataset.label;
}

document.querySelectorAll('.auth-form button[type="submit"]').forEach(btn => {
  btn.dataset.label = btn.textContent;
});

// ── Auth tab switching ────────────────────────────────────
authTabs.addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  clearError(loginError);
  clearError(registerError);
  showAuth(btn.dataset.tab === 'login' ? loginForm : registerForm);
});

// ── Register ──────────────────────────────────────────────
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(registerError);
  setSubmitLoading(registerForm, true);

  const data = await apiSignUp(registerEmail.value.trim(), registerPassword.value);
  setSubmitLoading(registerForm, false);

  if (data.error || data.msg) {
    setError(registerError, data.error?.message || data.msg || 'Kayıt başarısız.');
    return;
  }

  pendingEmail = registerEmail.value.trim();
  otpInfo.textContent = `${pendingEmail} adresine 6 haneli doğrulama kodu gönderildi.`;
  otpCode.value = '';
  clearError(otpError);
  showAuth(otpForm);
});

// ── OTP verify ────────────────────────────────────────────
otpForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(otpError);
  setSubmitLoading(otpForm, true);

  const data = await apiVerifyOtp(pendingEmail, otpCode.value.trim());
  setSubmitLoading(otpForm, false);

  if (data.error || !data.access_token) {
    setError(otpError, data.error?.message || 'Kod hatalı veya süresi dolmuş.');
    return;
  }

  saveSession(data);
  showApp();
});

// ── Resend OTP ────────────────────────────────────────────
resendBtn.addEventListener('click', async () => {
  clearError(otpError);
  resendBtn.disabled = true;
  resendBtn.textContent = 'Gönderiliyor...';
  await apiResendOtp(pendingEmail);
  resendBtn.disabled = false;
  resendBtn.textContent = 'Tekrar Gönder';
  setError(otpError, 'Kod tekrar gönderildi.');
});

// ── Login ─────────────────────────────────────────────────
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(loginError);
  setSubmitLoading(loginForm, true);

  const data = await apiSignIn(loginEmail.value.trim(), loginPassword.value);
  setSubmitLoading(loginForm, false);

  if (data.error || !data.access_token) {
    const msg = data.error?.message || '';
    if (msg.toLowerCase().includes('email not confirmed')) {
      pendingEmail = loginEmail.value.trim();
      await apiResendOtp(pendingEmail);
      otpInfo.textContent = `${pendingEmail} adresine 6 haneli doğrulama kodu gönderildi.`;
      otpCode.value = '';
      clearError(otpError);
      showAuth(otpForm);
    } else {
      setError(loginError, msg || 'E-posta veya şifre hatalı.');
    }
    return;
  }

  saveSession(data);
  showApp();
});

// ── Logout ────────────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await apiSignOut();
  saveSession(null);
  todos = [];
  showAuth(loginForm);
});

// ── Todos API ─────────────────────────────────────────────
function todoHeaders() {
  return {
    ...baseHeaders(session.access_token),
    'Prefer': 'return=representation',
  };
}

async function fetchTodos() {
  todoList.innerHTML = '<li class="empty-msg">Yükleniyor...</li>';
  const res = await fetch(`${API}?order=created_at.asc`, { headers: todoHeaders() });
  todos = await res.json();
  render();
}

async function addTodo(text) {
  text = text.trim();
  if (!text) return;
  todoInput.disabled = true;
  addBtn.disabled = true;
  const res = await fetch(API, {
    method: 'POST',
    headers: todoHeaders(),
    body: JSON.stringify({ text, completed: false, user_id: session.user.id }),
  });
  const [created] = await res.json();
  todos.push(created);
  todoInput.value = '';
  todoInput.disabled = false;
  addBtn.disabled = false;
  render();
  todoInput.focus();
}

async function toggleTodo(id, completed) {
  const res = await fetch(`${API}?id=eq.${id}`, {
    method: 'PATCH',
    headers: todoHeaders(),
    body: JSON.stringify({ completed }),
  });
  const [updated] = await res.json();
  todos = todos.map(t => t.id === id ? updated : t);
  render();
}

async function deleteTodo(id) {
  await fetch(`${API}?id=eq.${id}`, { method: 'DELETE', headers: todoHeaders() });
  todos = todos.filter(t => t.id !== id);
  render();
}

async function updateTodoText(id, text) {
  text = text.trim();
  if (!text) return;
  const res = await fetch(`${API}?id=eq.${id}`, {
    method: 'PATCH',
    headers: todoHeaders(),
    body: JSON.stringify({ text }),
  });
  const [updated] = await res.json();
  todos = todos.map(t => t.id === id ? updated : t);
  render();
}

async function clearCompletedTodos() {
  await fetch(`${API}?completed=eq.true&user_id=eq.${session.user.id}`, {
    method: 'DELETE',
    headers: todoHeaders(),
  });
  todos = todos.filter(t => !t.completed);
  render();
}

// ── Render ────────────────────────────────────────────────
function filteredTodos() {
  if (currentFilter === 'active') return todos.filter(t => !t.completed);
  if (currentFilter === 'completed') return todos.filter(t => t.completed);
  return todos;
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

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = '✎';
      editBtn.title = 'Düzenle';
      editBtn.addEventListener('click', () => startEdit(todo.id, span, editBtn));

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Sil';
      delBtn.addEventListener('click', () => deleteTodo(todo.id));

      li.append(checkbox, span, editBtn, delBtn);
      todoList.appendChild(li);
    });
  }

  const activeCount = todos.filter(t => !t.completed).length;
  remainingCount.textContent = `${activeCount} görev kaldı`;
  footer.classList.toggle('hidden', todos.length === 0);
}

function startEdit(id, span, editBtn) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-input';
  input.value = span.textContent;
  span.replaceWith(input);
  editBtn.textContent = '✓';
  editBtn.title = 'Kaydet';
  input.focus();

  const save = () => {
    const newText = input.value.trim();
    if (newText && newText !== span.textContent) {
      updateTodoText(id, newText);
    } else {
      render();
    }
  };

  editBtn.onclick = save;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') render();
  });
  input.addEventListener('blur', () => setTimeout(save, 150));
}

// ── Todo event listeners ──────────────────────────────────
addBtn.addEventListener('click', () => addTodo(todoInput.value));
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(todoInput.value); });
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});
clearCompleted.addEventListener('click', clearCompletedTodos);

// ── Init ──────────────────────────────────────────────────
if (session?.access_token) {
  showApp();
} else {
  showAuth(loginForm);
}
