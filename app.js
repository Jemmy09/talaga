// Talaga Premium Notes - Shield Core v3.1
// ------------------------------------------

// --- Helper Functions ---
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

// --- State ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
let currentUser = null;
let currentView = null;
let notes = [];
let viewContainer, mainNav;
let authInitialized = false;

// --- App Lifecycle ---
function initApp() {
    console.log("🛡️ Shield Core Initializing...");
    viewContainer = document.getElementById('view-container');
    mainNav = document.getElementById('main-nav');

    // SHOW SPINNER BY DEFAULT
    toggleSpinner(true, 'SECURING SPACE');

    // 1. Handle Google Redirect Result
    auth.getRedirectResult().catch((error) => {
        console.error("Auth Error:", error);
        showToast(error.message, 'error');
    });

    // 2. Monitor Auth State
    auth.onAuthStateChanged(async (user) => {
        console.log("Auth Event:", user ? "USER_FOUND" : "NO_USER");
        authInitialized = true;
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

    // 3. Router
    window.onhashchange = () => {
        if (!authInitialized) return; // Wait for auth
        const view = window.location.hash.replace('#', '') || (currentUser ? 'dashboard' : 'login');
        showView(view);
    };

    // 4. Global Nav Listeners
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => navigate(li.dataset.view);
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = () => {
        toggleSpinner(true, 'SIGNING OUT');
        auth.signOut();
    };

    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) menuToggle.onclick = () => mainNav.classList.toggle('open');
}

async function showView(viewName) {
    if (!viewContainer) return;
    if (currentView === viewName) return;

    // Auth Protection
    if (authInitialized) {
        if (!currentUser && viewName !== 'login' && viewName !== 'register') {
            navigate('login');
            return;
        }
        if (currentUser && (viewName === 'login' || viewName === 'register')) {
            navigate('dashboard');
            return;
        }
    }

    console.log(`📂 Switching to: ${viewName}`);
    currentView = viewName;
    
    viewContainer.classList.remove('view-enter');
    void viewContainer.offsetWidth; 
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
        
        if (viewName !== 'dashboard') {
            setTimeout(() => toggleSpinner(false), 300);
        }
    } catch (error) {
        console.error("Render Error:", error);
        toggleSpinner(false);
    }
}

// --- View Renderers ---

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
        auth.signInWithRedirect(provider);
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
        auth.signInWithRedirect(provider);
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
    document.getElementById('add-note-btn').onclick = () => openNoteModal();
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
    } catch(e) { console.warn("Fetch failed:", e); }
}

async function loadNotes() {
    const list = document.getElementById('notes-list');
    const empty = document.getElementById('empty-state');
    if (!list) return;

    if (notes.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        list.innerHTML = notes.map(n => `
            <div class="note-card">
                <h3>${n.title || 'Untitled'}</h3>
                <p>${(n.content || '').substring(0, 100)}...</p>
            </div>
        `).join('');
    }
}

function openNoteModal() {
    showToast("Editor opening...", "info");
}

function renderProfile() { viewContainer.innerHTML = "<h1>Profile View</h1>"; toggleSpinner(false); }
function renderSettings() { viewContainer.innerHTML = "<h1>Settings View</h1>"; toggleSpinner(false); }
function renderAbout() { viewContainer.innerHTML = "<h1>About View</h1>"; toggleSpinner(false); }
function renderFeedback() { viewContainer.innerHTML = "<h1>Feedback View</h1>"; toggleSpinner(false); }
function renderHelp() { viewContainer.innerHTML = "<h1>Help View</h1>"; toggleSpinner(false); }

// --- Entry Point ---
document.addEventListener('DOMContentLoaded', initApp);
