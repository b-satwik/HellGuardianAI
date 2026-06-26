# User Guide - HellGuardian AI OS

Welcome to **HellGuardian AI**, your autonomous productivity operating system. This guide explains how to navigate, interact with, and leverage the platform's features.

---

## 🔑 Onboarding & Authentication

When you first load HellGuardian AI, you are presented with the **Startup Security Console**:
1.  **Google Workspace Sign-in:** Use the main button to connect your Google Account. This grants access to your calendar events, emails, tasks, and Google Drive files.
2.  **User Credentials:** Alternatively, sign up using an email and password to explore the system with local cached states.

---

## 🖥️ Dashboard Interface Layout

The dashboard is structured as a terminal-style command center split into four primary regions:

### 1. Sidebar Navigation (Left Panel)
Use these tabs to pivot between the core system workspaces:
*   **Today's Focus:** The main mission viewport displaying your priority items, calendar timeline, and active email feeds.
*   **Task Directory:** Detailed list of items containing priority indicators, burnout risk metrics, and sub-task creation forms.
*   **Workspace Planner:** The AI Schedule Re-alignment page where you can run the scheduler optimization algorithms.
*   **Voice Assistant:** Dedicated hands-free conversational voice core with real-time speech synthesis.
*   **Productivity Analytics:** Visualization panels tracking task completion probabilities and burnout scores.
*   **Guardian Memory:** Persistent observations gathered by the AI regarding your workspace patterns.
*   **Workspace Settings:** Toggle API connections, Gemini parameters, and terminate the session.

### 2. Activity Center (Middle Panels)
*   **Focus Progress Bar:** Displays your active progress toward completing the day's schedule targets.
*   **Today's Focus Panel:** Contains a checklist of active tasks. Mark tasks as complete to update your focus score.
*   **Calendar Timeline & Gmail Cache:** Shows synced records from your Google profile.

### 3. Live AI Cognition Stream (Right Panel)
*   Displays real-time logs of the AI's background reasoning, showing what the Planner, Scheduler, and Risk agents are calculating.

### 4. Floating Command Console
*   Toggle this window by clicking the floating terminal icon in the bottom-right corner.
*   Drag the window by its title bar to reposition it.
*   Type commands (e.g. `/help`) or natural questions (e.g. `prioritize my calendar`) to communicate with the coordinator.

---

## 🎙️ Guardian Voice Assistant

The Voice Assistant provides a hands-free interface for managing your day.

### 1. Activation & Speech Controls
*   **Start/Stop Listening:** Click the microphone button to activate recording. Click it again to stop.
*   **Continuous Conversation:** Engage this switch to automatically resume listening 800ms after the Guardian finishes speaking.
*   **Speech Interruption:** Click the **Interrupt Playback** button or say "stop", "quiet", or "cancel" to immediately halt TTS output.

### 2. Advanced Agentic Vocals
Use these prompts to activate workspace reasoning:
*   **"Summarize today's emails"** -> Summarizes your email inbox cache into 2-3 concise spoken sentences.
*   **"What is my highest priority?"** -> Cross-checks tasks, threat levels, and deadlines, reading the top focus block.
*   **"Plan my day"** -> Computes an optimized schedule and reads your focus schedule blocks.
*   **"Create task from my latest gmail"** -> Analyzes the latest unread Gmail, extracts action items, inserts them into Firestore, and speaks confirmation.

---

## ⚡ Active Focus Mode

If you are falling behind or need to block out distractions:
1.  Click **Initiate Focus Mode** in the sidebar.
2.  The screen shifts to a high-contrast full-screen HUD.
3.  The system presents an optimized micro-schedule outlining the immediate priority task to complete.
4.  Exit by clicking **Deactivate Focus Mode**.
