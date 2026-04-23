// Talaga Premium Notes - Elite Core v3.8 (Enterprise Stability)
// -------------------------------------------------------------

function toggleSpinner(show, text = 'LOADING SPACE') {
    const spinner = document.getElementById('loading-spinner');
    const textEl = document.getElementById('spinner-text');
    if (spinner) {
        spinner.classList.toggle('hidden', !show);
        if (textEl) {
            const upText = text.toUpperCase();
            textEl.innerText = upText;
            
            // Smart Wake-up Feedback for Render Cold Starts
            if (show && (upText.includes('LOADING') || upText.includes('RESTORING') || upText.includes('FETCHING') || upText.includes('AUTHENTICATING'))) {
                setTimeout(() => {
                    if (!spinner.classList.contains('hidden') && textEl.innerText === upText) {
                        textEl.innerText = 'SERVER IS WAKING UP...';
                    }
                }, 6000);
                
                // Absolute Fail-safe: Hide spinner after 12 seconds if no data arrives
                setTimeout(() => {
                    if (!spinner.classList.contains('hidden') && textEl.innerText.includes('WAKING UP')) {
                        spinner.classList.add('hidden');
                        showToast("Connection is slow. Please refresh.", "warning");
                    }
                }, 15000);
            }
        }
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

    // Early background ping to wake up Render server
    fetch(`${API_BASE_URL}/api/ping`).catch(() => {});

    let isInitialLoad = true;
    
    // Always initialize authentication listener
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        const urlParams = new URLSearchParams(window.location.search);
        const sharedToken = urlParams.get('note');

        if (sharedToken && isInitialLoad) {
            // Clean URL and load public note
            window.history.replaceState({}, document.title, window.location.pathname);
            await loadPublicNote(sharedToken);
        } else if (isInitialLoad) {
            // Normal flow: Ensure badge is updated if logged in
            if (currentUser) loadNotifications();
            checkUserStatus();
        }
        
        isInitialLoad = false;
    });

    // --- Global Keyboard Shortcuts (Professional Grade) ---
    window.addEventListener('keydown', (e) => {
        // Alt + N for New Note
        if (e.altKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            if (currentUser) {
                navigate('dashboard');
                openNoteModal();
            }
        }
        // Esc to close Modals
        if (e.key === 'Escape') {
            closeModal();
        }
        // Ctrl + S to Save Note (Professional Workflow)
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            const saveBtn = document.getElementById('save-note-btn');
            if (saveBtn) {
                e.preventDefault();
                saveBtn.click();
            }
        }
    });
}

async function loadPublicNote(token) {
    toggleSpinner(true, 'FETCHING SHARED NOTE');
    try {
        const res = await fetch(`${API_BASE_URL}/api/public/notes/${token}`);
        if (!res.ok) throw new Error("Link expired or private");
        const note = await res.json();
        
        // Add to local notes if not already present, so the modal can find it
        if (!notes.some(n => n.id === note.id)) {
            notes.push(note);
        }
        openNoteModal(note.id);
        
        showToast("Viewing shared note", "info");
    } catch (e) {
        showToast(e.message, "error");
        if (!currentUser) showView('login');
        else navigate('dashboard');
    } finally {
        toggleSpinner(false);
    }
}

async function loadDashboard() {
    toggleSpinner(true, 'LOADING WORKSPACE');
    try {
        await Promise.all([loadNotes(), loadNotifications()]);
    } catch (e) {
        showToast("Session update failed", "error");
    } finally {
        toggleSpinner(false);
    }
}

let notifications = { invites: [], activities: [] };
// Start polling for notifications every 30 seconds
setInterval(() => {
    if (currentUser) loadNotifications();
}, 30000);

async function loadNotifications() {
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        notifications = await res.json();
        updateNotificationBadge();
        if (currentView === 'notifications') renderNotificationsView();
    } catch (e) {
        console.warn("Notification fetch failed");
    }
}

function updateNotificationBadge() {
    const navItem = document.querySelector('[data-view="notifications"]');
    if (!navItem) return;

    let badge = navItem.querySelector('.nav-badge');
    const count = notifications.invites.length + notifications.activities.filter(a => !localStorage.getItem(`read_act_${a.id}`)).length;
    
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.style.cssText = 'background: var(--accent); color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; margin-left: auto; font-weight: 800;';
            navItem.appendChild(badge);
        }
        badge.innerText = count;
    } else if (badge) {
        badge.remove();
    }
}

function renderNotificationsView() {
    if (!viewContainer) return;
    viewContainer.innerHTML = `
        <header class="dashboard-header view-enter">
            <div>
                <h1 style="font-weight: 800; letter-spacing: -1px; margin-bottom: 0.25rem">Notifications</h1>
                <p style="color: var(--text-dim); font-size: 0.95rem;">Hello, ${currentUser?.displayName || 'User'}</p>
                <p style="color: rgba(168, 85, 247, 0.4); font-size: 0.7rem; margin-top: 2px;">Managing updates for: ${currentUser?.email}</p>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button onclick="loadNotifications()" class="btn-primary" style="background: rgba(255,255,255,0.05); color: white; box-shadow: none; border: 1px solid var(--glass-border);" title="Refresh Notifications"><i class="fas fa-sync-alt"></i></button>
            </div>
        </header>

        <div class="view-enter" style="max-width: 900px; margin: 0 auto; padding-bottom: 5rem;">
            <!-- Pending Invitations -->
            <section style="margin-bottom: 3.5rem;">
                <h2 style="font-size: 1.1rem; color: white; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 12px; font-weight: 700;">
                    <i class="fas fa-envelope-open-text" style="color: var(--primary); font-size: 1.25rem"></i> 
                    Pending Invitations
                    ${notifications.invites.length > 0 ? `<span class="nav-badge" style="position: static; padding: 4px 10px; font-size: 0.75rem">${notifications.invites.length}</span>` : ''}
                </h2>
                ${notifications.invites.length === 0 ? `
                    <div style="background: var(--glass-bg); border: 1px dashed var(--glass-border); border-radius: 24px; padding: 4rem 2rem; text-align: center; color: var(--text-dim);">
                        <i class="fas fa-mailbox" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.2"></i>
                        <p>Your inbox is clear! No pending invitations.</p>
                    </div>
                ` : `
                    <div style="display: grid; gap: 1.25rem;">
                        ${notifications.invites.map(inv => `
                            <div class="note-card" style="margin: 0; background: var(--bg-surface); border: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; padding: 1.75rem; box-shadow: var(--shadow-lg);">
                                <div style="display: flex; align-items: center; gap: 1.5rem;">
                                    <div style="width: 48px; height: 48px; background: rgba(99, 102, 241, 0.1); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 1.2rem;">
                                        <i class="fas fa-user-plus"></i>
                                    </div>
                                    <div>
                                        <h3 style="font-size: 1.1rem; color: white; margin-bottom: 0.35rem;">${inv.title}</h3>
                                        <p style="font-size: 0.9rem; color: var(--text-dim);">
                                            <strong style="color: white">${inv.owner_name}</strong> invited you as an <strong style="color: var(--primary)">${inv.can_edit ? 'Editor' : 'Viewer'}</strong>
                                        </p>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.85rem;">
                                    <button onclick="respondToInvite(${inv.id}, 'accept')" class="btn-primary" style="padding: 0.65rem 1.5rem; font-size: 0.9rem;">Accept</button>
                                    <button onclick="respondToInvite(${inv.id}, 'reject')" class="btn-primary" style="padding: 0.65rem 1.5rem; font-size: 0.9rem; background: rgba(244, 63, 94, 0.05); color: var(--accent); box-shadow: none; border: 1px solid rgba(244,63,94,0.1);">Decline</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </section>

            <!-- Activity Logs -->
            <section>
                <h2 style="font-size: 1.1rem; color: white; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 12px; font-weight: 700;">
                    <i class="fas fa-bolt" style="color: var(--secondary); font-size: 1.25rem"></i> 
                    Recent Activity
                </h2>
                ${notifications.activities.length === 0 ? `
                    <div style="background: var(--glass-bg); border: 1px dashed var(--glass-border); border-radius: 24px; padding: 4rem 2rem; text-align: center; color: var(--text-dim);">
                        <i class="fas fa-stream" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.2"></i>
                        <p>No activity recorded on your notes yet.</p>
                    </div>
                ` : `
                    <div style="display: grid; gap: 0.85rem;">
                        ${notifications.activities.map(act => {
                            const isRead = localStorage.getItem(`read_act_${act.id}`);
                            return `
                                <div onclick="markActivityRead('${act.id}')" style="background: ${isRead ? 'rgba(255,255,255,0.01)' : 'rgba(168, 85, 247, 0.03)'}; border: 1px solid ${isRead ? 'var(--glass-border)' : 'rgba(168, 85, 247, 0.15)'}; border-radius: 16px; padding: 1.25rem 1.75rem; display: flex; align-items: center; gap: 1.5rem; cursor: pointer; transition: var(--transition); ${!isRead ? 'box-shadow: 0 4px 20px rgba(168,85,247,0.05);' : ''}">
                                    <div style="width: 44px; height: 44px; background: ${isRead ? 'rgba(255,255,255,0.03)' : 'rgba(168, 85, 247, 0.1)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--secondary); font-size: 1rem;">
                                        <i class="fas fa-edit"></i>
                                    </div>
                                    <div style="flex: 1">
                                        <p style="font-size: 0.95rem; color: ${isRead ? 'var(--text-muted)' : 'white'}; margin-bottom: 0.25rem; line-height: 1.4;">
                                            <strong style="color: var(--secondary)">${act.user_name}</strong> ${act.action} in <strong>"${act.note_title}"</strong>
                                        </p>
                                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-dim);">
                                            <i class="far fa-clock"></i>
                                            <span>${new Date(act.time).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    ${!isRead ? `<div style="width: 10px; height: 10px; background: var(--secondary); border-radius: 50%; box-shadow: 0 0 10px var(--secondary);"></div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </section>
        </div>
    `;
}

function markActivityRead(id) {
    localStorage.setItem(`read_act_${id}`, 'true');
    renderNotificationsView();
    updateNotificationBadge();
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

async function checkUserStatus() {
    if (currentUser) {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        showView(hash);
        loadDashboard(); // Async background load
    } else {
        showView('login');
        toggleSpinner(false);
    }
}

    // Keyboard Shortcuts (Functional & Responsive) - Only add once
    if (!window.shortcutsInitialized) {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.code === 'KeyN') {
                e.preventDefault();
                if (currentUser && currentView !== 'login') openNoteModal();
            }
            if (e.key === 'Escape') {
                closeModal();
            }
        });
        window.shortcutsInitialized = true;
    }

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
            // INSTANT UI RESPONSE: Clear state and go to login
            currentUser = null;
            notes = [];
            if (window.innerWidth <= 768) toggleMenu(true);
            
            auth.signOut().then(() => {
                showView('login');
                toggleSpinner(false);
                showToast('Signed out successfully', 'success');
            }).catch(() => {
                showView('login');
                toggleSpinner(false);
            });
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
            case 'notifications': renderNotificationsView(); break;
            case 'profile': renderProfile(); break;
            case 'settings': renderSettings(); break;
            case 'about': renderAbout(); break;
            case 'feedback': renderFeedback(); break;
            case 'help': renderHelp(); break;
            case 'login': renderLogin(); break;
            default: renderDashboard();
        }
        document.title = "Talaga";
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
    document.getElementById('google-signin').onclick = async () => {
        toggleSpinner(true, 'AUTHENTICATING');
        try {
            await auth.signInWithPopup(provider);
        } catch (e) {
            toggleSpinner(false);
            showToast(e.message, "error");
        }
    };
    toggleSpinner(false);
}

function renderDashboard() {
    if (mainNav) mainNav.classList.remove('hidden');
    if (!viewContainer) return;
    viewContainer.innerHTML = `
        <header class="dashboard-header view-enter">
            <div>
                <h1 style="font-weight: 800; letter-spacing: -1px; margin-bottom: 0.25rem">Digital Workspace</h1>
                <p style="color: var(--text-dim); font-size: 0.95rem;">Hello, ${currentUser?.displayName || 'User'}</p>
                <p style="color: rgba(99, 102, 241, 0.4); font-size: 0.7rem; margin-top: 2px;">Logged in as: ${currentUser?.email}</p>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button onclick="loadDashboard()" class="btn-primary" style="background: rgba(255,255,255,0.05); color: white; box-shadow: none; border: 1px solid var(--glass-border);" title="Refresh Dashboard"><i class="fas fa-sync-alt"></i></button>
                <button onclick="openNoteModal()" class="btn-primary"><i class="fas fa-plus"></i> New Note</button>
            </div>
        </header>
        <div id="notes-list" class="notes-grid view-enter">
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-dim);">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                <p style="font-size: 0.9rem; letter-spacing: 1px;">SYNCING YOUR SANCTUARY...</p>
            </div>
        </div>
        <div id="empty-state" class="hidden" style="text-align:center; padding: 4rem; color: var(--text-dim)"><p>Empty notes</p></div>
    `;
    toggleSpinner(false); // Hide full-screen loader immediately
    loadNotes(); // Start fetching in background
}

function renderProfile() {
    viewContainer.innerHTML = `
        <div class="profile-container view-enter" style="max-width: 600px; margin: 2rem auto; text-align: center;">
            <div style="margin-bottom: 3rem; position: relative; display: inline-block;">
                <img src="${currentUser.photoURL || 'https://ui-avatars.com/api/?name=' + currentUser.displayName}" style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid var(--primary); box-shadow: var(--glow-primary); object-fit: cover;">
                <div style="position: absolute; bottom: 5px; right: 5px; width: 32px; height: 32px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid var(--bg-body); color: white; font-size: 0.8rem;">
                    <i class="fas fa-check-circle"></i>
                </div>
            </div>
            
            <div style="background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 2rem; padding: 3rem 2rem; box-shadow: var(--shadow-xl);">
                <div id="profile-display-area">
                    <h1 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 12px;">
                        ${currentUser.displayName}
                        <button onclick="toggleNameEdit(true)" class="delete-btn" style="color: var(--primary); background: rgba(99, 102, 241, 0.05); width: 36px; height: 36px; border-radius: 10px;" title="Edit Name"><i class="fas fa-edit"></i></button>
                    </h1>
                    <p style="color: var(--text-dim); font-size: 1.1rem; margin-bottom: 2rem;">${currentUser.email}</p>
                </div>
                
                <div id="profile-edit-area" class="hidden">
                    <input type="text" id="new-display-name" value="${currentUser.displayName}" class="modal-input" style="text-align: center; font-size: 1.5rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="updateDisplayName()" class="btn-primary" style="width: auto; padding: 0.75rem 2rem;">Save Name</button>
                        <button onclick="toggleNameEdit(false)" class="btn-primary" style="width: auto; padding: 0.75rem 2rem; background: rgba(255,255,255,0.05); color: white; box-shadow: none; border: 1px solid var(--glass-border);">Cancel</button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--glass-border)">
                    <div style="text-align: center">
                        <h2 style="color: var(--primary); font-size: 2rem; font-weight: 800;">${notes.length}</h2>
                        <p style="font-size: 0.85rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">Notes</p>
                    </div>
                    <div style="text-align: center">
                        <h2 style="color: var(--secondary); font-size: 2rem; font-weight: 800;">${notifications.invites.length}</h2>
                        <p style="font-size: 0.85rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">Invites</p>
                    </div>
                </div>
            </div>
            
            <button onclick="navigate('dashboard')" class="btn-primary" style="margin-top: 2.5rem; background: transparent; box-shadow: none; border: 1px solid var(--glass-border); color: var(--text-dim); width: auto; padding: 0.75rem 2rem;">
                <i class="fas fa-arrow-left" style="margin-right: 8px;"></i> Return to Workspace
            </button>
        </div>
    `;
    toggleSpinner(false);
}

function toggleNameEdit(show) {
    document.getElementById('profile-display-area').classList.toggle('hidden', show);
    document.getElementById('profile-edit-area').classList.toggle('hidden', !show);
}

async function updateDisplayName() {
    const newName = document.getElementById('new-display-name').value.trim();
    if (!newName || newName === currentUser.displayName) {
        toggleNameEdit(false);
        return;
    }

    toggleSpinner(true, 'UPDATING PROFILE');
    try {
        await currentUser.updateProfile({ displayName: newName });
        showToast("Display name updated!", "success");
        renderProfile();
    } catch (e) {
        showToast("Failed to update profile", "error");
    } finally {
        toggleSpinner(false);
    }
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
        <div class="view-enter" style="max-width: 700px; margin: 3rem auto; padding-bottom: 5rem">
            <div style="text-align: center; margin-bottom: 3.5rem">
                <h1 style="font-size: 2.8rem; font-weight: 800; letter-spacing: -1.5px; margin-bottom: 0.75rem">Platform Feedback</h1>
                <p style="color: var(--text-dim); font-size: 1.1rem">Your insights help us craft a better sanctuary for your thoughts.</p>
            </div>
            
            <div style="background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 2.5rem; padding: 3rem; box-shadow: var(--shadow-xl); position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; right: 0; width: 150px; height: 150px; background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent); pointer-events: none;"></div>
                
                <div style="margin-bottom: 2.5rem">
                    <label style="display: block; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--primary); margin-bottom: 1rem;">Describe your experience</label>
                    <textarea id="feedback-text" placeholder="What's on your mind? Suggestions, bugs, or love letters..." 
                        style="width: 100%; min-height: 200px; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--glass-border); border-radius: 1.5rem; color: white; padding: 1.5rem; font-family: inherit; font-size: 1.1rem; line-height: 1.6; resize: vertical; transition: var(--transition); outline: none;"
                        onfocus="this.style.borderColor='var(--primary)'; this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.1)'"
                        onblur="this.style.borderColor='var(--glass-border)'; this.style.boxShadow='none'"></textarea>
                </div>
                
                <div style="display: flex; gap: 1.5rem; align-items: center;">
                    <button id="submit-feedback-btn" class="btn-primary" style="flex: 1; padding: 1.25rem; font-size: 1.1rem; font-weight: 700; border-radius: 1.25rem;">
                        <i class="fas fa-paper-plane" style="margin-right: 10px;"></i> Send Feedback
                    </button>
                </div>
                
                <p style="margin-top: 2rem; font-size: 0.85rem; color: var(--text-muted); text-align: center;">
                    Submitting as <strong style="color: white">${currentUser.displayName}</strong>. 
                    We review all feedback personally.
                </p>
            </div>

            <div style="margin-top: 4rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 1.5rem; padding: 1.5rem; text-align: center;">
                    <i class="fas fa-lightbulb" style="color: #fbbf24; font-size: 1.5rem; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 0.5rem;">Ideas</h4>
                    <p style="font-size: 0.8rem; color: var(--text-dim);">New features or UI improvements.</p>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 1.5rem; padding: 1.5rem; text-align: center;">
                    <i class="fas fa-bug" style="color: #f43f5e; font-size: 1.5rem; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 0.5rem;">Bugs</h4>
                    <p style="font-size: 0.8rem; color: var(--text-dim);">Something not working? Let us know.</p>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 1.5rem; padding: 1.5rem; text-align: center;">
                    <i class="fas fa-heart" style="color: #ec4899; font-size: 1.5rem; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 0.5rem;">Support</h4>
                    <p style="font-size: 0.8rem; color: var(--text-dim);">General questions or assistance.</p>
                </div>
            </div>
        </div>`;

    document.getElementById('submit-feedback-btn').onclick = async () => {
        const text = document.getElementById('feedback-text').value.trim();
        if (!text) {
            showToast("Please enter some feedback first!", "warning");
            return;
        }
        toggleSpinner(true, 'SENDING');
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                showToast("Feedback Received! Thank you.", "success");
                navigate('dashboard');
            }
        } catch (e) {
            showToast("Failed to send feedback", "error");
        }
        toggleSpinner(false);
    };
    toggleSpinner(false);
}

function renderHelp() {
    viewContainer.innerHTML = `
        <div class="help-container" style="animation: slideUp 0.6s ease-out; max-width: 600px; margin: 0 auto">
            <h1 style="text-align: center; margin-bottom: 2rem">Help & Master Shortcuts</h1>
            <div style="background: var(--glass-bg); padding: 2.5rem; border-radius: 2rem; border: 1px solid var(--glass-border); box-shadow: var(--shadow-xl)">
                <h3 style="margin-bottom: 1.5rem; color: var(--primary); letter-spacing: 1px;">KEYBOARD COMMANDS</h3>
                <div style="display: flex; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid var(--glass-border)">
                    <span>Create New Note</span><kbd style="color: var(--primary); font-weight: bold; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">Alt + N</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem">
                    <span>Close Any Modal</span><kbd style="color: var(--primary); font-weight: bold; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">Esc</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 1rem">
                    <span>Save Note (Edit Mode)</span><kbd style="color: var(--primary); font-weight: bold; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">Ctrl + S</kbd>
                </div>
            </div>
            <p style="margin-top: 3rem; color: var(--text-dim); text-align: center; font-size: 0.9rem;">
                Need more help? Reach out via the <strong>Feedback</strong> tool!
            </p>
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
                
                <div id="attachments-display" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem">
                    ${(note?.attachments || []).map((url, idx) => {
                        const isImage = url.startsWith('data:image/');
                        if (isImage) {
                            return `
                                <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border); aspect-ratio: 1; background: #000; position: relative;" class="view-enter">
                                    <img src="${url}" class="lightbox-trigger" style="width: 100%; height: 100%; object-fit: cover; cursor: zoom-in;">
                                </div>
                            `;
                        } else {
                            const fileName = `Document ${idx + 1}`;
                            return `
                                <a href="${url}" download="${fileName}" style="text-decoration: none; border-radius: 12px; border: 1px solid var(--glass-border); aspect-ratio: 1; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-dim); transition: var(--transition);" class="nav-item-btn view-enter">
                                    <i class="fas fa-file-alt" style="font-size: 2rem; color: var(--primary)"></i>
                                    <span style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">Download</span>
                                </a>
                            `;
                        }
                    }).join('')}
                </div>

                ${!note?.is_owner && !note?.can_edit ? `
                    <div style="background: rgba(244, 63, 94, 0.05); border: 1px solid rgba(244, 63, 94, 0.1); padding: 1rem; border-radius: 12px; margin-bottom: 2rem; display: flex; align-items: center; gap: 12px; color: #f43f5e; font-size: 0.9rem; font-weight: 500;">
                        <i class="fas fa-lock" style="font-size: 1.1rem"></i>
                        <span>This note is in <strong>Read-Only Mode</strong>. You do not have permission to edit this document.</span>
                    </div>
                ` : ''}

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

        const editBtn = document.getElementById('edit-mode-btn');
        if (editBtn) editBtn.onclick = () => renderEditView();

        const deleteBtn = document.getElementById('delete-modal-btn');
        if (deleteBtn) deleteBtn.onclick = () => deleteNote(noteId);

        const manageBtn = document.getElementById('manage-note-btn');
        if (manageBtn) manageBtn.onclick = () => openSharingModal(noteId);

        const copyBtn = document.getElementById('copy-quick-link-btn');
        if (copyBtn) {
            copyBtn.onclick = () => {
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

        const historyBtn = document.getElementById('view-history-btn');
        if (historyBtn) historyBtn.onclick = () => toggleHistory(noteId);
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
                    <div style="flex: 1; display: flex; align-items: center; gap: 0.75rem;">
                        <input type="file" id="note-image-picker" multiple style="display: none;">
                        <button id="trigger-image-picker" class="delete-btn" style="color: var(--primary); background: rgba(99, 102, 241, 0.05); padding: 0.6rem 1.2rem; width: auto; font-size: 0.85rem; display: flex; align-items: center; gap: 0.75rem; border-radius: 12px;">
                            <i class="fas fa-paperclip"></i> Attach Files
                        </button>
                        <div id="edit-attachments-preview" style="flex: 1; display: flex; gap: 0.75rem; overflow-x: auto; padding: 5px; scrollbar-width: none;">
                            ${(note?.attachments || []).map((url, idx) => {
                                const isImage = url.startsWith('data:image/');
                                return `
                                    <div style="position: relative; height: 50px; width: 50px; flex-shrink: 0; border-radius: 10px; border: 1px solid var(--glass-border); background: #000; overflow: visible;">
                                        ${isImage ? `<img src="${url}" style="height: 100%; width: 100%; object-fit: cover; border-radius: 8px;">` : `<div style="height: 100%; width: 100%; display: flex; align-items: center; justify-content: center;"><i class="fas fa-file-alt" style="color: var(--primary)"></i></div>`}
                                        <button onclick="window.removeAttachment(${idx})" style="position: absolute; right: -8px; top: -8px; background: #f43f5e; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3); border: 2px solid var(--bg-body);"><i class="fas fa-times"></i></button>
                                    </div>
                                `;
                            }).join('')}
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
            const preview = document.getElementById('edit-attachments-preview');
            preview.innerHTML = attachments.map((url, idx) => {
                const isImage = url.startsWith('data:image/');
                return `
                    <div style="position: relative; height: 50px; width: 50px; flex-shrink: 0; border-radius: 10px; border: 1px solid var(--glass-border); background: #000; overflow: visible;">
                        ${isImage ? `<img src="${url}" style="height: 100%; width: 100%; object-fit: cover; border-radius: 8px;">` : `<div style="height: 100%; width: 100%; display: flex; align-items: center; justify-content: center;"><i class="fas fa-file-alt" style="color: var(--primary)"></i></div>`}
                        <button onclick="window.removeAttachment(${idx})" style="position: absolute; right: -8px; top: -8px; background: #f43f5e; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3); border: 2px solid var(--bg-body);"><i class="fas fa-times"></i></button>
                    </div>
                `;
            }).join('');
        };
        
        updateAttachmentPreview();

        document.getElementById('trigger-image-picker').onclick = () => document.getElementById('note-image-picker').click();
        
        document.getElementById('note-image-picker').onchange = (e) => {
            const files = Array.from(e.target.files);
            let processed = 0;
            files.forEach(file => {
                if (file.size > 5 * 1024 * 1024) {
                    showToast(`File ${file.name} too large (>5MB)`, "error");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    attachments.push(event.target.result);
                    processed++;
                    if (processed === files.length) {
                        updateAttachmentPreview();
                        showToast(`${files.length} Files attached`, "success");
                    }
                };
                reader.readAsDataURL(file);
            });
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
                if (!currentUser) {
                    showToast("Please sign in to save changes", "warning");
                    toggleSpinner(false);
                    return;
                }
                const token = await currentUser.getIdToken();
                const method = 'POST'; // Always use POST for maximum compatibility
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
                    let errorMessage = "Access Denied / Unauthorized";
                    try {
                        const err = await res.json();
                        errorMessage = err.error || errorMessage;
                    } catch (e) {
                        const text = await res.text().catch(() => "");
                        if (text) errorMessage = text.substring(0, 50); 
                    }
                    showToast(errorMessage, "error");
                }
            } catch (err) {
                console.error("Save Error:", err);
                showToast("Network error or permission denied", "error");
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
        if (!currentUser) {
            showToast("Please sign in to view history", "warning");
            return;
        }
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Unauthorized");
        }

        const history = await res.json();
        const list = document.getElementById('history-list');
        list.innerHTML = history.length > 0 
            ? history.map(h => `<div style="padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05)"><strong style="color: white">${h.user_name}</strong> ${h.action} <span style="opacity: 0.5; font-size: 0.7rem; display: block; margin-top: 2px">${new Date(h.created_at).toLocaleString()}</span></div>`).join('')
            : 'No history found.';
        section.classList.remove('hidden');
    } catch (e) {
        showToast(e.message === "Unauthorized" ? "Access denied" : "Failed to load history", "error");
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
            method: 'POST',
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
            loadNotes();
        } else {
            let errorMsg = "Update failed";
            try {
                const err = await res.json();
                errorMsg = err.error || err.message || errorMsg;
            } catch (jsonErr) {
                errorMsg = `Server error (${res.status})`;
            }
            showToast(errorMsg, "error");
        }
    } catch (e) {
        console.error("General Access Error:", e);
        showToast(`Connection failed: ${e.message}`, "error");
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
