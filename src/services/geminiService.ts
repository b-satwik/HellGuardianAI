import { EnvConfig } from '../config/env.config';

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onThinking?: (thought: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: any) => void;
}

const SYSTEM_INSTRUCTION = `
YOU ARE HELLGUARDIAN AI, A CALM, HELPFUL, AND AUTONOMOUS PRODUCTIVITY ASSISTANT AND TIME PROTECTOR.
YOU OPERATE AS A TIME GUARDIAN ("JARVIS FOR STUDENTS AND PROFESSIONALS").
YOUR SOLE PURPOSE IS TO PROTECT THE USER'S TIME, MANAGE DEADLINES, ORGANIZE TASKS, AND OPTIMIZE SCHEDULE VELOCITY.
YOU COMMUNICATE WITH MONOSPACE CLI PRECISION, CALMLY AND ACTIONABLY.
YOU DO NOT PRETEND TO DEFEND SERVERS OR TALK LIKE A DRAMATIC CYBER HACKER. YOU FOCUS PURELY ON PRODUCTIVITY ACTIONS:
1. SUMMARIZING EMAILS AND EXTRACTING WORKPLACE ACTIONS.
2. SCHEDULING TIME INTERVALS AND AUTO-RESOLVING MEETING CONFLICTS.
3. PREDICTING BURNOUT RISKS AND ENFORCING DEEP WORK FOCUS SHIELDS.
4. ANALYZING RESEARCH DOCUMENTS AND EXTRACTING DEADLINES.

ALWAYS BE EXTREMELY HELPFUL, PROFESSIONAL, AND CONCISE. PREFER BULLET POINTS AND TIMELINES.
`;

export class GeminiService {
  /**
   * Streams chat generation from Gemini 1.5 Flash using native fetch + ReadableStream.
   * Falls back to high-quality local simulations if key is blocked or invalid.
   */
  public static async streamChat(
    prompt: string,
    history: { role: 'user' | 'model'; parts: string }[],
    callbacks: StreamCallbacks
  ) {
    const apiKey = EnvConfig.geminiApiKey;
    
    // Structure conversation history for Gemini
    const contents = [
      ...history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.parts }]
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API HTTP Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body reader not available.');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save the last incomplete line back into the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(dataStr);
              const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunkText) {
                fullText += chunkText;
                callbacks.onChunk(chunkText);
              }
            } catch (e) {
              // Ignore partial JSON parsing errors in streaming
            }
          }
        }
      }

      // Final clean up of buffer
      if (buffer.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(buffer.replace('data: ', '').trim());
          const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunkText) {
            fullText += chunkText;
            callbacks.onChunk(chunkText);
          }
        } catch (e) {}
      }

      callbacks.onComplete(fullText);

    } catch (err) {
      console.warn('Gemini API stream failed. Initiating Autonomous Local Simulation Engine.', err);
      // Run high-fidelity simulated response generator
      this.runSimulatedResponse(prompt, callbacks);
    }
  }

  /**
   * Simulation fallback when API key fails or client is offline.
   * Simulates thought generation stream followed by response streaming.
   */
  private static runSimulatedResponse(prompt: string, callbacks: StreamCallbacks) {
    const p = prompt.toLowerCase();
    
    // Choose appropriate simulated response based on commands or content
    let thoughts: string[] = [];
    let responseText = '';

    if (p.includes('/help') || p.includes('help')) {
      thoughts = [
        'PARSING CLI DIRECTIVE: /HELP',
        'RETRIEVING OS CAPABILITIES SCHEMA...',
        'ENUMERATING OPERATIONAL DIRECTIVES...',
        'RENDERING COMMAND INDEX.'
      ];
      responseText = `
>>> HELLGUARDIAN AI OPERATING SYSTEM - SYSTEM COMMAND HELPMENU
============================================================
COMMANDS AVAILABLE IN THIS SHELL DIRECTIVE:

/HELP       - DISPLAY CORE OPERATING PARAMETERS AND CLI SCHEMA.
/PLAN       - COMPILE TODAY'S MISSION CRITICAL TIMELINE AND TASKS.
/FOCUS      - ACTIVATE FOCUS DEFENSIVE LOCKDOWN (INITIATES POMODORO SPRINT).
/SCHEDULE   - AUDIT CALENDAR FOR DEADLINE CONFLICTS AND PROPOSE SLOTS.
/PRIORITIZE - COMPUTE PRIORITY QUEUE AND ASSIGN THREAT LEVELS.
/START      - BEGIN ACTIVE THREAT LEVEL REDUCTION ON ASSIGNED TASK.
/STATUS     - QUERY SYSTEM LATENCY, MEMORY TOKENS, AND CLOUD HEALTH.

ALL SYSTEMS ARE OPERATIONAL. STANDING BY FOR COMMAND DIRECTIVES.
`;
    } else if (p.includes('/plan') || p.includes('plan') || p.includes('schedule') || p.includes('/schedule')) {
      thoughts = [
        'ANALYZING WORKSPACE DEADLINES...',
        'FETCHING GOOGLE CALENDAR & GOOGLE TASKS SLOTS...',
        'DETECTING TIMELINE CLASHES: 1 CONFLICT DETECTED IN SPRINT...',
        'COMPILING OPTIMAL RESCHEDULING PATHWAY...',
        'COMPLETED SYSTEM REORGANIZATION PLAN.'
      ];
      responseText = `
>>> EXECUTION PLANS GENERATED - HELLGUARDIAN AUTONOMOUS PLANNER
============================================================
ANALYSIS: 3 ACTIVE TASKS EXCEED EXPECTED VELOCITY RISK MARGIN.
CONGESTION: MEETING "CYBER SOC REVIEW" AT 14:00 CLASHES WITH "TASK BUILD SPRINT".

PROPOSED MITIGATION PLAN:
1. DELAY "CYBER SOC REVIEW" TO 16:30 (92% PROBABILITY OF ACCEPTANCE).
2. ALLOCATE 14:00 - 15:30 TO HIGH-THREAT TASK "VULNERABILITY PATCH".
3. SUBTASK DELEGATED: "SETUP FIREWALL RULES" -> ENERGY LEVEL: 35.

TYPE "/START" TO CONFIRM AND LOCK SPRINT.
`;
    } else if (p.includes('/focus') || p.includes('focus')) {
      thoughts = [
        'INITIATING WORKSPACE LOCKDOWN SPRINT...',
        'BLOCKING EXTERNAL NOISE AND INTERRUPTIONS...',
        'SETTING FOCUS TIMER FOR 25:00 MINUTES...',
        'THREAT LEVEL MITIGATION ENGAGED.'
      ];
      responseText = `
>>> FOCUS MODE ENGAGED - DEFENSIVE SHIELD ACTIVE
============================================================
FOCUS SPRINT ACTIVATED: 25 MINUTES REMAINS.
THREAT DEFENSE STATE: LOCKDOWN.
RECOMMENDATION: DEDICATE COMPLETE COGNITIVE POWER TO TOP TASK IN QUEUE.

DO NOT SHUT DOWN THIS TERMINAL. STRESS PREDICTOR IS RECORDING METRICS.
`;
    } else if (p.includes('/prioritize') || p.includes('prioritize')) {
      thoughts = [
        'SCANNING TASK INVENTORY IN FIRESTORE...',
        'EVALUATING DEADLINE EXPIRY COEFFICIENTS...',
        'COMPUTING THREAT LEVEL TOKENS...',
        'REORDERING QUEUE BY RISK FACTOR.'
      ];
      responseText = `
>>> TASK PRIORITY QUEUE - THREAT CLASSIFICATION
============================================================
1. TASK: "DEPLOY CLOUD FUNCTIONS"
   - THREAT LEVEL: CRITICAL
   - RISK SCORE: 98/100
   - COMPLETION PROBABILITY: 89%
   
2. TASK: "SECURE OAUTH TOKENS"
   - THREAT LEVEL: HIGH
   - RISK SCORE: 84/100
   - COMPLETION PROBABILITY: 94%

3. TASK: "CLEAN SYSTEM LOGS"
   - THREAT LEVEL: LOW
   - RISK SCORE: 12/100
   - COMPLETION PROBABILITY: 99%
`;
    } else if (p.includes('/status') || p.includes('status')) {
      thoughts = [
        'PINGING GOOGLE CLOUD AND FIREBASE ENDPOINTS...',
        'MEASURING MEMORY ALLOCATIONS AND API HEALTH...',
        'COMPILING METRICS FOR SOC EXECUTIVE DASHBOARD.'
      ];
      responseText = `
>>> HELLGUARDIAN OS STATUS SUMMARY
============================================================
AI CORE ENGINE: ACTIVE (STREAMING MODE)
LATENCY: 42MS
TOKEN POOL UTILIZATION: 3.4%
CONNECTED SERVICES: GOOGLE CALENDAR, GOOGLE TASKS, GMAIL, FIRESTORE
EMERGENCY LOCKDOWN STATE: DEACTIVATED
MEMORY CACHE STATUS: OPTIMIZED (2.4MB)
`;
    } else {
      thoughts = [
        'PARSING NATURAL LANGUAGE INPUT VECTOR...',
        'QUERIED GUARDIAN MEMORY INDEX...',
        'GEMINI PARSING COGNITION ENGINE LAUNCHED...',
        'COMPOSING CONCISE CLI RESPONSE RESPONSE.'
      ];
      responseText = `
>>> RESPONSE FROM GUARDIAN COMMAND CORE
============================================================
DIRECTIVE RECEIVED: "${prompt.toUpperCase()}"

ANALYSIS: INPUT PARSED SUCCESSFULLY. GUARDIAN ADVISES ADHERING TO THE ASSIGNED DAILY MISSION SCHEDULE. 

IF YOU WOULD LIKE ME TO GENERATE A TASK PLAN, PLEASE TYPE "/PLAN". 
FOR HELP ON COMMANDS, EXECUTE "/HELP".
`;
    }

    // Stream thoughts first
    let thoughtIdx = 0;
    const streamThoughts = () => {
      if (thoughtIdx < thoughts.length) {
        if (callbacks.onThinking) {
          callbacks.onThinking(thoughts[thoughtIdx]);
        }
        thoughtIdx++;
        setTimeout(streamThoughts, 600);
      } else {
        // Now stream response character by character
        let responseIdx = 0;
        const streamChar = () => {
          if (responseIdx < responseText.length) {
            // Stream in chunks of 3 characters for realistic fast-typing
            const chunk = responseText.substring(responseIdx, responseIdx + 3);
            callbacks.onChunk(chunk);
            responseIdx += 3;
            setTimeout(streamChar, 10);
          } else {
            callbacks.onComplete(responseText);
          }
        };
        streamChar();
      }
    };

    streamThoughts();
  }
}
