import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { MultiAgentEngine } from '../services/multiAgentEngine';
import { GeminiService } from '../services/geminiService';
import { CalendarEvent, TaskItem, EmailFeed } from '../services/googleServices';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Play, Sparkles } from 'lucide-react';

interface VoiceAssistantProps {
  uid: string;
  tasks: TaskItem[];
  calendarEvents: CalendarEvent[];
  emails: EmailFeed[];
  onTriggerFocusMode: (active: boolean) => void;
}

export const VoiceAssistantView: React.FC<VoiceAssistantProps> = ({
  uid,
  tasks,
  calendarEvents,
  emails,
  onTriggerFocusMode,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [voiceLogs, setVoiceLogs] = useState<string[]>([
    'VOICE ENGINE INITIALIZED.',
    'SAY "GUARDIAN, WHAT SHOULD I FINISH TODAY?" OR CLICK A SUGGESTION.'
  ]);
  const [textInput, setTextInput] = useState('');

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopSpeaking();
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('BROWSER DOES NOT NATIVELY SUPPORT SPEECH RECOGNITION. PLEASE USE TEXT FALLBACK BELOW.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
    };

    rec.onerror = (e: any) => {
      console.warn('Speech Recognition error:', e.error);
      setIsListening(false);
      if (e.error === 'not-allowed') {
        setErrorMsg('MICROPHONE ACCESS DENIED. CHECK BROWSER PERMISSIONS.');
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscription(text);
      handleVoiceCommand(text);
    };

    recognitionRef.current = rec;
  }, [continuousMode]); // Dependency added to keep continuousMode closure fresh

  const startListening = () => {
    stopSpeaking();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Speech recognition start error:', e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const cleanSpeechText = (text: string): string => {
    if (!text) return '';
    let cleaned = text;
    // Remove divider lines
    cleaned = cleaned.replace(/^[=\-_*]{3,}\s*$/gm, '');
    // Remove markdown headers
    cleaned = cleaned.replace(/^#+\s+/gm, '');
    // Remove terminal prompt markers
    cleaned = cleaned.replace(/^>\s*/gm, '');
    // Remove bold markers
    cleaned = cleaned.replace(/\*\*/g, '');
    // Remove list item bullet dots/dashes
    cleaned = cleaned.replace(/^[\s\-\*]+\s+/gm, '');

    // Remove noise labels case-insensitively
    const noiseLabels = [
      /RESPONSE FROM GUARDIAN COMMAND CORE/gi,
      /DIRECTIVE RECEIVED:/gi,
      /ANALYSIS:/gi,
      /INPUT PARSED SUCCESSFULLY\.?/gi,
      /GUARDIAN CORE:/gi,
      /COMMAND LOGGED\.?/gi,
      /CONVERSATIONAL COMMAND:/gi,
      /EXPLANATION:/gi,
      /ACTION:/gi
    ];
    
    for (const regex of noiseLabels) {
      cleaned = cleaned.replace(regex, '');
    }

    // Replace multiple spaces and newlines with a single space
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    stopSpeaking();

    const cleaned = cleanSpeechText(text);
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    
    const voices = synthRef.current.getVoices();
    const targetVoice = voices.find(
      v => v.name.includes('Google US English') || v.name.includes('Natural')
    );
    if (targetVoice) utterance.voice = targetVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (continuousMode) {
        setTimeout(() => {
          if (continuousMode) {
            startListening();
          }
        }, 800);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const handleMicToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleVoiceCommand = async (utterance: string) => {
    const cleanCmd = utterance.toLowerCase().trim();
    addLog(`USER SAYS: "${utterance.toUpperCase()}"`);

    // Interruption support: stop speech immediately when requested
    if (cleanCmd === 'stop' || cleanCmd === 'stop speaking' || cleanCmd === 'quiet' || cleanCmd === 'shut up' || cleanCmd === 'cancel') {
      stopSpeaking();
      setIsThinking(false);
      const response = 'PLAYBACK HALTED.';
      setAssistantReply(response);
      return;
    }

    // Context analysis for agents
    const activeTasks = tasks.filter(t => t.status === 'needsAction');
    const upcomingEvents = calendarEvents.slice(0, 3);
    const unreadEmails = emails.slice(0, 3);

    // 1. Focus Mode
    if (cleanCmd.includes('focus mode') || cleanCmd.includes('lockdown')) {
      setIsThinking(false);
      const response = 'INITIATING WORKSPACE FOCUS HUD AND DISABLING DISTRACTIONS.';
      setAssistantReply(response);
      speakText(response);
      onTriggerFocusMode(true);
      return;
    }

    // 2. Create Task from Gmail
    if (cleanCmd.includes('create task from my latest gmail') || cleanCmd.includes('create task from gmail')) {
      if (emails.length === 0) {
        setIsThinking(false);
        const response = 'NO GMAIL CORRESPONDENCE IN SYSTEM CACHE TO EXTRACT TASKS FROM.';
        setAssistantReply(response);
        speakText(response);
        return;
      }
      const latestEmail = emails[0];
      setAssistantReply(`GUARDIAN IS ANALYZING LATEST EMAIL FROM ${latestEmail.from.toUpperCase()} TO EXTRACT DIRECTIVES...`);
      setIsThinking(true);

      const prompt = `Analyze this email subject: "${latestEmail.subject}" and snippet: "${latestEmail.snippet}".
      Extract a clear action item task title (up to 5 words, in uppercase) and a brief description.
      Respond ONLY with a valid JSON block of this shape:
      {"title": "TASK TITLE", "description": "brief description"}
      Do not include markdown or wrapping.`;

      try {
        let fullText = '';
        await GeminiService.streamChat(prompt, [], {
          onChunk: (text) => {
            fullText += text;
          },
          onComplete: async (completedText) => {
            setIsThinking(false);
            try {
              const cleanJson = completedText.replace(/```json|```/gi, '').trim();
              const parsed = JSON.parse(cleanJson);
              const taskTitle = parsed.title ? parsed.title.toUpperCase() : 'EXTRACTED TASK';
              const taskNotes = parsed.description || `Extracted from email by ${latestEmail.from}`;
              const taskId = `task-${Date.now()}`;
              const newItem = {
                id: taskId,
                title: taskTitle,
                due: new Date(Date.now() + 86400000).toISOString(),
                notes: taskNotes,
                status: 'needsAction',
                threatLevel: 'HIGH',
                riskScore: 70,
                completionProbability: 75,
                energyEstimation: 50,
                countdown: '12:00:00',
                dependencies: []
              };
              await setDoc(doc(db, `users/${uid}/tasks`, taskId), newItem);
              const reply = `TASK CREATED SUCCESSFULLY FROM GMAIL. TITLE: ${taskTitle}. NOTES: ${taskNotes}.`;
              setAssistantReply(reply);
              speakText(reply);
              addLog(`CREATED TASK: ${taskTitle}`);
            } catch (jsonErr) {
              const taskId = `task-${Date.now()}`;
              const taskTitle = `TASK: ${latestEmail.subject.substring(0, 30).toUpperCase()}`;
              const newItem = {
                id: taskId,
                title: taskTitle,
                due: new Date(Date.now() + 86400000).toISOString(),
                notes: `Action required on Gmail: ${latestEmail.subject}`,
                status: 'needsAction',
                threatLevel: 'HIGH',
                riskScore: 50,
                completionProbability: 80,
                energyEstimation: 30,
                countdown: '24:00:00',
                dependencies: []
              };
              await setDoc(doc(db, `users/${uid}/tasks`, taskId), newItem);
              const reply = `EXTRACTED TASK FROM EMAIL: ${taskTitle}.`;
              setAssistantReply(reply);
              speakText(reply);
              addLog(`CREATED TASK (FALLBACK): ${taskTitle}`);
            }
          },
          onError: () => {
            setIsThinking(false);
            const fallback = 'FAILED TO INGEST GMAIL MESSAGE TO EXTRACT TASK.';
            setAssistantReply(fallback);
            speakText(fallback);
          }
        });
      } catch (err) {
        setIsThinking(false);
        const fallback = 'COULD NOT STREAM GMAIL TASK EXTRACTION DIRECTIVE.';
        setAssistantReply(fallback);
        speakText(fallback);
      }
      return;
    }

    // 3. Create Task (Manual vocal prompt)
    if (cleanCmd.startsWith('create task') || cleanCmd.startsWith('add task')) {
      setIsThinking(false);
      const rawTitle = utterance.replace(/create task|add task/gi, '').trim();
      const taskTitle = rawTitle ? rawTitle.toUpperCase() : 'NEW VOICE DIRECTIVE TASK';
      const taskId = `task-${Date.now()}`;
      const newItem = {
        id: taskId,
        title: taskTitle,
        due: new Date(Date.now() + 86400000).toISOString(),
        notes: 'GENERATED AUTOMATICALLY BY VOICE ASSISTANT.',
        status: 'needsAction',
        threatLevel: 'HIGH',
        riskScore: 60,
        completionProbability: 80,
        energyEstimation: 40,
        countdown: '08:00:00',
        dependencies: []
      };
      await setDoc(doc(db, `users/${uid}/tasks`, taskId), newItem);
      const response = `SUCCESSFULLY CREATED HIGH PRIORITY TASK: ${taskTitle}.`;
      setAssistantReply(response);
      speakText(response);
      addLog(`CREATED TASK: ${taskTitle}`);
      return;
    }

    // 4. Summarize emails
    if (cleanCmd.includes('summarize today\'s emails') || cleanCmd.includes('summarize emails') || cleanCmd.includes('check emails')) {
      if (emails.length === 0) {
        setIsThinking(false);
        const response = 'YOU HAVE NO UNREAD EMAILS IN THE SYSTEM CACHE.';
        setAssistantReply(response);
        speakText(response);
        return;
      }
      setAssistantReply('GUARDIAN IS RETRIEVING AND SUMMARIZING GMAIL INBOX TELEMETRY...');
      setIsThinking(true);

      const prompt = `You are the HellGuardian AI Operating System. Ingest these email details:
      ${emails.slice(0, 5).map((e, i) => `Email #${i+1}: From: ${e.from}, Subject: ${e.subject}, Snippet: ${e.snippet}`).join('\n')}
      Summarize the emails and highlight any action items or critical info. Respond in 2-3 sentences max.`;

      try {
        let aiResult = '';
        await GeminiService.streamChat(prompt, [], {
          onChunk: (text) => {
            aiResult += text;
            setAssistantReply(aiResult);
          },
          onComplete: (fullText) => {
            setIsThinking(false);
            speakText(fullText);
            addLog(`GMAIL SUMMARY: ${fullText}`);
          },
          onError: () => {
            setIsThinking(false);
            const fallback = 'FAILED TO COMPLETE GMAIL SUMMARIZATION ENGINE.';
            setAssistantReply(fallback);
            speakText(fallback);
          }
        });
      } catch (err) {
        setIsThinking(false);
        const fallback = 'ERROR SUMMARIZING GMAIL TELEMETRY.';
        setAssistantReply(fallback);
        speakText(fallback);
      }
      return;
    }

    // 5. Highest priority and deadlines
    if (cleanCmd.includes('highest priority') || cleanCmd.includes('find upcoming deadlines') || cleanCmd.includes('deadlines') || cleanCmd.includes('prioritize')) {
      if (activeTasks.length === 0 && upcomingEvents.length === 0) {
        setIsThinking(false);
        const response = 'YOUR SCHEDULE IS FULLY CLEAR AND ALL DEADLINES HAVE BEEN SATISFIED.';
        setAssistantReply(response);
        speakText(response);
        return;
      }
      setAssistantReply('GUARDIAN IS ANALYZING WORKSPACE DEADLINES AND TASK DIRECTIVES...');
      setIsThinking(true);

      const prompt = `You are the HellGuardian AI Operating System. Evaluate these active tasks and events:
      Tasks: ${activeTasks.map(t => `${t.title} (Threat: ${t.threatLevel}, Due: ${t.due})`).join(', ')}
      Events: ${upcomingEvents.map(e => `${e.summary} starting at ${new Date(e.start).toLocaleString()}`).join(', ')}
      Identify the absolute highest priority item that requires focus to prevent a late penalty or missed meeting. Give 2-3 sentences of advice.`;

      try {
        let aiResult = '';
        await GeminiService.streamChat(prompt, [], {
          onChunk: (text) => {
            aiResult += text;
            setAssistantReply(aiResult);
          },
          onComplete: (fullText) => {
            setIsThinking(false);
            speakText(fullText);
            addLog(`PRIORITY DIRECTIVE: ${fullText}`);
          },
          onError: () => {
            setIsThinking(false);
            const fallback = 'ERROR CALCULATING PRIORITY THREAT LEVEL.';
            setAssistantReply(fallback);
            speakText(fallback);
          }
        });
      } catch (err) {
        setIsThinking(false);
        const fallback = 'PRIORITY ENGINE ERROR.';
        setAssistantReply(fallback);
        speakText(fallback);
      }
      return;
    }

    // 6. Plan my day / study schedule
    if (cleanCmd.includes('plan my day') || cleanCmd.includes('schedule study time') || cleanCmd.includes('optimize') || cleanCmd.includes('calendar conflicts') || cleanCmd.includes('check meetings')) {
      setAssistantReply('GUARDIAN IS COMPILING CALENDAR EVENTS AND ACTIVE TASKS INTO AN OPTIMIZED DAY PLAN...');
      setIsThinking(true);

      const prompt = `You are the HellGuardian AI Operating System. Create a daily study/focus plan combining these:
      Tasks: ${activeTasks.map(t => `${t.title} (Energy: ${t.energyEstimation}%)`).join(', ')}
      Events: ${upcomingEvents.map(e => `${e.summary} at ${new Date(e.start).toLocaleTimeString()}`).join(', ')}
      Deliver a simple daily plan showing focus blocks. Keep it to 3 sentences maximum.`;

      try {
        let aiResult = '';
        await GeminiService.streamChat(prompt, [], {
          onChunk: (text) => {
            aiResult += text;
            setAssistantReply(aiResult);
          },
          onComplete: (fullText) => {
            setIsThinking(false);
            speakText(fullText);
            addLog(`DAILY PLAN: ${fullText}`);
          },
          onError: () => {
            setIsThinking(false);
            const fallback = 'ERROR EXECUTING DAY SCHEDULER.';
            setAssistantReply(fallback);
            speakText(fallback);
          }
        });
      } catch (err) {
        setIsThinking(false);
        const fallback = 'DAILY PLAN ENGINE ERROR.';
        setAssistantReply(fallback);
        speakText(fallback);
      }
      return;
    }

    // 7. General Gemini Conversational query
    setAssistantReply('GUARDIAN IS QUERYING GEMINI FOR OPERATOR RESPONSE...');
    setIsThinking(true);
    try {
      let aiResult = '';
      await GeminiService.streamChat(
        `CONVERSATIONAL COMMAND: ${utterance}`,
        [],
        {
          onChunk: (text) => {
            aiResult += text;
            setAssistantReply(aiResult);
          },
          onComplete: (fullText) => {
            setIsThinking(false);
            speakText(fullText);
            addLog(`GUARDIAN CORE: ${fullText}`);
          },
          onError: () => {
            setIsThinking(false);
            const fallback = 'COMMAND LOGGED. STANDING BY.';
            setAssistantReply(fallback);
            speakText(fallback);
          }
        }
      );
    } catch {
      setIsThinking(false);
      const fallback = 'STANDBY.';
      setAssistantReply(fallback);
      speakText(fallback);
    }
  };

  const addLog = (log: string) => {
    setVoiceLogs(prev => [log, ...prev].slice(0, 15));
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscription(textInput);
    handleVoiceCommand(textInput);
    setTextInput('');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6">
      <div className="flex-1 tech-card p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[#12344A] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#00FF9D]" size={18} />
            <h2 className="text-sm font-bold text-[#00FF9D] tracking-wider">GUARDIAN VOICE CORE</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setContinuousMode(!continuousMode)}
              className={`px-3 py-1 border text-[10px] font-bold tracking-widest transition-all ${
                continuousMode
                  ? 'border-[#00D4FF] bg-[#00D4FF]/10 text-[#00D4FF]'
                  : 'border-[#12344A] text-[#4f94c4] hover:text-[#EAF7FF]'
              }`}
            >
              CONTINUOUS CONVERSATION: {continuousMode ? 'ENGAGED' : 'STANDBY'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="border border-[#FF4040]/50 bg-[#FF4040]/5 p-3 flex items-center gap-3 text-xs text-[#FF4040] font-bold">
            <AlertCircle size={16} className="shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Visual equalizer/animation display */}
        <div className="h-40 border border-[#12344A] bg-[#04070C] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
              <div
                key={i}
                className={`w-1.5 transition-all duration-300 rounded ${
                  isListening
                    ? 'h-24 bg-[#00D4FF] animate-pulse'
                    : isThinking
                    ? 'h-16 bg-[#32F3FF] animate-bounce'
                    : isSpeaking
                    ? 'h-20 bg-[#00FF9D] animate-pulse'
                    : 'h-6 bg-[#12344A]'
                }`}
                style={{
                  animationDelay: `${i * 80}ms`,
                  animationDuration: isListening ? '0.6s' : isThinking ? '0.7s' : '0.4s'
                }}
              />
            ))}
          </div>

          <div className="z-10 flex flex-col items-center gap-3">
            <button
              onClick={handleMicToggle}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-[#FF4040] text-[#04070C] shadow-lg shadow-[#FF4040]/20 animate-pulse'
                  : isSpeaking
                  ? 'bg-[#00FF9D] text-[#04070C] shadow-lg shadow-[#00FF9D]/20 animate-pulse'
                  : 'bg-[#00D4FF]/15 border border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF] hover:text-[#04070C]'
              }`}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <span className="text-[10px] font-bold tracking-widest text-[#4f94c4]">
              {isListening 
                ? 'LISTENING TO OPERATOR INPUT...' 
                : isThinking 
                ? 'GUARDIAN DECODING WORKSPACE LOGS...' 
                : isSpeaking 
                ? 'GUARDIAN CONVERSATIONAL RESPONSE...' 
                : 'VOICE CAPTURE STANDBY'}
            </span>
          </div>

          {(isSpeaking || isThinking) && (
            <button
              onClick={stopSpeaking}
              className="absolute right-4 bottom-4 border border-[#FF4040] text-[#FF4040] hover:bg-[#FF4040]/10 px-2 py-1 text-[9px] font-bold tracking-widest"
            >
              INTERRUPT PLAYBACK
            </button>
          )}
        </div>

        {/* Real-time Transcription panel */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-[#4f94c4]">OPERATOR UTTERANCE TRANSCRIPTION:</div>
          <div className="min-h-12 border border-[#12344A] bg-[#04070C] p-3 text-xs text-[#EAF7FF] font-semibold leading-relaxed">
            {transcription ? `> "${transcription.toUpperCase()}"` : '> NO INPUT DETECTED.'}
          </div>
        </div>

        {/* AI response panel */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-[#4f94c4]">GUARDIAN RESPONDER:</div>
          <div className="min-h-20 border border-[#12344A] bg-[#04070C] p-3 text-xs text-[#00FF9D] font-bold leading-relaxed whitespace-pre-wrap">
            {assistantReply ? `> ${assistantReply.toUpperCase()}` : '> STANDING BY FOR OPERATOR COMMAND.'}
          </div>
        </div>

        {/* Text fallback simulation */}
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="TYPE COMMAND TO SIMULATE VOICE INPUT..."
            className="flex-1 bg-[#04070C] border border-[#12344A] px-3 py-2 text-xs text-[#EAF7FF] placeholder-[#4f94c4] focus:outline-none focus:border-[#00D4FF]"
          />
          <button
            type="submit"
            className="border border-[#00D4FF] hover:bg-[#00D4FF]/10 text-[#00D4FF] px-4 text-xs font-bold tracking-widest"
          >
            SEND
          </button>
        </form>
      </div>

      {/* Suggested prompts & logs */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="tech-card p-4 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-[#00D4FF] border-b border-[#12344A] pb-2">SUGGESTED COMMANDS</h3>
          <div className="flex flex-col gap-2">
            {[
              'Guardian, what should I finish today?',
              'Summarize today\'s emails',
              'What is my highest priority?',
              'Plan my day',
              'Create task from my latest gmail',
              'Initiate focus mode'
            ].map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTranscription(cmd);
                  handleVoiceCommand(cmd);
                }}
                className="text-left border border-[#12344A] hover:border-[#00D4FF] p-2.5 text-[10px] text-[#4f94c4] hover:text-[#00D4FF] font-bold uppercase transition-all duration-200"
              >
                &gt; "{cmd}"
              </button>
            ))}
          </div>
        </div>

        <div className="tech-card p-4 flex-1 flex flex-col gap-3 min-h-60 max-h-80 overflow-y-auto">
          <h3 className="text-xs font-bold text-[#00D4FF] border-b border-[#12344A] pb-2">VOICE INTERFACE LOGS</h3>
          <div className="flex-1 flex flex-col gap-1.5 text-[9px] font-semibold text-[#4f94c4] overflow-y-auto pr-1">
            {voiceLogs.map((log, idx) => (
              <div key={idx} className="border-b border-[#12344A]/30 pb-1 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
