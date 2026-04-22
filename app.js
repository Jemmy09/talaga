// Talaga Premium Notes - Elite Core v3.4
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

    if (!currentUser && viewName !== 'login' && viewName !== 'register') {
        navigate('login'); return;
    }
    if (currentUser && (viewName === 'login' || viewName === 'register')) {
        navigate('dashboard'); return;
    }

    currentView = viewName;
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
    viewContainer.innerHTML = `
        <div class="auth-container" style="animation: slideUp 0.6s ease-out">
            <div style="text-align: center; margin-bottom: 2.5rem">
                <img src="images/logo.png" style="width: 80px; margin-bottom: 1.5rem">
                <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">Welcome Back</h1>
                <p style="color: var(--text-muted)">Your premium space for clear thinking.</p>
            </div>
            <button id="google-signin" class="google-btn">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="20" height="20">
                <span>Continue with Google</span>
            </button>
        </div>`;
    document.getElementById('google-signin').onclick = () => {
        toggleSpinner(true, 'AUTHENTICATING');
        auth.signInWithPopup(provider);
    };
    toggleSpinner(false);
}

function renderRegister() {
    if (mainNav) mainNav.classList.add('hidden');
    viewContainer.innerHTML = `
        <div class="auth-container" style="animation: slideUp 0.6s ease-out">
            <div style="text-align: center; margin-bottom: 2.5rem">
                <img src="images/logo.png" style="width: 80px; margin-bottom: 1.5rem">
                <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">Join Talaga</h1>
                <p style="color: var(--text-muted)">Start your journey towards professional organization.</p>
            </div>
            <button id="google-signup" class="google-btn">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="20" height="20">
                <span>Sign up with Google</span>
            </button>
        </div>`;
    document.getElementById('google-signup').onclick = () => {
        toggleSpinner(true, 'AUTHENTICATING');
        auth.signInWithPopup(provider);
    };
    toggleSpinner(false);
}

function renderDashboard() {
    if (mainNav) mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; animation: slideUp 0.4s ease-out">
            <div>
                <h1 style="font-size: 2rem; font-weight: 700">Digital Workspace</h1>
                <p style="color: var(--text-muted)">Hello, ${currentUser?.displayName || 'User'}. Ready to capture greatness?</p>
            </div>
            <button id="add-note-btn" class="btn-primary">
                <i class="fas fa-plus"></i> New Note
            </button>
        </header>
        <div id="notes-list" class="notes-grid"></div>
        <div id="empty-state" class="hidden" style="text-align:center; padding: 6rem 2rem; color: var(--text-dim); animation: slideUp 0.8s ease-out">
            <div style="font-size: 4rem; margin-bottom: 2rem; opacity: 0.3"><i class="fas fa-feather-pointed"></i></div>
            <h2 style="color: var(--text-muted); margin-bottom: 0.5rem">Your canvas is empty</h2>
            <p>Ready to capture your first idea?</p>
        </div>
    `;
    document.getElementById('add-note-btn').onclick = () => openNoteModal();
    toggleSpinner(false);
    loadNotes();
}

function renderProfile() {
    viewContainer.innerHTML = `
        <div class="profile-container" style="animation: slideUp 0.6s ease-out">
            <div style="text-align: center; margin-bottom: 3rem">
                <img src="${currentUser.photoURL}" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--primary); margin-bottom: 1.5rem">
                <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">${currentUser.displayName}</h1>
                <p style="color: var(--text-muted)">${currentUser.email}</p>
            </div>
            
            <div style="display: flex; gap: 2rem; margin-bottom: 4rem">
                <div class="stat-card" style="background: var(--glass-bg); padding: 2rem; border-radius: 1.5rem; border: 1px solid var(--glass-border); text-align: center; flex: 1">
                    <h2 style="font-size: 2rem; color: var(--primary)">${notes.length}</h2>
                    <p style="font-size: 0.9rem; color: var(--text-dim)">Total Notes</p>
                </div>
                <div class="stat-card" style="background: var(--glass-bg); padding: 2rem; border-radius: 1.5rem; border: 1px solid var(--glass-border); text-align: center; flex: 1">
                    <h2 style="font-size: 2rem; color: var(--success)">Active</h2>
                    <p style="font-size: 0.9rem; color: var(--text-dim)">Account Status</p>
                </div>
            </div>
            
            <div style="border-top: 1px solid var(--glass-border); padding-top: 2rem; text-align: center">
                <button class="btn-primary" onclick="auth.signOut()" style="background: var(--error)">Sign Out Everywhere</button>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

function renderSettings() {
    viewContainer.innerHTML = `
        <div class="settings-container" style="animation: slideUp 0.6s ease-out; max-width: 600px">
            <h1 style="margin-bottom: 2rem">Settings</h1>
            <div style="background: var(--glass-bg); border-radius: 1.5rem; border: 1px solid var(--glass-border); padding: 2rem; display: flex; flex-direction: column; gap: 2rem">
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <div>
                        <h3 style="margin-bottom: 0.3rem">Ultra Dark Mode</h3>
                        <p style="font-size: 0.85rem; color: var(--text-dim)">Optimized for deep night focus.</p>
                    </div>
                    <label class="switch"><input type="checkbox" checked><span class="slider round"></span></label>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <div>
                        <h3 style="margin-bottom: 0.3rem">Cloud Sync</h3>
                        <p style="font-size: 0.85rem; color: var(--text-dim)">Real-time backup of all thoughts.</p>
                    </div>
                    <label class="switch"><input type="checkbox" checked><span class="slider round"></span></label>
                </div>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

function renderAbout() {
    viewContainer.innerHTML = `
        <div class="about-container" style="animation: slideUp 0.6s ease-out; text-align: center; max-width: 600px; margin: 0 auto">
            <img src="images/logo.png" style="width: 120px; margin-bottom: 2rem">
            <h1 style="font-size: 3rem; margin-bottom: 1rem">Talaga</h1>
            <p style="color: var(--text-muted); line-height: 1.8; margin-bottom: 3rem">
                Talaga is your premium digital sanctuary for professional note-taking. We believe in clear thinking through elegant design and absolute security.
            </p>
            <div style="color: var(--text-dim); font-size: 0.9rem">Version 3.4 (Elite Core)</div>
        </div>
    `;
    toggleSpinner(false);
}

function renderFeedback() {
    viewContainer.innerHTML = `
        <div class="feedback-container" style="animation: slideUp 0.6s ease-out; max-width: 600px; margin: 0 auto">
            <h1 style="margin-bottom: 1rem">Feedback</h1>
            <p style="color: var(--text-muted); margin-bottom: 2rem">Help us shape the future of your sanctuary.</p>
            <textarea id="feedback-txt" class="modal-input" placeholder="What can we improve?" style="min-height: 150px; background: var(--glass-bg); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--glass-border); margin-bottom: 2rem"></textarea>
            <button class="btn-primary" style="width: 100%" onclick="showToast('Thank you!', 'success'); navigate('dashboard')">Submit Voice</button>
        </div>
    `;
    toggleSpinner(false);
}

function renderHelp() {
    viewContainer.innerHTML = `
        <div class="help-container" style="animation: slideUp 0.6s ease-out; max-width: 600px; margin: 0 auto">
            <h1 style="margin-bottom: 2rem">Help Center</h1>
            <div style="display: grid; gap: 1rem">
                <div style="background: var(--glass-bg); padding: 1.5rem; border-radius: 1.2rem; border: 1px solid var(--glass-border)">
                    <h3>Keyboard Shortcuts</h3>
                    <p style="color: var(--text-dim); font-size: 0.9rem; margin-top: 0.5rem">Alt + N: New Note | Esc: Close Editor</p>
                </div>
                <div style="background: var(--glass-bg); padding: 1.5rem; border-radius: 1.2rem; border: 1px solid var(--glass-border)">
                    <h3>Syncing</h3>
                    <p style="color: var(--text-dim); font-size: 0.9rem; margin-top: 0.5rem">Your notes are automatically saved to our secure cloud.</p>
                </div>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

// --- Note Logic ---

async function fetchAllNotes() {
    if (!currentUser) return;
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) notes = await res.json();
    } catch(e) { console.warn("Fetch Error:", e); }
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
        list.innerHTML = notes.map(n => `
            <div class="note-card" onclick="openNoteModal('${n.id}')">
                <div class="note-card-header">
                    <h3>${n.title || 'Untitled'}</h3>
                    <button onclick="event.stopPropagation(); deleteNote('${n.id}')" class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
                <p>${(n.content || '').substring(0, 100)}...</p>
                <div class="note-card-footer"><span>${new Date(n.updated_at || n.created_at).toLocaleDateString()}</span></div>
            </div>`).join('');
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
    
    if (noteId) {
        deleteBtn.classList.remove('hidden');
        deleteBtn.onclick = () => { deleteNote(noteId); closeModal(); };
    } else {
        deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    saveBtn.onclick = async () => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        if (!title && !content) return;

        toggleSpinner(true, 'SAVING');
        const token = await currentUser.getIdToken();
        const method = noteId ? 'PUT' : 'POST';
        const url = noteId ? `${API_BASE_URL}/api/notes/${noteId}` : `${API_BASE_URL}/api/notes`;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, content })
        });
        if (res.ok) { showToast('Synchronized!', 'success'); closeModal(); loadNotes(); }
        toggleSpinner(false);
    };
}

function closeModal() {
    const modal = document.getElementById('note-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    toggleSpinner(true, 'DELETING');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast('Deleted', 'success'); loadNotes(); }
    } catch(e) {}
    toggleSpinner(false);
}

document.addEventListener('DOMContentLoaded', initApp);
