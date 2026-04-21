# Talaga - Premium Personal Space 📝

Talaga is a modern, elegantly designed personal dashboard for organizing notes, to-do lists, and accounts. Built with a focus on efficiency and premium aesthetics, Talaga provides a secure sanctuary for your digital life.

![Talaga Banner](images/logo.png)

## ✨ Features

- **Digital Workspace**: A distraction-free dashboard for all your thoughts.
- **Categorized Notes**: Organize your life with 'Information', 'To-Do', and 'Account' badges.
- **Optional Descriptions**: Capture quick ideas with just a title, or add detailed notes when needed.
- **Secure Authentication**: Google-powered sign-in for seamless and safe access.
- **Responsive Design**: Elegant glassmorphism UI that works perfectly on desktop and mobile.
- **Sync Everywhere**: Powered by Firebase Firestore for real-time data persistence.
- **Help Center**: Integrated guide and FAQs to help you master your workspace.

## 🚀 Getting Started

### Prerequisites
- A modern web browser.
- A Firebase project (for hosting and database).

### Local Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Jemmy09/talaga.git
   ```
2. Open `index.html` in your browser or use a local server like `live-server`.

### Configuration
The app uses Firebase Compat SDK. Update the `firebaseConfig` object in `app.js` with your own credentials if you are deploying a fork:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    // ...
};
```

## 🛠️ Built With
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Backend**: Firebase Auth & Firestore
- **Icons**: Font Awesome 6
- **Typography**: Outfit (Google Fonts)

## 👤 Developer
Created by **Jemmy Francisco**.

---
*Truly your personal space.*
