# API Documentation - HellGuardian AI OS

This document details the interface schemas, types, and database collection models utilized by the HellGuardian AI OS application layers.

---

## 📂 Firestore Collection Structures

### `/users/{userId}/tasks`
Stores items created locally or synced from Google Tasks.
```typescript
interface TaskItem {
  id: string;
  title: string;
  due?: string;        // ISO timestamp
  notes?: string;
  status: 'needsAction' | 'completed';
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;                 // Burnout Risk Index (0-100)
  completionProbability: number;     // calculated probability (0-100)
  energyEstimation: number;          // Cognitive load (0-100)
  countdown?: string;                // Time remaining representation
  dependencies?: string[];           // Task pre-requisites
}
```

### `/users/{userId}/calendar_cache`
Stores cached calendar events synced from Google Calendar.
```typescript
interface CalendarEvent {
  id: string;
  summary: string;
  start: string;       // ISO timestamp
  end: string;         // ISO timestamp
  description?: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
```

---

## 🎙️ Speech Engine & Audio APIs

The application uses standard browser native speech interfaces:

### Web Speech API: `SpeechRecognition` (Ingress)
*   **Properties:** `continuous = false`, `interimResults = false`, `lang = 'en-US'`.
*   **Events:** `onstart`, `onerror`, `onend`, `onresult`.

### Web Speech API: `SpeechSynthesis` (Egress)
*   **SpeechSynthesisUtterance:**
    ```typescript
    interface SpeechUtteranceConfig {
      rate: 1.0;            // Speech rate (speed multiplier)
      pitch: 0.95;          // Low pitch for a robotic/calm aesthetic
      voice: SpeechSynthesisVoice; // Selected from Google US English / Natural (fallback to default)
    }
    ```
*   **Speech Filtering:** Input strings are parsed using `cleanSpeechText(text)` to remove dividers (`====`), headers (`###`), markdown bolding (`**`), and prompt prefixes (`>`) before being spoken.

---

## 🤖 Gemini Agentic Prompt Interface

The Multi-Agent coordinator invokes the Gemini model using a system instruction layout requesting a strict JSON output matching this schema:

```json
{
  "planner": "Plan overview details",
  "scheduler": "Conflict logs or focus allocations",
  "risk": "Burnout and stress estimation",
  "email": "Parsed email items and deadlines",
  "recovery": "Focus block suggestion details",
  "coordinator": "Summary of next execution steps",
  "suggestedMission": "Today's priority focus target",
  "burnoutIndex": 72,
  "focusScore": 85,
  "realignedTasks": [
    {
      "taskId": "task-id",
      "newDueDate": "ISO timestamp",
      "reason": "Re-alignment rationale description"
    }
  ]
}
```
If the model output does not conform to this structure, the coordinator defaults to pre-defined templates in the fallback layer to prevent runtime interface crashes.
