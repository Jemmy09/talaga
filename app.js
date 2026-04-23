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
    // Handle shared note links
    const urlParams = new URLSearchParams(window.location.search);
    const sharedToken = urlParams.get('note');
    if (sharedToken) {
        // Clear query param without refreshing to keep URL clean
        window.history.replaceState({}, document.title, window.location.pathname);
        loadPublicNote(sharedToken);
    } else {
        checkUserStatus();
    }
}

async function loadPublicNote(token) {
    toggleSpinner(true, 'FETCHING SHARED NOTE');
    try {
        const res = await fetch(`${API_BASE_URL}/api/public/notes/${token}`);
        if (!res.ok) throw new Error("Link expired or private");
        const note = await res.json();
        
        // Temporarily put note in global array for modal to find it
        notes = [note]; 
        openNoteModal(note.id);
        
        showToast("Viewing shared note", "info");
    } catch (e) {
        showToast(e.message, "error");
        checkUserStatus();
    } finally {
        toggleSpinner(false);
    }
}

async function loadDashboard() {
    toggleSpinner(true, 'LOADING WORKSPACE');
    try {
        await Promise.all([loadNotes(), loadInvitations()]);
    } catch (e) {
        showToast("Session update failed", "error");
    } finally {
        toggleSpinner(false);
    }
}

// Start polling for invitations every 30 seconds
setInterval(() => {
    if (currentUser && currentView === 'dashboard') loadInvitations();
}, 30000);

let invitations = [];
async function loadInvitations() {
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/invitations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        invitations = await res.json();
        updateInvitationBadge();
        renderInvitations();
    } catch (e) {
        console.warn("Invitation fetch failed");
    }
}

function updateInvitationBadge() {
    const navItem = document.querySelector('[onclick="navigate(\'dashboard\')"]');
    if (!navItem) return;

    let badge = navItem.querySelector('.nav-badge');
    if (invitations.length > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.style.cssText = 'background: var(--accent); color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; margin-left: auto; font-weight: 800;';
            navItem.appendChild(badge);
        }
        badge.innerText = invitations.length;
    } else if (badge) {
        badge.remove();
    }
}

function renderInvitations() {
    const container = document.getElementById('invitations-container');
    if (!container) return;

    if (invitations.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.classList.remove('hidden');
    container.innerHTML = `
        <div style="background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 20px; padding: 2rem; margin-bottom: 2.5rem; animation: slideDown 0.5s ease-out;">
            <h2 style="margin-bottom: 1.5rem; font-size: 1.25rem; color: white; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-envelope-open-text" style="color: var(--primary);"></i> 
                Pending Invitations
                <span style="background: var(--primary); color: white; font-size: 0.75rem; padding: 2px 8px; border-radius: 20px;">${invitations.length}</span>
            </h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
                ${invitations.map(inv => `
                    <div class="note-card" style="background: var(--glass-bg); border: 1px solid var(--glass-border); margin: 0; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <h3 style="font-size: 1.1rem; color: white;">${inv.title}</h3>
                            <span style="padding: 4px 10px; background: rgba(99, 102, 241, 0.1); color: var(--primary); border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">Invite</span>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 1.5rem; line-height: 1.5;">
                            <strong style="color: white">${inv.owner_name}</strong> invited you to collaborate as an <strong style="color: var(--primary)">${inv.can_edit ? 'Editor' : 'Viewer'}</strong>.
                        </p>
                        <div style="display: flex; gap: 0.75rem;">
                            <button onclick="respondToInvite(${inv.id}, 'accept')" class="btn-primary" style="flex: 2; padding: 0.6rem; font-size: 0.85rem;">Accept</button>
                            <button onclick="respondToInvite(${inv.id}, 'reject')" class="btn-primary" style="flex: 1; padding: 0.6rem; font-size: 0.85rem; background: rgba(244, 63, 94, 0.1); color: #f43f5e; box-shadow: none; border: 1px solid rgba(244,63,94,0.1);">Decline</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function respondToInvite(id, action) {
    toggleSpinner(true, action === 'accept' ? 'ACCEPTING' : 'DECLINING');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/invitations/${id}/${action}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast(action === 'accept' ? "Invitation accepted!" : "Invitation declined", "success");
            loadDashboard();
        }
    } catch (e) {
        showToast("Action failed", "error");
    } finally {
        toggleSpinner(false);
    }
}

function checkUserStatus() {
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
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1">
                        <h3>${n.title || 'Untitled'}</h3>
                        ${!n.is_owner ? '<i class="fas fa-user-friends" style="color: var(--primary); font-size: 0.8rem;" title="Shared with you"></i>' : ''}
                        <i class="fas ${n.sharing_config?.access_type === 'public' ? 'fa-globe' : 'fa-lock'}" style="color: ${n.sharing_config?.access_type === 'public' ? '#10b981' : 'var(--text-dim)'}; font-size: 0.75rem" title="${n.sharing_config?.access_type === 'public' ? 'Publicly shared' : 'Private'}"></i>
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
                        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.1); color: var(--primary); border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${note?.category || 'General Note'}</span>
                            <span style="display: inline-block; padding: 4px 12px; background: ${note?.sharing_config?.access_type === 'public' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)'}; color: ${note?.sharing_config?.access_type === 'public' ? '#10b981' : 'var(--text-dim)'}; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; border: 1px solid ${note?.sharing_config?.access_type === 'public' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'};">
                                <i class="fas ${note?.sharing_config?.access_type === 'public' ? 'fa-globe' : 'fa-lock'}" style="margin-right: 4px"></i>
                                ${note?.sharing_config?.access_type === 'public' ? 'Public' : 'Private'}
                            </span>
                            ${!note?.is_owner ? `
                                <span style="display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Shared Note</span>
                                ${!note?.can_edit ? '<span style="display: inline-block; padding: 4px 12px; background: rgba(244, 63, 94, 0.1); color: #f43f5e; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Viewer Only</span>' : ''}
                            ` : ''}
                        </div>
                        <h1 style="font-size: 2.2rem; font-weight: 800; color: white; line-height: 1.2">${note ? note.title : 'New Note'}</h1>
                        <div style="display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.75rem">
                            <p style="color: var(--text-dim); font-size: 0.8rem;">Owner: <strong style="color: white">${note?.owner_name || 'You'}</strong></p>
                            ${note?.last_editor_name ? `<p style="color: var(--text-dim); font-size: 0.8rem;">Last Editor: <strong style="color: white">${note.last_editor_name}</strong></p>` : ''}
                            <p style="color: var(--text-dim); font-size: 0.8rem;">Updated: ${new Date(note ? (note.updated_at || note.created_at) : Date.now()).toLocaleString()}</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.75rem">
                        <button id="view-history-btn" class="delete-btn" title="Activity History" style="color: #6366f1; background: rgba(99, 102, 241, 0.05)"><i class="fas fa-history"></i></button>
                        ${note?.is_owner ? `
                            <button id="copy-quick-link-btn" class="delete-btn" title="Copy Share Link" style="color: #10b981; background: rgba(16, 185, 129, 0.05)"><i class="fas fa-link"></i></button>
                            <button id="manage-note-btn" class="delete-btn" title="Manage Note" style="color: var(--secondary); background: rgba(168, 85, 247, 0.05)"><i class="fas fa-user-cog"></i></button>
                        ` : ''}
                        ${(note?.is_owner || note?.can_edit) ? `<button id="edit-mode-btn" class="delete-btn" title="Edit Note" style="color: var(--primary); background: rgba(99, 102, 241, 0.05)"><i class="fas fa-edit"></i></button>` : ''}
                        ${note?.is_owner ? `<button id="delete-modal-btn" class="delete-btn" title="Delete Note" style="background: rgba(244, 63, 94, 0.05)"><i class="fas fa-trash"></i></button>` : ''}
                        <button onclick="closeModal()" class="delete-btn" title="Close"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                
                <div id="attachments-display" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem">
                    ${(note?.attachments || []).map(url => `
                        <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border); aspect-ratio: 1; background: #000">
                            <img src="${url}" class="lightbox-trigger" style="width: 100%; height: 100%; object-fit: cover; cursor: zoom-in;">
                        </div>
                    `).join('')}
                </div>

                <div id="history-section" class="hidden" style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--glass-border)">
                    <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--primary);">Activity History</h3>
                    <div id="history-list" style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.8rem; color: var(--text-muted);"></div>
                </div>

                <div class="note-content-display" style="font-size: 1.1rem; line-height: 1.8; color: #e2e8f0; min-height: 300px; padding: 0.5rem 0">
                    ${note ? note.content : 'No content provided.'}
                </div>
                <div style="margin-top: 3rem; border-top: 1px solid var(--glass-border); padding-top: 1.5rem; display: flex; justify-content: flex-end">
                    <button onclick="closeModal()" class="nav-item-btn" style="width: auto; padding: 0.5rem 1.5rem">Back to Notes</button>
                </div>
            </div>
        `;
        
        // Add lightbox behavior to all images in the display
        document.querySelectorAll('.lightbox-trigger, .note-content-display img').forEach(img => {
            img.style.cursor = 'zoom-in';
            img.onclick = () => openLightbox(img.src);
        });

        document.getElementById('edit-mode-btn').onclick = () => renderEditView();
        if (note?.is_owner) {
            document.getElementById('delete-modal-btn').onclick = () => deleteNote(noteId);
            document.getElementById('manage-note-btn').onclick = () => openSharingModal(noteId);
            document.getElementById('copy-quick-link-btn').onclick = () => {
                const config = note.sharing_config || { share_token: null };
                if (!config.share_token || config.access_type === 'restricted') {
                    showToast("Change access to 'Public' in Manage Note first", "warning");
                    openSharingModal(noteId);
                    return;
                }
                const link = `${window.location.origin}${window.location.pathname}?note=${config.share_token}`;
                navigator.clipboard.writeText(link).then(() => showToast("Link copied!", "success"));
            };
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

                <div id="editor-container" style="height: 400px; background: rgba(255,255,255,0.01); color: white; border: 1px solid var(--glass-border); border-radius: 12px; margin-bottom: 1.5rem"></div>
                
                <div style="display: flex; gap: 1rem">
                    <button id="save-note-btn" class="btn-primary" style="flex: 2; padding: 1.25rem">Save Changes</button>
                    ${noteId ? `<button id="cancel-edit-btn" class="btn-primary" style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); box-shadow: none; color: var(--text-muted)">Discard</button>` : ''}
                </div>
            </div>
        `;

        // Initialize Quill with Document-like features
        const quill = new Quill('#editor-container', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                ]
            },
            placeholder: 'Write your thoughts like a document...'
        });

        // Load existing content
        if (note?.content) {
            quill.root.innerHTML = note.content;
        }

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
            const content = quill.root.innerHTML; // Get Rich Text HTML
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

async function openSharingModal(id) {
    const note = notes.find(n => n.id == id);
    if (!note) return;

    const modal = document.getElementById('note-modal');
    const viewContainer = modal.querySelector('.modal-content');
    
    toggleSpinner(true, 'LOADING ACCESS');
    let collaborators = [];
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}/collaborators`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        collaborators = await res.json();
    } catch (e) {}
    toggleSpinner(false);

    const renderSharingView = () => {
        const config = note.sharing_config || { access_type: 'restricted', public_role: 'viewer', share_token: null };
        const shareLink = `${window.location.origin}${window.location.pathname}?note=${config.share_token}`;

        viewContainer.innerHTML = `
            <div style="animation: slideUp 0.4s ease-out">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem">
                    <h2 style="font-size: 1.5rem; font-weight: 800; color: white">Share "${note.title}"</h2>
                    <button onclick="openNoteModal('${id}')" class="delete-btn"><i class="fas fa-times"></i></button>
                </div>

                <div style="margin-bottom: 2rem">
                    <h3 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px">Add people</h3>
                    <div style="display: flex; gap: 0.75rem">
                        <input id="share-email-input" class="modal-input" placeholder="Enter email address" style="flex: 1; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.85rem 1rem;">
                        <select id="share-role-input" style="width: auto; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 12px; color: white; padding: 0 1rem;">
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                        </select>
                        <button id="confirm-share-btn" class="btn-primary" style="padding: 0 1.5rem">Invite</button>
                    </div>
                </div>

                <div style="margin-bottom: 2rem">
                    <h3 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px">People with access</h3>
                    <div id="collaborators-list" style="display: flex; flex-direction: column; gap: 1rem">
                        <div style="display: flex; justify-content: space-between; align-items: center">
                            <div style="display: flex; align-items: center; gap: 0.75rem">
                                <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white">${note.owner_name ? note.owner_name[0].toUpperCase() : 'Y'}</div>
                                <div>
                                    <div style="font-weight: 600; color: white">${note.owner_name || 'You'} (Owner)</div>
                                    <div style="font-size: 0.75rem; color: var(--text-dim)">Creator of this note</div>
                                </div>
                            </div>
                        </div>
                        ${collaborators.map(c => `
                            <div style="display: flex; justify-content: space-between; align-items: center">
                                <div style="display: flex; align-items: center; gap: 0.75rem">
                                    <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white">${c.user_email[0].toUpperCase()}</div>
                                    <div>
                                        <div style="font-weight: 600; color: white">${c.user_email}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-dim)">
                                            ${c.status === 'pending' ? '<span style="color: var(--warning)">Invite Pending</span>' : (c.can_edit ? 'Editor' : 'Viewer')}
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem">
                                    ${c.status !== 'pending' ? `<button onclick="updateCollaboratorRole('${id}', '${c.user_email}', ${!c.can_edit})" class="delete-btn" style="color: var(--primary)" title="Change Role"><i class="fas fa-sync-alt"></i></button>` : ''}
                                    <button onclick="removeCollaborator('${id}', '${c.user_email}')" class="delete-btn" style="color: var(--accent)" title="Remove Access"><i class="fas fa-user-minus"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="border-top: 1px solid var(--glass-border); padding-top: 1.5rem; margin-top: 2rem">
                    <h3 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px">General access</h3>
                    <div style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: 16px; border: 1px solid var(--glass-border)">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem">
                            <div style="display: flex; align-items: center; gap: 1rem">
                                <div style="width: 40px; height: 40px; background: ${config.access_type === 'public' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${config.access_type === 'public' ? '#10b981' : '#f43f5e'}">
                                    <i class="fas ${config.access_type === 'public' ? 'fa-globe' : 'fa-lock'}"></i>
                                </div>
                                <div>
                                    <select id="general-access-select" style="background: transparent; border: none; color: white; font-weight: 600; font-size: 0.9rem; padding: 0; width: auto; cursor: pointer;">
                                        <option value="restricted" ${config.access_type === 'restricted' ? 'selected' : ''}>Restricted</option>
                                        <option value="public" ${config.access_type === 'public' ? 'selected' : ''}>Anyone with the link</option>
                                    </select>
                                    <div style="font-size: 0.75rem; color: var(--text-dim)">
                                        ${config.access_type === 'public' ? 'Anyone with this link can access' : 'Only people invited can access'}
                                    </div>
                                </div>
                            </div>
                            ${config.access_type === 'public' ? `
                                <select id="public-role-select" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: white; padding: 0.4rem 0.6rem; font-size: 0.8rem">
                                    <option value="viewer" ${config.public_role === 'viewer' ? 'selected' : ''}>Viewer</option>
                                    <option value="editor" ${config.public_role === 'editor' ? 'selected' : ''}>Editor</option>
                                </select>
                            ` : ''}
                        </div>
                        <button id="save-access-btn" class="btn-primary" style="width: 100%; padding: 0.6rem; font-size: 0.85rem; background: var(--primary-dark); border-radius: 8px;">Save Access Settings</button>
                    </div>
                </div>

                <div style="margin-top: 2rem; display: flex; justify-content: space-between; align-items: center">
                    <button id="copy-link-btn" class="btn-primary" style="background: rgba(255,255,255,0.05); color: var(--primary); border: 1px solid var(--glass-border); box-shadow: none">
                        <i class="fas fa-link"></i> Copy Link
                    </button>
                    <button onclick="openNoteModal('${id}')" class="btn-primary" style="padding: 0.75rem 2rem">Done</button>
                </div>
            </div>
        `;

        document.getElementById('confirm-share-btn').onclick = () => {
            const email = document.getElementById('share-email-input').value.trim();
            const canEdit = document.getElementById('share-role-input').value === 'editor';
            if (email) shareWithUser(id, email, canEdit);
        };

        document.getElementById('save-access-btn').onclick = () => {
            const accessType = document.getElementById('general-access-select').value;
            const publicRole = document.getElementById('public-role-select')?.value || config.public_role;
            updateGeneralAccess(id, accessType, publicRole);
        };

        document.getElementById('general-access-select').onchange = (e) => {
            // Re-render immediately to show/hide public-role-select
            config.access_type = e.target.value;
            renderSharingView();
        };

        document.getElementById('copy-link-btn').onclick = () => {
            if (config.access_type === 'restricted') {
                showToast("Link is restricted. Change to 'Public' to share.", "warning");
            }
            navigator.clipboard.writeText(shareLink).then(() => {
                showToast("Link copied to clipboard", "success");
            });
        };
    };

    renderSharingView();
}

async function shareWithUser(id, email, canEdit) {
    toggleSpinner(true, 'SHARING');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ email, can_edit: canEdit })
        });
        if (res.ok) {
            showToast(`Invited ${email}`, "success");
            openSharingModal(id); // Refresh
        } else {
            const err = await res.json();
            showToast(err.error || "Failed", "error");
        }
    } catch (e) { showToast("Error", "error"); }
    finally { toggleSpinner(false); }
}

async function updateGeneralAccess(id, access_type, public_role) {
    toggleSpinner(true, 'UPDATING ACCESS');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}/access`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ access_type, public_role })
        });
        
        if (res.ok) {
            const newConfig = await res.json();
            const noteIdx = notes.findIndex(n => n.id == id);
            if (noteIdx !== -1) {
                notes[noteIdx].sharing_config = newConfig;
            }
            showToast("Access settings saved", "success");
            openSharingModal(id);
            renderNotes();
        } else {
            const err = await res.json();
            showToast(err.error || "Update failed", "error");
        }
    } catch (e) {
        console.error("General Access Error:", e);
        showToast("Network Error: Could not reach server", "error");
    } finally {
        toggleSpinner(false);
    }
}

async function updateCollaboratorRole(id, email, canEdit) {
    // Re-use shareWithUser as it handles update (ON CONFLICT DO UPDATE)
    shareWithUser(id, email, canEdit);
}

async function removeCollaborator(id, email) {
    if (!confirm(`Remove ${email}?`)) return;
    toggleSpinner(true, 'REMOVING');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}/collaborators/${email}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Removed", "success");
            openSharingModal(id);
        }
    } catch (e) {}
    finally { toggleSpinner(false); }
}

function openLightbox(src) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 10000; display: flex;
        align-items: center; justify-content: center; cursor: zoom-out;
        animation: fadeIn 0.3s ease;
    `;
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 12px; box-shadow: 0 0 50px rgba(0,0,0,0.5);';
    
    overlay.onclick = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };
    
    overlay.appendChild(img);
    document.body.appendChild(overlay);
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
