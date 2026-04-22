// Talaga Premium Notes - Elite Core v3.6 (Absolute Masterpiece)
// -------------------------------------------------------------

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
let notes = [];
let viewContainer, mainNav;

// --- Initialization ---

function initApp() {
    viewContainer = document.getElementById('view-container');
    mainNav = document.getElementById('main-nav');
    
    // Instant Theme Recovery (Prevent Flash)
    const isUltra = localStorage.getItem('ultraDark') === 'true';
    if (isUltra) document.body.classList.add('ultra-dark');

    toggleSpinner(true, 'RESTORING SANCTUARY');
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    let isInitialLoad = true;
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            await showView(hash);
            await fetchAllNotes();
            if (hash === 'dashboard') loadNotes();
        } else {
            showView('login');
        }
        isInitialLoad = false;
        toggleSpinner(false);
    });

    // Keyboard Shortcuts (Functional & Responsive)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.code === 'KeyN') {
            e.preventDefault();
            if (currentUser && currentView !== 'login') openNoteModal();
        }
        if (e.key === 'Escape') {
            closeModal();
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
            if (window.innerWidth <= 768) mainNav.classList.remove('open');
        };
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            toggleSpinner(true, 'SIGNING OUT');
            auth.signOut().then(() => {
                showToast('Signed out successfully', 'success');
            });
        };
    }

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
    } catch (e) { toggleSpinner(false); }
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

function renderDashboard() {
    if (mainNav) mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem">
            <div><h1>Digital Workspace</h1><p>Hello, ${currentUser?.displayName || 'User'}</p></div>
            <button id="add-note-btn" class="btn-primary"><i class="fas fa-plus"></i> New Note</button>
        </header>
        <div id="notes-list" class="notes-grid"></div>
        <div id="empty-state" class="hidden" style="text-align:center; padding: 4rem; color: var(--text-dim)"><p>No notes in sanctuary.</p></div>
    `;
    document.getElementById('add-note-btn').onclick = () => openNoteModal();
    toggleSpinner(false);
    loadNotes();
}

function renderProfile() {
    viewContainer.innerHTML = `
        <div class="profile-container" style="animation: slideUp 0.6s ease-out">
            <div style="text-align: center; margin-bottom: 2rem">
                <img src="${currentUser.photoURL}" style="width: 100px; border-radius: 50%; border: 3px solid var(--primary); margin-bottom: 1rem">
                <h1>${currentUser.displayName}</h1>
                <p style="color: var(--text-muted)">${currentUser.email}</p>
            </div>
            <div style="background: var(--glass-bg); padding: 2rem; border-radius: 1.5rem; text-align: center; border: 1px solid var(--glass-border)">
                <h2 style="color: var(--primary)">${notes.length}</h2><p>Notes Managed</p>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

function renderSettings() {
    viewContainer.innerHTML = `
        <div class="settings-container" style="animation: slideUp 0.6s ease-out; max-width: 600px">
            <h1>Settings</h1>
            <div style="background: var(--glass-bg); border-radius: 2rem; border: 1px solid var(--glass-border); padding: 2.5rem; display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem">
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <div><h3>Ultra Dark Mode</h3><p style="font-size: 0.8rem; color: var(--text-dim)">For elite night focus.</p></div>
                    <label class="switch"><input type="checkbox" id="dark-toggle"><span class="slider round"></span></label>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <div><h3>Cloud Sync</h3><p style="font-size: 0.8rem; color: var(--text-dim)">Global synchronization active.</p></div>
                    <label class="switch"><input type="checkbox" checked><span class="slider round"></span></label>
                </div>
                <div style="border-top: 1px solid var(--glass-border); padding-top: 2rem; display: flex; flex-direction: column; gap: 1rem">
                    <button class="btn-primary" style="background: var(--warning); width: 100%" onclick="wipeAllData()">Wipe All Data</button>
                    <button class="btn-primary" style="background: var(--error); width: 100%" onclick="deleteAccount()">Delete Account</button>
                </div>
                <button class="btn-primary" style="width: 100%; margin-top: 1rem" onclick="saveSettings()">Save Changes</button>
            </div>
        </div>
    `;
    const toggle = document.getElementById('dark-toggle');
    if (toggle) toggle.checked = document.body.classList.contains('ultra-dark');
    toggleSpinner(false);
}

function renderAbout() {
    viewContainer.innerHTML = `
        <div class="about-container" style="animation: slideUp 0.6s ease-out; text-align: center; max-width: 600px; margin: 0 auto">
            <img src="images/logo.png" style="width: 100px; margin-bottom: 2rem">
            <h1>Talaga Sanctuary</h1>
            <p style="color: var(--text-muted); margin-bottom: 3rem">Developed with precision by <strong>Jemmy Francisco</strong>.</p>
            <div style="background: var(--glass-bg); padding: 2.5rem; border-radius: 2rem; border: 1px solid var(--glass-border)">
                <h3 style="margin-bottom: 1.5rem">Contact Developer</h3>
                <div style="display: flex; justify-content: center; gap: 3rem">
                    <a href="mailto:Jemmyfrancisco30@gmail.com" style="color: #EA4335; font-size: 2.5rem" title="Gmail">
                        <i class="fas fa-envelope"></i>
                    </a>
                    <a href="https://facebook.com/jemmy.francisco.98" target="_blank" style="color: #1877F2; font-size: 2.5rem" title="Facebook">
                        <i class="fab fa-facebook"></i>
                    </a>
                </div>
                <p style="margin-top: 2rem; font-size: 0.9rem; color: var(--text-dim)">Jemmyfrancisco30@gmail.com</p>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

function renderFeedback() {
    viewContainer.innerHTML = `
        <div class="feedback-container" style="animation: slideUp 0.6s ease-out; max-width: 500px; margin: 0 auto">
            <h1>Sanctuary Feedback</h1>
            <p style="color: var(--text-muted); margin-bottom: 2.5rem">Directly to Jemmy Francisco</p>
            <textarea id="feedback-body" class="modal-input" placeholder="Your professional feedback..." style="min-height: 200px; background: var(--glass-bg); padding: 2rem; border-radius: 1.5rem; border: 1px solid var(--glass-border); margin-bottom: 2rem"></textarea>
            <button class="btn-primary" style="width: 100%" onclick="sendFeedback()">Send to Jemmy</button>
        </div>
    `;
    toggleSpinner(false);
}

function renderHelp() {
    viewContainer.innerHTML = `
        <div class="help-container" style="animation: slideUp 0.6s ease-out; max-width: 600px; margin: 0 auto">
            <h1>Help & Support</h1>
            <div style="background: var(--glass-bg); padding: 2.5rem; border-radius: 2rem; border: 1px solid var(--glass-border); margin-top: 2rem">
                <h3 style="margin-bottom: 1.5rem">Keyboard Master</h3>
                <div style="display: flex; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid var(--glass-border)">
                    <span>New Note</span><kbd style="color: var(--primary); font-weight: bold">Alt + N</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 1rem">
                    <span>Close Modal</span><kbd style="color: var(--primary); font-weight: bold">Esc</kbd>
                </div>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

// --- Action Logic ---

function saveSettings() {
    const toggle = document.getElementById('dark-toggle');
    const isDark = toggle.checked;
    localStorage.setItem('ultraDark', isDark);
    if (isDark) document.body.classList.add('ultra-dark');
    else document.body.classList.remove('ultra-dark');
    showToast("Settings Saved & Synchronized", "success");
}

async function wipeAllData() {
    if (!confirm("Are you 100% sure? This will wipe ALL your sanctuary notes forever.")) return;
    toggleSpinner(true, 'WIPING DATA');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/wipe`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast("Sanctuary Cleared", "success"); loadNotes(); }
    } catch(e) { showToast("Action failed", "error"); }
    toggleSpinner(false);
}

async function deleteAccount() {
    if (!confirm("CRITICAL: Delete account and all data forever? This cannot be undone.")) return;
    toggleSpinner(true, 'DELETING ACCOUNT');
    try {
        const token = await currentUser.getIdToken();
        await fetch(`${API_BASE_URL}/api/notes/wipe`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        await currentUser.delete();
        showToast("Account Removed", "success");
        auth.signOut();
    } catch(e) { showToast("Security: Please sign in again to delete account.", "error"); }
    toggleSpinner(false);
}

function sendFeedback() {
    const body = document.getElementById('feedback-body').value;
    if (!body.trim()) return;
    window.location.href = `mailto:Jemmyfrancisco30@gmail.com?subject=Talaga Feedback&body=${encodeURIComponent(body)}`;
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
    if (!list) return;
    await fetchAllNotes();
    if (notes.length === 0) {
        list.innerHTML = '';
        document.getElementById('empty-state').classList.remove('hidden');
    } else {
        document.getElementById('empty-state').classList.add('hidden');
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
    if (noteId) deleteBtn.classList.remove('hidden');
    else deleteBtn.classList.add('hidden');
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
        if (res.ok) { closeModal(); loadNotes(); showToast("Synchronized", "success"); }
        toggleSpinner(false);
    };
}

function closeModal() {
    const modal = document.getElementById('note-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function deleteNote(id) {
    if (!confirm('Permanently delete note?')) return;
    toggleSpinner(true, 'DELETING');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast("Deleted", "success"); loadNotes(); }
    } catch(e) {}
    toggleSpinner(false);
}

document.addEventListener('DOMContentLoaded', initApp);
