# Google Technologies Used - HellGuardian AI OS

This document catalogs every Google service, API, and cloud technology integrated into the HellGuardian AI platform.

---

## 🧠 Google Gemini AI
*   **Gemini 1.5 Flash API:** Leveraged as the cognitive core. Parses user directives, analyzes calendar collisions, calculates task priorities, and generates recovery strategies.

---

## 🎙️ Speech Processing & Voice APIs
*   **Speech-to-Text (Web Speech API):** Transcribes user verbal commands locally within the browser, feeding them directly into the agent engine.
*   **Text-to-Speech (Web Speech API):** Synthesizes conversational responses using Google US English and Natural synthesized voices.

---

## ⚡ Google Firebase Suite
*   **Firebase Authentication:** Secures user registration, login states, and OAuth token ingestion using Google Identity Redirects.
*   **Cloud Firestore:** Serves as the primary real-time database, storing task checklists, event logs, and user configuration caches.
*   **Firebase Storage:** Handles document and media uploads for system context injection.
*   **Firebase Hosting:** Deploys and serves the static production build of the React-TypeScript single-page application.

---

## 💼 Google Workspace APIs
*   **Gmail API:** Synchronizes unread messages, allowing the AI to scan for incoming task deadlines and client requests.
*   **Google Calendar API:** Pulls user agendas to detect scheduling conflicts and map deep work focus zones.
*   **Google Tasks API:** Synchronizes task checklists, allowing the system to update, complete, and create tasks.
*   **Google Drive API:** Ingests document outlines, generating summaries and contextual task inputs.
*   **People API:** Extracts contact names and emails to coordinate advisor notifications.

---

## ☁️ Google Cloud Platform (GCP)
*   **Cloud Run:** Runs the containerized production image under high-performance Nginx routing.
*   **Cloud Functions:** Powers backend REST endpoints and trigger processes.
*   **Cloud Scheduler:** Triggers periodic task alignments and deadline health checks.
*   **Secret Manager:** Secures backend API keys and OAuth client secrets.
*   **Cloud Logging & Monitoring:** Tracks serverless request metrics and agent diagnostic events.
*   **Cloud Storage:** Backs up document processing buckets.
