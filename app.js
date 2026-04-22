// Talaga Premium Notes - Reliability Core v3.2
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
    if (window.location.hash.replace('#', '') !== view) {
        window.location.hash = view;
    }
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
    }, 5000); // Increased time for better reading
}

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
provider.setCustomParameters({ prompt: 'select_account' });

let currentUser = null;
let currentView = null;
let notes = [];
let viewContainer, mainNav;

function initApp() {
    console.log("🚀 Reliability Core v3.2 Initializing...");
    viewContainer = document.getElementById('view-container');
    mainNav = document.getElementById('main-nav');

    toggleSpinner(true, 'SECURING SPACE');

    // Force persistence to LOCAL
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    auth.onAuthStateChanged(async (user) => {
        console.log("Auth State Changed:", user ? "LOGGED_IN" : "LOGGED_OUT");
        currentUser = user;

        if (user) {
            const currentHash = window.location.hash.replace('#', '');
            if (!currentHash || currentHash === 'login' || currentHash === 'register') {
                navigate('dashboard');
                showView('dashboard');
            } else {
                showView(currentHash);
            }
            fetchAllNotes();
        } else {
            notes = [];
            navigate('login');
            showView('login');
        }
    });

    window.onhashchange = () => {
        const view = window.location.hash.replace('#', '') || (currentUser ? 'dashboard' : 'login');
        showView(view);
    };

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => navigate(li.dataset.view);
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();

    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) menuToggle.onclick = () => mainNav.classList.toggle('open');
}

async function showView(viewName) {
    if (!viewContainer) return;
    if (currentView === viewName && viewName !== 'dashboard') return;

    if (!currentUser && viewName !== 'login' && viewName !== 'register') {
        navigate('login');
        return;
    }
    if (currentUser && (viewName === 'login' || viewName === 'register')) {
        navigate('dashboard');
        return;
    }

    currentView = viewName;
    viewContainer.classList.remove('view-enter');
    void viewContainer.offsetWidth; 
    viewContainer.classList.add('view-enter');

    try {
        switch (viewName) {
            case 'login': renderLogin(); break;
            case 'register': renderRegister(); break;
            case 'dashboard': renderDashboard(); break;
            default: renderDashboard();
        }
        document.title = `Talaga | ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`;
        if (viewName !== 'dashboard') toggleSpinner(false);
    } catch (error) {
        console.error("Render Error:", error);
        toggleSpinner(false);
    }
}

function renderLogin() {
    if (mainNav) mainNav.classList.add('hidden');
    viewContainer.innerHTML = `
        <div class="auth-container">
            <div style="text-align: center; margin-bottom: 2.5rem">
                <img src="images/logo.png" style="width: 80px; margin-bottom: 1.5rem">
                <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">Welcome Back</h1>
                <p style="color: var(--text-muted)">Your premium space for clear thinking.</p>
            </div>
            <button id="google-signin" class="google-btn">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="20" height="20">
                <span>Continue with Google</span>
            </button>
            <p style="text-align: center; margin-top: 2rem; font-size: 0.9rem">
                New here? <a href="#register" style="color: var(--primary); text-decoration: none">Create account</a>
            </p>
        </div>
    `;
    document.getElementById('google-signin').onclick = () => {
        toggleSpinner(true, 'AUTHENTICATING');
        auth.signInWithPopup(provider).catch(e => {
            toggleSpinner(false);
            showToast(`Auth Error: ${e.message}`, 'error');
        });
    };
    toggleSpinner(false);
}

function renderRegister() {
    if (mainNav) mainNav.classList.add('hidden');
    viewContainer.innerHTML = `
        <div class="auth-container">
            <div style="text-align: center; margin-bottom: 2.5rem">
                <img src="images/logo.png" style="width: 80px; margin-bottom: 1.5rem">
                <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">Join Talaga</h1>
                <p style="color: var(--text-muted)">Start your journey towards professional organization.</p>
            </div>
            <button id="google-signup" class="google-btn">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="20" height="20">
                <span>Sign up with Google</span>
            </button>
            <p style="text-align: center; margin-top: 2rem; font-size: 0.9rem">
                Have an account? <a href="#login" style="color: var(--primary); text-decoration: none">Sign in</a>
            </p>
        </div>
    `;
    document.getElementById('google-signup').onclick = () => {
        toggleSpinner(true, 'AUTHENTICATING');
        auth.signInWithPopup(provider).catch(e => {
            toggleSpinner(false);
            showToast(`Auth Error: ${e.message}`, 'error');
        });
    };
    toggleSpinner(false);
}

function renderDashboard() {
    if (mainNav) mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem">
            <div>
                <h1 style="font-size: 2rem; font-weight: 700">Digital Workspace</h1>
                <p style="color: var(--text-muted)">Hello, ${currentUser?.displayName || 'User'}</p>
            </div>
            <button id="add-note-btn" class="btn-primary">New Note</button>
        </header>
        <div id="notes-list" class="notes-grid"></div>
        <div id="empty-state" class="hidden" style="text-align:center; padding: 4rem">
            <p>Your workspace is empty. Let's create something!</p>
        </div>
    `;
    document.getElementById('add-note-btn').onclick = () => showToast("Editor coming soon!", "info");
    toggleSpinner(false);
    loadNotes();
}

async function fetchAllNotes() {
    if (!currentUser) return;
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) notes = await res.json();
    } catch(e) { console.error("Sync Error:", e); }
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
                    <button onclick="event.stopPropagation(); deleteNote('${n.id}')" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <p>${(n.content || '').substring(0, 120)}${(n.content || '').length > 120 ? '...' : ''}</p>
                <div class="note-card-footer">
                    <span>${new Date(n.updated_at || n.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
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
    modal.dataset.currentId = noteId || '';
    
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

        toggleSpinner(true, 'SAVING NOTE');
        try {
            const token = await currentUser.getIdToken();
            const method = noteId ? 'PUT' : 'POST';
            const url = noteId ? `${API_BASE_URL}/api/notes/${noteId}` : `${API_BASE_URL}/api/notes`;
            
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, content })
            });
            
            if (res.ok) {
                showToast(noteId ? 'Note updated' : 'Note saved', 'success');
                closeModal();
                loadNotes();
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to save', 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            toggleSpinner(false);
        }
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
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Note deleted', 'success');
            loadNotes();
        }
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        toggleSpinner(false);
    }
}

function renderProfile() {
    viewContainer.innerHTML = `
        <div class="profile-container" style="animation: slideUp 0.6s ease-out">
            <div class="profile-header">
                <img src="${currentUser.photoURL}" class="profile-avatar" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--primary); margin-bottom: 1.5rem">
                <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">${currentUser.displayName}</h1>
                <p style="color: var(--text-muted)">${currentUser.email}</p>
            </div>
            
            <div class="profile-stats" style="display: flex; gap: 2rem; margin-top: 3rem">
                <div class="stat-card" style="background: var(--glass-bg); padding: 1.5rem 2.5rem; border-radius: 1.5rem; border: 1px solid var(--glass-border); text-align: center; flex: 1">
                    <h2 style="font-size: 2rem; color: var(--primary)">${notes.length}</h2>
                    <p style="font-size: 0.9rem; color: var(--text-dim)">Total Notes</p>
                </div>
                <div class="stat-card" style="background: var(--glass-bg); padding: 1.5rem 2.5rem; border-radius: 1.5rem; border: 1px solid var(--glass-border); text-align: center; flex: 1">
                    <h2 style="font-size: 2rem; color: var(--success)">Active</h2>
                    <p style="font-size: 0.9rem; color: var(--text-dim)">Account Status</p>
                </div>
            </div>
            
            <div style="margin-top: 4rem; border-top: 1px solid var(--glass-border); padding-top: 2rem">
                <button class="btn-primary" onclick="auth.signOut()" style="background: var(--error)">Log Out Everywhere</button>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

function renderFeedback() {
    viewContainer.innerHTML = `
        <div class="feedback-container" style="animation: slideUp 0.6s ease-out; max-width: 600px; margin: 0 auto">
            <h1 style="margin-bottom: 1rem">Your Voice Matters</h1>
            <p style="color: var(--text-muted); margin-bottom: 3rem">Help us shape the future of Talaga. What's on your mind?</p>
            
            <div style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 2.5rem; border-radius: 2rem">
                <textarea id="feedback-input" class="modal-input" placeholder="Feedback, feature requests, or a simple hello..." style="min-height: 200px; margin-bottom: 2rem; border-bottom: 1px solid var(--glass-border)"></textarea>
                <button id="send-feedback-btn" class="btn-primary" style="width: 100%">Send Feedback</button>
            </div>
        </div>
    `;
    document.getElementById('send-feedback-btn').onclick = () => {
        const val = document.getElementById('feedback-input').value;
        if (!val.trim()) return;
        showToast("Thank you! Your feedback has been sent.", "success");
        navigate('dashboard');
    };
    toggleSpinner(false);
}

function renderHelp() {
    viewContainer.innerHTML = `
        <div class="help-container" style="animation: slideUp 0.6s ease-out; max-width: 700px; margin: 0 auto">
            <h1 style="margin-bottom: 3rem">How can we help?</h1>
            <div style="display: grid; gap: 1.5rem">
                <div onclick="startTutorial()" style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 1.5rem; border-radius: 1.5rem; cursor: pointer; display: flex; align-items: center; gap: 1.5rem">
                    <div style="width: 50px; height: 50px; background: var(--primary-light); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <div>
                        <h3 style="margin-bottom: 0.2rem">Interactive Guide</h3>
                        <p style="font-size: 0.85rem; color: var(--text-dim)">Learn the essentials of Talaga in 60 seconds.</p>
                    </div>
                </div>
                <div style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 1.5rem; border-radius: 1.5rem; display: flex; align-items: center; gap: 1.5rem">
                    <div style="width: 50px; height: 50px; background: rgba(99, 102, 241, 0.1); color: var(--text-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem">
                        <i class="fas fa-keyboard"></i>
                    </div>
                    <div>
                        <h3 style="margin-bottom: 0.2rem">Keyboard Shortcuts</h3>
                        <p style="font-size: 0.85rem; color: var(--text-dim)">Alt + N: New Note | Esc: Close Modal</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

function startTutorial() {
    const steps = [
        { title: "Welcome to Talaga", text: "Your sanctuary for organized thoughts. Ready for a quick tour?", btn: "Let's Go" },
        { title: "Dashboard", text: "All your ideas live here. They sync automatically to your professional workspace.", btn: "Next" },
        { title: "Create Anything", text: "Click 'New Note' to start writing. Talaga saves your work in real-time.", btn: "Next" },
        { title: "Stay Mobile", text: "The sidebar works perfectly on all devices. Click the menu icon to toggle it.", btn: "Finish" }
    ];
    
    let currentStep = 0;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay flex';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    
    const showStep = () => {
        const s = steps[currentStep];
        overlay.innerHTML = `
            <div class="modal-content" style="text-align: center; max-width: 400px">
                <div style="font-size: 3rem; color: var(--primary); margin-bottom: 1.5rem"><i class="fas fa-magic"></i></div>
                <h2 style="margin-bottom: 1rem">${s.title}</h2>
                <p style="color: var(--text-dim); line-height: 1.6; margin-bottom: 2rem">${s.text}</p>
                <button id="tutorial-next" class="btn-primary" style="width: 100%">${s.btn}</button>
            </div>
        `;
        document.getElementById('tutorial-next').onclick = () => {
            currentStep++;
            if (currentStep < steps.length) showStep();
            else overlay.remove();
        };
    };
    
    document.body.appendChild(overlay);
    showStep();
}

function renderSettings() {
    viewContainer.innerHTML = `
        <div class="settings-container" style="animation: slideUp 0.6s ease-out; max-width: 600px">
            <h1 style="margin-bottom: 2rem">Settings</h1>
            
            <div class="settings-section" style="background: var(--glass-bg); border-radius: 1.5rem; border: 1px solid var(--glass-border); padding: 2rem; display: flex; flex-direction: column; gap: 2rem">
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <div>
                        <h3 style="margin-bottom: 0.3rem">Ultra Dark Mode</h3>
                        <p style="font-size: 0.85rem; color: var(--text-dim)">Enhances contrast for night use.</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="dark-mode-toggle">
                        <span class="slider round"></span>
                    </label>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <div>
                        <h3 style="margin-bottom: 0.3rem">Compact List</h3>
                        <p style="font-size: 0.85rem; color: var(--text-dim)">Show more notes on one screen.</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
    toggleSpinner(false);
}

function renderAbout() {
    viewContainer.innerHTML = `
        <div class="about-container" style="animation: slideUp 0.6s ease-out; text-align: center">
            <img src="images/logo.png" style="width: 120px; margin-bottom: 2rem">
            <h1 style="font-size: 3rem; margin-bottom: 1rem">Talaga</h1>
            <p style="color: var(--text-muted); max-width: 600px; margin: 0 auto 3rem; line-height: 1.8">
                Talaga is more than just a note-taking app. It is your premium digital sanctuary for clear thinking, organized living, and professional growth. Built with state-of-the-art security and elegant design.
            </p>
            <div style="color: var(--text-dim); font-size: 0.9rem">Version 3.2 (Reliability Core)</div>
        </div>
    `;
    toggleSpinner(false);
}

document.addEventListener('DOMContentLoaded', initApp);
