# Talaga - Premium Personal Workspace 📝

Talaga is an elite, glassmorphism-inspired personal dashboard for organizing thoughts, tasks, and accounts. 

## 🏗️ Professional Architecture (Free Tier Optimized)
This project is engineered to provide premium functionality using 100% free-tier services:
- **Frontend**: [GitHub Pages](https://pages.github.com/) 
- **Authentication**: [Firebase Auth](https://firebase.google.com/) (Google Login)
- **Backend API**: [Render](https://render.com/) (Node.js/Express)
- **Database**: [Aiven](https://aiven.io/) (PostgreSQL)

## 🚀 Deployment Guide

### 1. Database Setup
1. Log in to your **Aiven Console**.
2. Run the code from **[setup.sql](setup.sql)** in your Aiven PostgreSQL query editor to create the required tables.

### 2. Backend Deployment (Render)
1. Push this repository to your **GitHub**.
2. Create a **New Web Service** on Render and link this repository.
3. In the Render **Environment** settings, add:
   - `DATABASE_URL`: Your Aiven Service URI.
   - `FIREBASE_SERVICE_ACCOUNT`: Your Base64 encoded Firebase JSON (See **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)**).
4. Once deployed, Render will provide a **Live URL** (e.g., `https://talaga-api.onrender.com`).

### 3. Final Frontend Configuration
1. Open **[app.js](app.js)** and update `API_BASE_URL` on **line 30** with your Render Live URL.
2. Push the change to GitHub.

## 👥 Credits
Developed by **Jemmy Francisco**.

---
*Truly your personal space. Elegant, Secure, and Free.*
