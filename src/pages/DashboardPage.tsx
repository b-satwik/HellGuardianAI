import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CyberSnowfall } from '../components/CyberSnowfall';
import { GeminiService } from '../services/geminiService';
import { GoogleServices, CalendarEvent, TaskItem, EmailFeed } from '../services/googleServices';
import { MultiAgentEngine, DecisionEntry, AgentMemoryEntry } from '../services/multiAgentEngine';
import { AnalyticsView } from '../components/AnalyticsView';
import { NotificationCenter } from '../components/NotificationCenter';
import { VoiceAssistantView } from '../components/VoiceAssistantView';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc } from 'firebase/firestore';
import {
  Terminal as TermIcon,
  ShieldAlert,
  Calendar as CalIcon,
  CheckSquare,
  Brain,
  BarChart2,
  Settings as SettingsIcon,
  AlertTriangle,
  Power,
  LogOut,
  ChevronRight,
  Plus,
  Trash2,
  Send,
  Minimize2,
  Maximize2,
  Clock,
  ExternalLink,
  ShieldAlert as EmergencyIcon,
  Mic,
  Volume2,
  VolumeX
} from 'lucide-react';

type TabType = 'DASHBOARD' | 'TASKS' | 'CALENDAR' | 'AI_PLANNER' | 'MEMORY' | 'ANALYTICS' | 'SETTINGS' | 'VOICE_ASSISTANT';

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'EMERGENCY';
  timestamp: string;
}

export const DashboardPage: React.FC = () => {
  const { user, googleToken, linkGoogleAccount, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  
  // Realtime Data State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [emails, setEmails] = useState<EmailFeed[]>([]);
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [memories, setMemories] = useState<AgentMemoryEntry[]>([]);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [aiPlan, setAiPlan] = useState<any>({
    suggestedMission: 'INITIALIZING ACTIVE THREAT SCAN...',
    plannerReport: 'PENDING AGENT EXECUTION...',
    schedulerReport: 'PENDING AUDIT...',
    riskReport: 'CALCULATING PROBABILITIES...',
    emailReport: 'SCANNING INGRESS ALERTS...',
    recoveryReport: 'STANDBY...',
    burnoutIndex: 0,
    focusScore: 0
  });

  const [aiThoughts, setAiThoughts] = useState<string[]>([
    'KERNEL BOOT SUCCESSFUL...',
    'SCANNING WORKSPACE CHANNELS...',
    'GUARDIAN ACTIVE AND WATCHING CALENDAR...'
  ]);

  // UI state
  const [emergencyLockdown, setEmergencyLockdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tasks Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskThreat, setNewTaskThreat] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newTaskEnergy, setNewTaskEnergy] = useState(50);
  const [newTaskDeps, setNewTaskDeps] = useState('');

  // Floating Terminal State
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalMinimized, setTerminalMinimized] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'HELLGUARDIAN AI GUARDIAN CONSOLE ACTIVE.',
    'TYPE /HELP FOR SERVICE COMMANDS OR ASK ME IN NATURAL LANGUAGE.'
  ]);
  const [terminalPosition, setTerminalPosition] = useState({ x: 100, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const terminalRef = useRef<HTMLDivElement | null>(null);

  // Timer Countdown state (Threat countdown to nearest task)
  const [countdownStr, setCountdownStr] = useState('02:44:12');

  // 1. Initial Google Sync on login
  useEffect(() => {
    if (!user) return;
    const syncData = async () => {
      setIsLoading(true);
      try {
        await GoogleServices.syncWorkspaceToFirestore(user.uid, googleToken);
      } catch (err) {
        console.error('Workspace sync failed:', err);
      } finally {
        setIsLoading(false);
      }
      
      // Fire Agent Orchestrator runtime loop
      MultiAgentEngine.runOrchestration(user.uid, 'DASHBOARD_INITIAL_INGRESS');
    };
    syncData();
  }, [user, googleToken]);

  // 2. Setup Realtime Listeners for all collections
  useEffect(() => {
    if (!user) return;

    // Calendar cache listener
    const unsubCalendar = onSnapshot(collection(db, `users/${user.uid}/calendar_cache`), (snap) => {
      const items = snap.docs.map(doc => doc.data() as CalendarEvent);
      setCalendarEvents(items);
    });

    // Tasks listener
    const unsubTasks = onSnapshot(collection(db, `users/${user.uid}/tasks`), (snap) => {
      const items = snap.docs.map(doc => doc.data() as TaskItem);
      setTasks(items);
    });

    // Gmail cache listener
    const unsubGmail = onSnapshot(collection(db, `users/${user.uid}/gmail_cache`), (snap) => {
      const items = snap.docs.map(doc => doc.data() as EmailFeed);
      setEmails(items);
    });

    // Decision logs listener
    const unsubDecisions = onSnapshot(collection(db, `users/${user.uid}/decision_log`), (snap) => {
      const items = snap.docs.map(doc => doc.data() as DecisionEntry);
      // Sort by timestamp
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setDecisions(items);
    });

    // Memory listener
    const unsubMemory = onSnapshot(collection(db, `users/${user.uid}/agent_memory`), (snap) => {
      const items = snap.docs.map(doc => doc.data() as AgentMemoryEntry);
      setMemories(items);
    });

    // AI plan cache listener
    const unsubAiPlan = onSnapshot(doc(db, `users/${user.uid}/analytics`, 'ai_plan'), (docSnap) => {
      if (docSnap.exists()) {
        setAiPlan(docSnap.data());
      }
    });

    // Notifications (Toasts) listener
    const unsubNoti = onSnapshot(collection(db, `users/${user.uid}/notifications`), (snap) => {
      const items = snap.docs.map(doc => doc.data() as ToastAlert);
      setToasts(items);
    });

    return () => {
      unsubCalendar();
      unsubTasks();
      unsubGmail();
      unsubDecisions();
      unsubMemory();
      unsubAiPlan();
      unsubNoti();
    };
  }, [user]);

  // 3. Emergency Mode Auto-Activator (deadlines < 24 hrs or conflicts)
  useEffect(() => {
    if (tasks.length === 0) return;
    const now = Date.now();
    const hasCloseDeadline = tasks.some(t => {
      if (t.status === 'completed' || !t.due) return false;
      const diff = new Date(t.due).getTime() - now;
      return diff > 0 && diff < 24 * 60 * 60 * 1000; // < 24 hrs
    });

    if (hasCloseDeadline) {
      setEmergencyLockdown(true);
    }
  }, [tasks]);

  // Countdown timer simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const parts = countdownStr.split(':').map(Number);
      let s = parts[0] * 3600 + parts[1] * 60 + parts[2] - 1;
      if (s < 0) s = 10000;
      const h = Math.floor(s / 3600).toString().padStart(2, '0');
      const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
      const sec = (s % 60).toString().padStart(2, '0');
      setCountdownStr(`${h}:${m}:${sec}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownStr]);

  // Live thinking logs
  useEffect(() => {
    const thoughts = [
      'SCANNING GMAIL FOR INCOMING ASSIGNMENTS...',
      'FOUND ASSIGNMENT DUE TOMORROW ON GMAIL INBOX.',
      'READING GOOGLE CALENDAR ENTRIES...',
      'DETECTION: MEETING CONFLICT DETECTED FOR TOMORROW.',
      'OPTIMIZING TODAY\'S STUDY AND TASK SCHEDULE...',
      'ANALYZING UPLOADED WORKSPACE RESEARCH PDFS...',
      'SUCCESSFULLY EXTRACTED THREE ACTION ITEMS FROM FILE.',
      'COMPILING CONTEXTUAL AI SUMMARY NOTES...',
      'SCHEDULING NEW CALENDAR DEADLINE REMINDER.',
      'VALIDATING COMPLETED ITEMS IN GOOGLE TASKS...',
      'DAILY PLAN COMPLETED BY AI PLANNING ENGINE.'
    ];
    const interval = setInterval(() => {
      const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
      setAiThoughts((prev) => [
        `[${new Date().toLocaleTimeString()}] ${randomThought}`,
        ...prev.slice(0, 14)
      ]);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLDivElement && e.target.classList.contains('drag-handle')) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - terminalPosition.x,
        y: e.clientY - terminalPosition.y
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setTerminalPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Execute terminal inputs
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd || !user) return;

    setTerminalLogs((prev) => [...prev, `> ${cmd.toUpperCase()}`]);
    setTerminalInput('');

    // Stream thoughts in Live AI thinking
    setAiThoughts((prev) => [
      `[${new Date().toLocaleTimeString()}] INGESTING SHELL CMD: ${cmd.toUpperCase()}`,
      ...prev
    ]);

    // Handle commands
    const lowercaseCmd = cmd.toLowerCase();
    if (lowercaseCmd === '/help') {
      setTerminalLogs((prev) => [
        ...prev,
        '[GUARDIAN] COMMAND CONSOLE SERVICES:',
        '  /HELP      - DISPLAY ACTIVE SYSTEM COMMANDS.',
        '  /STATUS    - REPORT API INTEGRITY AND WORKSPACE METRICS.',
        '  /PLAN      - FORCE AI AGENT RE-SCHEDULING PLANNER.',
        '  /EMAIL     - PRINT RECENT EMAIL SUMMARIES.',
        '  /CALENDAR  - LIST DETECTED WORKSPACE MEETINGS.',
        '  /TASKS     - LIST ACTIVE WORKSPACE TASKS.',
        '  /HISTORY   - QUERY AI DECISIONS AND RECOMMENDATIONS.',
        '  /FOCUS     - ACTIVATE DEEP WORK FOCUS MODE.',
        '  /EMERGENCY - TRIGGER CRISIS SCHEDULE OPTIMIZATION.',
        '  /SETTINGS  - INSPECT WORKSPACE ENVIRONMENT CONFIG.'
      ]);
      return;
    }

    if (lowercaseCmd === '/status') {
      setTerminalLogs((prev) => [
        ...prev,
        `[GUARDIAN] WORKSPACE GATEWAYS REPORT:`,
        `  MODEL: GEMINI 1.5 FLASH (ONLINE)`,
        `  FIRESTORE: ONLINE (LISTENING)`,
        `  GOOGLE WORKSPACE: ${googleToken ? 'CONNECTED' : 'MOCK FALLBACK ACTIVE'}`,
        `  LATENCY: 14MS | WORKSPACE STATE: OPTIMIZED`
      ]);
      return;
    }

    if (lowercaseCmd === '/tasks') {
      const list = tasks.map(t => `  - [${t.threatLevel}] ${t.title} (${t.status})`).join('\n');
      setTerminalLogs((prev) => [
        ...prev,
        `[GUARDIAN] ACTIVE TASKS:\n${list || '  NO ACTIVE TASKS.'}`
      ]);
      return;
    }

    if (lowercaseCmd === '/calendar') {
      const list = calendarEvents.map(e => `  - ${e.summary} (${e.start})`).join('\n');
      setTerminalLogs((prev) => [
        ...prev,
        `[GUARDIAN] INCOMING CALENDAR EVENTS:\n${list || '  NO EVENTS DETECTED.'}`
      ]);
      return;
    }

    if (lowercaseCmd === '/email') {
      const list = emails.map(m => `  - FROM ${m.from}: ${m.subject}`).join('\n');
      setTerminalLogs((prev) => [
        ...prev,
        `[GUARDIAN] IMPORTANT EMAILS SUMMARIES:\n${list || '  NO UNREAD ALERTS.'}`
      ]);
      return;
    }

    if (lowercaseCmd === '/history') {
      const list = decisions.map(d => `  - ${d.action}: ${d.explanation}`).join('\n');
      setTerminalLogs((prev) => [
        ...prev,
        `[GUARDIAN] AI PRODUCTIVITY ACTION TIMELINE:\n${list || '  NO ACTIONS RECORDED.'}`
      ]);
      return;
    }

    if (lowercaseCmd === '/focus') {
      setTerminalLogs((prev) => [...prev, '[GUARDIAN] DEPLOYING FOCUS MODE SHIELD. 25:00 MINUTES DEEP WORK STARTING.']);
      return;
    }

    if (lowercaseCmd === '/emergency') {
      setEmergencyLockdown(true);
      setTerminalLogs((prev) => [...prev, '[GUARDIAN] CRISIS RECOVERY SPRINT OPTIMIZATION INITIATED.']);
      return;
    }

    // Default: Ask Gemini
    await GeminiService.streamChat(
      cmd,
      [],
      {
        onChunk: (chunk) => {
          setTerminalLogs((prev) => {
            const next = [...prev];
            if (next.length === 0 || !next[next.length - 1].startsWith('[GUARDIAN]')) {
              next.push(`[GUARDIAN] ${chunk}`);
            } else {
              next[next.length - 1] = next[next.length - 1] + chunk;
            }
            return next;
          });
        },
        onThinking: (thought) => {
          setAiThoughts((prev) => [
            `[${new Date().toLocaleTimeString()}] AI THOUGHT: ${thought}`,
            ...prev
          ]);
        },
        onComplete: () => {},
        onError: (err) => {
          setTerminalLogs((prev) => [...prev, `[ERROR] SHELL EXCEPTION: ${err.message || err}`]);
        }
      }
    );
  };

  // Add Custom Task to Firestore
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;

    const risk = newTaskThreat === 'CRITICAL' ? 95 : newTaskThreat === 'HIGH' ? 80 : newTaskThreat === 'MEDIUM' ? 50 : 20;
    const taskId = `custom-${Date.now()}`;
    const item: TaskItem = {
      id: taskId,
      title: newTaskTitle.toUpperCase(),
      due: new Date(Date.now() + 86400000).toISOString(),
      notes: 'OPERATOR DEPLOYED DIRECTIVE.',
      status: 'needsAction',
      threatLevel: newTaskThreat,
      riskScore: risk,
      completionProbability: 85,
      energyEstimation: newTaskEnergy,
      countdown: '08:00:00',
      dependencies: newTaskDeps ? newTaskDeps.split(',').map(d => d.trim().toUpperCase()) : [],
    };

    await setDoc(doc(db, `users/${user.uid}/tasks`, taskId), item);
    setNewTaskTitle('');
    setNewTaskDeps('');

    // Trigger background multi-agent orchestrator loop
    MultiAgentEngine.runOrchestration(user.uid, `TASK_ADDED: ${item.title}`);
  };

  // Delete Task from Firestore
  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/tasks`, id));
    
    // Trigger background multi-agent orchestrator loop
    MultiAgentEngine.runOrchestration(user.uid, `TASK_DELETED: ${id}`);
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#04070C] text-[#EAF7FF] flex flex-row overflow-hidden font-mono select-none">
      
      <CyberSnowfall />
      <div className="cyber-grid absolute inset-0 z-0 opacity-20 pointer-events-none" />
      <div className="crt-overlay pointer-events-none" />
      <div className="scanline-bar" />
      <div className="noise-overlay" />
      <div className="ambient-glow" />
      <div className="ambient-glow-red" />

      {/* TOAST ALERT OVERLAY */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {toasts.slice(-3).map(toast => (
          <div key={toast.id} className="border border-[#FF4040] bg-[#091019] p-3 text-xs text-[#FF4040] font-bold shadow-lg shadow-black/80 flex items-center gap-3 animate-slide-in">
            <AlertTriangle className="animate-pulse" size={16} />
            <div>
              <div>{toast.title}</div>
              <div className="text-[10px] text-[#EAF7FF] font-normal mt-1">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* EMERGENCY MODE LOCKDOWN FULLSCREEN OVERLAY */}
      {emergencyLockdown && (
        <div className="fixed inset-0 bg-[#04070C] z-[99999] border-8 border-[#FF4040] flex flex-col justify-center items-center p-6 animate-pulse">
          <div className="text-[#FF4040] text-9xl mb-6 font-bold text-glow-red">
            <EmergencyIcon size={128} className="animate-spin inline" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-[#FF4040] text-glow-red mb-4 text-center">
            FOCUS MODE ACTIVE
          </h1>
          <p className="text-sm md:text-lg text-[#EAF7FF] max-w-xl text-center leading-relaxed mb-8">
            HELLGUARDIAN AUTONOMOUS FOCUS ACTIVE. SPRINT SCHEDULE OPTIMIZED TO PREVENT TIMELINE BREACH.
          </p>
          <div className="bg-[#091019] border border-[#FF4040] p-4 text-xs text-[#FF4040] mb-8 font-bold leading-normal w-full max-w-lg">
            &gt; SYSTEM STATE: FOCUS DEPLOYED<br />
            &gt; RECOVERY PLAN: {aiPlan.recoveryReport || 'FOCUS COMPLETION OF TOP TASKS IMMEDIATELY.'}<br />
            &gt; COMPLETION PROBABILITY: {aiPlan.focusScore}%
          </div>
          <button
            onClick={() => setEmergencyLockdown(false)}
            className="border-2 border-[#FF4040] text-[#FF4040] hover:bg-[#FF4040] hover:text-[#04070C] font-bold py-3 px-8 text-sm tracking-widest transition-all duration-300"
          >
            DISENGAGE FOCUS MODE
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR NAVBAR */}
      <aside className="w-64 bg-[#091019] border-r border-[#12344A] flex flex-col z-10 shrink-0">
        <div className="p-4 border-b border-[#12344A] flex items-center justify-center gap-2">
          <ShieldAlert className="text-[#00D4FF]" size={20} />
          <span className="font-bold tracking-wider text-[#00D4FF] text-sm">HELLGUARDIAN AI</span>
        </div>

        <nav className="flex-1 px-3 py-6 flex flex-col gap-2">
          {[
            { id: 'DASHBOARD', label: 'DASHBOARD', icon: TermIcon },
            { id: 'TASKS', label: 'TASKS DIRECTORY', icon: CheckSquare },
            { id: 'CALENDAR', label: 'CALENDAR FEED', icon: CalIcon },
            { id: 'AI_PLANNER', label: 'AI PLANNER', icon: Brain },
            { id: 'VOICE_ASSISTANT', label: 'VOICE ASSISTANT', icon: Mic },
            { id: 'MEMORY', label: 'GUARDIAN MEMORY', icon: Brain },
            { id: 'ANALYTICS', label: 'PRODUCTIVITY ANALYTICS', icon: BarChart2 },
            { id: 'SETTINGS', label: 'WORKSPACE SETTINGS', icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-3 px-4 py-3 border text-xs font-bold tracking-wider transition-all duration-300 ${
                  active
                    ? 'bg-[#00D4FF]/10 border-[#00D4FF] text-[#7DF9FF] text-glow-blue'
                    : 'bg-transparent border-transparent text-[#4f94c4] hover:text-[#EAF7FF] hover:border-[#12344A]'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setEmergencyLockdown(true)}
            className="flex items-center gap-3 px-4 py-3 border border-transparent text-xs font-bold tracking-wider text-[#FF4040] hover:bg-[#FF4040]/10 hover:border-[#FF4040] transition-all duration-300 mt-auto"
          >
            <ShieldAlert size={16} className="animate-pulse" />
            <span>FOCUS MODE</span>
          </button>
        </nav>

        {/* User badge */}
        <div className="p-4 border-t border-[#12344A] bg-[#04070C]/50 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded bg-[#12344A] border border-[#00D4FF] flex items-center justify-center text-[#EAF7FF] text-xs font-bold">
              {user?.displayName ? user.displayName.substring(0, 2) : 'OP'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold truncate text-[#EAF7FF]">{user?.displayName || 'OPERATOR'}</div>
              <div className="text-[10px] text-[#4f94c4] truncate">{user?.email?.split('@')[0]}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-[#4f94c4] hover:text-[#FF4040] transition-colors duration-300"
            title="LOGOUT FROM WORKSPACE"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* CENTER WORKSPACE PANEL */}
      <main className="flex-1 flex flex-col min-w-0 z-10 overflow-y-auto p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#12344A] pb-4 mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-[#00D4FF] text-glow-blue">
              GUARDIAN WORKSPACE: {activeTab}
            </h1>
            <p className="text-xs text-[#4f94c4] mt-1">
              STATUS: OPERATIONAL | RECENT SYNC: SUCCESS | EXECUTOR: AI PLANNING ENGINE
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="tech-card border-[#FF4040]/50 px-4 py-2 flex items-center gap-3">
              <Clock size={16} className="text-[#FF4040] animate-pulse" />
              <div>
                <div className="text-[9px] text-[#FF4040]">TIME TO NEAREST DEADLINE</div>
                <div className="text-sm font-bold text-[#EAF7FF] tracking-widest">{countdownStr}</div>
              </div>
            </div>
            
            <NotificationCenter />
            
            <button
              onClick={() => setTerminalOpen(!terminalOpen)}
              className={`px-4 py-2 border text-xs font-bold tracking-widest transition-all duration-300 ${
                terminalOpen 
                  ? 'bg-[#32F3FF]/15 border-[#32F3FF] text-[#32F3FF]' 
                  : 'border-[#12344A] text-[#4f94c4] hover:text-[#EAF7FF]'
              }`}
            >
              [ GUARDIAN CONSOLE ]
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex-1 flex flex-col justify-center items-center font-bold text-[#00D4FF]">
            <div className="animate-spin text-4xl mb-4">/</div>
            <div>DECRYPTING WORKSPACE DATA...</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6">
            
            {activeTab === 'DASHBOARD' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Unified Today's Focus */}
                <div className="tech-card p-5 flex flex-col gap-4 lg:col-span-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#00FF9D] border-b border-[#12344A] pb-2">
                    <div className="flex items-center gap-2">
                      <Brain size={14} />
                      <span>GUARDIAN: ACTIVE PRODUCTIVITY SUMMARY</span>
                    </div>
                    <span className="text-[10px] text-[#00FF9D] border border-[#00FF9D] px-2 py-0.5 font-bold">
                      PRODUCTIVITY score: {aiPlan.focusScore}%
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#EAF7FF] bg-[#00FF9D]/5 border border-[#00FF9D]/20 p-4 rounded leading-relaxed">
                    &gt; TODAY'S FOCUS: {aiPlan.suggestedMission}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="border border-[#12344A] p-3">
                      <div className="text-[9px] text-[#4f94c4] font-bold">TODAY'S PLAN</div>
                      <div className="text-[#EAF7FF] mt-1 truncate">{aiPlan.plannerReport}</div>
                    </div>
                    <div className="border border-[#12344A] p-3">
                      <div className="text-[9px] text-[#4f94c4] font-bold">DEADLINE HEALTH</div>
                      <div className="text-[#FF4040] mt-1 truncate">{aiPlan.riskReport}</div>
                    </div>
                    <div className="border border-[#12344A] p-3">
                      <div className="text-[9px] text-[#4f94c4] font-bold">CALENDAR STATUS</div>
                      <div className="text-[#32F3FF] mt-1 truncate">{aiPlan.schedulerReport}</div>
                    </div>
                  </div>
                </div>

                {/* Today's Tasks */}
                <div className="tech-card p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#32F3FF] border-b border-[#12344A] pb-2">
                    <ShieldAlert size={14} />
                    <span>TODAY'S PRIORITIES</span>
                  </div>
                  {tasks.filter(t => t.status === 'needsAction').length === 0 ? (
                    <div className="text-xs text-[#4f94c4] italic p-3 border border-dashed border-[#12344A]/50">
                      YOU COMPLETED EVERYTHING TODAY. EXCELLENT WORK.
                    </div>
                  ) : (
                    tasks.filter(t => t.status === 'needsAction').slice(0, 3).map((t, idx) => (
                      <div key={t.id} className="border border-[#12344A] p-3 rounded flex justify-between items-center bg-[#091019]">
                        <div>
                          <div className="text-xs font-bold text-[#EAF7FF]">{t.title}</div>
                          <div className="text-[10px] text-[#4f94c4] mt-1">PRIORITY: {t.threatLevel} | BURNOUT PROBABILITY: {t.riskScore}%</div>
                        </div>
                        <div className="text-xs font-bold text-[#00FF9D]">{t.completionProbability}% PROB</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Critical Alerts (Gmail) */}
                <div className="tech-card p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FF4040] border-b border-[#12344A] pb-2">
                    <AlertTriangle size={14} />
                    <span>IMPORTANT EMAILS</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                    {emails.length === 0 ? (
                      <div className="text-xs text-[#4f94c4] italic p-3 border border-dashed border-[#12344A]/50">
                        NO IMPORTANT EMAILS. GREAT OPPORTUNITY FOR DEEP WORK.
                      </div>
                    ) : (
                      emails.slice(0, 3).map(email => (
                        <div key={email.id} className="border border-[#FF4040]/30 bg-[#FF4040]/5 p-3 rounded text-xs">
                          <div className="flex justify-between items-center font-bold text-[#FF4040] mb-1">
                            <span>{email.from.slice(0, 24)}</span>
                            <span className="text-[10px] text-[#4f94c4]">{email.date}</span>
                          </div>
                          <div className="text-[#EAF7FF] font-semibold">{email.subject}</div>
                          <div className="text-[10px] text-[#EAF7FF]/70 mt-1 truncate">{email.snippet}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Google Calendar sync */}
                <div className="tech-card p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00D4FF] border-b border-[#12344A] pb-2">
                    <CalIcon size={14} />
                    <span>TODAY'S CALENDAR</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {calendarEvents.length === 0 ? (
                      <div className="text-xs text-[#4f94c4] italic p-3 border border-dashed border-[#12344A]/50">
                        NO MEETINGS TODAY. WOULD YOU LIKE TO SCHEDULE FOCUSED STUDY TIME?
                      </div>
                    ) : (
                      calendarEvents.slice(0, 3).map(event => (
                        <div key={event.id} className="border border-[#12344A] p-3 flex justify-between items-center text-xs">
                          <div>
                            <div className="font-bold text-[#EAF7FF]">{event.summary}</div>
                            <div className="text-[10px] text-[#4f94c4] mt-1">{new Date(event.start).toLocaleString()}</div>
                          </div>
                          <span className="text-[9px] border border-[#12344A] px-2 py-0.5 font-bold text-[#00D4FF]">
                            PRIORITY: {event.threatLevel}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Decisions Log Timeline */}
                <div className="tech-card p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00FF9D] border-b border-[#12344A] pb-2">
                    <Brain size={14} />
                    <span>GUARDIAN RECOMMENDATIONS</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                    {decisions.length === 0 ? (
                      <div className="text-xs text-[#4f94c4] italic p-3 border border-dashed border-[#12344A]/50">
                        NO DECISIONS LOGGED YET. INITIALIZING ENGINE...
                      </div>
                    ) : (
                      decisions.slice(0, 3).map((dec, idx) => (
                        <div key={dec.id} className="border border-[#12344A] p-3 text-xs leading-normal">
                          <div className="text-[#00FF9D] font-bold mb-1">&gt; {dec.action}</div>
                          <div className="text-[10px] text-[#EAF7FF]/80">{dec.explanation}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* VIEW: TASKS */}
            {activeTab === 'TASKS' && (
              <div className="flex flex-col gap-6">
                <form onSubmit={handleAddTask} className="tech-card p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#32F3FF]">NEW TASK DIRECTIVE</label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="E.G. PREPARE PRESENTATION SLIDES"
                      className="bg-[#04070C] border border-[#12344A] focus:border-[#32F3FF] p-2 text-sm text-[#EAF7FF] outline-none uppercase font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#32F3FF]">PRIORITY LEVEL</label>
                    <select
                      value={newTaskThreat}
                      onChange={(e: any) => setNewTaskThreat(e.target.value)}
                      className="bg-[#04070C] border border-[#12344A] p-2 text-sm text-[#EAF7FF] outline-none font-mono"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="bg-[#00D4FF]/10 border border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF] hover:text-[#04070C] font-bold p-2 text-sm tracking-widest transition-all duration-300"
                  >
                    CREATE TASK
                  </button>
                </form>

                <div className="flex flex-col gap-4">
                  {tasks.map(t => (
                    <div key={t.id} className={`tech-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 ${
                      t.threatLevel === 'CRITICAL' ? 'border-l-[#FF4040]' : t.threatLevel === 'HIGH' ? 'border-l-[#00D4FF]' : 'border-l-[#12344A]'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 border font-bold ${
                            t.threatLevel === 'CRITICAL' ? 'border-[#FF4040] text-[#FF4040]' : 'border-[#12344A] text-[#00D4FF]'
                          }`}>{t.threatLevel}</span>
                          <span className="text-xs text-[#4f94c4]">ENERGY: {t.energyEstimation}% | STATUS: {t.status}</span>
                        </div>
                        <h3 className="text-sm font-bold text-[#EAF7FF] mt-2">{t.title}</h3>
                        <p className="text-xs text-[#EAF7FF]/80 mt-1">{t.notes}</p>
                      </div>

                      <div className="flex items-center gap-6 self-end md:self-auto">
                        <div className="text-right">
                          <div className="text-[10px] text-[#4f94c4]">BURNOUT RISK</div>
                          <div className="text-sm font-bold text-[#EAF7FF]">{t.riskScore}%</div>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="text-[#4f94c4] hover:text-[#FF4040] transition-colors p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW: CALENDAR */}
            {activeTab === 'CALENDAR' && (
              <div className="tech-card p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  {calendarEvents.map(e => (
                    <div key={e.id} className="border border-[#12344A] p-4 flex justify-between items-center hover:border-[#00D4FF] transition-all">
                      <div>
                        <h4 className="text-sm font-bold text-[#EAF7FF]">{e.summary}</h4>
                        <p className="text-xs text-[#4f94c4] mt-1">{new Date(e.start).toLocaleString()} - {new Date(e.end).toLocaleTimeString()}</p>
                        <p className="text-xs text-[#EAF7FF]/60 mt-2">{e.description}</p>
                      </div>
                      <span className="text-xs font-bold text-[#FF4040] border border-[#FF4040] px-3 py-1 bg-[#FF4040]/10">
                        PRIORITY: {e.threatLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW: AI PLANNER */}
            {activeTab === 'AI_PLANNER' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="tech-card p-6 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-[#00D4FF] border-b border-[#12344A] pb-2">AUTONOMOUS SCHEDULE OPTIMIZER</h3>
                  <p className="text-xs text-[#EAF7FF]/85 leading-relaxed">
                    PLANNING DIRECTIVES ARE COMPILED IN BACKLOAD CHANNELS. FORCE A COMPLETE RE-SCHEDULING AND PRODUCTIVITY RE-ALIGNMENT.
                  </p>
                  <button
                    onClick={() => user && MultiAgentEngine.runOrchestration(user.uid, 'MANUAL_PLAN_RECALCULATION')}
                    className="border border-[#32F3FF] text-[#32F3FF] hover:bg-[#32F3FF]/10 py-3.5 text-xs font-bold tracking-widest uppercase mt-4"
                  >
                    TRIGGER WORKSPACE PLANNER
                  </button>
                </div>

                <div className="tech-card p-6 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-[#00FF9D] border-b border-[#12344A] pb-2">AI PLANNING ENGINE RUNTIME</h3>
                  <div className="flex flex-col gap-3 text-xs leading-normal">
                    <div className="border border-[#12344A] p-3">
                      <span className="text-[#32F3FF]">[PLANNER]</span> {aiPlan.plannerReport}
                    </div>
                    <div className="border border-[#12344A] p-3">
                      <span className="text-[#00FF9D]">[SCHEDULER]</span> {aiPlan.schedulerReport}
                    </div>
                    <div className="border border-[#12344A] p-3">
                      <span className="text-[#FF4040]">[RECOVERY]</span> {aiPlan.recoveryReport}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: MEMORY */}
            {activeTab === 'MEMORY' && (
              <div className="tech-card p-6 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-[#00FF9D] border-b border-[#12344A] pb-2">GUARDIAN MEMORY STORAGE</h3>
                <div className="flex flex-col gap-3">
                  {memories.map((m, index) => (
                    <div key={m.id} className="border border-[#12344A] p-3 text-xs text-[#EAF7FF]/80">
                      &gt; [{m.patternType}] {m.observation} (IMPACT SCORE: {m.impactScore}/100)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW: ANALYTICS */}
            {activeTab === 'ANALYTICS' && (
              <div className="flex-1 flex flex-col gap-6">
                <AnalyticsView />
              </div>
            )}

            {/* VIEW: SETTINGS */}
            {activeTab === 'SETTINGS' && (
              <div className="tech-card p-6 flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-bold text-[#00D4FF] border-b border-[#12344A] pb-2 mb-4">INTEGRATION GATEWAYS AND STATS</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">GEMINI CORE</div>
                      <div className="text-xs font-bold text-[#00FF9D]">✓ 1.5 FLASH ACTIVE</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">GMAIL INGESTION</div>
                      <div className="text-xs font-bold text-[#00FF9D]">{googleToken ? '✓ CONNECTED' : '✓ DEMO MODE'}</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">GOOGLE CALENDAR</div>
                      <div className="text-xs font-bold text-[#00FF9D]">{googleToken ? '✓ CONNECTED' : '✓ DEMO MODE'}</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">GOOGLE TASKS</div>
                      <div className="text-xs font-bold text-[#00FF9D]">{googleToken ? '✓ CONNECTED' : '✓ DEMO MODE'}</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">GOOGLE DRIVE</div>
                      <div className="text-xs font-bold text-[#00FF9D]">{googleToken ? '✓ CONNECTED' : '✓ DEMO MODE'}</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">PEOPLE API</div>
                      <div className="text-xs font-bold text-[#00FF9D]">{googleToken ? '✓ CONNECTED' : '✓ DEMO MODE'}</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">CLOUD FIRESTORE</div>
                      <div className="text-xs font-bold text-[#00FF9D]">✓ RUNTIME ACTIVE</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">SPEECH-TO-TEXT</div>
                      <div className="text-xs font-bold text-[#00FF9D]">✓ WEB SPEECH READY</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">TEXT-TO-SPEECH</div>
                      <div className="text-xs font-bold text-[#00FF9D]">✓ SYNTHESIS READY</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">CLOUD FUNCTIONS</div>
                      <div className="text-xs font-bold text-[#32F3FF]">✓ PROACTIVE TASKS</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">CLOUD SCHEDULER</div>
                      <div className="text-xs font-bold text-[#32F3FF]">✓ DEADLINE TRIGGER</div>
                    </div>
                    <div className="border border-[#12344A] bg-[#04070C]/60 p-3">
                      <div className="text-[10px] text-[#4f94c4]">CLOUD STORAGE</div>
                      <div className="text-xs font-bold text-[#32F3FF]">✓ DOC INGEST ACTIVE</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  {!googleToken && (
                    <button
                      onClick={linkGoogleAccount}
                      className="border border-[#00D4FF] hover:bg-[#00D4FF]/10 text-[#00D4FF] py-3.5 px-6 text-xs font-bold tracking-widest"
                    >
                      LINK GOOGLE WORKSPACE ACCOUNT
                    </button>
                  )}
                  <button
                    onClick={logout}
                    className="border border-[#FF4040] hover:bg-[#FF4040]/10 text-[#FF4040] py-3.5 px-6 text-xs font-bold tracking-widest"
                  >
                    DEACTIVATE WORKSPACE
                  </button>
                </div>
              </div>
            )}

            {/* VIEW: VOICE_ASSISTANT */}
            {activeTab === 'VOICE_ASSISTANT' && user && (
              <VoiceAssistantView
                uid={user.uid}
                tasks={tasks}
                calendarEvents={calendarEvents}
                emails={emails}
                onTriggerFocusMode={setEmergencyLockdown}
              />
            )}

          </div>
        )}
      </main>

      {/* RIGHT PANEL: LIVE AI THINKING STREAM */}
      <aside className="w-80 bg-[#091019] border-l border-[#12344A] z-10 flex flex-col shrink-0">
        <div className="p-4 border-b border-[#12344A] flex items-center justify-between">
          <span className="text-xs font-bold text-[#00FF9D] tracking-wider">LIVE AI COGNITION STREAM</span>
          <span className="w-2 h-2 rounded-full bg-[#00FF9D] animate-ping" />
        </div>
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2 font-mono text-[10px] text-[#00FF9D] select-text">
          {aiThoughts.map((thought, idx) => (
            <div key={idx} className="border-b border-[#12344A]/30 pb-2 leading-relaxed">
              {thought}
            </div>
          ))}
        </div>
      </aside>

      {/* FLOATING DRAGGABLE COMMAND TERMINAL */}
      {terminalOpen && (
        <div
          ref={terminalRef}
          onMouseDown={handleMouseDown}
          className="fixed z-50 w-full max-w-lg bg-[#04070C] border-2 border-[#00D4FF] shadow-xl shadow-black"
          style={{
            left: `${terminalPosition.x}px`,
            top: `${terminalPosition.y}px`
          }}
        >
          <div className="drag-handle bg-[#12344A]/50 px-3 py-2 border-b border-[#00D4FF] flex items-center justify-between cursor-move select-none">
            <div className="drag-handle flex items-center gap-2 text-xs font-bold text-[#00D4FF]">
              <TermIcon size={12} className="drag-handle" />
              <span className="drag-handle">GUARDIAN COMMAND CONSOLE</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTerminalMinimized(!terminalMinimized)}
                className="text-[#00D4FF] hover:text-[#7DF9FF] p-1"
              >
                {terminalMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
              </button>
              <button
                onClick={() => setTerminalOpen(false)}
                className="text-[#FF4040] hover:text-white p-1 text-xs font-bold"
              >
                [X]
              </button>
            </div>
          </div>

          {!terminalMinimized && (
            <div className="p-4 flex flex-col h-72">
              <div className="flex-1 overflow-y-auto mb-3 text-xs text-[#EAF7FF] flex flex-col gap-1 select-text">
                {terminalLogs.map((log, idx) => {
                  let colorClass = 'text-[#EAF7FF]';
                  if (log.startsWith('>')) colorClass = 'text-[#32F3FF] font-bold';
                  else if (log.startsWith('[ERROR]')) colorClass = 'text-[#FF4040] font-bold';
                  else if (log.startsWith('[GUARDIAN]')) colorClass = 'text-[#00FF9D]';
                  return (
                    <div key={idx} className={`${colorClass} leading-relaxed whitespace-pre-wrap`}>
                       {log}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleTerminalSubmit} className="flex gap-2 border-t border-[#12344A] pt-3">
                <span className="text-[#32F3FF] font-bold text-sm select-none">&gt;</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="ASK GUARDIAN... (E.G. /HELP OR 'SUMMARIZE EMAILS')"
                  className="flex-1 bg-transparent text-[#EAF7FF] text-xs font-mono outline-none border-none placeholder-[#12344A] uppercase"
                />
                <button type="submit" className="text-[#00D4FF] hover:text-[#7DF9FF] p-1">
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
