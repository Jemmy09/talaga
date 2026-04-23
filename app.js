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

    toggleSpinner(true, 'RESTORING NOTES');
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

    const navOverlay = document.getElementById('nav-overlay');
    const toggleMenu = (forceClose = false) => {
        const isOpen = forceClose ? false : !mainNav.classList.contains('open');
        mainNav.classList.toggle('open', isOpen);
        if (navOverlay) navOverlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => {
            const view = li.dataset.view;
            if (view) navigate(view);
            if (window.innerWidth <= 768) toggleMenu(true);
        };
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            toggleSpinner(true, 'SIGNING OUT');
            auth.signOut().then(() => showToast('Signed out successfully', 'success'));
        };
    }

    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.onclick = (e) => {
            e.stopPropagation();
            toggleMenu();
        };
    }

    if (navOverlay) {
        navOverlay.onclick = () => toggleMenu(true);
    }
}

async function showView(viewName) {
    if (!viewContainer || !mainNav) return;

    // Auth Guard
    if (!currentUser && viewName !== 'login' && viewName !== 'register') {
        navigate('login'); return;
    }
    if (currentUser && (viewName === 'login' || viewName === 'register')) {
        navigate('dashboard'); return;
    }

    currentView = viewName;

    // Sidebar Visibility Control
    if (viewName === 'login' || viewName === 'register') {
        mainNav.classList.add('hidden');
    } else {
        mainNav.classList.remove('hidden');
    }

    // Active Tab Styling
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', li.dataset.view === viewName);
    });

    // View Routing
    try {
        switch (viewName) {
            case 'dashboard': renderDashboard(); break;
            case 'profile': renderProfile(); break;
            case 'settings': renderSettings(); break;
            case 'about': renderAbout(); break;
            case 'feedback': renderFeedback(); break;
            case 'help': renderHelp(); break;
            case 'login': renderLogin(); break;
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
            <div style="text-align: center; margin-bottom: 2.5rem; display: flex; flex-direction: column; align-items: center;">
                <img src="images/logo.png" style="width: 80px; margin-bottom: 1.5rem; display: block;">
                <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">Login</h1>
                <p style="color: var(--text-muted)">A simple space for your thoughts.</p>
            </div>
            <button id="google-signin" class="google-btn">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="20" height="20">
                <span>Login with Google</span>
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
        <header class="dashboard-header">
            <div><h1>Digital Workspace</h1><p>Hello, ${currentUser?.displayName || 'User'}</p></div>
            <button id="add-note-btn" class="btn-primary"><i class="fas fa-plus"></i> New Note</button>
        </header>
        <div id="notes-list" class="notes-grid"></div>
        <div id="empty-state" class="hidden" style="text-align:center; padding: 4rem; color: var(--text-dim)"><p>Empty notes</p></div>
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
        <div class="settings-container" style="animation: slideUp 0.6s ease-out; max-width: 600px; margin: 0 auto; text-align: center">
            <h1 style="font-size: 2.5rem; margin-bottom: 2rem">Settings</h1>
            <div style="background: var(--glass-bg); border-radius: 2rem; border: 1px solid var(--glass-border); padding: 2.5rem; display: flex; flex-direction: column; gap: 2rem; text-align: left">
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <div><h3>Ultra Dark Mode</h3><p style="font-size: 0.8rem; color: var(--text-dim)">For elite night focus.</p></div>
                    <label class="switch"><input type="checkbox" id="dark-toggle"><span class="slider round"></span></label>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <div><h3>Cloud Sync</h3><p style="font-size: 0.8rem; color: var(--text-dim)">Global synchronization active.</p></div>
                    <label class="switch"><input type="checkbox" checked disabled><span class="slider round"></span></label>
                </div>
                <div style="border-top: 1px solid var(--glass-border); padding-top: 2rem; display: flex; flex-direction: column; gap: 1rem">
                    <button class="btn-primary" style="background: #f43f5e; width: 100%; box-shadow: none" onclick="wipeAllData()">Wipe All Data</button>
                    <button class="btn-primary" style="background: #f43f5e; width: 100%; box-shadow: none" onclick="deleteAccount()">Delete Account</button>
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
        <div class="about-container" style="animation: slideUp 0.6s ease-out; text-align: center; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
            <img src="images/logo.png" style="width: 100px; margin-bottom: 2rem; display: block;">
            <h1>Talaga</h1>
            <p style="color: var(--text-muted); margin-bottom: 3rem">Developed by <strong>Jemmy Francisco</strong></p>
            <div style="background: var(--glass-bg); padding: 2.5rem; border-radius: 2rem; border: 1px solid var(--glass-border); width: 100%;">
                <h3 style="margin-bottom: 1.5rem">Contact Developer</h3>
                <div style="display: flex; justify-content: center; gap: 3rem; position: relative; z-index: 10;">
                    <a href="mailto:Jemmyfrancisco30@gmail.com" style="color: #EA4335; font-size: 2.5rem; display: inline-block; cursor: pointer; position: relative; z-index: 20;" title="Gmail">
                        <i class="fas fa-envelope"></i>
                    </a>
                    <a href="https://facebook.com/jemmy.francisco.98" target="_blank" style="color: #1877F2; font-size: 2.5rem; display: inline-block; cursor: pointer; position: relative; z-index: 20;" title="Facebook">
                        <i class="fab fa-facebook"></i>
                    </a>
                </div>
                <a href="mailto:Jemmyfrancisco30@gmail.com" style="display: block; margin-top: 2rem; font-size: 0.9rem; color: var(--text-dim); text-decoration: none; position: relative; z-index: 20;">Jemmyfrancisco30@gmail.com</a>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

function renderFeedback() {
    viewContainer.innerHTML = `
        <div style="max-width: 600px; margin: 4rem auto; text-align: center; animation: slideUp 0.6s ease-out">
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem">Feedback</h1>
            <p style="color: var(--text-muted); margin-bottom: 2rem">Send to developer</p>
            <div class="settings-group" style="text-align: left">
                <textarea id="feedback-text" placeholder="Add feedback" style="width: 100%; min-height: 150px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 16px; color: white; padding: 1.25rem; font-family: inherit; resize: vertical"></textarea>
            </div>
            <button id="submit-feedback-btn" class="btn-primary" style="width: 100%; margin-top: 1.5rem">Send</button>
        </div>`;

    document.getElementById('submit-feedback-btn').onclick = async () => {
        const text = document.getElementById('feedback-text').value.trim();
        if (!text) return;
        toggleSpinner(true, 'SENDING');
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                showToast("Feedback Sent", "success");
                navigate('dashboard');
            }
        } catch (e) { }
        toggleSpinner(false);
    };
    toggleSpinner(false);
}

function renderHelp() {
    viewContainer.innerHTML = `
        <div class="help-container" style="animation: slideUp 0.6s ease-out; max-width: 600px; margin: 0 auto">
            <h1>Help & Support</h1>
            <div style="background: var(--glass-bg); padding: 2.5rem; border-radius: 2rem; border: 1px solid var(--glass-border); margin-top: 2rem">
                <h3 style="margin-bottom: 1.5rem">Keyboard Shortcuts</h3>
                <div style="display: flex; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid var(--glass-border)">
                    <span>New Note</span><kbd style="color: var(--primary); font-weight: bold">Alt + N</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem">
                    <span>Close Modal</span><kbd style="color: var(--primary); font-weight: bold">Esc</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 1rem">
                    <span>Save Note (Edit Mode)</span><kbd style="color: var(--primary); font-weight: bold">Enter</kbd>
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
    } catch (e) { showToast("Action failed", "error"); }
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
    } catch (e) { showToast("Security: Please sign in again to delete account.", "error"); }
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
    } catch (e) { }
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
                ${n.attachments && n.attachments.length > 0 ? `<div class="note-card-image" style="background-image: url('${n.attachments[0]}'); height: 120px; border-radius: 12px 12px 0 0; background-size: cover; background-position: center;"></div>` : ''}
                <div class="note-card-header" style="${n.attachments && n.attachments.length > 0 ? 'padding-top: 1rem;' : ''}">
                    <div style="display: flex; align-items: center; gap: 0.5rem">
                        <h3>${n.title || 'Untitled'}</h3>
                        ${!n.is_owner ? '<i class="fas fa-user-friends" style="color: var(--primary); font-size: 0.8rem;" title="Shared with you"></i>' : ''}
                    </div>
                    <button onclick="event.stopPropagation(); deleteNote('${n.id}')" class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
                <p>${(n.content || '').substring(0, 80)}...</p>
                <div class="note-card-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.7rem; color: var(--text-dim)">${!n.is_owner ? 'Owned by ' + (n.owner_name || 'Collaborator') : 'Owner'}</span>
                    <span>${new Date(n.updated_at || n.created_at).toLocaleDateString()}</span>
                </div>
            </div>`).join('');
    }
}

function openNoteModal(noteId = null) {
    const modal = document.getElementById('note-modal');
    const viewContainer = modal.querySelector('.modal-content');

    // Robust ID matching (handles string vs number from DB)
    const note = noteId ? notes.find(n => n.id == noteId) : null;

    const renderReadView = () => {
        viewContainer.innerHTML = `
            <div style="animation: slideUp 0.4s ease-out">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1.5rem">
                    <div style="flex: 1">
                        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem">
                            <span style="display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.1); color: var(--primary); border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${note?.category || 'General Note'}</span>
                            ${!note?.is_owner ? '<span style="display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Shared Note</span>' : ''}
                        </div>
                        <h1 style="font-size: 2.2rem; font-weight: 800; color: white; line-height: 1.2">${note ? note.title : 'New Note'}</h1>
                        <div style="display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.75rem">
                            <p style="color: var(--text-dim); font-size: 0.8rem;">Owner: <strong style="color: white">${note?.owner_name || 'You'}</strong></p>
                            <p style="color: var(--text-dim); font-size: 0.8rem;">Last Editor: <strong style="color: white">${note?.last_editor_name || 'N/A'}</strong></p>
                            <p style="color: var(--text-dim); font-size: 0.8rem;">Updated: ${new Date(note ? (note.updated_at || note.created_at) : Date.now()).toLocaleString()}</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.75rem">
                        <button id="view-history-btn" class="delete-btn" title="Activity History" style="color: #6366f1; background: rgba(99, 102, 241, 0.05)"><i class="fas fa-history"></i></button>
                        ${note?.is_owner ? `<button id="share-note-btn" class="delete-btn" title="Share Note" style="color: #10b981; background: rgba(16, 185, 129, 0.05)"><i class="fas fa-share-alt"></i></button>` : ''}
                        ${(note?.is_owner || note?.can_edit !== false) ? `<button id="edit-mode-btn" class="delete-btn" title="Edit Note" style="color: var(--primary); background: rgba(99, 102, 241, 0.05)"><i class="fas fa-edit"></i></button>` : ''}
                        ${note?.is_owner ? `<button id="delete-modal-btn" class="delete-btn" title="Delete Note" style="background: rgba(244, 63, 94, 0.05)"><i class="fas fa-trash"></i></button>` : ''}
                        <button onclick="closeModal()" class="delete-btn" title="Close"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                
                <div id="attachments-display" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem">
                    ${(note?.attachments || []).map(url => `
                        <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border); aspect-ratio: 1; background: #000">
                            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="window.open('${url}')">
                        </div>
                    `).join('')}
                </div>

                <div id="history-section" class="hidden" style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--glass-border)">
                    <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--primary);">Activity History</h3>
                    <div id="history-list" style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.8rem; color: var(--text-muted);"></div>
                </div>

                <div style="font-size: 1.25rem; line-height: 2; color: #e2e8f0; white-space: pre-wrap; min-height: 300px; padding: 0.5rem 0">
                    ${note ? note.content : 'No content provided.'}
                </div>
                <div style="margin-top: 3rem; border-top: 1px solid var(--glass-border); padding-top: 1.5rem; display: flex; justify-content: flex-end">
                    <button onclick="closeModal()" class="nav-item-btn" style="width: auto; padding: 0.5rem 1.5rem">Back to Notes</button>
                </div>
            </div>
        `;
        document.getElementById('edit-mode-btn').onclick = () => renderEditView();
        if (note?.is_owner) {
            document.getElementById('delete-modal-btn').onclick = () => deleteNote(noteId);
            document.getElementById('share-note-btn').onclick = () => shareNote(noteId);
        }
        document.getElementById('view-history-btn').onclick = () => toggleHistory(noteId);
    };

    const renderEditView = () => {
        viewContainer.innerHTML = `
            <div style="animation: slideUp 0.4s ease-out">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem">
                    <div style="display: flex; align-items: center; gap: 0.75rem">
                        <div style="width: 10px; height: 10px; background: var(--primary); border-radius: 50%; box-shadow: var(--glow)"></div>
                        <h2 style="font-size: 1rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 2px">Studio Mode</h2>
                    </div>
                    <button onclick="closeModal()" class="delete-btn"><i class="fas fa-times"></i></button>
                </div>
                <input id="note-title-input" class="modal-input" placeholder="title" value="${note ? (note.title || '') : ''}" style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 12px; border: 1px solid var(--glass-border)">
                
                <div style="margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: center;">
                    <select id="note-category-input" class="modal-input" style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.5rem 1rem; width: auto; font-size: 0.85rem; font-weight: 600; color: var(--primary); margin-bottom: 0;">
                        <option value="info" ${note?.category === 'info' ? 'selected' : ''}>General Info</option>
                        <option value="todo" ${note?.category === 'todo' ? 'selected' : ''}>To-Do List</option>
                        <option value="account" ${note?.category === 'account' ? 'selected' : ''}>Accounts</option>
                        <option value="business" ${note?.category === 'business' ? 'selected' : ''}>Business</option>
                        <option value="student" ${note?.category === 'student' ? 'selected' : ''}>Academic</option>
                        <option value="personal" ${note?.category === 'personal' ? 'selected' : ''}>Personal</option>
                        <option value="other" ${note?.category === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                    <div style="flex: 1; display: flex; align-items: center; gap: 0.5rem;">
                        <input type="file" id="note-image-picker" accept="image/*" multiple style="display: none;">
                        <button id="trigger-image-picker" class="delete-btn" style="color: var(--primary); background: rgba(99, 102, 241, 0.05); padding: 0.5rem 1rem; width: auto; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; border-radius: 10px;">
                            <i class="fas fa-plus"></i> Add Files
                        </button>
                        <div id="edit-attachments-preview" style="flex: 1; display: flex; gap: 0.5rem; overflow-x: auto; padding: 4px;">
                            ${(note?.attachments || []).map((url, idx) => `
                                <div style="position: relative; height: 40px; width: 40px; flex-shrink: 0;">
                                    <img src="${url}" style="height: 100%; width: 100%; object-fit: cover; border-radius: 6px;">
                                    <button onclick="removeAttachment(${idx})" style="position: absolute; -10px; top: -10px; background: #f43f5e; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer;"><i class="fas fa-times"></i></button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <textarea id="note-content-input" class="modal-input" placeholder="Any thoughts" style="font-size: 1.2rem; min-height: 400px; line-height: 1.8; resize: none; background: rgba(255,255,255,0.01); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem">${note ? (note.content || '') : ''}</textarea>
                <div style="display: flex; gap: 1rem">
                    <button id="save-note-btn" class="btn-primary" style="flex: 2; padding: 1.25rem">Save Changes</button>
                    ${noteId ? `<button id="cancel-edit-btn" class="btn-primary" style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); box-shadow: none; color: var(--text-muted)">Discard</button>` : ''}
                </div>
            </div>
        `;

        let attachments = note?.attachments ? [...note.attachments] : [];

        window.removeAttachment = (idx) => {
            attachments.splice(idx, 1);
            updateAttachmentPreview();
        };

        const updateAttachmentPreview = () => {
            document.getElementById('edit-attachments-preview').innerHTML = attachments.map((url, idx) => `
                <div style="position: relative; height: 40px; width: 40px; flex-shrink: 0;">
                    <img src="${url}" style="height: 100%; width: 100%; object-fit: cover; border-radius: 6px;">
                    <button onclick="removeAttachment(${idx})" style="position: absolute; right: -5px; top: -5px; background: #f43f5e; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer;"><i class="fas fa-times"></i></button>
                </div>
            `).join('');
        };

        document.getElementById('trigger-image-picker').onclick = () => document.getElementById('note-image-picker').click();
        
        document.getElementById('note-image-picker').onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (file.size > 2 * 1024 * 1024) {
                    showToast(`File ${file.name} too large`, "error");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    attachments.push(event.target.result);
                    updateAttachmentPreview();
                };
                reader.readAsDataURL(file);
            });
            showToast("Files attached", "success");
        };

        if (noteId) document.getElementById('cancel-edit-btn').onclick = () => renderReadView();

        document.getElementById('save-note-btn').onclick = async () => {
            const title = document.getElementById('note-title-input').value.trim();
            const content = document.getElementById('note-content-input').value.trim();
            const category = document.getElementById('note-category-input').value;
            
            if (!title && !content) return;

            // Professional check: Only sync if changes were actually made
            if (note && note.title === title && note.content === content && (note.category || 'info') === category && JSON.stringify(note.attachments || []) === JSON.stringify(attachments)) {
                closeModal();
                return;
            }

            toggleSpinner(true, 'SAVING');
            try {
                const token = await currentUser.getIdToken();
                const method = noteId ? 'PUT' : 'POST';
                const url = noteId ? `${API_BASE_URL}/api/notes/${noteId}` : `${API_BASE_URL}/api/notes`;
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ title, content, category, attachments })
                });
                
                if (res.ok) { 
                    closeModal(); 
                    loadNotes(); 
                    showToast("Changes saved successfully", "success"); 
                } else {
                    const errorText = await res.text();
                    console.error("API Error:", errorText);
                    showToast("Failed to save. Please try again.", "error");
                }
            } catch (err) {
                console.error("Network Error:", err);
                showToast("Network error. Please check your connection.", "error");
            } finally {
                toggleSpinner(false);
            }
        };
    };

    if (noteId) renderReadView();
    else renderEditView();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('note-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function toggleHistory(id) {
    const section = document.getElementById('history-section');
    if (!section.classList.contains('hidden')) {
        section.classList.add('hidden');
        return;
    }

    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await res.json();
        const list = document.getElementById('history-list');
        list.innerHTML = history.length > 0 
            ? history.map(h => `<div><strong style="color: white">${h.user_name}</strong> ${h.action} <span style="opacity: 0.5; font-size: 0.7rem">${new Date(h.created_at).toLocaleString()}</span></div>`).join('')
            : 'No history found.';
        section.classList.remove('hidden');
    } catch (e) {
        showToast("Failed to load history", "error");
    }
}

async function shareNote(id) {
    const email = prompt("Enter the email of the person you want to share this note with:");
    if (!email || !email.includes('@')) return;

    const canEdit = confirm("Do you want to allow this person to EDIT the note?\n\nOK = Yes (Editor)\nCancel = No (View Only)");

    toggleSpinner(true, 'SHARING');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ email, can_edit: canEdit })
        });
        if (res.ok) {
            showToast(`Note shared with ${email} (${canEdit ? 'Editor' : 'Viewer'})`, "success");
        } else {
            const err = await res.json();
            showToast(err.error || "Failed to share note", "error");
        }
    } catch (e) {
        showToast("Network error", "error");
    } finally {
        toggleSpinner(false);
    }
}

async function deleteNote(id) {
    if (!confirm('Permanently delete note?')) return;
    toggleSpinner(true, 'DELETING');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            showToast("Deleted", "success");
            closeModal();
            loadNotes();
        }
    } catch (e) { }
    toggleSpinner(false);
}

document.addEventListener('DOMContentLoaded', initApp);
