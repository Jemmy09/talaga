<p align="center">
  <img src="images/logo.png" width="120" alt="Talaga Logo">
</p>

# Talaga - A Simple Space for Your Thoughts 🧘‍♂️✨

**Talaga** (Tagalog for *"Really"* or *"Truly"*) isn't just another notes app. It’s a clean, quiet space for your mind. In a world full of chaotic tabs and forgotten sticky notes, Talaga provides a professional, glassmorphism-inspired workspace where your ideas can grow.

> *"Your brain is for having ideas, not storing them. Talaga handles the storage, so you can handle the work."* 🧠🚀

---

## ✨ Why Talaga?
- **Clean Aesthetics**: A workspace designed for focus and organization.
- **Secure by Design**: Armed with Firebase Auth and PostgreSQL; your data is safe.
- **Seamless Sync**: From your desk to the coffee shop, your notes follow you everywhere.
- **Free-Tier Powered**: Engineered to run 100% on high-performance free tiers (Aiven + Render + GitHub).

## 🛠️ The Tech "Secret Sauce"
We built this with a focus on stability and simplicity:
- **Frontend**: A responsive SPA hosted on **GitHub Pages**.
- **Security**: **Firebase Auth** (Google Login) for a secure, one-tap entry.
- **Brain (API)**: **Node.js/Express** running on **Render**.
- **Memory (DB)**: **Aiven PostgreSQL** for rock-solid data persistence.

---

## 🚀 Getting Your Workspace Live

### 1. The Foundation (Database)
1. Head over to your **Aiven Console**.
2. Grab the code from **[backend/setup.sql](backend/setup.sql)** and run it in the Aiven query editor. 
3. *Boom!* Your tables are ready for action.

### 2. The Engine (Backend)
1. Fork this repo and link it to a **New Web Service** on **Render**.
2. **IMPORTANT**: In the Render settings, set the **Root Directory** to `backend`.
3. Add these Environment Variables:
   - `DATABASE_URL`: Your Aiven Connection URI.
   - `FIREBASE_SERVICE_ACCOUNT`: Your Base64 encoded JSON (See **[backend/FIREBASE_SETUP.md](backend/FIREBASE_SETUP.md)**).
4. Once Render gives you that **Live URL**, copy it.

### 3. The Control Center (Frontend)
1. Open **[app.js](app.js)** and find `API_BASE_URL`.
2. Replace the placeholder with your fresh Render URL.
3. Simply run `.\sync.ps1` in your terminal to push everything to GitHub.

---

## ☕ Support & Credits
Developed with caffeine and care by **Jemmy Francisco**.

- **Email**: [jemmyfrancisco30@gmail.com](mailto:jemmyfrancisco30@gmail.com)
- **Facebook**: [Jemmy Francisco](https://facebook.com/jemmy.francisco.98)

*Got feedback?* Use the in-app feedback tool. We promise we actually read it.

---
<p align="center">
  <i>Truly your personal space. Elegant, Secure, and Free.</i>
</p>
