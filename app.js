// --- Global Error Handling for Debugging ---
window.onerror = function (msg, url, line, col, error) {
    console.error("Global Error:", msg, "at", line, ":", col);
    // alert("Application Error: " + msg);
    return false;
};

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyD3H3gQOsE9sAF6DUW69vytH6-v3fQvhzQ",
    authDomain: "francisco-61572.firebaseapp.com",
    databaseURL: "https://francisco-61572.firebaseio.com",
    projectId: "francisco-61572",
    storageBucket: "francisco-61572.firebasestorage.app",
    messagingSenderId: "852919915425",
    appId: "1:852919915425:web:f5a5be829b170a787e71e0",
    measurementId: "G-KW85CT06B7"
};

// Initialize Firebase (Compat mode)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const analytics = firebase.analytics();
const provider = new firebase.auth.GoogleAuthProvider();

// --- Backend Configuration ---
// Change this to your deployed Aiven backend URL when live
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://talaga-backend.onrender.com';

// --- Application State ---
let currentUser = null;
let currentView = 'login';
let notes = [];

// --- DOM Elements ---
let viewContainer, mainNav, logoutBtn, spinner, menuToggle, modalContainer;

function initApp() {
    console.log("App Initializing...");
    viewContainer = document.getElementById('view-container');
    mainNav = document.getElementById('main-nav');
    logoutBtn = document.getElementById('logout-btn');
    spinner = document.getElementById('loading-spinner');
    menuToggle = document.getElementById('menu-toggle');
    modalContainer = document.getElementById('modal-container');

    if (!viewContainer) {
        console.error("Critical Error: view-container not found!");
        return;
    }

    // Create Toast Container
    const tContainer = document.createElement('div');
    tContainer.id = 'toast-container';
    tContainer.className = 'toast-container';
    document.body.appendChild(tContainer);

    // Auth State Observer
    auth.onAuthStateChanged(async (user) => {
        console.log("Auth State Changed:", user ? "LoggedIn" : "LoggedOut");
        if (user) {
            currentUser = user;
            // Navigate FIRST so login feels instant and responsive
            const currentHash = window.location.hash.replace('#', '') || 'dashboard';
            navigate(currentHash);
            // Then fetch notes in the background (non-blocking)
            fetchAllNotes().catch(e => console.warn("Background note sync:", e.message));
        } else {
            currentUser = null;
            notes = [];
            navigate('login');
        }
    });

    // Hash Router Listener
    window.onhashchange = () => {
        const view = window.location.hash.replace('#', '') || (currentUser ? 'dashboard' : 'login');
        showView(view);
    };

    // Event Listeners
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut().catch(e => showToast(e.message, 'error'));
    if (menuToggle) menuToggle.onclick = () => mainNav.classList.toggle('open');

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => navigate(li.dataset.view);
    });

    // Alt + N shortcut
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            if (currentUser && currentView === 'dashboard') openNoteModal();
        }
    });
}

const navigate = (view) => {
    window.location.hash = view;
};

const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
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
};

async function fetchAllNotes() {
    if (!currentUser) return;
    try {
        const token = await auth.currentUser.getIdToken(true);
        const response = await fetch(`${API_BASE_URL}/api/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.details || errData.error || `Status ${response.status}`;
            // Only show a soft warning, not a scary red error - database may be warming up
            if (errMsg.includes('does not exist')) {
                console.warn("DB warming up - tables not ready yet:", errMsg);
                showToast("Database warming up, please wait a moment...", "info");
            } else {
                showToast(`Sync issue: ${errMsg}`, "error");
            }
            notes = [];
            return;
        }
        notes = await response.json();
    } catch (e) {
        console.error("Global Fetch Error:", e);
        // Don't show error to user here - will show on dashboard if needed
        notes = [];
    }
}

// --- Core Logic ---

const showView = (viewName) => {
    if (!viewContainer) return;

    // Auth Guard
    if (!currentUser && viewName !== 'login' && viewName !== 'register') {
        navigate('login');
        return;
    }

    currentView = viewName;
    toggleSpinner(true);

    // Close mobile menu
    if (mainNav) mainNav.classList.remove('open');

    // Update Nav Active State
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', li.dataset.view === viewName);
    });

    // Prepare container for transition
    viewContainer.classList.remove('view-enter');
    void viewContainer.offsetWidth; // trigger reflow
    viewContainer.classList.add('view-enter');

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
    } catch (error) {
        console.error("Render Error:", error);
        toggleSpinner(false);
    }
};

const toggleSpinner = (show) => {
    if (spinner) spinner.classList.toggle('hidden', !show);
};

// --- View Renderers ---

function renderLogin() {
    mainNav.classList.add('hidden');
    viewContainer.innerHTML = `
            <div class="auth-container">
                <div style="text-align: center; margin-bottom: 2.5rem">
                    <img src="images/logo.png" style="width: 80px; margin-bottom: 1.5rem; filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.4))">
                    <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">Welcome Back</h1>
                    <p style="color: var(--text-muted)">Your premium space for clear thinking.</p>
                </div>
                
                <button id="google-signin" class="google-btn">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="20" height="20" alt="Google">
                    <span>Continue with Google</span>
                </button>
                
                <div style="display: flex; align-items: center; gap: 1rem; margin: 2rem 0; color: var(--text-dim)">
                    <div style="flex:1; height:1px; background: var(--glass-border)"></div>
                    <span style="font-size: 0.85rem">SECURE ACCESS</span>
                    <div style="flex:1; height:1px; background: var(--glass-border)"></div>
                </div>
                
                <p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                    New to Talaga? <a href="#" id="go-to-register" style="color: var(--primary); text-decoration: none; font-weight: 600">Create an account</a>
                </p>
            </div>
        `;

    document.getElementById('google-signin').onclick = () => {
        toggleSpinner(true);
        auth.signInWithRedirect(provider).catch(e => {
            toggleSpinner(false);
            showToast(e.message, 'error');
        });
    };
    document.getElementById('go-to-register').onclick = (e) => { e.preventDefault(); showView('register'); };
    toggleSpinner(false);
}

function renderRegister() {
    mainNav.classList.add('hidden');
    viewContainer.innerHTML = `
            <div class="auth-container">
                <div style="text-align: center; margin-bottom: 2.5rem">
                    <img src="images/logo.png" style="width: 80px; margin-bottom: 1.5rem; filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.4))">
                    <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem">Join Talaga</h1>
                    <p style="color: var(--text-muted)">Start your journey towards professional organization.</p>
                </div>
                
                <button id="google-signup" class="google-btn">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="20" height="20" alt="Google">
                    <span>Sign up with Google</span>
                </button>
                
                <div style="display: flex; align-items: center; gap: 1rem; margin: 2rem 0; color: var(--text-dim)">
                    <div style="flex:1; height:1px; background: var(--glass-border)"></div>
                    <span style="font-size: 0.85rem">EASY SETUP</span>
                    <div style="flex:1; height:1px; background: var(--glass-border)"></div>
                </div>
                
                <p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                    Already have an account? <a href="#" id="go-to-login" style="color: var(--primary); text-decoration: none; font-weight: 600">Sign in</a>
                </p>
            </div>
        `;

    document.getElementById('google-signup').onclick = () => {
        toggleSpinner(true);
        auth.signInWithRedirect(provider).catch(e => {
            toggleSpinner(false);
            showToast(e.message, 'error');
        });
    };
    document.getElementById('go-to-login').onclick = (e) => { e.preventDefault(); showView('login'); };
    toggleSpinner(false);
}

async function renderDashboard() {
    mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
            <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; animation: slideUp 0.6s ease-out">
                <div>
                    <h1 style="font-size: 2rem; font-weight: 700">Digital Workspace</h1>
                    <p style="color: var(--text-muted)">Hello, ${currentUser?.displayName || 'User'}. What's on your mind?</p>
                </div>
                <div style="display: flex; gap: 1rem">
                    <button id="start-tutorial-btn" class="nav-item-btn" style="border: 1px solid var(--glass-border); background: var(--glass-bg)">
                        <i class="fas fa-lightbulb"></i> <span>Guide</span>
                    </button>
                    <button id="add-note-btn" class="btn-primary">
                        <i class="fas fa-plus"></i> New Note
                    </button>
                </div>
            </header>

            <div id="notes-list" class="notes-grid"></div>
            <div id="empty-state" class="hidden" style="text-align:center; padding: 6rem 2rem; color: var(--text-dim); animation: slideUp 0.8s ease-out">
                <div style="font-size: 4rem; margin-bottom: 2rem; opacity: 0.3"><i class="fas fa-feather-pointed"></i></div>
                <h2 style="color: var(--text-muted); margin-bottom: 0.5rem">Your canvas is empty</h2>
                <p>Ready to capture your first idea?</p>
                <button id="get-started-btn" class="btn-primary" style="margin-top: 2rem">Get Started</button>
            </div>
        `;

    document.getElementById('add-note-btn').onclick = () => openNoteModal();
    document.getElementById('start-tutorial-btn').onclick = () => startTutorial();
    const gsBtn = document.getElementById('get-started-btn');
    if (gsBtn) gsBtn.onclick = () => openNoteModal();

    loadNotes();
}

function renderAbout() {
    mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
            <div class="auth-container" style="max-width: 750px; text-align: left; animation: slideUp 0.6s ease">
                <div style="text-align: center; margin-bottom: 3.5rem">
                    <div style="display: inline-block; padding: 1.2rem; background: var(--glass-bg); border-radius: 24px; border: 1px solid var(--glass-border); margin-bottom: 1.5rem; box-shadow: var(--glow)">
                        <img src="images/logo.png" style="width: 90px;">
                    </div>
                    <h1 style="font-size: 2.8rem; letter-spacing: -1px">Truly Your Space.</h1>
                    <p style="color: var(--text-primary); font-weight: 500; font-size: 1.2rem; margin-top: 0.5rem">A humble space for your notes.</p>
                </div>
                
                <section style="margin-bottom: 3.5rem; line-height: 1.9">
                    <h3 style="color: var(--primary); margin-bottom: 1.2rem; font-size: 1.3rem">The Story Behind the Screen 💻</h3>
                    <p style="color: var(--text-muted)">This website is simply a personal project built for taking notes. Nothing more, nothing less. It's a humble space designed to keep thoughts organized without the extra noise. I hope it helps you stay productive!</p>
                </section>

                <div style="background: var(--glass-bg); padding: 2.5rem; border-radius: 30px; border: 1px solid var(--glass-border); display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; backdrop-filter: blur(20px)">
                    <div>
                        <h4 style="margin-bottom: 1rem; color: var(--text-main); font-size: 1.1rem"><i class="fas fa-code" style="margin-right: 0.75rem; color: var(--primary)"></i> Developer</h4>
                        <p style="color: var(--text-muted); font-size: 1.05rem">Jemmy Francisco</p>
                        <p style="color: var(--text-dim); font-size: 0.85rem; margin-top: 0.4rem">Chief Dreamer & Code Architect</p>
                    </div>
                    <div>
                        <h4 style="margin-bottom: 1rem; color: var(--text-main); font-size: 1.1rem"><i class="fas fa-paper-plane" style="margin-right: 0.75rem; color: var(--primary)"></i> Say Hello!</h4>
                        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 0.5rem">
                            <i class="fas fa-envelope-open-text" style="width: 20px; font-size: 0.9rem"></i> <a href="mailto:jemmyfrancisco30@gmail.com" style="color: inherit; text-decoration: none">jemmyfrancisco30@gmail.com</a>
                        </p>
                        <p style="color: var(--text-muted); font-size: 0.95rem">
                            <i class="fab fa-facebook" style="width: 20px; font-size: 0.9rem"></i> <a href="https://facebook.com/jemmy.francisco.98" target="_blank" style="color: inherit; text-decoration: none">Jemmy Francisco</a>
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 3.5rem; text-align: center">
                    <p style="color: var(--text-dim); font-size: 0.9rem; margin-bottom: 1.5rem">"Code is temporary, thoughts are forever." — Someone smart, probably.</p>
                    <button id="about-tutorial-btn" class="btn-primary" style="display: inline-flex; width: auto; justify-content: center">
                        <i class="fas fa-rocket" style="margin-right: 10px"></i> Take the Grand Tour
                    </button>
                </div>
            </div>
        `;
    document.getElementById('about-tutorial-btn').onclick = () => startTutorial();
    toggleSpinner(false);
}

function renderFeedback() {
    mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
            <div class="auth-container" style="max-width: 550px; animation: slideUp 0.6s ease">
                <div style="text-align: center; margin-bottom: 2.5rem">
                    <i class="fas fa-comments" style="font-size: 3rem; color: var(--primary); margin-bottom: 1.5rem"></i>
                    <h1>Share Your Experience</h1>
                    <p style="color: var(--text-muted)">Your feedback helps us refine the Talaga experience.</p>
                </div>
                
                <form id="feedback-form" style="display: flex; flex-direction: column; gap: 1.5rem">
                    <div>
                        <label style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.75rem; display: block; font-weight: 500">MESSAGE</label>
                        <textarea id="feedback-text" placeholder="I suggest adding..." required style="height: 150px; resize: none;"></textarea>
                    </div>
                    <button type="submit" class="btn-primary" style="justify-content: center; width: 100%; padding: 1rem">
                        Send Professional Feedback
                    </button>
                </form>
            </div>
        `;

    document.getElementById('feedback-form').onsubmit = (e) => {
        e.preventDefault();
        const text = document.getElementById('feedback-text').value.trim();
        if (!text) return;
        window.location.href = `mailto:jemmyfrancisco30@gmail.com?subject=Talaga Feedback&body=${encodeURIComponent(text)}`;
        showToast("Opening your email client...", "success");
        setTimeout(() => navigate('dashboard'), 1500);
    };
    toggleSpinner(false);
}

function renderProfile() {
    mainNav.classList.remove('hidden');
    const stats = {
        todo: notes.filter(n => n.category === 'todo').length,
        account: notes.filter(n => n.category === 'account').length,
        info: notes.filter(n => n.category === 'info').length,
        business: notes.filter(n => n.category === 'business').length,
        student: notes.filter(n => n.category === 'student').length
    };

    viewContainer.innerHTML = `
            <div class="auth-container" style="max-width: 600px; animation: slideUp 0.6s ease">
                <div style="text-align: center; margin-bottom: 3rem">
                    <div style="position: relative; display: inline-block">
                        <img id="profile-img" src="${currentUser?.photoURL || 'https://via.placeholder.com/150'}" style="width: 120px; height: 120px; border-radius: 40px; border: 4px solid var(--primary); object-fit: cover; box-shadow: var(--glow); cursor: pointer">
                        <div style="position: absolute; bottom: -10px; right: -10px; background: var(--primary); padding: 8px; border-radius: 50%; cursor: pointer" id="edit-pic-btn">
                            <i class="fas fa-camera"></i>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 1.5rem;">
                        <h1 id="profile-name" style="font-size: 1.8rem; margin: 0;">${currentUser?.displayName || 'Anonymous User'}</h1>
                        <button id="edit-name-btn" style="background: transparent; border: none; color: var(--text-dim); cursor: pointer;"><i class="fas fa-edit"></i></button>
                    </div>
                    <p style="color: var(--text-muted)">${currentUser?.email || ''}</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-top: 2rem">
                    <div style="background: var(--glass-bg); padding: 1.5rem; border-radius: 20px; text-align: center; border: 1px solid var(--glass-border)">
                        <h2 style="font-size: 1.5rem; color: var(--success)">${stats.todo}</h2>
                        <p style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Tasks</p>
                    </div>
                    <div style="background: var(--glass-bg); padding: 1.5rem; border-radius: 20px; text-align: center; border: 1px solid var(--glass-border)">
                        <h2 style="font-size: 1.5rem; color: var(--warning)">${stats.account}</h2>
                        <p style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Accounts</p>
                    </div>
                    <div style="background: var(--glass-bg); padding: 1.5rem; border-radius: 20px; text-align: center; border: 1px solid var(--glass-border)">
                        <h2 style="font-size: 1.5rem; color: var(--primary)">${stats.info}</h2>
                        <p style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Notes</p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem">
                    <div style="background: var(--glass-bg); padding: 1.5rem; border-radius: 20px; text-align: center; border: 1px solid var(--glass-border)">
                        <h2 style="font-size: 1.5rem; color: var(--secondary)">${stats.business}</h2>
                        <p style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Business</p>
                    </div>
                    <div style="background: var(--glass-bg); padding: 1.5rem; border-radius: 20px; text-align: center; border: 1px solid var(--glass-border)">
                        <h2 style="font-size: 1.5rem; color: #3b82f6;">${stats.student}</h2>
                        <p style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Student</p>
                    </div>
                </div>
            </div>
        `;
    toggleSpinner(false);

    document.getElementById('edit-name-btn').onclick = async () => {
        const newName = prompt("Enter new display name:", currentUser?.displayName || '');
        if (newName && newName.trim() !== '') {
            toggleSpinner(true);
            try {
                await currentUser.updateProfile({ displayName: newName.trim() });
                document.getElementById('profile-name').innerText = newName.trim();
                showToast("Profile name updated!", "success");
                navigate('dashboard');
                setTimeout(()=>navigate('profile'), 100);
            } catch (e) {
                showToast(e.message, "error");
            }
            toggleSpinner(false);
        }
    };

    document.getElementById('edit-pic-btn').onclick = async () => {
        const newPic = prompt("Enter new profile picture URL:", currentUser?.photoURL || '');
        if (newPic && newPic.trim() !== '') {
            toggleSpinner(true);
            try {
                await currentUser.updateProfile({ photoURL: newPic.trim() });
                document.getElementById('profile-img').src = newPic.trim();
                showToast("Profile picture updated!", "success");
            } catch (e) {
                showToast(e.message, "error");
            }
            toggleSpinner(false);
        }
    };
}

function renderSettings() {
    mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
            <header style="margin-bottom: 3rem">
                <h1 style="font-size: 2rem; font-weight: 700">Account Settings</h1>
                <p style="color: var(--text-muted)">Personalize your Talaga experience.</p>
            </header>

            <div class="settings-group">
                <h3 style="margin-bottom: 1.5rem; color: var(--primary-light)">Appearance</h3>
                <div class="settings-row">
                    <div>
                        <h4 style="margin-bottom: 0.25rem">Ultra Dark Mode</h4>
                        <p style="font-size: 0.85rem; color: var(--text-dim)">Even deeper blacks for OLED screens.</p>
                    </div>
                    <div id="theme-toggle" class="toggle-switch"></div>
                </div>
                <div class="settings-row">
                    <div>
                        <h4 style="margin-bottom: 0.25rem">Reduced Motion</h4>
                        <p style="font-size: 0.85rem; color: var(--text-dim)">Disable smooth view transitions.</p>
                    </div>
                    <div id="motion-toggle" class="toggle-switch"></div>
                </div>
            </div>

            <div class="settings-group">
                <h3 style="margin-bottom: 1.5rem; color: var(--accent)">Data Management</h3>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem">Be careful, these actions are permanent and cannot be undone.</p>
                <div style="display: flex; gap: 1rem">
                    <button id="export-data" class="nav-item-btn" style="border: 1px solid var(--glass-border); width: auto">
                        <i class="fas fa-download"></i> Export Markdown
                    </button>
                    <button id="clear-data" class="nav-item-btn" style="color: var(--accent); border: 1px solid rgba(244, 63, 94, 0.2); width: auto; margin-right: 1rem;">
                        <i class="fas fa-trash"></i> Wipe All Data
                    </button>
                    <button id="delete-account" class="nav-item-btn" style="color: var(--accent); border: 1px solid rgba(244, 63, 94, 0.2); width: auto;">
                        <i class="fas fa-user-times"></i> Delete Account
                    </button>
                </div>
            </div>
            <div style="margin-top: 2rem; text-align: center;">
                <button id="save-settings" class="btn-primary" style="width: 100%; justify-content: center; padding: 1rem; border-radius: 16px;">
                    <i class="fas fa-save"></i> Save Settings
                </button>
            </div>
        `;

    const isUltraDark = document.body.classList.contains('ultra-dark');
    const isReducedMotion = document.body.classList.contains('reduced-motion');
    
    if (isUltraDark) document.getElementById('theme-toggle').classList.add('active');
    if (isReducedMotion) document.getElementById('motion-toggle').classList.add('active');

    document.getElementById('theme-toggle').onclick = (e) => e.target.classList.toggle('active');
    document.getElementById('motion-toggle').onclick = (e) => e.target.classList.toggle('active');

    document.getElementById('save-settings').onclick = () => {
        const darkActive = document.getElementById('theme-toggle').classList.contains('active');
        const motionActive = document.getElementById('motion-toggle').classList.contains('active');
        
        if (darkActive) document.body.classList.add('ultra-dark');
        else document.body.classList.remove('ultra-dark');
        
        if (motionActive) document.body.classList.add('reduced-motion');
        else document.body.classList.remove('reduced-motion');
        
        showToast("Settings saved successfully!", "success");
    };

    document.getElementById('export-data').onclick = () => {
        if (!notes || notes.length === 0) {
            showToast("No notes to export", "info");
            return;
        }
        let mdContent = "# My Talaga Notes\n\n";
        notes.forEach(note => {
            mdContent += `## ${note.title}\n**Category:** ${note.category}\n`;
            if (note.description) mdContent += `**Description:** ${note.description}\n`;
            if (note.content) mdContent += `\n${note.content}\n`;
            mdContent += "\n---\n\n";
        });
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Talaga_Notes.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Notes exported to Markdown!", "success");
    };

    document.getElementById('clear-data').onclick = async () => {
        if (confirm("Are you sure? This will delete ALL your notes permanently from Aiven.")) {
            toggleSpinner(true);
            try {
                const token = await auth.currentUser.getIdToken(true);
                const response = await fetch(`${API_BASE_URL}/api/notes`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Wipe operation failed');

                await fetchAllNotes();
                showToast("All data cleared from PostgreSQL.", "success");
                navigate('dashboard');
            } catch (e) {
                showToast("Error: " + e.message, "error");
            } finally {
                toggleSpinner(false);
            }
        }
    };

    document.getElementById('delete-account').onclick = async () => {
        if (confirm("Are you sure you want to completely delete your account? This action is permanent and will remove all your data.")) {
            toggleSpinner(true);
            try {
                const token = await auth.currentUser.getIdToken(true);
                await fetch(`${API_BASE_URL}/api/notes`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                await auth.currentUser.delete();
                showToast("Account successfully deleted.", "info");
            } catch (e) {
                if (e.code === 'auth/requires-recent-login') {
                    showToast("Please log out and log back in to verify your identity before deleting your account.", "error");
                } else {
                    showToast("Error: " + e.message, "error");
                }
            } finally {
                toggleSpinner(false);
            }
        }
    };

    toggleSpinner(false);
}

function renderHelp() {
    mainNav.classList.remove('hidden');
    viewContainer.innerHTML = `
            <header style="margin-bottom: 3rem">
                <h1 style="font-size: 2rem; font-weight: 700">Help Center</h1>
                <p style="color: var(--text-muted)">Master the Talaga experience.</p>
            </header>

            <div class="help-grid">
                <div class="help-card">
                    <i class="fas fa-keyboard" style="font-size: 1.5rem; color: var(--primary-light); margin-bottom: 1rem"></i>
                    <h4 style="margin-bottom: 0.5rem">Shortcuts</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted)">Press <kbd style="background:var(--bg-surface); padding: 2px 4px; border-radius: 4px">Alt + N</kbd> to create a new note instantly.</p>
                </div>
                <div class="help-card">
                    <i class="fas fa-shield-alt" style="font-size: 1.5rem; color: var(--success); margin-bottom: 1rem"></i>
                    <h4 style="margin-bottom: 0.5rem">Privacy</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted)">Your notes are encrypted at rest and filtered by your unique ID.</p>
                </div>
                <div class="help-card">
                    <i class="fas fa-cloud" style="font-size: 1.5rem; color: var(--secondary); margin-bottom: 1rem"></i>
                    <h4 style="margin-bottom: 0.5rem">Sync</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted)">Changes sync automatically across all your logged-in devices.</p>
                </div>
            </div>

            <section style="margin-top: 4rem">
                <h3 style="margin-bottom: 2rem">Common Questions</h3>
                <div class="settings-group">
                    <details style="cursor: pointer">
                        <summary style="font-weight: 600; padding: 0.5rem 0">How do I rename a note?</summary>
                        <p style="color: var(--text-muted); margin-top: 1rem; font-size: 0.9rem">Simply click on any note card to open the editor. Change the Title and hit Save. The note will be updated immediately.</p>
                    </details>
                    <hr style="border: none; border-top: 1px solid var(--glass-border); margin: 1rem 0">
                    <details style="cursor: pointer">
                        <summary style="font-weight: 600; padding: 0.5rem 0">Is the description mandatory?</summary>
                        <p style="color: var(--text-muted); margin-top: 1rem; font-size: 0.9rem">No. You can save notes with just a Title. This is great for quick to-do reminders.</p>
                    </details>
                </div>
            </section>
        `;
    toggleSpinner(false);
}

// --- Logic Handlers ---

async function handleFeedbackSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const text = document.getElementById('feedback-text').value.trim();
    if (!text) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const token = await auth.currentUser.getIdToken(true);
        const response = await fetch(`${API_BASE_URL}/api/feedback`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) throw new Error('Failed to send feedback');
        
        showToast("Thank you for your professional feedback!", "success");
        setTimeout(() => navigate('dashboard'), 1500);
    } catch (e) {
        showToast("Error: " + e.message, "error");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function loadNotes() {
    const list = document.getElementById('notes-list');
    if (!list) return;
    list.innerHTML = '';

    try {
        await fetchAllNotes();

        if (notes.length === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
        } else {
            document.getElementById('empty-state').classList.add('hidden');
            notes.forEach(note => {
                const card = document.createElement('div');
                card.className = 'note-card';
                card.innerHTML = `
                        <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem">
                            <span class="note-category-badge badge-${note.category || 'info'}">${note.category || 'info'}</span>
                            <button class="delete-note" data-id="${note.id}" title="Delete" style="background:transparent; border:none; color:var(--text-dim); cursor:pointer">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                        <h3 style="margin-bottom: 0.5rem">${note.title}</h3>
                        ${note.description ? `<p style="color: var(--primary-light); font-size: 0.8rem; font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase;">${note.description}</p>` : ''}
                        ${note.content ? `<p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${note.content}</p>` : ''}
                        <div style="margin-top: auto; padding-top: 1rem; font-size: 0.75rem; color: var(--text-dim); display: flex; justify-content: space-between">
                            <span><i class="fas fa-pen" style="margin-right: 4px"></i> Open</span>
                            <span>${note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Just now'}</span>
                        </div>
                    `;
                card.onclick = () => openNoteModal(note);
                list.appendChild(card);
            });

            document.querySelectorAll('.delete-note').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const noteId = e.target.closest('button').dataset.id;
                    if (confirm("Delete this record permanently from Aiven?")) {
                        toggleSpinner(true);
                        try {
                            const token = await auth.currentUser.getIdToken(true);
                            const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!response.ok) throw new Error('Delete failed');
                            showToast("Note deleted from database", "info");
                            loadNotes();
                        } catch (err) {
                            showToast(err.message, "error");
                        } finally {
                            toggleSpinner(false);
                        }
                    }
                };
            });
        }
    } catch (e) {
        console.error("Load Error:", e);
        showToast("Error loading notes", "error");
    } finally {
        toggleSpinner(false);
    }
}

function openNoteModal(note = null) {
    if (!modalContainer) return;
    modalContainer.classList.remove('hidden');
    const isEdit = !!note;

    modalContainer.classList.add('fullscreen-overlay');
    modalContainer.innerHTML = `
            <div class="auth-container fullscreen-modal" style="margin: 0; max-width: 100%; height: 100vh; border-radius: 0; text-align: left; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem">
                    <h2 style="font-size: 1.8rem">${isEdit ? 'Refine Note' : 'Capture Idea'}</h2>
                    <button onclick="document.getElementById('modal-container').classList.add('hidden'); document.getElementById('modal-container').classList.remove('fullscreen-overlay');" style="background:transparent; border:none; color:white; font-size: 1.5rem; cursor:pointer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="margin-bottom: 1.5rem">
                    <label style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; display: block">Title</label>
                    <input type="text" id="note-title" placeholder="Give your note a name..." value="${note?.title || ''}" autofocus>
                </div>

                <div style="margin-bottom: 1.5rem">
                    <label style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; display: block">Category</label>
                    <select id="note-category">
                        <option value="info" ${note?.category === 'info' ? 'selected' : ''}>Information</option>
                        <option value="todo" ${note?.category === 'todo' ? 'selected' : ''}>To-Do</option>
                        <option value="account" ${note?.category === 'account' ? 'selected' : ''}>Account</option>
                        <option value="business" ${note?.category === 'business' ? 'selected' : ''}>Business</option>
                        <option value="student" ${note?.category === 'student' ? 'selected' : ''}>Student</option>
                        <option value="personal" ${note?.category === 'personal' ? 'selected' : ''}>Personal</option>
                        <option value="other" ${note?.category === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem">
                    <label style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; display: block">Brief Purpose (Description)</label>
                    <input type="text" id="note-description" placeholder="E.g., Final Exam Prep, Client Meeting..." value="${note?.description || ''}">
                </div>

                <div style="margin-bottom: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                    <label style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; display: block">Main Content (Optional)</label>
                    <textarea id="note-content" placeholder="Jot down your thoughts here..." style="flex: 1; min-height: 200px; resize: none;">${note?.content || ''}</textarea>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 2rem">
                    <button id="save-note" class="btn-primary" style="flex: 2; height: 55px; border-radius: 16px; font-size: 1.1rem">
                        ${isEdit ? 'Update Changes' : 'Save Note'}
                    </button>
                    <button id="close-modal" class="nav-item-btn" style="flex: 1; border: 1px solid var(--glass-border); justify-content: center; height: 55px; border-radius: 16px">
                        Cancel
                    </button>
                </div>
            </div>
        `;

    document.getElementById('close-modal').onclick = () => { modalContainer.classList.add('hidden'); modalContainer.classList.remove('fullscreen-overlay'); };
    document.getElementById('save-note').onclick = async (e) => {
        const btn = e.target.closest('button');
        const title = document.getElementById('note-title').value.trim();
        const description = document.getElementById('note-description').value.trim();
        const content = document.getElementById('note-content').value.trim();
        const category = document.getElementById('note-category').value;

        if (!title) {
            showToast("A title is required to save your note.", "error");
            document.getElementById('note-title').focus();
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true;

        try {
            const token = await auth.currentUser.getIdToken(true);
            let response;

            if (isEdit) {
                response = await fetch(`${API_BASE_URL}/api/notes/${note.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, description, content, category })
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/notes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, description, content, category })
                });
            }

            if (!response.ok) throw new Error('Server returned an error');

            showToast(isEdit ? "Note updated in Aiven" : "Note saved to Aiven", "success");
            modalContainer.classList.add('hidden');
            modalContainer.classList.remove('fullscreen-overlay');
            loadNotes();
        } catch (e) {
            showToast("Sync Error: " + e.message, "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };
}

function startTutorial() {
    const steps = [
        { title: "Welcome to Talaga", content: "Your premium space for capturing ideas, managing to-dos, and securing accounts.", icon: "star" },
        { title: "Create Instantly", content: "Use the 'New Note' button or press Alt + N anywhere in the app to capture a thought.", icon: "plus-circle" },
        { title: "Organize with Styles", content: "Categorize your notes as Information, Tasks, or Accounts for better mental clarity.", icon: "tags" },
        { title: "Secure & Sync", content: "Your data is secured by Firebase and synced across all your devices in real-time.", icon: "cloud-upload-alt" }
    ];

    let currentStep = 0;
    const updateModal = () => {
        const step = steps[currentStep];
        modalContainer.classList.remove('fullscreen-overlay');
        modalContainer.innerHTML = `
                <div class="auth-container" style="max-width: 500px; text-align: center; animation: slideUp 0.4s ease">
                    <i class="fas fa-${step.icon}" style="font-size: 3.5rem; color: var(--primary); margin-bottom: 2rem"></i>
                    <h2 style="margin-bottom: 1rem">${step.title}</h2>
                    <p style="color: var(--text-muted); line-height: 1.6; margin-bottom: 2.5rem">${step.content}</p>
                    <div style="display: flex; gap: 1rem">
                        ${currentStep > 0 ? `<button id="prev-step" class="nav-item-btn" style="flex: 1; border: 1px solid var(--glass-border); justify-content: center">Back</button>` : ''}
                        <button id="next-step" class="btn-primary" style="flex: 2">${currentStep === steps.length - 1 ? 'Start Organizing' : 'Continue'}</button>
                    </div>
                    <div style="margin-top: 2rem; display: flex; justify-content: center; gap: 0.5rem">
                        ${steps.map((_, i) => `<div style="width: 8px; height: 8px; border-radius: 50%; background: ${i === currentStep ? 'var(--primary)' : 'var(--glass-border)'}"></div>`).join('')}
                    </div>
                </div>
            `;

        const nextBtn = document.getElementById('next-step');
        if (nextBtn) nextBtn.onclick = () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                updateModal();
            } else {
                modalContainer.classList.add('hidden');
                showToast("You're all set! Enjoy Talaga.", "success");
            }
        };

        const prevBtn = document.getElementById('prev-step');
        if (prevBtn) prevBtn.onclick = () => {
            currentStep--;
            updateModal();
        };
    };

    modalContainer.classList.remove('hidden');
    updateModal();
}

// Start the app when window loads
window.addEventListener('DOMContentLoaded', initApp);
