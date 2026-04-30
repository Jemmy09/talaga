<p align="center">
  <img src="images/logo.png" width="120" alt="Talaga Logo">
</p>

<h1 align="center">Talaga</h1>
<p align="center"><em>A simple, sincere space for your thoughts.</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-10b981?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Frontend-GitHub%20Pages-181717?style=for-the-badge&logo=github" alt="GitHub Pages">
  <img src="https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render" alt="Render">
  <img src="https://img.shields.io/badge/Database-Aiven%20PostgreSQL-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Auth-Firebase-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase">
</p>

---

> *"Your brain is for having ideas, not for storing them. Talaga handles the storage, so you can handle the work."* 🧠

**Talaga** (Tagalog for *"Truly"* or *"Really"*) is a personal full-stack note-taking web application built with care and simplicity in mind. It is not the biggest app in the world — but it is honest, clean, and genuinely useful. Built by one person, for everyone.

---

## 🌐 Live Application

| Service | URL |
|---|---|
| **Frontend (Web App)** | [https://talaga.qzz.io](https://talaga.qzz.io) |
| **Backend API** | [https://talaga-backend-4o1y.onrender.com](https://talaga-backend-4o1y.onrender.com) |
| **API Health Check** | [https://talaga-backend-4o1y.onrender.com/api/ping](https://talaga-backend-4o1y.onrender.com/api/ping) |

---

## ✨ Features

- 🔐 **Secure Google Login** — One-tap sign-in via Firebase Authentication
- 📝 **Rich Text Notes** — Full formatting with the Quill.js editor (bold, italic, lists, code, images)
- 📎 **File Attachments** — Attach images and files to your notes
- 🤝 **Note Collaboration** — Share notes with others as Viewer or Editor
- 🔔 **Notifications** — Receive invitations and activity updates from collaborators
- 🔗 **Public Note Sharing** — Generate a shareable public link for any note
- 🌙 **Ultra Dark Mode** — A deep dark theme for focused night-time work
- 📱 **Fully Responsive** — Works seamlessly on mobile, tablet, and desktop
- 💬 **In-App Feedback** — Send feedback directly from within the app
- ⌨️ **Keyboard Shortcuts** — `Alt+N` (new note), `Ctrl+S` (save), `Esc` (close)
- 🧹 **Data Management** — Wipe all data or delete account from settings

---

## 🏗️ Project Architecture

```
talaga/
├── index.html              # Main HTML shell (SPA entry point)
├── app.js                  # All frontend logic (1,385 lines)
├── styles.css              # All UI styles — glassmorphism design
├── package.json            # Root project metadata
├── sync.ps1                # PowerShell sync script (push to GitHub)
├── CNAME                   # Custom domain config (talaga.qzz.io)
├── images/
│   └── logo.png            # App logo / favicon
└── backend/
    ├── server.js           # Node.js/Express API server (614 lines)
    ├── package.json        # Backend dependencies
    ├── setup.sql           # Legacy DB schema (auto-created by server.js)
    ├── .env.example        # Environment variable template
    └── FIREBASE_SETUP.md   # Firebase service account setup guide
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| **HTML5** | App structure and semantic markup |
| **CSS3** (Vanilla) | Glassmorphism UI, animations, responsive layout |
| **JavaScript** (Vanilla) | All app logic, routing, API calls |
| **Firebase Auth (Compat v10)** | Google authentication |
| **Quill.js v1.3.6** | Rich text note editor |
| **Font Awesome 6.4** | Icons throughout the interface |
| **Google Fonts (Outfit)** | Premium typography |
| **GitHub Pages** | Static site hosting |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Server runtime |
| **Express.js v4** | REST API framework |
| **PostgreSQL (pg v8)** | Database driver |
| **Firebase Admin SDK v11** | Server-side token verification |
| **Nodemailer v6** | Email notifications for feedback |
| **dotenv v16** | Environment variable management |
| **cors v2** | Cross-origin request handling |
| **crypto** (built-in) | Secure share token generation |
| **Render** | Backend cloud hosting |

### Database & Services
| Service | Purpose |
|---|---|
| **Aiven PostgreSQL 17.9** | Cloud-hosted relational database |
| **Firebase (Google)** | Authentication provider |

---

## 🗄️ Database Schema

The database is automatically created and migrated on every server startup. No manual setup is needed.

### `notes` table
| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment note ID |
| `user_id` | VARCHAR(255) | Firebase UID of the owner |
| `owner_name` | VARCHAR(255) | Display name of the owner |
| `last_editor_name` | VARCHAR(255) | Last person who edited |
| `title` | VARCHAR(255) | Note title |
| `description` | TEXT | Short description |
| `content` | TEXT | Full rich text content (HTML) |
| `attachments` | JSONB | Array of attached file URLs |
| `sharing_config` | JSONB | Access type, public role, share token |
| `category` | VARCHAR(50) | `info`, `todo`, `account`, `business`, `student`, `personal`, `other` |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `note_collaborators` table
| Column | Type | Description |
|---|---|---|
| `note_id` | INTEGER FK | References `notes(id)` |
| `user_email` | VARCHAR(255) | Invited collaborator's email |
| `can_edit` | BOOLEAN | Editor or Viewer permission |
| `status` | VARCHAR(20) | `pending` or `accepted` |

### `note_history` table
| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment history ID |
| `note_id` | INTEGER FK | References `notes(id)` |
| `user_name` | VARCHAR(255) | Who performed the action |
| `action` | TEXT | Description of the action |
| `created_at` | TIMESTAMPTZ | When it happened |

### `feedback` table
| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment feedback ID |
| `user_id` | VARCHAR(255) | Firebase UID of submitter |
| `user_name` | VARCHAR(255) | Display name of submitter |
| `message` | TEXT | Feedback content |
| `created_at` | TIMESTAMPTZ | Submission timestamp |

---

## 🔌 API Endpoints

**Base URL:** `https://talaga-backend-4o1y.onrender.com`

> All endpoints marked with 🔒 require a valid Firebase ID Token in the `Authorization: Bearer <token>` header.

### System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | — | API landing page (HTML) |
| GET | `/api/ping` | — | Health check — returns `{status: "online"}` |
| GET | `/health` | — | Deep health check — tests DB connection |

### Notes
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notes` | 🔒 | Get all notes (owned + accepted shared) |
| POST | `/api/notes` | 🔒 | Create a new note |
| POST | `/api/notes/:id` | 🔒 | Update an existing note |
| DELETE | `/api/notes/:id` | 🔒 | Delete a note (owner only) |
| DELETE | `/api/notes/wipe` | 🔒 | Delete all notes for the user |

### Sharing & Collaboration
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/public/notes/:token` | — | View a publicly shared note by token |
| POST | `/api/notes/:id/access` | 🔒 | Set access level (`restricted` or `public`) |
| POST | `/api/notes/:id/share` | 🔒 | Invite a collaborator by email |
| GET | `/api/notes/:id/collaborators` | 🔒 | List collaborators on a note |
| DELETE | `/api/notes/:id/collaborators/:email` | 🔒 | Remove a collaborator |
| GET | `/api/notes/:id/history` | 🔒 | Get edit history of a note |

### Notifications & Invitations
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | 🔒 | Get pending invites + activity feed |
| POST | `/api/invitations/:id/accept` | 🔒 | Accept a note invitation |
| POST | `/api/invitations/:id/reject` | 🔒 | Decline a note invitation |

### Feedback
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/feedback` | 🔒 | Submit feedback (stored in DB + optional email) |

---

## 🚀 Deployment Guide

### Prerequisites
- GitHub account with this repository forked
- [Render](https://render.com) account (free tier)
- [Aiven](https://aiven.io) account (free tier PostgreSQL)
- [Firebase](https://console.firebase.google.com) project with Google Auth enabled

### Step 1 — Firebase Setup
1. Go to Firebase Console → your project → **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"** → download the `.json` file
3. Convert to Base64 (PowerShell):
   ```powershell
   $json = Get-Content "path\to\serviceAccountKey.json" -Raw
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))
   ```
4. Save this base64 string — it's your `FIREBASE_SERVICE_ACCOUNT` value

### Step 2 — Backend Deployment (Render)
1. Create a **New Web Service** on Render
2. Connect your GitHub repo (`Jemmy09/talaga`)
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Health Check Path:** `/api/ping`
4. Add Environment Variables:
   ```
   DATABASE_URL    = postgres://avnadmin:PASSWORD@host:port/defaultdb?sslmode=require
   PORT            = 3000
   FIREBASE_SERVICE_ACCOUNT = <your base64 string>
   ```
5. Deploy — tables are created automatically on first boot ✅

### Step 3 — Frontend Configuration
1. Open `app.js` and update line 62:
   ```js
   const API_BASE_URL = 'https://your-render-url.onrender.com';
   ```
2. Push to GitHub — GitHub Pages auto-deploys within 1 minute

### Step 4 — Firebase Authorized Domains
1. Firebase Console → **Authentication** → **Settings** → **Authorized Domains**
2. Add your GitHub Pages domain: `your-username.github.io`

---

## 🔐 Security

- **Authentication**: All protected endpoints verify Firebase ID tokens server-side using the Admin SDK — tokens cannot be faked
- **Authorization**: Notes are scoped to `user_id` (Firebase UID); collaborator access is checked on every request
- **Secrets**: All credentials are stored in environment variables — never committed to the repository
- **CORS**: Configured to allow the frontend origin only
- **SSL**: All database connections use `sslmode=require` via Aiven
- **`.gitignore`**: `.env`, `serviceAccountKey.json`, and `ca.pem` are excluded from version control

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + N` | Create a new note |
| `Ctrl + S` | Save the current note |
| `Esc` | Close any open modal |

---

## 📁 Environment Variables Reference

Create a `backend/.env` file based on `backend/.env.example`:

```env
# Aiven PostgreSQL connection string
DATABASE_URL=postgres://avnadmin:PASSWORD@hostname:port/defaultdb?sslmode=require

# Server port
PORT=3000

# Firebase Admin SDK — Base64 encoded service account JSON
FIREBASE_SERVICE_ACCOUNT=your_base64_encoded_json_here

# Optional — for email notifications on feedback
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

## 📬 Contact & Support

This project was built by one person who wanted a clean place to keep their thoughts.  
If it helps you too, that's more than enough.

- **Developer:** Jemmy Francisco
- **Email:** [jemmyfrancisco30@gmail.com](mailto:jemmyfrancisco30@gmail.com)
- **Facebook:** [Jemmy Francisco](https://facebook.com/jemmy.francisco.98)

Have a bug or suggestion? Use the **Feedback** feature inside the app — every message is read personally.

---

## 📄 License

MIT License — free to use, study, and build upon.

---

<p align="center">
  <em>Built humbly, with purpose. Thank you for visiting. 🙏</em>
</p>
