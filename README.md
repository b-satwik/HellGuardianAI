# HellGuardian AI

> **An AI-powered autonomous productivity operating system built for the Google AI Hackathon 2026.**

HellGuardian AI is an intelligent productivity assistant that helps users avoid missed deadlines, reduce burnout, and manage their workload proactively. Instead of sending passive reminders, it analyzes Google Workspace data using Gemini AI and provides personalized plans, task prioritization, email summaries, and schedule recommendations.

---
## Highlights

- 🤖 AI-powered autonomous productivity assistant
- 📅 Google Calendar, Gmail, Tasks & Drive integration
- 🧠 Gemini-powered multi-agent planning
- 🔐 Firebase Authentication & Firestore Security Rules
- ☁️ Deployed on Firebase Hosting & Cloud Functions

---

## Live Demo

**Website**

https://hellguardianai-9cf98.web.app

**GitHub Repository**

https://github.com/b-satwik/HellGuardianAI

---

# Problem Statement

**Google AI Hackathon**

**The Last-Minute Life Saver**

Build an AI-powered assistant that helps users manage deadlines, organize work, and avoid last-minute stress.

---

# Key Features

## AI Productivity Assistant

* AI-powered daily planner
* Task prioritization
* Deadline prediction
* Burnout risk estimation
* Focus Mode dashboard

## Google Workspace Integration

* Gmail summaries
* Google Calendar synchronization
* Google Tasks integration
* Google Drive document summaries
* Google People API integration

## Voice Assistant

* Speech-to-text commands
* Text-to-speech responses
* Continuous conversation mode
* Voice interruption support

## Multi-Agent AI

* Planner Agent
* Scheduler Agent
* Email Agent
* Risk Analysis Agent
* Coordinator Agent

---

# Google Technologies Used

* Google Gemini 1.5 Flash
* Firebase Authentication
* Cloud Firestore
* Firebase Hosting
* Firebase Cloud Functions
* Google Calendar API
* Gmail API
* Google Tasks API
* Google Drive API
* Google People API

---

# Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* Firebase Cloud Functions
* Firebase Authentication
* Firestore

### AI

* Google Gemini

---

# Project Architecture

```text
User
      │
      ▼
React + TypeScript Frontend
      │
      ▼
Firebase Authentication
      │
      ▼
Cloud Functions
      │
      ▼
Gemini AI
      │
      ▼
Firestore Database
      │
      ▼
Google Workspace APIs
```

---

# Repository Structure

```
HellGuardianAI/

├── src/
├── functions/
├── docs/
├── firebase.json
├── firestore.rules
├── package.json
└── README.md
```

---

# Installation

Clone the repository

```bash
git clone https://github.com/b-satwik/HellGuardianAI.git
cd HellGuardianAI
```

Install dependencies

```bash
npm install
cd functions
npm install
```

Create a `.env` file using `.env.example`.

Run locally

```bash
npm run dev
```

Deploy

```bash
firebase deploy
```

---

# Documentation

Additional documentation is available in this repository.

* Architecture.md
* Installation.md
* UserGuide.md
* API_Documentation.md
* Project_Description.md
* Security_Report.md
* Testing_Report.md

---

# Security

* Firebase Authentication
* Firestore Security Rules
* Backend Gemini Proxy
* Environment variable based configuration
* No API keys exposed in the frontend


---

# License

Apache License 2.0

---

Built for the **Google AI Hackathon 2026** by **Bala Satwik**.
