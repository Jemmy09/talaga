// Talaga Premium Notes - Final Masterpiece v3.3
// ------------------------------------------

function toggleSpinner(show, text = 'LOADING SPACE') {
    const spinner = document.getElementById('loading-spinner');
    const textEl = document.getElementById('spinner-text');
    if (spinner) {
        spinner.classList.toggle('hidden', !show);
        if (textEl) textEl.innerText = text.toUpperCase();
    }
}

function navigate(view) {
    window.location.hash = view;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'exclamation-circle' : 'info-circle');
    toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyABJZRDkwNTs0Ujs2wpnSSmNMlY4uinKNo",
    authDomain: "francisco-61572.firebaseapp.com",
    projectId: "francisco-61572",
    storageBucket: "francisco-61572.firebasestorage.app",
    messagingSenderId: "333100224160",
    appId: "1:333100224160:web:4887376c6c59b66c433a75"
};

const API_BASE_URL = 'https://talaga-backend.onrender.com';

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;
let currentView = null;
let notes = [];
let viewContainer, mainNav;

function initApp() {
    viewContainer = document.getElementById('view-container');
    mainNav = document.getElementById('main-nav');
    
    toggleSpinner(true, 'SECURING SPACE');
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            showView(hash);
            fetchAllNotes();
        } else {
            showView('login');
        }
    });

    window.onhashchange = () => {
        const view = window.location.hash.replace('#', '') || (currentUser ? 'dashboard' : 'login');
        showView(view);
    };

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => {
            const view = li.dataset.view;
            if (view) navigate(view);
        };
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();
    
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) menuToggle.onclick = () => mainNav.classList.toggle('open');
}

async function showView(viewName) {
    if (!viewContainer) return;

    // Protection
    if (!currentUser && viewName !== 'login' && viewName !== 'register') {
        navigate('login'); return;
    }
    if (currentUser && (viewName === 'login' || viewName === 'register')) {
        navigate('dashboard'); return;
    }

    currentView = viewName;
    
    // Update active state in sidebar
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', li.dataset.view === viewName);
    });

    try {
        switch (viewName) {
            case 'login': renderLogin(); break;
            case 'register': renderRegister(); break;
            case 'dashboard': renderDashboard(); break;
            case 'profile': renderProfile(); break;
            case 'settings': renderSettings(); break;
            case 'about': renderAbout(); break;
            case 'feedback': renderFeedback(); break;
            case 'help': renderHelp(); break;
            default: renderDashboard();
        }
        document.title = `Talaga | ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`;
        if (viewName !== 'dashboard') toggleSpinner(false);
    } catch (e) {
        console.error(e);
        toggleSpinner(false);
    }
}

// --- View Renderers ---

function renderLogin() {
    if (mainNav) mainNav.classList.add('hidden');
    viewContainer.innerHTML = `<div class="auth-container"><h1>Welcome Back</h1><button id="google-signin" class="google-btn">Continue with Google</button></div>`;
    document.getElementById('google-signin').onclick = () => {
        toggleSpinner(true, 'AUTHENTICATING');
        auth.signInWithPopup(provider);
    };
    toggleSpinner(false);
}

function renderRegister() {
    if (mainNav) mainNav.classList.add('hidden');
    viewContainer.innerHTML = `<div class="auth-container"><h1>Join Talaga</h1><button id="google-signup" class="google-btn">Sign up with Google</button></div>`;
    document.getElementById('google-signup').onclick = () => {
        toggleSpinner(true, 'AUTHENTICATING');
        auth.signInWithPopup(provider);
    };
    toggleSpinner(false);
}

function renderDashboard() {
    if (mainNav) mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem">
            <div><h1>Digital Workspace</h1><p>Hello, ${currentUser?.displayName || 'User'}</p></div>
            <button id="add-note-btn" class="btn-primary">New Note</button>
        </header>
        <div id="notes-list" class="notes-grid"></div>
        <div id="empty-state" class="hidden" style="text-align:center; padding: 4rem"><p>No notes yet.</p></div>
    `;
    document.getElementById('add-note-btn').onclick = () => openNoteModal();
    toggleSpinner(false);
    loadNotes();
}

function renderProfile() {
    viewContainer.innerHTML = `<div style="padding: 2rem"><h1>Profile</h1><p>Email: ${currentUser.email}</p><button class="btn-primary" onclick="auth.signOut()">Logout</button></div>`;
    toggleSpinner(false);
}

function renderSettings() {
    viewContainer.innerHTML = `<div style="padding: 2rem"><h1>Settings</h1><p>Theme settings coming soon.</p></div>`;
    toggleSpinner(false);
}

function renderAbout() {
    viewContainer.innerHTML = `<div style="padding: 2rem; text-align: center"><h1>About Talaga</h1><p>Your premium note sanctuary.</p></div>`;
    toggleSpinner(false);
}

function renderFeedback() {
    viewContainer.innerHTML = `<div style="padding: 2rem"><h1>Feedback</h1><textarea class="modal-input" placeholder="Your thoughts..."></textarea><button class="btn-primary">Send</button></div>`;
    toggleSpinner(false);
}

function renderHelp() {
    viewContainer.innerHTML = `<div style="padding: 2rem"><h1>Help Center</h1><p>Contact support at help@talaga.app</p></div>`;
    toggleSpinner(false);
}

// --- Note Logic ---

async function fetchAllNotes() {
    if (!currentUser) return;
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) notes = await res.json();
    } catch(e) {}
}

async function loadNotes() {
    const list = document.getElementById('notes-list');
    const empty = document.getElementById('empty-state');
    if (!list) return;
    await fetchAllNotes();
    if (notes.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        list.innerHTML = notes.map(n => `<div class="note-card" onclick="openNoteModal('${n.id}')"><h3>${n.title || 'Untitled'}</h3><p>${(n.content || '').substring(0, 100)}...</p></div>`).join('');
    }
}

function openNoteModal(noteId = null) {
    const modal = document.getElementById('note-modal');
    const titleInput = document.getElementById('note-title-input');
    const contentInput = document.getElementById('note-content-input');
    const saveBtn = document.getElementById('save-note-btn');
    const deleteBtn = document.getElementById('delete-modal-btn');
    
    const note = noteId ? notes.find(n => n.id === noteId) : null;
    titleInput.value = note ? note.title : '';
    contentInput.value = note ? note.content : '';
    
    if (noteId) deleteBtn.classList.remove('hidden');
    else deleteBtn.classList.add('hidden');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    saveBtn.onclick = async () => {
        toggleSpinner(true, 'SAVING');
        const token = await currentUser.getIdToken();
        const method = noteId ? 'PUT' : 'POST';
        const url = noteId ? `${API_BASE_URL}/api/notes/${noteId}` : `${API_BASE_URL}/api/notes`;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: titleInput.value, content: contentInput.value })
        });
        if (res.ok) { closeModal(); loadNotes(); showToast('Saved!', 'success'); }
        toggleSpinner(false);
    };
}

function closeModal() {
    const modal = document.getElementById('note-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

document.addEventListener('DOMContentLoaded', initApp);
