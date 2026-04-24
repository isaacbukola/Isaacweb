import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Send, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  RefreshCcw, 
  Trash2, 
  ShieldCheck,
  AlertCircle,
  Key as KeyIcon,
  Unlock,
  Link,
  ChevronRight,
  Share2,
  Moon,
  Sun,
  Upload,
  FileText,
  X,
  Download,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { db } from './lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  serverTimestamp,
  collection,
  query,
  orderBy,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { encryptMessage, decryptMessage } from './lib/crypto';
import { nanoid } from 'nanoid';

// Branding constants
const APP_NAME = "IDB SECRET MESSAGE";
const PUBLIC_BASE_URL = "https://ais-pre-dmeg54kczs4raume2zyf4x-298283305183.europe-west1.run.app";

type ViewState = 'LANDING' | 'CREATE' | 'DISCOVER' | 'CHAT' | 'SUCCESS' | 'RETRIEVE' | 'REVEALED' | 'EXPIRED' | 'ERROR' | 'LOADING' | 'ABOUT' | 'SECURITY' | 'HOW_IT_WORKS' | 'CONTACT';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  // Dark Mode effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Creation State
  const [task, setTask] = useState('');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [viewLimit, setViewLimit] = useState(1);
  const [expiryHours, setExpiryHours] = useState(24);
  const [generatedId, setGeneratedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoCopied, setAutoCopied] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Chat State
  const [chatRoomCode, setChatRoomCode] = useState('');
  const [chatPassword, setChatPassword] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatActiveRoom, setChatActiveRoom] = useState<any>(null);
  const [chatJoined, setChatJoined] = useState(false);
  const [chatNewMessage, setChatNewMessage] = useState('');
  const [chatRoomId, setChatRoomId] = useState('');
  const [dbStatus, setDbStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await getDoc(doc(db, '_status', 'connection'));
        setDbStatus('ONLINE');
      } catch (err: any) {
        console.warn("DB Status Check:", err.message);
        // If it's permission denied, it's technically online because it reached the server
        if (err.message.includes('permission') || err.code === 'permission-denied') {
          setDbStatus('ONLINE');
        } else {
          setDbStatus('OFFLINE');
        }
      }
    };
    checkConnection();
    // Re-check periodically
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const passwordCriteria = useMemo(() => ({
    length: password.length >= 8,
    digit: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }), [password]);

  const isPasswordValid = passwordCriteria.length && passwordCriteria.digit && passwordCriteria.special;

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (passwordCriteria.length) score += 33.3;
    if (passwordCriteria.digit) score += 33.3;
    if (passwordCriteria.special) score += 33.4;
    return score;
  }, [password, passwordCriteria]);

  const processFile = (file: File) => {
    // 500KB limit to ensure the final encrypted & base64 encoded payload stays under Firestore's 1MB limit
    if (file.size > 512000) {
      setError("Protocol Size Limit: Shard exceeds 500KB limit. Please use a smaller file or photo to ensure secure transmission.");
      return;
    }

    const resizeAndCompress = (dataUrl: string): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension 1200px
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to 70% quality jpeg
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataUrl;
      });
    };

    const reader = new FileReader();
    reader.onload = async (event) => {
      let base64 = event.target?.result as string;
      
      if (file.type.startsWith('image/')) {
        base64 = await resizeAndCompress(base64);
      }

      setAttachedFile({
        name: file.name,
        type: file.type,
        data: base64
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Retrieval State
  const [retrieveId, setRetrieveId] = useState('');
  const [retrieveData, setRetrieveData] = useState<any>(null);
  const [revealPassword, setRevealPassword] = useState('');
  const [showRevealPassword, setShowRevealPassword] = useState(false);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
  const [manualIdInput, setManualIdInput] = useState('');

  // Read URL on mount
  useEffect(() => {
    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const hashPart = window.location.hash.includes('?') 
        ? window.location.hash.split('?')[1] 
        : window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hashPart);
      
      const id = params.get('s') || hashParams.get('s');
      const chatRoom = params.get('c') || hashParams.get('c');
      
      if (id) {
        window.history.replaceState(null, '', `/#s=${id}`);
        handleLoadSecret(id);
      } else if (chatRoom) {
        window.history.replaceState(null, '', `/#c=${chatRoom}`);
        setChatRoomCode(chatRoom);
        setViewState('CHAT');
      }
    };

    checkUrl();
    window.addEventListener('hashchange', checkUrl);
    return () => window.removeEventListener('hashchange', checkUrl);
  }, []);

  const handleLoadSecret = async (id: string) => {
    setViewState('LOADING'); // Immediate feedback
    setLoading(true);
    setRetrieveId(id);
    setError(null);
    setManualIdInput('');
    
    try {
      const docRef = doc(db, 'secrets', id.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date();
        const expiresAt = data.expiresAt?.toDate();
        const isExpired = expiresAt && now > expiresAt;

        if (data.viewCount >= data.viewLimit || isExpired) {
          setViewState('EXPIRED');
        } else {
          setRetrieveData(data);
          setViewState('RETRIEVE');
        }
      } else {
        setViewState('EXPIRED'); 
      }
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        setViewState('EXPIRED');
      } else {
        setError(`Uplink Error: Protocol handshake failed. Re-verify your sequence ID or network status.`);
        setViewState('DISCOVER');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !password) return;

    if (!isPasswordValid) {
      setError("Security Violation: Credentials must satisfy all complexity filters (Green Indicators) before ignition.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = JSON.stringify({
        text: message,
        file: attachedFile
      });
      const { encryptedData, iv, salt } = await encryptMessage(payload, password);
      const id = nanoid(8).toUpperCase(); 
      
      const expiresAt = expiryHours > 0 ? new Date(Date.now() + expiryHours * 3600000) : null;

      const secretData = {
        task: task.trim(),
        encryptedData,
        iv,
        salt,
        viewLimit: Number(viewLimit),
        viewCount: 0,
        expiresAt: expiresAt,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'secrets', id), secretData);
      
      setGeneratedId(id);
      setViewState('SUCCESS');

      // Auto-copy sequence
      const url = `${window.location.origin.replace(/\/$/, '')}/#s=${id}`;
      navigator.clipboard.writeText(url);
      setAutoCopied(true);
      setTimeout(() => setAutoCopied(false), 5000);

    } catch (err: any) {
      console.error("Transmission Error:", err);
      if (err?.message?.includes("too large") || err?.message?.includes("quota")) {
        setError("Transmission Failure: Secret shard is too large for the vault. Try a smaller file or shorter message.");
      } else {
        setError("Encryption Failure: Critical handshake error during vault transmission. Refresh and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealPassword || !retrieveData) return;

    setLoading(true);
    setError(null);

    try {
      const decrypted = await decryptMessage(
        retrieveData.encryptedData,
        retrieveData.iv,
        retrieveData.salt,
        revealPassword
      );

      const docRef = doc(db, 'secrets', retrieveId);
      await updateDoc(docRef, {
        viewCount: increment(1)
      });

      try {
        const parsed = JSON.parse(decrypted);
        setDecryptedMessage(parsed.text);
        if (parsed.file) {
          setRetrieveData((prev: any) => ({ ...prev, attachedFile: parsed.file }));
        }
      } catch (e) {
        // Fallback for old simple-string messages
        setDecryptedMessage(decrypted);
      }
      setViewState('REVEALED');
    } catch (err: any) {
      setError("Decryption Refused: Access key mismatch. The protocol remains locked to protect data integrity.");
      setRevealPassword('');
    } finally {
      setLoading(false);
    }
  };

  // Chat Room Logic
  const handleCreateChatRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPassword) return;
    
    setLoading(true);
    setError(null);
    console.log("[PROTOCOL] Initializing Secure Chat Vault...");
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Transmission Timeout: Secure channel handshake exceeded 15s.")), 15000)
    );

    try {
      console.log("[PROTOCOL] Step 1: Sequence Generation");
      const id = nanoid(6).toUpperCase();
      
      console.log("[PROTOCOL] Step 2: Client-side Encryption");
      const validatorString = "IDB_SECURE_VAULT_OPEN";
      const { encryptedData, iv, salt } = await encryptMessage(validatorString, chatPassword);
      
      const expiresAt = new Date(Date.now() + 24 * 3600000); 

      const roomData = {
        roomCode: id,
        encryptedValidator: encryptedData,
        iv,
        salt,
        createdAt: serverTimestamp(),
        expiresAt
      };

      console.log("[PROTOCOL] Step 3: Vault Deposition");
      await Promise.race([
        setDoc(doc(db, 'chatRooms', id), roomData),
        timeoutPromise
      ]);

      console.log("[PROTOCOL] Step 4: Finalizing Handshake");
      setChatRoomCode(id);
      setChatActiveRoom(roomData);
      setChatJoined(true);
      console.log("[PROTOCOL] Uplink Secure:", id);
    } catch (err: any) {
      console.error("[CRITICAL FAILURE] Chat Vault Error:", err);
      setError(err.message || "Vault Creation Error: Protocol failed during initialization.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChatRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatRoomCode || !chatPassword) return;
    setLoading(true);
    setError(null);
    console.log("Attempting Authenticated Uplink...");
    try {
      const docRef = doc(db, 'chatRooms', chatRoomCode.toUpperCase().trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date();
        const expiresAt = data.expiresAt?.toDate();
        if (expiresAt && now > expiresAt) {
          setError("Protocol Denied: This secure link has expired and was purged from our system.");
          return;
        }

        // Validate password
        try {
          await decryptMessage(data.encryptedValidator, data.iv, data.salt, chatPassword);
          setChatActiveRoom(data);
          setChatJoined(true);
          setChatRoomCode(data.roomCode);
          console.log("Uplink Established.");
        } catch (err) {
          setError("Access Refused: Secure key mismatch. Protocol remains locked.");
        }
      } else {
        setError("Uplink Error: Secure vault not found. Verify the sequence ID.");
      }
    } catch (err: any) {
      console.error("Connection Failure:", err);
      setError("Connection Error: Protocol handshake failed. Uplink unstable.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatNewMessage.trim() || !chatActiveRoom || !chatJoined) return;

    try {
      const { encryptedData, iv, salt } = await encryptMessage(chatNewMessage, chatPassword);
      const messageId = nanoid();
      const messageData = {
        senderId: 'ANON-' + nanoid(4),
        encryptedText: encryptedData,
        iv,
        salt,
        timestamp: serverTimestamp()
      };

      const messagesRef = doc(db, 'chatRooms', chatActiveRoom.roomCode, 'messages', messageId);
      await setDoc(messagesRef, messageData);
      setChatNewMessage('');
    } catch (err) {
      setError("Transmission Error: Failed to sync message across secure channel.");
    }
  };

  useEffect(() => {
    if (chatJoined && chatActiveRoom) {
      const messagesRef = collection(db, 'chatRooms', chatActiveRoom.roomCode, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

      const unsubscribe = onSnapshot(q, async (snapshot: any) => {
        const msgs = await Promise.all(snapshot.docs.map(async (doc: any) => {
          const data = doc.data();
          try {
            // Use message-specific salt
            const dec = await decryptMessage(data.encryptedText, data.iv, data.salt, chatPassword);
            return { id: doc.id, ...data, text: dec };
          } catch (e) {
            return { id: doc.id, ...data, text: "[DECRYPTION ERROR: SECURITY SHIELD ACTIVE]" };
          }
        }));
        setChatMessages(msgs);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, (err: any) => {
        console.error("Snapshot error:", err);
        setError("Sync Failure: Lost connection to secure vault.");
      });

      return () => unsubscribe();
    }
  }, [chatJoined, chatActiveRoom, chatPassword]);

  const copyToClipboard = async (type: 'link' | 'invite' | 'share' | 'id' = 'link') => {
    const currentOrigin = window.location.origin;
    const cleanBase = currentOrigin.replace(/\/$/, '');
    const url = `${cleanBase}/#s=${generatedId}`;
    
    let text = '';
    if (type === 'id') {
      text = generatedId;
    } else if (type === 'link') {
      text = url;
    } else {
      text = `🔐 IDB Secret Message\n\nID: ${generatedId}\nLink: ${url}\n\n(View limit: ${viewLimit} times)`;
    }
    
    if (type === 'share' && navigator.share) {
      try {
        await navigator.share({
          title: 'IDB Secret Message',
          text: `I've sent you a secret message. ID: ${generatedId}`,
          url: url
        });
      } catch (err) {
        // Fallback to clipboard if share is cancelled or fails
        navigator.clipboard.writeText(url);
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    window.history.pushState({}, '', window.location.pathname);
    setViewState('LANDING');
    setLoading(false); // Reset loading
    setTask('');
    setMessage('');
    setPassword('');
    setViewLimit(1);
    setGeneratedId('');
    setRetrieveId('');
    setManualIdInput('');
    setRetrieveData(null);
    setRevealPassword('');
    setDecryptedMessage(null);
    setAttachedFile(null);
    setError(null);
  };

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  const NavItem = ({ label, target, num }: { label: string, target: ViewState, num: string }) => (
    <button 
      onClick={() => {
        setViewState(target);
        setLoading(false); // Clear loading on navigation
        setError(null);   // Clear error on navigation
      }}
      className={`group flex items-center gap-4 py-3 border-b border-foreground/5 w-full text-left transition-all ${viewState === target ? 'opacity-100' : 'opacity-30 hover:opacity-100'}`}
    >
      <span className="text-[10px] font-mono font-bold">{num}</span>
      <span className="text-sm font-black tracking-tighter uppercase">{label}</span>
      <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${viewState === target ? 'translate-x-0' : '-translate-x-2 group-hover:translate-x-0'}`} />
    </button>
  );

  return (
    <div className={`min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row overflow-x-hidden ${isDark ? 'dark' : ''}`}>
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-r border-border p-8 flex flex-col gap-12 z-20 bg-background transition-colors duration-300">
        <div className="flex justify-between items-start">
          <div className="cursor-pointer" onClick={reset}>
            <h1 className="text-2xl font-black tracking-tighter leading-tight italic">IDB.</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-30 mt-1">Secret Protocol 5.0</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="rounded-none hover:bg-neon hover:text-black transition-all"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-2">
           <NavItem num="01" label="Protocol Home" target="LANDING" />
           <NavItem num="02" label="New Message" target="CREATE" />
           <NavItem num="03" label="See My Message" target="DISCOVER" />
           <NavItem num="04" label="Temporary Chat" target="CHAT" />
           <NavItem num="05" label="How it works" target="HOW_IT_WORKS" />
           <NavItem num="06" label="Security" target="SECURITY" />
           <NavItem num="07" label="Info" target="ABOUT" />
           <NavItem num="08" label="Contact" target="CONTACT" />
        </nav>

        <div className="p-4 bg-foreground text-background flex items-center justify-between">
           <span className="text-[10px] font-bold uppercase tracking-widest">Status</span>
           <div className="w-2 h-2 bg-neon rounded-full animate-pulse shadow-[0_0_8px_#00FF00]" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative min-h-screen flex flex-col">
        {/* Background Marquee / Graphic */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-[0.05]">
           <h2 className="text-[25vw] font-display uppercase leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap select-none rotate-[-10deg]">
             BUKOLA
           </h2>
        </div>

        <div className="relative z-10 flex-1 flex flex-col px-8 md:px-16 py-12 md:py-24 max-w-4xl">
          {error && (
            <div className="mb-8 border-2 border-red-500 bg-red-500/10 p-4 text-[10px] font-black uppercase text-red-500 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <AnimatePresence mode="wait">
            {viewState === 'LOADING' && (
              <motion.div key="loading" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 py-20">
                <div className="text-[60px] md:text-[120px] font-display leading-[0.8] animate-pulse">CONNECTING...</div>
                <p className="font-mono text-sm opacity-40">Decrypting satellite uplink...</p>
              </motion.div>
            )}

            {viewState === 'LANDING' && (
              <motion.div key="landing" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                <div className="relative overflow-hidden h-12 flex items-center border-y-2 border-foreground -mx-8 md:-mx-16 bg-neon mb-12">
                  <div className="flex whitespace-nowrap animate-marquee">
                    {[1,2,3,4,5,6].map(i => (
                      <span key={i} className="text-xl font-display uppercase tracking-[0.2em] px-8">
                        IDB SECURE LINK SYSTEM // PROTOCOL ACTIVATED // ZERO KNOWLEDGE ARCHITECTURE // 
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[80px] md:text-[150px] font-display leading-[0.8] tracking-tighter uppercase relative text-foreground">
                    Wildly <br /> 
                    <span className="text-neon italic drop-shadow-[0_0_20px_rgba(0,255,0,0.4)]">Secure.</span>
                  </div>
                  <p className="max-w-md text-lg md:text-xl font-medium leading-relaxed opacity-60">
                    The world's most dynamic encryption platform. Create, share, and destroy messages with a single tap.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                  <button 
                    onClick={() => setViewState('CREATE')}
                    className="h-24 border-4 border-foreground p-6 flex flex-col justify-between hover:bg-foreground hover:text-background transition-all group relative overflow-hidden"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 group-hover:opacity-100 italic z-10">Phase 01</span>
                    <span className="text-xl font-black uppercase tracking-tighter z-10 text-left">New Secret Message</span>
                    <div className="absolute right-[-10%] bottom-[-20%] text-[80px] font-display text-foreground/5 group-hover:text-background/10 transition-all">01</div>
                  </button>
                  <button 
                   onClick={() => setViewState('DISCOVER')}
                   className="h-24 border-4 border-foreground p-6 flex flex-col justify-between hover:bg-neon transition-all hover:text-black group relative overflow-hidden"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 group-hover:opacity-100 italic z-10">Phase 02</span>
                    <span className="text-xl font-black uppercase tracking-tighter flex items-center justify-between z-10">
                       See My Message <ChevronRight />
                    </span>
                    <div className="absolute right-[-10%] bottom-[-20%] text-[80px] font-display text-foreground/5 group-hover:text-black/10 transition-all">02</div>
                  </button>
                </div>

                <div className="pt-12 border-t border-foreground/10 grid grid-cols-3 gap-8">
                   <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-[0.2em]">Uptime</span>
                     <p className="text-2xl font-display uppercase">99.9%</p>
                   </div>
                   <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-[0.2em]">Encrypted</span>
                     <p className="text-2xl font-display uppercase">AES-256</p>
                   </div>
                   <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-[0.2em]">Protocol</span>
                     <p className="text-2xl font-display uppercase">IDB-5</p>
                   </div>
                </div>
              </motion.div>
            )}

            {viewState === 'CREATE' && (
              <motion.div key="create" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                 <div className="space-y-2">
                    <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase">Post it.</h2>
                    <p className="font-medium opacity-50">Encryption is client-side. We never see your password.</p>
                 </div>

                 <form onSubmit={handleCreateSecret} className="space-y-4">
                    <Input 
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      placeholder="ASSOCIATED TASK / TITLE (OPTIONAL)"
                      className="h-16 border-4 border-foreground bg-background rounded-none focus-visible:ring-0 font-bold px-8 uppercase tracking-widest placeholder:opacity-20 transition-colors"
                    />

                    <Textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your secret..."
                      className="min-h-[220px] border-4 border-foreground bg-background rounded-none text-xl p-8 focus-visible:ring-0 shadow-[12px_12px_0px_0px_var(--color-neon)]/50 focus:shadow-none transition-all"
                      required
                    />

                    {/* File Attachment Section */}
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-4 border-foreground border-dashed p-4 flex flex-col gap-4 transition-all ${isDragOver ? 'bg-neon/20 scale-[1.02]' : 'bg-background/50'}`}
                    >
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase italic opacity-40">Secure Attachment (Max 500KB)</span>
                          {attachedFile && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setAttachedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="text-red-500 hover:text-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                       
                       {!attachedFile ? (
                         <div className="relative">
                            <input 
                              ref={fileInputRef}
                              type="file" 
                              accept="image/*,application/pdf,text/plain,.doc,.docx"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full h-16 flex items-center justify-center gap-3 border-2 border-foreground hover:bg-foreground hover:text-background transition-all group"
                            >
                               <Upload className="w-5 h-5 group-hover:animate-bounce" />
                               <span className="font-black uppercase text-xs">Browse Device Shards</span>
                            </button>
                            <p className="text-[8px] text-center mt-2 font-black uppercase opacity-20">or drop protocol shard here</p>
                         </div>
                       ) : (
                         <div className="h-20 flex items-center gap-4 px-4 bg-foreground text-background border-l-4 border-neon">
                            {attachedFile.type.startsWith('image/') ? (
                              <div className="w-12 h-12 border border-neon/30 overflow-hidden shrink-0 bg-black/20">
                                <img 
                                  src={attachedFile.data} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <FileText className="w-8 h-8 text-neon shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                               <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase truncate">{attachedFile.name}</span>
                                  <Badge className="bg-neon text-black text-[8px] h-4 rounded-none border-none">{(attachedFile.data.length * 0.75 / 1024).toFixed(1)}KB</Badge>
                               </div>
                               <span className="text-[9px] opacity-60 uppercase font-mono">{attachedFile.type || 'PROTOCOL/SHARD'}</span>
                            </div>
                         </div>
                       )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Input 
                          type={showCreatePassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="ACCESS PASSWORD"
                          className="h-16 border-4 border-foreground bg-background rounded-none focus-visible:ring-0 font-bold px-6 pr-12 w-full transition-colors"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword(!showCreatePassword)}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all p-1 hover:bg-foreground/5 ${showCreatePassword ? 'text-neon drop-shadow-[0_0_8px_rgba(0,255,0,0.6)]' : 'text-foreground/40 hover:text-foreground'}`}
                        >
                          {showCreatePassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Password Strength Meter */}
                      <div className="md:col-span-2 space-y-1">
                        <div className="h-1.5 w-full bg-foreground/10 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${passwordStrength}%`,
                              backgroundColor: passwordStrength < 40 ? '#ef4444' : passwordStrength < 80 ? '#eab308' : '#00ff00' 
                            }}
                            className="h-full transition-all duration-500"
                          />
                        </div>
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter opacity-40 italic">
                          <span>Entropy: {Math.round(passwordStrength)}%</span>
                          <span>Status: {passwordStrength === 0 ? 'Awaiting Data' : passwordStrength < 40 ? 'Vulnerable' : passwordStrength < 80 ? 'Developing' : 'Secure Shard'}</span>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex flex-wrap gap-4 pt-2">
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${passwordCriteria.length ? 'text-neon' : 'opacity-30'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.length ? 'bg-neon shadow-[0_0_8px_rgba(0,255,0,0.8)]' : 'bg-foreground'}`} />
                          8+ Characters
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${passwordCriteria.digit ? 'text-neon' : 'opacity-30'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.digit ? 'bg-neon shadow-[0_0_8px_rgba(0,255,0,0.8)]' : 'bg-foreground'}`} />
                          1+ Number
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${passwordCriteria.special ? 'text-neon' : 'opacity-30'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.special ? 'bg-neon shadow-[0_0_8px_rgba(0,255,0,0.8)]' : 'bg-foreground'}`} />
                          1+ Special
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase opacity-40">Destruction Timer</span>
                          <select 
                            value={expiryHours}
                            onChange={(e) => setExpiryHours(Number(e.target.value))}
                            className="w-full h-16 border-4 border-foreground bg-background rounded-none focus:outline-none font-bold px-6 uppercase transition-colors appearance-none cursor-pointer hover:bg-accent/50"
                          >
                            <option value={1}>1 HR - EPHEMERAL SHARD</option>
                            <option value={24}>24 HRS - STANDARD SHARD</option>
                            <option value={168}>7 DAYS - PERSISTENT SHARD</option>
                            <option value={0}>PERMANENT (LIMIT READ ONLY)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase opacity-40">View Access Limit</span>
                          <Input 
                            type="number"
                            min="1"
                            max="50"
                            value={viewLimit}
                            onChange={(e) => setViewLimit(parseInt(e.target.value))}
                            placeholder="VIEW LIMIT"
                            className="h-16 border-4 border-foreground bg-background rounded-none focus-visible:ring-0 font-bold px-6 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                    <Button type="submit" disabled={loading || !isPasswordValid} className="w-full h-20 bg-foreground text-background text-xl font-black uppercase rounded-none hover:bg-neon hover:text-black transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                       {loading ? <RefreshCcw className="animate-spin" /> : 'Lock Session'}
                    </Button>
                 </form>
              </motion.div>
            )}
            {viewState === 'DISCOVER' && (
              <motion.div key="discover" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                 <div className="space-y-2">
                    <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase">See My <br /> Message.</h2>
                    <p className="font-medium opacity-50 uppercase tracking-widest text-[10px]">Retrieve a message from the global vault.</p>
                 </div>

                 <div className="space-y-6">
                    <div className="relative group">
                       <Input 
                        placeholder="PASTE SECRET ID HERE"
                        value={manualIdInput}
                        onChange={(e) => setManualIdInput(e.target.value.toUpperCase())}
                        className="h-24 border-4 border-foreground bg-background rounded-none focus-visible:ring-0 text-3xl font-display tracking-[0.2em] px-10 placeholder:opacity-10 group-hover:bg-accent/50 transition-all text-foreground"
                       />
                       <div className="absolute right-8 top-1/2 -translate-y-1/2 p-2 bg-foreground text-background">
                          <Eye className="w-6 h-6" />
                       </div>
                    </div>
                    <Button 
                      onClick={() => manualIdInput && handleLoadSecret(manualIdInput.trim())}
                      className="w-full h-20 bg-foreground text-background text-xl font-black uppercase rounded-none hover:bg-neon hover:text-black transition-all"
                    >
                      Retrieve Data
                    </Button>
                 </div>

                 <div className="p-8 border-2 border-foreground border-dashed flex items-start gap-6 opacity-40 text-foreground">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="text-xs font-bold leading-relaxed uppercase italic">
                      Passwords are the critical factor. If you enter the correct ID but the wrong password, the data remains scrambled. Ensure you have the exact credentials before attempting retrieval.
                    </p>
                 </div>
              </motion.div>
            )}

            {viewState === 'CHAT' && (
              <motion.div key="chat" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                 {!chatJoined ? (
                   <div className="space-y-12">
                      <div className="space-y-2 flex justify-between items-start">
                        <div>
                          <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase">Join Room.</h2>
                          <p className="font-medium opacity-50 uppercase text-[10px] tracking-widest">Temporary 24h Secure Chat Protocol.</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className={`flex items-center gap-2 px-3 py-1 border ${dbStatus === 'ONLINE' ? 'border-neon text-neon' : 'border-red-500 text-red-500'} text-[8px] font-black uppercase tracking-widest`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'ONLINE' ? 'bg-neon animate-pulse' : 'bg-red-500'} shadow-[0_0_8px_currentColor]`} />
                            {dbStatus}
                          </div>
                          {!window.isSecureContext && (
                            <div className="text-[7px] text-red-500 font-black uppercase italic">Unsecured Environment: Crypto Disabled</div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-6">
                            <h3 className="text-xl font-black uppercase italic text-neon">Create New Room</h3>
                            <form onSubmit={handleCreateChatRoom} className="space-y-4">
                               <Input 
                                 type="password"
                                 placeholder="SET ROOM PASSWORD"
                                 value={chatPassword}
                                 onChange={(e) => setChatPassword(e.target.value)}
                                 className="h-16 border-4 border-foreground bg-background focus-visible:ring-0 font-bold px-6 uppercase"
                                 required
                               />
                               <Button type="submit" disabled={loading || dbStatus === 'OFFLINE'} className="w-full h-16 bg-foreground text-background hover:bg-neon hover:text-black font-black uppercase rounded-none transition-all disabled:opacity-50">
                                  {loading ? 'Transmitting...' : 'Initialize Protocol'}
                               </Button>
                            </form>
                         </div>

                         <div className="space-y-6">
                            <h3 className="text-xl font-black uppercase italic text-neon">Join Existing Room</h3>
                            <form onSubmit={handleJoinChatRoom} className="space-y-4">
                               <Input 
                                 placeholder="ROOM CODE (E.G. XJ7K2P)"
                                 value={chatRoomCode}
                                 onChange={(e) => setChatRoomCode(e.target.value.toUpperCase())}
                                 className="h-16 border-4 border-foreground bg-background focus-visible:ring-0 font-bold px-6 uppercase tracking-widest"
                                 required
                               />
                               <Input 
                                 type="password"
                                 placeholder="ROOM PASSWORD"
                                 value={chatPassword}
                                 onChange={(e) => setChatPassword(e.target.value)}
                                 className="h-16 border-4 border-foreground bg-background focus-visible:ring-0 font-bold px-6 uppercase"
                                 required
                               />
                               <Button type="submit" disabled={loading || dbStatus === 'OFFLINE'} className="w-full h-16 bg-foreground text-background hover:bg-neon hover:text-black font-black uppercase rounded-none transition-all disabled:opacity-50">
                                  {loading ? 'Authenticating...' : 'Authenticate Uplink'}
                               </Button>
                            </form>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="flex flex-col h-[70vh] border-4 border-foreground bg-background relative">
                      <div className="p-4 bg-foreground text-background flex justify-between items-center shrink-0">
                         <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase opacity-50">Secure Chat Channel</span>
                            <span className="text-lg font-display tracking-widest uppercase">Room: {chatActiveRoom.roomCode}</span>
                         </div>
                         <div className="flex gap-4">
                            <Button variant="ghost" size="icon" onClick={() => {
                               navigator.clipboard.writeText(`${window.location.origin}/#c=${chatActiveRoom.roomCode}`);
                               setCopied(true);
                               setTimeout(() => setCopied(false), 2000);
                            }} className="h-8 w-8 hover:text-neon">
                               {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                               setChatJoined(false);
                               setChatActiveRoom(null);
                               setChatMessages([]);
                               setChatPassword('');
                               setChatRoomCode('');
                            }} className="h-8 w-8 hover:text-red-500">
                               <X className="w-4 h-4" />
                            </Button>
                         </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono scrollbar-hide">
                         {chatMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 italic">
                               <Lock className="w-12 h-12 mb-4" />
                               <p className="text-[10px] font-black uppercase">Channel Secured. Waiting for messages...</p>
                            </div>
                         )}
                         {chatMessages.map((msg, i) => (
                           <motion.div 
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             key={msg.id || i} 
                             className="flex flex-col gap-1 border-l-2 border-foreground/10 pl-4 py-1"
                           >
                              <div className="flex items-center gap-4">
                                 <span className="text-[9px] font-black uppercase text-neon">{msg.senderId}</span>
                                 <span className="text-[7px] opacity-30 uppercase">{msg.timestamp?.toDate().toLocaleTimeString()}</span>
                              </div>
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                           </motion.div>
                         ))}
                         <div ref={chatBottomRef} />
                      </div>

                      <div className="p-4 border-t-2 border-foreground/10 shrink-0">
                         <form onSubmit={handleSendChatMessage} className="flex gap-2">
                            <Input 
                              placeholder="TRANSMIT SECURE DATA..."
                              value={chatNewMessage}
                              onChange={(e) => setChatNewMessage(e.target.value)}
                              className="h-16 border-2 border-foreground bg-background focus-visible:ring-0 font-bold px-6 uppercase text-xs"
                            />
                            <Button type="submit" className="h-16 w-16 bg-foreground text-background hover:bg-neon hover:text-black shrink-0 transition-all">
                               <Send className="w-6 h-6" />
                            </Button>
                         </form>
                      </div>

                      <div className="absolute bottom-[-24px] right-0 flex items-center gap-2">
                         <div className="w-2 h-2 bg-neon rounded-full animate-pulse shadow-[0_0_8px_#00FF00]" />
                         <span className="text-[8px] font-black uppercase opacity-40">End-to-End Encrypted Tunnel</span>
                      </div>
                   </div>
                 )}
              </motion.div>
            )}

            {viewState === 'SUCCESS' && (
              <motion.div key="success" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-10 py-10">
                <AnimatePresence>
                  {autoCopied && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-neon text-black p-4 text-xs font-black uppercase flex items-center justify-between border-2 border-black"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Protocol Link Auto-Copied to Clipboard
                      </div>
                      <span className="opacity-50 italic">Ready for share</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex flex-col gap-6">
                  <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase text-neon drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]">Success.</h2>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p className="font-bold opacity-50 uppercase text-xs">The protocol has verified your transmission.</p>
                    <div className="flex items-center gap-3 bg-foreground text-background px-4 py-2 border-b-4 border-neon">
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Views Remaining</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(viewLimit, 10) }).map((_, i) => (
                          <div key={i} className="w-1 h-3 bg-neon" />
                        ))}
                        {viewLimit > 10 && <span className="text-[9px] font-black ml-1 text-neon/70">+{viewLimit - 10}</span>}
                      </div>
                      <span className="text-xl font-display leading-none ml-2 text-neon">{viewLimit}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-1 bg-foreground">
                    <div className="bg-background p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-2 border-foreground">
                      <div className="flex flex-col gap-1 w-full truncate text-foreground">
                         <span className="text-[10px] font-black uppercase opacity-30 italic">Encrypted Endpoint</span>
                         <div className="flex items-center gap-3">
                            <code className="text-lg md:text-2xl font-display truncate select-all flex-1">{PUBLIC_BASE_URL}/#s={generatedId}</code>
                            <Button 
                              onClick={() => copyToClipboard('link')}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 hover:text-neon transition-colors"
                            >
                               {copied ? <Check className="w-4 h-4 text-neon" /> : <Copy className="w-4 h-4" />}
                            </Button>
                         </div>
                      </div>
                      <div className="flex gap-2 shrink-0 w-full md:w-auto">
                        <Button onClick={() => copyToClipboard('link')} className="flex-1 h-16 bg-foreground text-background hover:bg-neon hover:text-black rounded-none transition-all">
                          {copied ? <Check /> : <Copy className="mr-2" />} Link
                        </Button>
                        <Button onClick={() => copyToClipboard('share')} className="flex-1 h-16 bg-neon text-black font-black border-2 border-black rounded-none">
                           <Share2 className="mr-2" /> Share to Social
                        </Button>
                        <Button onClick={() => copyToClipboard('invite')} variant="outline" className="flex-1 h-16 border-2 border-foreground rounded-none font-bold text-foreground">
                           Invite
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-accent/50 flex flex-col md:flex-row justify-between items-center border-l-8 border-foreground group gap-4">
                     <div className="flex flex-col gap-1 text-foreground w-full md:w-auto">
                        <span className="font-bold uppercase text-[10px] opacity-40 italic underline underline-offset-4 tracking-widest">Physical Secret ID</span>
                        <div className="flex items-center gap-4">
                           <span className="text-3xl font-display tracking-[0.2em]">{generatedId}</span>
                           <Button 
                             onClick={() => copyToClipboard('id')}
                             variant="ghost"
                             size="icon"
                             className="h-10 w-10 hover:bg-neon hover:text-black transition-all rounded-none border border-foreground/20"
                           >
                             {copied ? <Check className="w-4 h-4 text-neon" /> : <Copy className="w-4 h-4" />}
                           </Button>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 w-full md:w-auto">
                        <p className="text-[10px] font-black uppercase opacity-20 hidden md:block">Reference code for manual retrieval</p>
                        <div className="h-0.5 w-12 bg-foreground/10 hidden md:block" />
                     </div>
                  </div>
                </div>

                <Button onClick={reset} variant="ghost" className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100">
                  Wipe & Resume Home
                </Button>
              </motion.div>
            )}

            {viewState === 'RETRIEVE' && (
              <motion.div key="retrieve" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                <div className="space-y-2">
                  <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase">ID Verified.</h2>
                  <div className="flex flex-wrap gap-2 items-center">
                    <p className="font-black opacity-50 uppercase text-xs tracking-widest italic">Target: {retrieveId} // Limit: {retrieveData?.viewLimit}</p>
                    {retrieveData?.task && (
                      <span className="bg-neon text-black px-3 py-1 text-[10px] font-black uppercase leading-none border border-black italic">Task: {retrieveData.task}</span>
                    )}
                  </div>
                </div>

                <form onSubmit={handleDecrypt} className="space-y-6">
                  <div className="space-y-2">
                    <div className="relative group">
                      <Input 
                        type={showRevealPassword ? "text" : "password"}
                        value={revealPassword}
                        onChange={(e) => setRevealPassword(e.target.value)}
                        placeholder="ENTER ACCESS PASSWORD"
                        className="h-24 border-4 border-foreground rounded-none focus-visible:ring-0 bg-background text-foreground text-2xl font-black px-10 pr-24 placeholder:opacity-10 w-full transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRevealPassword(!showRevealPassword)}
                        className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2 p-2 bg-foreground text-background hover:bg-neon hover:text-black transition-all"
                      >
                        {showRevealPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">
                          {showRevealPassword ? 'Hide' : 'Show'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-24 bg-foreground text-background rounded-none font-black text-2xl hover:bg-neon hover:text-black transition-all">
                    {loading ? <RefreshCcw className="animate-spin" /> : 'REVEAL CONTENT'}
                  </Button>
                </form>
              </motion.div>
            )}

            {viewState === 'REVEALED' && (
              <motion.div key="revealed" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                <div className="flex justify-between items-center border-b-4 border-foreground pb-4">
                  <div className="space-y-2">
                    <h2 className="text-[60px] font-display leading-none uppercase text-foreground">Revealed.</h2>
                    {retrieveData?.task && (
                      <Badge className="bg-neon text-black rounded-none font-black uppercase text-[10px] py-1 px-4 italic border border-black">
                        Task: {retrieveData.task}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                     <div className="flex items-center gap-3 bg-foreground text-background px-3 py-1 border-l-4 border-neon shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        <span className="text-[9px] font-black uppercase tracking-widest">Remaining Views</span>
                        <span className="text-2xl font-display leading-none text-neon">{Math.max(0, retrieveData.viewLimit - retrieveData.viewCount - 1)}</span>
                     </div>
                     <div className="text-foreground">
                        <p className="text-[9px] font-black uppercase">Decrypted Payload</p>
                        <p className="font-mono text-xs opacity-40">{new Date().toISOString()}</p>
                     </div>
                  </div>
                </div>
                <div className="p-12 bg-foreground text-background min-h-[300px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 font-display text-[10vw] opacity-[0.03] select-none uppercase text-background">SECRET</div>
                  <p className="text-2xl md:text-3xl leading-relaxed whitespace-pre-wrap font-mono uppercase relative z-10 text-center tracking-tight italic">
                    "{decryptedMessage}"
                  </p>
                </div>

                {/* Secure Attachment Reveal */}
                {retrieveData?.attachedFile && (
                  <div className="p-8 border-4 border-foreground bg-accent/20 space-y-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 bg-foreground text-background flex items-center justify-center shrink-0">
                            {retrieveData.attachedFile.type?.startsWith('image/') ? (
                              <img 
                                src={retrieveData.attachedFile.data} 
                                alt="Secret Attachment" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <FileText className="w-8 h-8 text-neon" />
                            )}
                         </div>
                         <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] font-black uppercase opacity-40">Attached Protocol Shard</span>
                            <span className="text-xl font-black uppercase truncate max-w-[200px] md:max-w-md">{retrieveData.attachedFile.name}</span>
                            <span className="text-[9px] font-mono opacity-60 uppercase">{retrieveData.attachedFile.type}</span>
                         </div>
                      </div>
                      <a 
                        href={retrieveData.attachedFile.data} 
                        download={retrieveData.attachedFile.name}
                        className="h-16 px-10 bg-neon text-black font-black uppercase text-sm flex items-center gap-3 hover:bg-white transition-all shadow-[8px_8px_0px_0px_var(--color-foreground)] active:shadow-none active:translate-x-1 active:translate-y-1 w-full md:w-auto justify-center"
                      >
                        <Download className="w-5 h-5" />
                        Retrieve File
                      </a>
                    </div>

                    {retrieveData.attachedFile.type?.startsWith('image/') && (
                      <div className="border-2 border-foreground/10 p-2 bg-black/5">
                        <img 
                          src={retrieveData.attachedFile.data} 
                          alt="Decrypted Attachment" 
                          className="max-h-[500px] w-auto mx-auto object-contain cursor-zoom-in"
                          onClick={() => window.open(retrieveData.attachedFile.data, '_blank')}
                          referrerPolicy="no-referrer"
                        />
                        <p className="text-[8px] text-center mt-2 opacity-30 font-black uppercase tracking-widest">End-to-End Decrypted Visual Asset</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6 border-4 border-foreground bg-neon/10 flex gap-6 items-center">
                   <ShieldCheck className="w-10 h-10 shrink-0 text-foreground" />
                   <p className="text-sm font-black uppercase leading-tight italic text-foreground">
                     Caution: This message is ephemeral. Once you close this session or the view limit is reached, it will be purged from existence.
                   </p>
                </div>
                <Button onClick={reset} className="w-full h-20 bg-foreground text-background text-xl font-black uppercase rounded-none hover:bg-neon hover:text-black transition-all">EXPIRE SESSION</Button>
              </motion.div>
            )}

            {viewState === 'HOW_IT_WORKS' && (
              <motion.div key="how" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                <div className="space-y-2">
                  <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase">The <br /> Protocol.</h2>
                  <p className="font-medium opacity-50 uppercase tracking-widest text-[10px]">How IDB handles your sensitive data.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <h3 className="text-2xl font-black uppercase italic text-neon">01. End-To-End Encryption</h3>
                         <p className="text-sm opacity-60 leading-relaxed">Everything happens in your browser. We use the enterprise-grade AES-256 GCM encryption protocol. Your message is scrambled using your personal password before it ever leaves your device.</p>
                      </div>
                      <div className="space-y-2">
                         <h3 className="text-2xl font-black uppercase italic text-neon">02. Secure Transmission</h3>
                         <p className="text-sm opacity-60 leading-relaxed">The encrypted payload (the "secret shard") is uploaded to our secure database with a unique ID. Because we don't store your password, the data remains a zero-knowledge secret.</p>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <h3 className="text-2xl font-black uppercase italic text-neon">03. Automated Destruction</h3>
                         <p className="text-sm opacity-60 leading-relaxed">Once the view limit is hit or the expiry timer runs out, the shard becomes inaccessible. Our one-time links ensure that your sensitive data doesn't persist on any server.</p>
                      </div>
                      <div className="space-y-2">
                         <h3 className="text-2xl font-black uppercase italic text-neon">04. Local Retrieval</h3>
                         <p className="text-sm opacity-60 leading-relaxed">The receiver needs both the link and the matching password key. Decryption happens locally on their web browser, ensuring total privacy from end to end.</p>
                      </div>
                   </div>
                </div>

                <div className="p-8 bg-foreground text-background">
                   <h4 className="font-black uppercase mb-4 text-xs tracking-widest">When to use IDB Secret Message?</h4>
                   <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-bold uppercase italic">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neon" /> Share Passwords & Login Credentials</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neon" /> Secure File & Photo Sharing</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neon" /> Self-Destructing Notes for Privacy</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neon" /> Gain Traffic with Private Invite Links</li>
                   </ul>
                </div>
              </motion.div>
            )}

            {viewState === 'CONTACT' && (
               <motion.div key="contact" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                  <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase text-foreground">Support.</h2>
                  <div className="p-12 border-4 border-foreground space-y-6 text-foreground bg-background">
                     <p className="font-bold text-xl uppercase italic">Need assistance with the protocol?</p>
                     <p className="opacity-60 leading-relaxed">
                       IDB Secret Message is a privacy-first platform. Due to our zero-knowledge architecture, we cannot recover forgotten passwords or messages. 
                     </p>
                      <div className="pt-6 space-y-4">
                         <p className="text-xs font-black uppercase opacity-30 tracking-widest">Admin Support Channel</p>
                         <a 
                           href="https://wa.me/2349017837108" 
                           target="_blank" 
                           rel="noreferrer"
                           className="flex items-center justify-center gap-4 h-20 px-8 bg-foreground text-background hover:bg-neon hover:text-black transition-all rounded-none w-full md:w-auto text-center"
                         >
                            <MessageCircle className="w-8 h-8" />
                            <div className="flex flex-col items-start leading-tight">
                               <span className="text-xl font-display uppercase italic">Open Secure Chat</span>
                               <span className="text-[10px] font-black opacity-60 uppercase tracking-tighter">+234 901 783 7108</span>
                            </div>
                         </a>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-6 bg-foreground text-background space-y-2">
                        <p className="text-[10px] font-bold opacity-40 uppercase">Location</p>
                        <p className="font-bold italic">SECURE NODE 01</p>
                     </div>
                     <div className="p-6 border-4 border-foreground space-y-2 text-foreground">
                        <p className="text-[10px] font-bold opacity-40 uppercase">Response Time</p>
                        <p className="font-bold italic">&lt; 12 HOURS</p>
                     </div>
                  </div>
               </motion.div>
            )}

            {viewState === 'ABOUT' && (
               <motion.div key="about" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                  <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase text-foreground">The IDB System.</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-medium leading-relaxed opacity-70 text-foreground">
                    <div className="space-y-4">
                       <h3 className="text-xl font-black uppercase tracking-tighter italic">Mission: Privacy First</h3>
                       <p>IDB Secret Message was built to solve the "last mile" problem of digital security: sharing text and files without leaving a digital trail. Whether you're a developer sharing API keys or an individual sending private photos, IDB ensures your data is ephemeral.</p>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-xl font-black uppercase tracking-tighter italic">Global Search Ranking</h3>
                       <p>Our platform is designed to be highly accessible and discoverable. By creating high-quality, secure links, IDB helps users communicate securely across any platform while maintaining optimal performance and privacy levels.</p>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-xl font-black uppercase tracking-tighter italic">One-Time Use</h3>
                       <p>Messages are strictly limited by view counts and destruction timers. Our platform is the choice for anyone needing a "Burn After Reading" feature for their sensitive information.</p>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-xl font-black uppercase tracking-tighter italic">Zero Logs</h3>
                       <p>We don't track browser history, IP addresses, or user profiles. No accounts required. Just pure, unadulterated privacy for your secret messages.</p>
                    </div>
                  </div>
                  <Button onClick={() => setViewState('CREATE')} className="w-full h-20 border-4 border-foreground bg-background text-foreground text-xl font-black uppercase rounded-none hover:bg-foreground hover:text-background transition-all">DEPLOY SECRET MESSAGE</Button>
               </motion.div>
            )}

            {viewState === 'SECURITY' && (
              <motion.div key="security" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 bg-background text-foreground p-8 md:p-16 border-4 border-foreground">
                <div className="space-y-2">
                  <h2 className="text-[60px] md:text-[100px] font-display leading-none uppercase">Shielded.</h2>
                  <p className="font-medium opacity-50 uppercase tracking-widest text-[10px]">End-to-End Cryptography for Personal Privacy.</p>
                </div>

                <div className="space-y-8">
                   <div className="space-y-4">
                      <ShieldCheck className="w-12 h-12 text-neon" />
                      <h3 className="text-3xl font-black uppercase tracking-tighter">Zero-Knowledge Architecture</h3>
                      <p className="opacity-60 text-sm leading-relaxed">
                        IDB is engineered on the principle that the platform should never be able to access your private conversations. 
                        By leveraging the Web Crypto API, your secret password acts as the primary decryption key that remains on your device. 
                        We never transmit your password to any server. Even if our database was breached, your messages remain secure, encrypted blobs.
                      </p>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-6 bg-accent/20 border border-foreground/10 space-y-2">
                         <span className="text-[9px] font-black uppercase opacity-40">Encryption Engine</span>
                         <p className="font-bold">AES-GCM 256-bit</p>
                      </div>
                      <div className="p-6 bg-accent/20 border border-foreground/10 space-y-2">
                         <span className="text-[9px] font-black uppercase opacity-40">Key Derivation</span>
                         <p className="font-bold">PBKDF2 (100k Iterations)</p>
                      </div>
                      <div className="p-6 bg-accent/20 border border-foreground/10 space-y-2">
                         <span className="text-[9px] font-black uppercase opacity-40">Safe Storage</span>
                         <p className="font-bold">Encrypted Shards Only</p>
                      </div>
                   </div>

                   <div className="p-8 border-2 border-foreground/20 space-y-6">
                      <h2 className="text-[30px] font-display leading-none uppercase text-neon">Black Box Core.</h2>
                      <div className="space-y-4 max-w-xl font-mono text-[10px] uppercase tracking-widest leading-loose">
                         <p className="border-l-2 border-neon pl-6">[01] All IPC tunneled via TLS 1.3 encryption layers.</p>
                         <p className="border-l-2 border-neon pl-6">[02] Keys derived using PBKDF2 with 100,000 iterations.</p>
                         <p className="border-l-2 border-neon pl-6">[03] Volatile storage profile. No persistent tracking logs.</p>
                         <p className="border-l-2 border-neon pl-6">[04] Client-side password masking prevents visual leaks.</p>
                      </div>
                      <div className="flex gap-4">
                         <div className="w-10 h-10 border border-neon flex items-center justify-center text-neon font-black italic text-[10px]">256</div>
                         <div className="w-10 h-10 border border-neon flex items-center justify-center text-neon font-black italic text-[10px]">BWA</div>
                         <div className="w-10 h-10 border border-neon flex items-center justify-center text-neon font-black italic text-[10px]">GCM</div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {/* Error / Expired States simplified for the Wilder UI */}
            {['EXPIRED', 'ERROR'].includes(viewState) && (
              <motion.div key="status" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 py-20">
                 <h2 className="text-[60px] md:text-[120px] font-display leading-none uppercase opacity-10 text-foreground">TERMINATED.</h2>
                 <p className="text-xl font-black uppercase italic border-l-8 border-foreground pl-8 max-w-md text-foreground">
                   {viewState === 'EXPIRED' ? 'The data you are looking for has been purged or never existed within this node.' : error}
                 </p>
                 <Button onClick={reset} className="h-20 px-12 bg-foreground text-background text-xl font-black uppercase rounded-none hover:bg-neon hover:text-black transition-all">RESTORE NODE</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Footer (Sharp & Bold) */}
        <footer className="mt-auto px-16 py-12 border-t border-foreground/10 flex justify-between items-center gap-8 text-xs font-black uppercase tracking-[0.3em] text-foreground transition-all">
           <span className="hover:text-neon transition-colors cursor-default">App Created and designed By Bukola</span>
           <div className="hidden md:flex gap-12 opacity-40">
              <span className="flex items-center gap-2"><div className="w-1 h-1 bg-neon shadow-[0_0_8px_#00ff00]" /> LAT: 4.128° N</span>
              <span className="flex items-center gap-2"><div className="w-1 h-1 bg-neon shadow-[0_0_8px_#00ff00]" /> LON: 7.006° W</span>
              <span className="flex items-center gap-2"><div className="w-1 h-1 bg-neon shadow-[0_0_8px_#00ff00]" /> VER: 5.0.0</span>
           </div>
        </footer>
      </main>
    </div>
  );
}
