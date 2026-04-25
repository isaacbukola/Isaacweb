import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Send, 
  Shield, 
  Settings, 
  Trash2, 
  Image as ImageIcon, 
  File, 
  X, 
  Terminal, 
  Eye, 
  EyeOff, 
  Upload,
  Plus,
  ArrowRight,
  RefreshCw,
  Monitor,
  Zap,
  Fingerprint,
  Smile,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  deleteDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { encryptMessage, decryptMessage } from './lib/crypto';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// TYPES
type ViewState = 'LANDING' | 'CREATE' | 'JOIN' | 'CHAT';
type Theme = 'NEON' | 'AMBER' | 'CRIMSON' | 'PHANTOM';
type BubbleStyle = 'SHARP' | 'ROUNDED' | 'MINIMAL';

interface Message {
  id: string;
  senderId: string;
  encryptedText: string;
  iv: string;
  salt: string;
  iterations?: number;
  timestamp: any;
  text?: string;
  file?: {
    name: string;
    type: string;
    data: string;
  };
  reactions?: Record<string, string[]>;
}

interface ChatRoom {
  roomCode: string;
  encryptedValidator: string;
  iv: string;
  salt: string;
  iterations?: number;
  createdAt: any;
  expiresAt: any;
}

// COMPONENT: Button
const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) => {
  const base = "btn-brutal relative overflow-hidden font-mono tracking-widest text-[10px]";
  const variants = {
    primary: "bg-foreground text-background hover:bg-neon hover:text-background",
    secondary: "bg-accent text-foreground hover:border-neon",
    ghost: "border-none hover:text-neon p-2",
    danger: "bg-red-900/20 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
  };
  
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};

// COMPONENT: Input
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn("input-brutal font-mono text-[11px] placeholder:opacity-30", className)} 
    {...props} 
  />
);

export default function App() {
  // NAVIGATION & UI
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // SESSION DATA
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string, type: string, data: string } | null>(null);
  const [userId] = useState(() => 'AGENT-' + nanoid(4).toUpperCase());
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // SETTINGS
  const [theme, setTheme] = useState<Theme>('NEON');
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>('SHARP');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showEntropy, setShowEntropy] = useState(true);
  const [pbkdf2Iterations, setPbkdf2Iterations] = useState(100000);
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // UTILS
  const chatBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Apply Light/Dark Class
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
    }
  }, [isDarkMode]);

  const themes = {
    NEON: { 
      primary: isDarkMode ? 'text-green-400' : 'text-green-600', 
      border: isDarkMode ? 'border-green-400/50' : 'border-green-600', 
      bg: isDarkMode ? 'bg-green-400/50' : 'bg-green-600', 
      shadow: isDarkMode ? 'shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'shadow-[0_0_10px_rgba(22,163,74,0.3)]' 
    },
    AMBER: { 
      primary: isDarkMode ? 'text-amber-400' : 'text-amber-500', 
      border: isDarkMode ? 'border-amber-400/50' : 'border-amber-500', 
      bg: isDarkMode ? 'bg-amber-400/50' : 'bg-amber-500', 
      shadow: isDarkMode ? 'shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
    },
    CRIMSON: { 
      primary: isDarkMode ? 'text-red-400' : 'text-red-600', 
      border: isDarkMode ? 'border-red-400/50' : 'border-red-600', 
      bg: isDarkMode ? 'bg-red-400/50' : 'bg-red-600', 
      shadow: isDarkMode ? 'shadow-[0_0_10px_rgba(248,113,113,0.2)]' : 'shadow-[0_0_10px_rgba(220,38,38,0.3)]' 
    },
    PHANTOM: { 
      primary: isDarkMode ? 'text-cyan-400' : 'text-cyan-500', 
      border: isDarkMode ? 'border-cyan-400/50' : 'border-cyan-500', 
      bg: isDarkMode ? 'bg-cyan-400/50' : 'bg-cyan-500', 
      shadow: isDarkMode ? 'shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
    },
  };

  const currentTheme = themes[theme];

  // TYPING LOGIC
  useEffect(() => {
    if (viewState === 'CHAT' && activeRoom && db) {
      const typingRef = doc(db, 'chatRooms', activeRoom.roomCode, 'typing', userId);
      
      let typingTimeout: any;
      if (newMessage.length > 0) {
        setDoc(typingRef, { isTyping: true, updatedAt: serverTimestamp() }, { merge: true });
        
        typingTimeout = setTimeout(() => {
          setDoc(typingRef, { isTyping: false, updatedAt: serverTimestamp() }, { merge: true });
        }, 3000);
      } else {
        setDoc(typingRef, { isTyping: false, updatedAt: serverTimestamp() }, { merge: true });
      }

      return () => {
        clearTimeout(typingTimeout);
        if (activeRoom && db) {
          setDoc(typingRef, { isTyping: false, updatedAt: serverTimestamp() }, { merge: true });
        }
      };
    }
  }, [newMessage, viewState, activeRoom, userId]);

  // LISTEN FOR TYPING
  useEffect(() => {
    if (viewState === 'CHAT' && activeRoom && db) {
      const q = query(
        collection(db, 'chatRooms', activeRoom.roomCode, 'typing')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const typing = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(u => u.id !== userId && u.isTyping && u.updatedAt?.toDate() > new Date(Date.now() - 10000))
          .map(u => u.id);
        setTypingUsers(typing);
      });
      
      return () => unsubscribe();
    }
  }, [viewState, activeRoom, userId]);

  // HANDLERS
  const handleCreateRoom = async () => {
    if (!password || password.length < 4) {
      setError("SECURITY_POLICY: Access token must be at least 4 characters.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const code = nanoid(6).toUpperCase();
      const validator = "IDB_HANDSHAKE_VERIFIED";
      const { encryptedData, ivBase64, salt, iterations } = await encryptMessage(validator, password, pbkdf2Iterations);
      
      const payload: ChatRoom = {
        roomCode: code,
        encryptedValidator: encryptedData,
        iv: ivBase64,
        salt: salt,
        iterations: iterations,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      };

      if (db) {
        await setDoc(doc(db, 'chatRooms', code), payload);
      }
      
      setActiveRoom(payload);
      setRoomCode(code);
      setViewState('CHAT');
    } catch (err: any) {
      setError("HANDSHAKE_ERROR: Failed to establish secure shard.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode || !password) return;
    
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'chatRooms', roomCode.toUpperCase());
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setError("SHARD_NOT_FOUND: Sequence ID does not exist in the decentralized matrix.");
        return;
      }
      
      const data = docSnap.data() as ChatRoom;
      try {
        await decryptMessage(data.encryptedValidator, data.iv, data.salt, password, data.iterations || 100000);
        setActiveRoom(data);
        setViewState('CHAT');
      } catch {
        setError("AUTHENTICATION_FAILURE: Secure key mismatch. Protocol rejected.");
      }
    } catch (err: any) {
      setError("HANDSHAKE_ERROR: Network instability detected during uplink.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachedFile) || !activeRoom) return;
    
    const textToSend = newMessage.trim();
    setNewMessage('');
    const fileToSend = attachedFile;
    setAttachedFile(null);

    try {
      const payload = JSON.stringify({
        text: textToSend,
        file: fileToSend
      });
      
      const { encryptedData, ivBase64, salt, iterations } = await encryptMessage(payload, password, pbkdf2Iterations);
      
      const msgId = nanoid();
      const msgData = {
        senderId: userId,
        encryptedText: encryptedData,
        iv: ivBase64,
        salt: salt,
        iterations: iterations,
        timestamp: serverTimestamp()
      };

      if (db) {
        await setDoc(doc(db, 'chatRooms', activeRoom.roomCode, 'messages', msgId), msgData);
      }
    } catch (err) {
      setError("TRANSMISSION_ERROR: Secure packet drop detected.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        setError("PAYLOAD_OVERFLOW: File exceeds 800KB bandwidth limit.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFile({
          name: file.name,
          type: file.type,
          data: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!activeRoom || !db) return;
    
    const messageRef = doc(db, 'chatRooms', activeRoom.roomCode, 'messages', messageId);
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const currentReactions = message.reactions || {};
    const users = currentReactions[emoji] || [];
    
    let newUsers;
    if (users.includes(userId)) {
      newUsers = users.filter(id => id !== userId);
    } else {
      newUsers = [...users, userId];
    }

    const updatedReactions = { ...currentReactions, [emoji]: newUsers };
    
    try {
      await updateDoc(messageRef, { reactions: updatedReactions });
    } catch (err) {
      console.error("REACTION_FAILURE:", err);
    }
  };

  // SUBSCRIBE TO MESSAGES
  useEffect(() => {
    if (viewState === 'CHAT' && activeRoom && db) {
      const q = query(
        collection(db, 'chatRooms', activeRoom.roomCode, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(100)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMsgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        
        // Decrypt matches asynchronously
        const decryptAll = async () => {
          const decrypted = await Promise.all(newMsgs.map(async (m) => {
            try {
              const raw = await decryptMessage(m.encryptedText, m.iv, m.salt, password, m.iterations || 100000);
              const parsed = JSON.parse(raw);
              return { ...m, text: parsed.text, file: parsed.file };
            } catch {
              return { ...m, text: "[CORRUPTED_CIPHER_BLOCK]" };
            }
          }));
          setMessages(decrypted);
        };
        
        decryptAll();
      });
      
      return () => unsubscribe();
    }
  }, [viewState, activeRoom, password]);

  // ANIMATIONS
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <div className={cn("min-h-screen flex flex-col uppercase", theme === 'PHANTOM' ? 'selection:bg-cyan-400 selection:text-black' : '')}>
      
      {/* HEADER RAIL */}
      <header className="fixed top-0 left-0 right-0 z-50 mix-blend-difference px-6 py-8 flex justify-between items-center pointer-events-none">
        <div className="flex flex-col">
          <h1 className="text-4xl md:text-6xl font-display leading-[0.8]">IDB_SECURE</h1>
          <p className={cn("font-mono text-[8px] tracking-[0.4em] opacity-60 mt-2", currentTheme.primary)}>Protocol v4.0.2 // Zero Knowledge</p>
        </div>
        <div className="flex items-center gap-4 pointer-events-auto">
          {viewState === 'CHAT' && (
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn("p-2 brutal-border hover:bg-foreground hover:text-background transition-all", currentTheme.primary, currentTheme.border)}
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
          <div className={cn("text-[10px] font-mono", currentTheme.primary)}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "STATUS: STEALTH"}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col pt-32 px-6 pb-12 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* LANDING VIEW */}
          {viewState === 'LANDING' && (
            <motion.div 
              key="landing"
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="flex-1 flex flex-col justify-center gap-12"
            >
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center gap-3 opacity-30">
                  <Terminal className="w-4 h-4" />
                  <span className="text-[10px] font-mono tracking-tighter">Initializing terminal interface...</span>
                </div>
                <h2 className="text-6xl md:text-8xl font-display leading-[0.9]">Destroy the trail.</h2>
                <p className="font-mono text-sm opacity-60 max-w-md">
                  Messages are encrypted client-side using 256-bit AES-GCM. 
                  Access tokens are never sent to the server. 
                  Uplinks expire after 24 hours.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <Button onClick={() => setViewState('CREATE')} className="h-20 text-lg w-full md:w-64">
                  Open Shard <Plus className="ml-2 w-5 h-5" />
                </Button>
                <Button onClick={() => setViewState('JOIN')} variant="secondary" className="h-20 text-lg w-full md:w-64">
                  Uplink Key <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* CREATE VIEW */}
          {viewState === 'CREATE' && (
            <motion.div 
              key="create"
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="max-w-xl self-center w-full space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-4xl">Set Secure Key</h3>
                <p className="opacity-40 text-[10px] font-mono">This token generates your encryption matrix. Don't lose it.</p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Input 
                    type="password" 
                    placeholder="ENTER SECRET HANDSHAKE..." 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-20 text-xl"
                  />
                  <Fingerprint className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 opacity-20" />
                </div>
                
                {error && (
                  <div className="p-4 bg-red-900/20 brutal-border border-red-500 text-red-500 text-[10px] font-mono">
                    ERROR: {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button onClick={() => setViewState('LANDING')} variant="ghost">BACK</Button>
                  <Button onClick={handleCreateRoom} disabled={loading} className="flex-1 h-16">
                    {loading ? "INITIALIZING..." : "GENERATE SHARD"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* JOIN VIEW */}
          {viewState === 'JOIN' && (
            <motion.div 
              key="join"
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="max-w-xl self-center w-full space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-4xl">Establish Uplink</h3>
                <p className="opacity-40 text-[10px] font-mono">Input room sequence ID and authentication token.</p>
              </div>
              
              <div className="space-y-4">
                <Input 
                  placeholder="SEQUENCE ID (E.G. AB12CD)..." 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="h-16"
                />
                <Input 
                  type="password" 
                  placeholder="SECRET HANDSHAKE..." 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-16"
                />
                
                {error && (
                  <div className="p-4 bg-red-900/20 brutal-border border-red-500 text-red-500 text-[10px] font-mono">
                    ERROR: {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button onClick={() => setViewState('LANDING')} variant="ghost">BACK</Button>
                  <Button onClick={handleJoinRoom} disabled={loading} className="flex-1 h-16">
                    {loading ? "AUTHENTICATING..." : "INITIATE PROTOCOL"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* CHAT VIEW */}
          {viewState === 'CHAT' && activeRoom && (
            <motion.div 
              key="chat"
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="flex-1 flex flex-col relative"
            >
              {/* CHAT HEADER */}
              <div className="flex justify-between items-end mb-8 border-b border-foreground/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className={cn("w-3 h-3", currentTheme.primary)} />
                    <span className="text-[8px] font-mono tracking-widest opacity-40">ENCRYPTED_CHANNEL // ID: {activeRoom.roomCode}</span>
                  </div>
                  <h3 className="text-3xl leading-none">{activeRoom.roomCode}</h3>
                </div>
                <div className="text-right hidden md:block">
                  <span className="text-[8px] font-mono opacity-30 block">EXPIRES_IN</span>
                  <span className="text-[12px] font-mono">23H 59M 59S</span>
                </div>
              </div>

              {/* MESSAGES SCROLL */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar min-h-[400px]">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4 text-center">
                    <Lock className="w-12 h-12" />
                    <p className="font-mono text-[10px]">Secure channel empty. Start transmission.</p>
                  </div>
                )}
                {messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      m.senderId === userId ? "items-end self-end" : "items-start self-start"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1 px-2">
                       <span className={cn("text-[7px] font-mono font-bold", m.senderId === userId ? currentTheme.primary : "text-foreground/40")}>
                        {m.senderId}
                       </span>
                       {showTimestamps && (
                         <span className="text-[6px] opacity-20 font-mono">
                           {m.timestamp?.toDate()?.toLocaleTimeString() || "..."}
                         </span>
                       )}
                    </div>
                    
                    <div className="group relative flex flex-col items-inherit">
                      {/* REACTION PICKER (HOVER) */}
                      <div className={cn(
                        "absolute top-0 opacity-0 group-hover:opacity-100 transition-all z-20 flex gap-2 bg-accent/90 backdrop-blur-sm p-1 brutal-border shadow-xl",
                        m.senderId === userId ? "right-full mr-2" : "left-full ml-2"
                      )}>
                        {['👍', '❤️', '😂', '🔥', '🤐', '💀'].map(emoji => (
                          <button 
                            key={emoji} 
                            onClick={() => handleReaction(m.id, emoji)}
                            className="hover:scale-125 transition-transform p-1 text-xs"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      <div className={cn(
                        "p-3 text-sm transition-all duration-300 relative",
                        bubbleStyle === 'SHARP' && "brutal-border",
                        bubbleStyle === 'ROUNDED' && "rounded-2xl border border-foreground/10",
                        bubbleStyle === 'MINIMAL' && "border-l-2 border-foreground/30 pl-4",
                        m.senderId === userId ? (bubbleStyle === 'SHARP' ? "bg-foreground text-background" : currentTheme.bg + " text-background") : "bg-accent/50 text-foreground",
                        m.senderId === userId && "brutal-shadow"
                      )}>
                        {m.text && <p className="font-mono break-words">{m.text}</p>}
                        {m.file && (
                          <div className="mt-3 space-y-2">
                            {m.file && m.file.type.startsWith('image/') ? (
                              <div className="relative group/image">
                                <img 
                                  src={m.file.data} 
                                  className="max-w-full brutal-border h-auto cursor-zoom-in brightness-90 group-hover/image:brightness-100 transition-all" 
                                  alt="Shared Data" 
                                  onClick={() => m.file && window.open(m.file.data)}
                                />
                              </div>
                            ) : m.file && (
                              <div className="flex items-center gap-3 p-3 bg-black/20 rounded">
                                <File className="w-5 h-5 opacity-40" />
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-mono truncate max-w-[120px]">{m.file.name}</span>
                                  <span className="text-[6px] opacity-30 font-mono">{m.file.type}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ACTIVE REACTIONS DISPLAY */}
                      {m.reactions && Object.values(m.reactions).some(u => u.length > 0) && (
                        <div className={cn(
                          "flex flex-wrap gap-1 mt-1",
                          m.senderId === userId ? "justify-end" : "justify-start"
                        )}>
                          {Object.entries(m.reactions).map(([emoji, users]) => (
                            users.length > 0 && (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(m.id, emoji)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono brutal-border bg-black transition-all hover:scale-105 active:scale-95",
                                  users.includes(userId) ? "border-neon text-neon" : "border-foreground/10 text-foreground/60"
                                )}
                              >
                                <span>{emoji}</span>
                                <span className="font-black">{users.length}</span>
                              </button>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* TYPING INDICATOR */}
                {typingUsers.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-start self-start"
                  >
                    <div className="flex items-center gap-1 px-2 mb-1">
                      <span className="text-[7px] font-mono text-foreground/40">{typingUsers.join(', ')}</span>
                    </div>
                    <div className={cn(
                      "p-3 brutal-border bg-accent/30 text-foreground flex items-center gap-1.5",
                      bubbleStyle === 'ROUNDED' && "rounded-2xl",
                      bubbleStyle === 'MINIMAL' && "border-none border-l-2 border-foreground/30 pl-4"
                    )}>
                      <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-foreground rounded-full" />
                      <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-foreground rounded-full" />
                      <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-foreground rounded-full" />
                    </div>
                  </motion.div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* INPUT RAIL */}
              <div className="mt-8 space-y-4">
                {attachedFile && (
                  <div className={cn("p-4 brutal-border flex items-center justify-between animate-in fade-in slide-in-from-bottom-2", currentTheme.bg + "/10", currentTheme.border)}>
                    <div className="flex items-center gap-4">
                      {attachedFile.type.startsWith('image/') ? (
                        <img src={attachedFile.data} className="w-12 h-12 brutal-border object-cover" alt="Ready to transmit" />
                      ) : (
                        <File className="w-8 h-8" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono leading-none">{attachedFile.name}</span>
                        <span className="text-[8px] font-mono opacity-40">READY FOR SECURE TRANSMISSION</span>
                      </div>
                    </div>
                    <button onClick={() => setAttachedFile(null)} className="hover:text-red-500">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Input 
                      placeholder="ENTER CIPHER TEXT..." 
                      className="pr-20 h-16"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                       <label className="cursor-pointer hover:text-neon transition-colors">
                        <Upload className="w-5 h-5" />
                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.txt" />
                       </label>
                    </div>
                  </div>
                  <Button onClick={handleSend} className="h-16 w-32">
                    SEND <Send className="ml-1 w-4 h-4" />
                  </Button>
                </div>

                {showEntropy && (
                  <div className="flex justify-between items-center opacity-40 text-[7px] font-mono tracking-widest px-1">
                    <span>ENTROPY: 100% // AES-GCM-256</span>
                    <span>SIGNAL: AUTHENTICATED_SESSION</span>
                  </div>
                )}
              </div>

              {/* SETTINGS MODAL */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.9, opacity: 0, rotate: 2 }}
                      className="bg-accent brutal-border p-8 max-w-sm w-full space-y-8 brutal-shadow"
                    >
                      <div className="flex justify-between items-center border-b border-foreground/10 pb-4">
                        <h4 className="text-2xl">PROTOCOL_SETTINGS</h4>
                        <button onClick={() => setShowSettings(false)}><X className="w-6 h-6 hover:rotate-90 transition-transform" /></button>
                      </div>

                      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* THEME */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-mono opacity-40">VISUAL_OVERSIGHT (MODE & THEME)</label>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setIsDarkMode(!isDarkMode)}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-mono brutal-border",
                                isDarkMode ? "bg-accent/50 text-foreground" : "bg-white text-black"
                              )}
                            >
                              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                              {isDarkMode ? "DARK_MODE" : "LIGHT_MODE"}
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {(['NEON', 'AMBER', 'CRIMSON', 'PHANTOM'] as Theme[]).map((t) => (
                              <button 
                                key={t}
                                onClick={() => setTheme(t)}
                                className={cn(
                                  "h-10 brutal-border border-foreground/20 hover:border-foreground transition-all flex items-center justify-center",
                                  theme === t && "bg-foreground text-background border-foreground"
                                )}
                              >
                                <div className={cn("w-3 h-3 rounded-full", themes[t].bg)} />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* BUBBLE STYLE */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-mono opacity-40">DATA_STRUCTURE (UI STYLE)</label>
                          <div className="grid grid-cols-1 gap-2">
                            {(['SHARP', 'ROUNDED', 'MINIMAL'] as BubbleStyle[]).map((s) => (
                              <button 
                                key={s}
                                onClick={() => setBubbleStyle(s)}
                                className={cn(
                                  "p-3 brutal-border border-foreground/20 hover:border-foreground text-[9px] font-mono text-left transition-all",
                                  bubbleStyle === s && "bg-foreground text-background border-foreground"
                                )}
                              >
                                {s} :: {s === 'SHARP' ? "[BRUTALIST]" : s === 'ROUNDED' ? "[MODERN]" : "[GHOST]"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ADVANCED SECURITY TOGGLE */}
                        <div className="border-t border-foreground/10 pt-6 space-y-4">
                          <button 
                            onClick={() => setShowAdvancedSecurity(!showAdvancedSecurity)}
                            className="w-full flex justify-between items-center text-[10px] font-mono"
                          >
                            <span className="flex items-center gap-2">
                              <Shield className={cn("w-3 h-3", currentTheme.primary)} />
                              ADVANCED_SECURITY_PARAMETERS
                            </span>
                            <span className="opacity-40">{showAdvancedSecurity ? "[-]" : "[+]"}</span>
                          </button>

                          <AnimatePresence>
                            {showAdvancedSecurity && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-6 overflow-hidden"
                              >
                                <div className="space-y-3">
                                  <label className="text-[9px] font-mono opacity-40 block">PBKDF2_ITERATION_COUNT</label>
                                  <div className="flex gap-2">
                                    {[50000, 100000, 250000, 500000].map(count => (
                                      <button 
                                        key={count}
                                        onClick={() => setPbkdf2Iterations(count)}
                                        className={cn(
                                          "flex-1 py-2 text-[8px] font-mono brutal-border border-foreground/20",
                                          pbkdf2Iterations === count && "bg-foreground text-background border-foreground"
                                        )}
                                      >
                                        {count / 1000}K
                                      </button>
                                    ))}
                                  </div>
                                  <p className="text-[7px] font-mono opacity-30 italic leading-tight">
                                    Higher counts increase security but may impact decryption speed on older hardware. 
                                    Default recommended: 100K.
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  <label className="text-[10px] font-mono opacity-40">DISPLAY_PREFERENCES</label>
                                  <div className="space-y-2">
                                    <button 
                                      onClick={() => setShowTimestamps(!showTimestamps)}
                                      className="w-full flex justify-between items-center text-[10px] font-mono opacity-80 hover:opacity-100"
                                    >
                                      <span>SHOW TIMESTAMPS</span>
                                      {showTimestamps ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={() => setShowEntropy(!showEntropy)}
                                      className="w-full flex justify-between items-center text-[10px] font-mono opacity-80 hover:opacity-100"
                                    >
                                      <span>DEBUG OVERLAY</span>
                                      {showEntropy ? <Monitor className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <Button 
                          variant="danger" 
                          className="w-full"
                          onClick={() => {
                            setViewState('LANDING');
                            setActiveRoom(null);
                            setMessages([]);
                            setShowSettings(false);
                          }}
                        >
                          ABORT_SESSION <Trash2 className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER RAILS */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-6 pointer-events-none mix-blend-difference flex justify-between items-center">
        <div className="font-mono text-[8px] opacity-20 hidden md:block">
          ENCRYPTION: AES-256-GCM // MODE: ZERO-TRUST-CLIENT
        </div>
        <div className="font-mono text-[8px] opacity-20">
          IDB_SECURE_MESSAGING // MADE FOR ANONYMITY
        </div>
      </footer>

      {/* BACKGROUND GRAPHICS */}
      <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100px_100px]" />
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className={cn("absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full blur-[120px] opacity-20", currentTheme.bg)}
        />
      </div>
    </div>
  );
}
