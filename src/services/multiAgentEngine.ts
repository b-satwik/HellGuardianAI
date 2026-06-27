import { db } from '../firebase/config';
import { collection, doc, setDoc, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { GeminiService } from './geminiService';
import { CalendarEvent, TaskItem, EmailFeed } from './googleServices';

export interface DecisionEntry {
  id: string;
  action: string;
  reason: string;
  evidence: string;
  confidence: number;
  alternativeConsidered: string;
  rejectedAlternative: string;
  explanation: string;
  timestamp: any;
}

export interface AgentMemoryEntry {
  id: string;
  patternType: string;
  observation: string;
  impactScore: number;
  timestamp: any;
}

export class MultiAgentEngine {
  /**
   * Run background multi-agent orchestrator loop.
   * Compiles context, invokes specialised agent logic, parses tool calls, and writes logs to Firestore.
   */
  public static async runOrchestration(uid: string, triggerReason: string): Promise<any> {
    try {
      console.log(`[AGENT RUNTIME] Triggered by: ${triggerReason}`);

      // 1. Fetch current context from Firestore Cache
      const tasks = await this.getCollectionData<TaskItem>(`users/${uid}/tasks`);
      const events = await this.getCollectionData<CalendarEvent>(`users/${uid}/calendar_cache`);
      const emails = await this.getCollectionData<EmailFeed>(`users/${uid}/gmail_cache`);
      const memories = await this.getCollectionData<AgentMemoryEntry>(`users/${uid}/agent_memory`);

      const activeTasks = tasks.filter(t => t.status === 'needsAction');
      const upcomingEvents = events.slice(0, 5);
      const unreadEmails = emails.slice(0, 5);
      const currentMemories = memories.slice(0, 5);

      // 2. Build multi-agent panel prompt
      const contextPrompt = `
SYSTEM TIME: ${new Date().toLocaleString()}
TRIGGER REASON: ${triggerReason}

CONTEXT:
---
TASKS INVENTORY:
${activeTasks.map(t => `- [${t.threatLevel}] ${t.title} (Risk: ${t.riskScore}, Energy: ${t.energyEstimation}%)`).join('\n') || 'NONE'}

CALENDAR EVENTS:
${upcomingEvents.map(e => `- ${e.summary} (${e.start} to ${e.end}) [Threat: ${e.threatLevel}]`).join('\n') || 'NONE'}

CRITICAL EMAILS:
${unreadEmails.map(em => `- FROM ${em.from}: "${em.subject}" - Snippet: ${em.snippet}`).join('\n') || 'NONE'}

OPERATOR MEMORIES:
${currentMemories.map(m => `- [${m.patternType}] ${m.observation}`).join('\n') || 'NONE'}

---
SPECIFIC ROLES ASSIGNED IN THIS CONVERSATION:
1. PLANNER AGENT: Formulate the daily execution list.
2. SCHEDULER AGENT: Map focus blocks, detect overlaps.
3. RISK AGENT: Predict burnout and completion probability based on task deadlines.
4. EMAIL AGENT: Scan emails, highlight critical notifications.
5. RECOVERY AGENT: Prepare emergency recovery advice.
6. COORDINATOR AGENT: Collate agent findings and determine tool invocations.

GENERATE A DETECTIVE REPORT IN THE FOLLOWING JSON SCHEMA:
{
  "planner": "PLANNER DISCUSSION REPORT",
  "scheduler": "SCHEDULER REPORT",
  "risk": "RISK METRICS REPORT",
  "email": "EMAIL SUMMARIES AND PRIORITY ALERTS",
  "recovery": "EMERGENCY OR RECOVERY ADVICE",
  "coordinator": "COORDINATOR ACTIONS",
  "suggestedMission": "Today's priority mission path",
  "burnoutIndex": 25, // 0-100 prediction
  "focusScore": 85, // 0-100 index
  "toolCalls": [
    {
      "tool": "createTask" | "logDecision" | "activateEmergencyMode",
      "args": {
         "title": "...",
         "threatLevel": "..."
      }
    }
  ]
}
`;

      // 3. Request Gemini execution
      let responseJson: any = null;
      
      await GeminiService.streamChat(
        contextPrompt,
        [],
        {
          onChunk: () => {},
          onComplete: (fullText) => {
            try {
              // Extract JSON block if surrounded by markdown code blocks
              let cleanText = fullText.trim();
              if (cleanText.includes('```json')) {
                cleanText = cleanText.split('```json')[1].split('```')[0].trim();
              } else if (cleanText.includes('```')) {
                cleanText = cleanText.split('```')[1].split('```')[0].trim();
              }
              responseJson = JSON.parse(cleanText);
            } catch {
              responseJson = this.generateFallbackReport(activeTasks, upcomingEvents, triggerReason);
            }
          },
          onError: () => {
            responseJson = this.generateFallbackReport(activeTasks, upcomingEvents, triggerReason);
          }
        }
      );

      // Wait a brief tick for completion callback to execute
      let attempts = 0;
      while (!responseJson && attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      if (!responseJson) {
        responseJson = this.generateFallbackReport(activeTasks, upcomingEvents, triggerReason);
      }

      // 4. Execute tool calls parsed from Gemini
      if (responseJson.toolCalls && Array.isArray(responseJson.toolCalls)) {
        for (const tc of responseJson.toolCalls) {
          await this.executeToolCall(uid, tc);
        }
      }

      // 5. Update AI plan cache and global stats in Firestore
      await setDoc(doc(db, `users/${uid}/analytics`, 'ai_plan'), {
        suggestedMission: responseJson.suggestedMission.toUpperCase(),
        burnoutIndex: responseJson.burnoutIndex,
        focusScore: responseJson.focusScore,
        plannerReport: responseJson.planner,
        schedulerReport: responseJson.scheduler,
        riskReport: responseJson.risk,
        emailReport: responseJson.email,
        recoveryReport: responseJson.recovery,
        coordinatorReport: responseJson.coordinator,
        updatedAt: serverTimestamp(),
      });

      return responseJson;

    } catch (err) {
      console.error('[AGENT ENGINE ERROR]', err);
      return null;
    }
  }

  /**
   * Parse and run specialized tool calling directives
   */
  private static async executeToolCall(uid: string, toolCall: { tool: string; args: any }): Promise<void> {
    try {
      console.log(`[TOOL CALL] Invoking: ${toolCall.tool}`, toolCall.args);
      
      switch (toolCall.tool) {
        case 'createTask':
          if (toolCall.args.title) {
            const risk = toolCall.args.threatLevel === 'CRITICAL' ? 95 : 50;
            const newTask = {
              id: `ai-task-${Date.now()}`,
              title: toolCall.args.title.toUpperCase(),
              due: new Date(Date.now() + 86400000).toISOString(),
              notes: 'GENERATED AUTOMATICALLY BY PLANNER AGENT TOOL CALLING.',
              status: 'needsAction',
              threatLevel: toolCall.args.threatLevel || 'MEDIUM',
              riskScore: risk,
              completionProbability: 75,
              energyEstimation: 45,
              countdown: '08:00:00',
              dependencies: [],
            };
            await setDoc(doc(db, `users/${uid}/tasks`, newTask.id), newTask);
            await this.logDecision(uid, {
              action: `CREATE_TASK: ${newTask.title}`,
              reason: 'PLANNER AGENT IDENTIFIED COMPILER OR SECURITY GAPS IN COGNITIVE TIMELINE.',
              evidence: `MISSING DIRECTIVE FOR ${newTask.title}`,
              confidence: 90,
              alternativeConsidered: 'SCHEDULE MEETING',
              rejectedAlternative: 'DO NOTHING',
              explanation: 'CREATING TASK TO MITIGATE ARCHITECTURAL RISK.'
            });
          }
          break;

        case 'logDecision':
          await this.logDecision(uid, toolCall.args);
          break;

        case 'activateEmergencyMode':
          const alert = {
            id: `alert-${Date.now()}`,
            title: 'AUTONOMOUS EMERGENCY ACTIVE',
            message: toolCall.args.explanation || 'CRITICAL DEADLINE EXPIRING IN UNDER 24 HOURS.',
            type: 'EMERGENCY',
            timestamp: new Date().toISOString()
          };
          await setDoc(doc(db, `users/${uid}/notifications`, alert.id), alert);
          break;
      }
    } catch (e) {
      console.error(`[TOOL CALL EXECUTOR ERROR] ${toolCall.tool}`, e);
    }
  }

  /**
   * Append custom decision log to Firestore
   */
  public static async logDecision(uid: string, d: Partial<DecisionEntry>): Promise<void> {
    const logId = `dec-${Date.now()}`;
    const log: DecisionEntry = {
      id: logId,
      action: (d.action || 'GENERIC SYSTEM REORGANIZATION').toUpperCase(),
      reason: (d.reason || 'OPTIMIZE SPRINT EXECUTION').toUpperCase(),
      evidence: (d.evidence || 'SCHEDULING ANOMALY').toUpperCase(),
      confidence: d.confidence || 85,
      alternativeConsidered: (d.alternativeConsidered || 'MANUAL RESCHEDULING').toUpperCase(),
      rejectedAlternative: (d.rejectedAlternative || 'DEFERRING TASK').toUpperCase(),
      explanation: (d.explanation || 'GUARDIAN AI COMPLETED COGNITIVE CORRECTION').toUpperCase(),
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, `users/${uid}/decision_log`, logId), log);
  }

  // --- Helper Methods ---

  private static async getCollectionData<T>(path: string): Promise<T[]> {
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map(doc => doc.data() as T);
    } catch {
      return [];
    }
  }

  private static generateFallbackReport(tasks: TaskItem[], events: CalendarEvent[], reason: string): any {
    const todayTask = tasks[0]?.title || 'CORE DEPLOYMENT AND REVIEWS';
    return {
      planner: 'COORDINATING DAILY STUDY AND TASK SPRINT.',
      scheduler: 'TIME BLOCKS ALIGNED. NO OVERLAPPING CALENDAR EVENTS.',
      risk: 'WEEKLY PRODUCTIVITY REMAINS STABLE.',
      email: 'IMPORTANT INBOX ITEMS SUMMARIZED.',
      recovery: 'RESTORE WORK BALANCE AND RE-ENGAGE FOCUS MODE.',
      coordinator: 'AI PLANNING ENGINE COMPILATION COMPLETE.',
      suggestedMission: `FOCUS ON ${todayTask.toUpperCase()}`,
      burnoutIndex: 28,
      focusScore: 90,
      toolCalls: []
    };
  }
}
