import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const STARTUP_LOGS = [
  'INITIALIZING HELLGUARDIAN KERNEL...',
  'ESTABLISHING CONNECTION TO GOOGLE WORKSPACE...',
  'FETCHING CALENDAR TIMELINE OBJECTS...',
  'PARSING ACTIVE TASK INGRESS FEEDS...',
  'RUNNING COGNITIVE BURNOUT STRESS PREDICTOR...',
  'GUARDIAN PLANNING SYSTEM ARMED.'
];

const PROMPT_STRINGS = [
  'ANALYZING DEADLINES...',
  'CONNECTING GOOGLE CALENDAR...',
  'PRIORITIZING TASKS...',
  'GENERATING EXECUTION PLAN...',
  'MONITORING PRODUCTIVITY...'
];

type AuthTab = 'GOOGLE' | 'EMAIL_LOGIN' | 'EMAIL_REGISTER';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  
  const [activeTab, setActiveTab] = useState<AuthTab>('GOOGLE');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [promptText, setPromptText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1. Startup console logs sequence
  useEffect(() => {
    let logIdx = 0;
    const addLog = () => {
      if (logIdx < STARTUP_LOGS.length) {
        setConsoleLogs((prev) => [...prev, `[OK] ${STARTUP_LOGS[logIdx]}`]);
        logIdx++;
        setTimeout(addLog, 400);
      }
    };
    addLog();
  }, []);

  // 2. Typewriter loop for command prompt examples
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentFullStr = `> ${PROMPT_STRINGS[promptIndex]}`;

    if (isDeleting) {
      timer = setTimeout(() => {
        setPromptText((prev) => prev.slice(0, -1));
      }, 50);
    } else {
      timer = setTimeout(() => {
        setPromptText((prev) => currentFullStr.slice(0, prev.length + 1));
      }, 80);
    }

    if (!isDeleting && promptText === currentFullStr) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && promptText === '') {
      setIsDeleting(false);
      setPromptIndex((prev) => (prev + 1) % PROMPT_STRINGS.length);
    }

    return () => clearTimeout(timer);
  }, [promptText, isDeleting, promptIndex]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await loginWithGoogle();
      setSuccessMsg('GOOGLE IDENTITY AUTHENTICATED. INGRESS GRANTED.');
    } catch (err: any) {
      setErrorMsg('AUTH INGRESS FAILED: ' + (err.message || 'UNKNOWN EXPLOIT').toUpperCase());
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('DIRECTIVE FAULT: CREDENTIAL PARAMETERS MISSING.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await loginWithEmail(email.trim(), password.trim());
      setSuccessMsg('OPERATOR AUTHENTICATED. INITIALIZING SHELL...');
    } catch (err: any) {
      setErrorMsg('OPERATOR CREDENTIAL FAULT: ' + (err.code || err.message || 'UNAUTHORIZED').toUpperCase());
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !operatorName.trim()) {
      setErrorMsg('DIRECTIVE FAULT: OPERATOR DATA INCOMPLETE.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await registerWithEmail(email.trim(), password.trim(), operatorName.trim());
      setSuccessMsg('OPERATOR REGISTERED. VERIFICATION EMAILED.');
    } catch (err: any) {
      setErrorMsg('REGISTRATION CRITICAL FAULT: ' + (err.code || err.message || 'CONFLICT').toUpperCase());
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setErrorMsg('DIRECTIVE FAULT: OPERATOR EMAIL REQUIRED FOR RESET.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await resetPassword(email.trim());
      setSuccessMsg('PASSWORD RESET DISPATCHED TO SPECIFIED NODE.');
    } catch (err: any) {
      setErrorMsg('DISPATCH FAULT: ' + (err.message || 'DISPATCH_ERROR').toUpperCase());
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#04070C] flex flex-col justify-center items-center px-4 overflow-hidden">
      
      {/* Scanline and Grid overlays */}
      <div className="cyber-grid absolute inset-0 z-0 opacity-40 pointer-events-none" />
      <div className="crt-overlay pointer-events-none" />
      <div className="scanline-bar" />
      <div className="noise-overlay" />
      
      {/* Ambient Lighting */}
      <div className="ambient-glow" />
      <div className="ambient-glow-red" />

      {/* Main Console Interface */}
      <div className="relative z-10 w-full max-w-2xl bg-[#091019] border-2 border-[#12344A] p-6 md:p-8 flex flex-col items-center shadow-lg shadow-black/80">
        
        {/* Corner Brackets */}
        <div className="absolute top-2 left-2 text-[#00D4FF] text-xs font-bold">[SYS_LGN]</div>
        <div className="absolute top-2 right-2 text-[#FF4040] text-xs font-bold">SECURE_CHNL</div>
        <div className="absolute bottom-2 left-2 text-[#4f94c4] text-xs">V1.0.0-PROD</div>
        <div className="absolute bottom-2 right-2 text-[#4f94c4] text-xs">LOC_SEC: 0x992</div>

        {/* LOGO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mt-4 mb-6"
        >
          <h1 className="text-4xl md:text-5xl font-sans font-bold tracking-widest text-[#00D4FF] text-glow-blue select-none uppercase">
            HELLGUARDIAN AI
          </h1>
          <h2 className="text-xs md:text-sm font-mono tracking-widest text-[#32F3FF] mt-2 select-none uppercase">
            AUTONOMOUS PRODUCTIVITY OPERATING SYSTEM
          </h2>
        </motion.div>

        {/* Startup log terminal */}
        <div className="w-full bg-[#04070C] border border-[#12344A] p-4 font-mono text-xs md:text-sm text-[#00FF9D] mb-6 h-36 overflow-y-auto select-text">
          <AnimatePresence>
            {consoleLogs.map((log, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-1 leading-relaxed"
              >
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="text-[#32F3FF] mt-2 font-bold min-h-[1.5rem]">
            {promptText}
            <span className="terminal-cursor"></span>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="w-full flex border-b border-[#12344A] mb-6 text-xs font-bold tracking-wider">
          <button
            onClick={() => { setActiveTab('GOOGLE'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-center border-t border-x ${
              activeTab === 'GOOGLE' ? 'border-[#00D4FF] text-[#00D4FF] bg-[#00D4FF]/5' : 'border-transparent text-[#4f94c4] hover:text-[#EAF7FF]'
            }`}
          >
            GOOGLE WORKSPACE
          </button>
          <button
            onClick={() => { setActiveTab('EMAIL_LOGIN'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-center border-t border-x ${
              activeTab === 'EMAIL_LOGIN' ? 'border-[#00D4FF] text-[#00D4FF] bg-[#00D4FF]/5' : 'border-transparent text-[#4f94c4] hover:text-[#EAF7FF]'
            }`}
          >
            USER LOGIN
          </button>
          <button
            onClick={() => { setActiveTab('EMAIL_REGISTER'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-center border-t border-x ${
              activeTab === 'EMAIL_REGISTER' ? 'border-[#00D4FF] text-[#00D4FF] bg-[#00D4FF]/5' : 'border-transparent text-[#4f94c4] hover:text-[#EAF7FF]'
            }`}
          >
            CREATE USER ACCOUNT
          </button>
        </div>

        {/* Error / Success messages */}
        {errorMsg && (
          <div className="w-full bg-red-950/40 border border-[#FF4040] text-[#FF4040] text-xs p-3 mb-6 font-bold tracking-wider text-glow-red">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="w-full bg-green-950/40 border border-[#00FF9D] text-[#00FF9D] text-xs p-3 mb-6 font-bold tracking-wider text-glow-green">
            {successMsg}
          </div>
        )}

        {/* Tab Contents */}
        <div className="w-full max-w-sm flex flex-col gap-4 items-center">
          
          {activeTab === 'GOOGLE' && (
            <div className="w-full flex flex-col gap-4">
              <p className="text-xs text-[#4f94c4] leading-relaxed text-center">
                INGEST CALENDAR, GMAIL, AND TASKS DIRECTIVES DIRECTLY FROM YOUR SECURE GOOGLE IDENTITY ENVIRONMENT.
              </p>
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-transparent border-2 border-[#00D4FF] hover:bg-[#00D4FF]/10 text-[#00D4FF] hover:text-[#7DF9FF] py-3 px-6 font-bold tracking-widest text-sm flex items-center justify-center gap-3 transition-all duration-300 text-glow-blue hover:shadow-[0_0_15px_rgba(0,212,255,0.4)] disabled:opacity-50"
              >
                <span className="text-lg">G</span>
                {isLoading ? 'ESTABLISHING HANDSHAKE...' : 'AUTHENTICATE WITH GOOGLE IDENTITY'}
              </button>
            </div>
          )}

          {activeTab === 'EMAIL_LOGIN' && (
            <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#32F3FF] font-bold">USER EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="USER@HELLGUARDIAN.AI"
                  required
                  className="w-full bg-[#04070C] border border-[#12344A] focus:border-[#32F3FF] text-[#EAF7FF] text-xs p-2 outline-none font-mono tracking-wider placeholder-[#12344A]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#32F3FF] font-bold">PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#04070C] border border-[#12344A] focus:border-[#32F3FF] text-[#EAF7FF] text-xs p-2 outline-none font-mono tracking-wider placeholder-[#12344A]"
                />
              </div>
              <div className="flex gap-2 justify-between mt-2">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-[10px] text-[#FF4040] hover:underline"
                >
                  [ FORGOT PASSWORD RESET ]
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="border border-[#00FF9D]/50 text-[#00FF9D] hover:bg-[#00FF9D]/10 px-4 py-2 text-xs font-bold tracking-wider disabled:opacity-50"
                >
                  {isLoading ? 'LOGGING IN...' : 'LOG IN TO WORKSPACE'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'EMAIL_REGISTER' && (
            <form onSubmit={handleEmailRegister} className="w-full flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#32F3FF] font-bold">USER PROFILE NAME</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value.toUpperCase())}
                  placeholder="E.G. JOHN_DOE"
                  required
                  className="w-full bg-[#04070C] border border-[#12344A] focus:border-[#32F3FF] text-[#EAF7FF] text-xs p-2 outline-none font-mono tracking-wider placeholder-[#12344A] uppercase"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#32F3FF] font-bold">REGISTER EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="NEWUSER@HELLGUARDIAN.AI"
                  required
                  className="w-full bg-[#04070C] border border-[#12344A] focus:border-[#32F3FF] text-[#EAF7FF] text-xs p-2 outline-none font-mono tracking-wider placeholder-[#12344A]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#32F3FF] font-bold">CREATE PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#04070C] border border-[#12344A] focus:border-[#32F3FF] text-[#EAF7FF] text-xs p-2 outline-none font-mono tracking-wider placeholder-[#12344A]"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full border border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/10 py-2.5 mt-2 text-xs font-bold tracking-wider disabled:opacity-50"
              >
                {isLoading ? 'CREATING USER PROFILE...' : 'CREATE USER ACCOUNT'}
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
