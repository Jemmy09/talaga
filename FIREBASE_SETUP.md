# 🔑 Firebase Service Account Setup Guide

To protect your Aiven PostgreSQL database, your backend needs to verify who is logging in. This is done via the **Firebase Admin SDK**, which requires a "Service Account Key".

### 1. Generate the Key
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project (**francisco-61572**).
3.  Click the **Gear Icon (⚙️)** next to "Project Overview" and select **Project Settings**.
4.  Navigate to the **Service Accounts** tab.
5.  Click the **Generate New Private Key** button.
6.  Confirm by clicking **Generate Key**. This will download a `.json` file to your computer.

### 2. Prepare the Key for Backend
For **Aiven Application Hosting** or **Render/Railway**, it is best to set the key as an **Environment Variable** rather than uploading the file.

1.  Open the downloaded `.json` file in a text editor (like Notepad).
2.  **Minify it**: Make sure the entire content is on a single line.
3.  **Base64 Encode it** (Optional but Recommended): 
    - On Mac/Linux: `base64 -w 0 your-file.json`
    - On Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("your-file.json"))`

### 3. Set the Environment Variable
In your Aiven/Hosting dashboard, add a new environment variable:
- **Name**: `FIREBASE_SERVICE_ACCOUNT`
- **Value**: (Paste the Base64 string or the JSON content here)

---
> [!CAUTION]
> **NEVER** commit your `serviceAccountKey.json` to GitHub. This file grants full administrative access to your Firebase project.
