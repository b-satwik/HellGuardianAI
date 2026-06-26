# Installation, Configuration & Deployment Guide

This guide describes how to set up local development, configure Firebase backend services, and deploy the HellGuardian AI operating system to staging or production environments.

---

## 📋 Prerequisites

Ensure your development machine has the following tools installed:
*   **Node.js** (v18.x or v20.x recommended)
*   **npm** (v9.x or later)
*   **Git**
*   **Docker** (Optional, for container testing)
*   **Firebase CLI** (`npm install -g firebase-tools`)
*   **Google Cloud SDK** (For GCP deployment)

---

## 🛠️ Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/balasatwik/HellGuardianAI.git
cd HellGuardianAI
```

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Configure Local Environment Variables
Create a local `.env` file by copying the template file:
```bash
cp .env.example .env
```
Fill in the credentials in `.env` using your specific Google Cloud and Firebase configurations.

### 4. Run the Development Server
```bash
npm run dev
```
The application will launch on your localhost (usually `http://localhost:5173`).

### 5. Build for Production
To compile and optimize the app:
```bash
npm run build
npm run preview
```

---

## 🔑 Firebase Services Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  Enable **Authentication** and add the following providers:
    *   **Google Sign-In** (Required for Workspace API tokens)
    *   **Email/Password** (Required for fallback registration)
3.  Create a **Firestore Database** in production mode.
4.  Create a **Cloud Storage Bucket**.

### Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage Security Rules (`storage.rules`)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Deploy security rules using:
```bash
firebase deploy --only firestore:rules,storage:rules
```

### OAuth Consent Screen Settings
To support Google Workspace API access:
1.  Go to **GCP Console > APIs & Services > OAuth consent screen**.
2.  Configure scopes to request permission for:
    *   `https://www.googleapis.com/auth/calendar.readonly`
    *   `https://www.googleapis.com/auth/gmail.readonly`
    *   `https://www.googleapis.com/auth/tasks`
    *   `https://www.googleapis.com/auth/drive.readonly`
    *   `https://www.googleapis.com/auth/directory.readonly`

---

## 📦 Containerized Deployment (Docker)

### 1. Build the Docker Image
```bash
docker build -t hellguardian-ai-os:latest .
```

### 2. Run the Container Locally
```bash
docker run -p 8080:80 --env-file .env hellguardian-ai-os:latest
```

---

## ⚡ Hosting & Cloud Deployments

### Firebase Hosting Deployment
Deploy the compiled React assets:
```bash
firebase login
firebase use --add <your-project-id>
firebase deploy --only hosting
```

### Google Cloud Run Deployment
Run the container on managed **Google Cloud Run**:
1.  Enable required GCP endpoints:
    ```bash
    gcloud services enable \
      run.googleapis.com \
      builds.googleapis.com \
      secretmanager.googleapis.com \
      artifactregistry.googleapis.com
    ```
2.  Store sensitive credentials (`GEMINI_API_KEY`, `FIREBASE_API_KEY`) in **Secret Manager** and grant secret accessor roles to the Cloud Run service account.
3.  Deploy:
    ```bash
    gcloud builds submit --tag gcr.io/<your-project-id>/app:latest
    gcloud run deploy hellguardian-app \
      --image gcr.io/<your-project-id>/app:latest \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars=NODE_ENV=production
    ```

### Cloud Scheduler (Cron Trigger)
To trigger automated re-alignment processes every hour:
```bash
gcloud scheduler jobs create http alignment-trigger \
  --schedule="0 * * * *" \
  --uri="https://<your-cloud-functions-url>/triggerScheduler" \
  --http-method=POST \
  --time-zone="UTC"
```
