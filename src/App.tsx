import React, { useState, useEffect, useRef } from "react";
import { auth, provider, db, requestForToken } from "./firebase";
import type { User } from "firebase/auth";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onValue, update, onDisconnect, remove, push, onChildAdded } from "firebase/database";
import { Heart, BellRing, Link2, Settings as SettingsIcon, LogOut, Volume2, VolumeX, Palette, Globe, Save, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, History, Clock, MessageCircle, Send, X, Camera, HeartPulse, ScreenShare, Brush, Moon, CalendarHeart, AlarmClock, Eraser } from "lucide-react";
import { useSettingsStore } from "./store";
import { motion, AnimatePresence } from "framer-motion";

const translations = {
  'zh-TW': {
    title: '情侶專屬呼叫器',
    login: '使用 Google 登入',
    pairTitle: '配對你的另一半',
    pairDesc: '請將你的邀請碼傳給對方：',
    pairInput: '輸入對方的代碼',
    pairBtn: '開始配對',
    partnerStatus: '對方狀態：',
    online: '在線中 ❤️',
    offline: '不在畫面上 (或關閉了)',
    yourCode: '你的代碼:',
    ringingTitle: '寶貝來電視訊！',
    dismissBtn: '接聽 (Answer)',
    triggerBtn: '按下視訊通話',
    settings: '設定',
    logout: '登出',
    theme: '主題顏色',
    language: '語言 / Language',
    sound: '音效提示',
    syncTheme: '同步主題顏色給對方',
    anniversary: '紀念日',
    save: '儲存並關閉',
    pairSuccess: '配對成功！',
    pairFail: '配對失敗。',
    calling: '正在呼叫對方...',
    cancel: '取消',
    minCallTime: '需通話1分鐘',
    mediaError: '需要權限！',
    history: '通話紀錄',
    noHistory: '尚無紀錄',
    missed: '未接來電',
    completed: '已通話',
    outgoing: '撥出通話',
    chat: '傳送訊息',
    typeMessage: '輸入訊息...',
    send: '傳送',
    takePhoto: '拍照留念',
    photoSaved: '已經儲存寶貝的照片囉！',
    screenShare: '分享螢幕',
    whiteboard: '互動白板',
    clearBoard: '清除白板',
    bedtimeMode: '陪睡模式',
    setAlarm: '叫寶貝起床',
    alarmSent: '已經設定鬧鐘給寶貝了！',
    alarmRinging: '寶貝叫你起床囉！',
    daysTogether: '我們已經在一起',
    days: '天',
    partnerTime: '對方時間'
  },
  'en': {
    title: 'Couples Connect',
    login: 'Login with Google',
    pairTitle: 'Pair with your partner',
    pairDesc: 'Share your invite code with them:',
    pairInput: 'Enter partner code',
    pairBtn: 'Start Pairing',
    partnerStatus: 'Partner Status:',
    online: 'Online ❤️',
    offline: 'Offline / Away',
    yourCode: 'Your code:',
    ringingTitle: 'Incoming Video Call!',
    dismissBtn: 'Answer',
    triggerBtn: 'Start Video Call',
    settings: 'Settings',
    logout: 'Logout',
    theme: 'Theme Color',
    language: 'Language',
    sound: 'Sound Indicator',
    syncTheme: 'Sync Theme with Partner',
    anniversary: 'Anniversary Date',
    save: 'Save & Close',
    pairSuccess: 'Pairing Successful!',
    pairFail: 'Pairing failed.',
    calling: 'Calling partner...',
    cancel: 'Cancel',
    minCallTime: '1 min limit',
    mediaError: 'Permission required!',
    history: 'Call History',
    noHistory: 'No history yet',
    missed: 'Missed Call',
    completed: 'Completed',
    outgoing: 'Outgoing Call',
    chat: 'Messages',
    typeMessage: 'Type a message...',
    send: 'Send',
    takePhoto: 'Take Photo',
    photoSaved: 'Photo saved!',
    screenShare: 'Share Screen',
    whiteboard: 'Whiteboard',
    clearBoard: 'Clear Board',
    bedtimeMode: 'Bedtime Mode',
    setAlarm: 'Set Alarm for Partner',
    alarmSent: 'Alarm sent to partner!',
    alarmRinging: 'Your partner woke you up!',
    daysTogether: 'Together for',
    days: 'days',
    partnerTime: 'Partner Time'
  }
};

const themeStyles = {
  pink: { bg: 'bg-pink-50', btn: 'bg-pink-500 hover:bg-pink-600', ring: 'focus:outline-pink-400', txt: 'text-pink-500', light: 'bg-pink-100', hoverLight: 'group-hover:bg-pink-200' },
  blue: { bg: 'bg-blue-50', btn: 'bg-blue-500 hover:bg-blue-600', ring: 'focus:outline-blue-400', txt: 'text-blue-500', light: 'bg-blue-100', hoverLight: 'group-hover:bg-blue-200' },
  purple: { bg: 'bg-purple-50', btn: 'bg-purple-500 hover:bg-purple-600', ring: 'focus:outline-purple-400', txt: 'text-purple-500', light: 'bg-purple-100', hoverLight: 'group-hover:bg-purple-200' },
  teal: { bg: 'bg-teal-50', btn: 'bg-teal-500 hover:bg-teal-600', ring: 'focus:outline-teal-400', txt: 'text-teal-500', light: 'bg-teal-100', hoverLight: 'group-hover:bg-teal-200' }
};

const RTC_CONFIG = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }] };

const FloatingHeart: React.FC<{ id: string, onComplete: (id: string) => void }> = ({ id, onComplete }) => {
  const randomX = Math.random() * 200 - 100;
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5, x: 0 }}
      animate={{ opacity: 0, y: -500, scale: 2, x: randomX }}
      transition={{ duration: 2, ease: "easeOut" }}
      onAnimationComplete={() => onComplete(id)}
      className="fixed bottom-20 left-1/2 text-pink-500 z-50 pointer-events-none"
      style={{ marginLeft: '-1.5rem' }}
    >
      <Heart className="w-12 h-12 fill-current" />
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerTimezone, setPartnerTimezone] = useState<string | null>(null);
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [callHistory, setCallHistory] = useState<any[]>([]);

  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [hearts, setHearts] = useState<{id: string}[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // New Features
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isBedtimeMode, setIsBedtimeMode] = useState(false);
  const [partnerTime, setPartnerTime] = useState<string>('');
  const [incomingAlarm, setIncomingAlarm] = useState(false);

  // WebRTC States
  const [callData, setCallData] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { theme, language, soundEnabled, syncSettings, anniversaryDate, setTheme, setLanguage, setSoundEnabled, setSyncSettings, setAnniversaryDate } = useSettingsStore();
  const t = translations[language];
  const curTheme = themeStyles[theme];

  const isReceivingCall = callData?.status === 'ringing' && callData.caller !== user?.uid;
  const isInCall = callData?.status === 'connected';

  // Computed Anniversary
  const daysTogether = anniversaryDate ? Math.floor((Date.now() - new Date(anniversaryDate).getTime()) / 86400000) : null;

  useEffect(() => {
    const beep = new Audio('data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    beep.loop = true;
    audioRef.current = beep;
  }, []);

  useEffect(() => {
    if (isReceivingCall || incomingAlarm) {
      if (soundEnabled && !isBedtimeMode) audioRef.current?.play().catch(() => {});
      if (Notification.permission === 'granted' && isReceivingCall) {
        const notif = new Notification(t.ringingTitle, { body: '寶貝在找你囉！快接聽！', icon: '/icons/pwa-192x192.png', requireInteraction: true, tag: 'incoming-call' });
        notif.onclick = () => { window.focus(); notif.close(); };
      }
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [isReceivingCall, soundEnabled, incomingAlarm, isBedtimeMode, t.ringingTitle]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const myStatusRef = ref(db, `users/${currentUser.uid}/status`);
        set(myStatusRef, "online");
        update(ref(db, `users/${currentUser.uid}`), { timezone: myTz });
        onDisconnect(myStatusRef).set("offline");

        onValue(ref(db, `users/${currentUser.uid}`), (snapshot) => {
          const data = snapshot.val();
          if (data?.partnerId) setPartnerId(data.partnerId);
          if (data?.theme && syncSettings) setTheme(data.theme);
          if (data?.history) setCallHistory(Object.values(data.history).sort((a: any, b: any) => b.timestamp - a.timestamp));
        });

        // Listen for alarms
        onChildAdded(ref(db, `users/${currentUser.uid}/alarms`), (snap) => {
           if (Date.now() - snap.val().timestamp < 60000) setIncomingAlarm(true);
        });

        const token = await requestForToken();
        if (token) update(ref(db, `users/${currentUser.uid}`), { fcmToken: token });
      }
    });

    const handleVisibilityChange = () => {
      if (auth.currentUser) set(ref(db, `users/${auth.currentUser.uid}/status`), document.visibilityState === "hidden" ? "away" : "online");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { unsubscribeAuth(); document.removeEventListener("visibilitychange", handleVisibilityChange); };
  }, [syncSettings, setTheme]);

  useEffect(() => {
    if (partnerId) {
      onValue(ref(db, `users/${partnerId}/status`), (snap) => setPartnerOnline(snap.val() === "online" || snap.val() === "away"));
      onValue(ref(db, `users/${partnerId}/timezone`), (snap) => setPartnerTimezone(snap.val()));
    }
  }, [partnerId]);

  useEffect(() => {
    if (partnerTimezone) {
      const interval = setInterval(() => {
        setPartnerTime(new Intl.DateTimeFormat(language === 'zh-TW' ? 'zh-TW' : 'en-US', { timeZone: partnerTimezone, timeStyle: 'short' }).format(new Date()));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [partnerTimezone, language]);

  useEffect(() => {
    if (user && partnerId) setRoomId([user.uid, partnerId].sort().join('_'));
  }, [user, partnerId]);

  useEffect(() => {
    if (user && syncSettings) {
      update(ref(db, `users/${user.uid}`), { theme });
      if (partnerId) update(ref(db, `users/${partnerId}`), { theme });
    }
  }, [theme, syncSettings, user, partnerId]);

  useEffect(() => {
    if (!roomId) return;
    const callRef = ref(db, `calls/${roomId}`);
    onDisconnect(callRef).remove();
    const unsubCall = onValue(callRef, (snap) => {
      const data = snap.val();
      setCallData(data);
      if (!data) cleanupCall();
    });

    const unsubChat = onValue(ref(db, `rooms/${roomId}/messages`), (snap) => {
      if (snap.val()) {
        setMessages(Object.values(snap.val()).sort((a: any, b: any) => a.timestamp - b.timestamp));
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    const unsubHearts = onChildAdded(ref(db, `rooms/${roomId}/hearts`), (snap) => {
       const h = snap.val();
       if (h && Date.now() - h.timestamp < 5000) setHearts(prev => [...prev, { id: snap.key as string }]);
    });

    // Whiteboard Sync
    const unsubWhiteboard = onChildAdded(ref(db, `rooms/${roomId}/draw`), (snap) => {
       const line = snap.val();
       if (line && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.beginPath();
            ctx.moveTo(line.x0, line.y0);
            ctx.lineTo(line.x1, line.y1);
            ctx.strokeStyle = line.color;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
          }
       }
    });

    onValue(ref(db, `rooms/${roomId}/drawClear`), (snap) => {
       if (snap.val() && canvasRef.current) {
         const ctx = canvasRef.current.getContext('2d');
         ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
       }
    });

    return () => { unsubCall(); unsubChat(); unsubHearts(); unsubWhiteboard(); };
  }, [roomId]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isInCall) timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    else setCallDuration(0);
    return () => clearInterval(timer);
  }, [isInCall]);

  useEffect(() => { if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream; }, [localStream, callData]);
  useEffect(() => { if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream, callData]);

  const cleanupCall = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setShowWhiteboard(false);
    setIsBedtimeMode(false);
  };

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => signOut(auth);

  const handlePairing = async () => {
    if (!user || !pairingCodeInput) return;
    try {
        await update(ref(db, `users/${user.uid}`), { partnerId: pairingCodeInput });
        await update(ref(db, `users/${pairingCodeInput}`), { partnerId: user.uid });
        alert(t.pairSuccess);
    } catch(err) { alert(t.pairFail); }
  };

  const initWebRTC = async (isCaller: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.ontrack = (event) => setRemoteStream(event.streams[0]);

      pc.onicecandidate = (event) => {
        if (event.candidate && roomId) {
          push(ref(db, `calls/${roomId}/${isCaller ? 'callerCandidates' : 'calleeCandidates'}`), event.candidate.toJSON());
        }
      };
      return pc;
    } catch (e) { alert(t.mediaError); return null; }
  };

  const startCall = async () => {
    if (!roomId || !user) return;
    const pc = await initWebRTC(true);
    if (!pc) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await set(ref(db, `calls/${roomId}`), { caller: user.uid, status: 'ringing', offer: { type: offer.type, sdp: offer.sdp } });

    onValue(ref(db, `calls/${roomId}/answer`), (snap) => {
      const answer = snap.val();
      if (answer && pc.signalingState !== 'stable') pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(() => {});
    });

    onChildAdded(ref(db, `calls/${roomId}/calleeCandidates`), (snap) => {
      if (snap.val()) pc.addIceCandidate(new RTCIceCandidate(snap.val())).catch(() => {});
    });
    push(ref(db, `users/${user.uid}/history`), { type: 'outgoing', timestamp: Date.now() });
  };

  const answerCall = async () => {
    if (!roomId) return;
    const pc = await initWebRTC(false);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await update(ref(db, `calls/${roomId}`), { status: 'connected', answer: { type: answer.type, sdp: answer.sdp } });

    onChildAdded(ref(db, `calls/${roomId}/callerCandidates`), (snap) => {
      if (snap.val()) pc.addIceCandidate(new RTCIceCandidate(snap.val())).catch(() => {});
    });

    push(ref(db, `users/${user.uid}/history`), { type: 'completed', timestamp: Date.now() });
    if (partnerId) push(ref(db, `users/${partnerId}/history`), { type: 'completed', timestamp: Date.now() });
  };

  const handleHangup = async () => {
    if (isInCall && callDuration < 60 && !isBedtimeMode) {
      alert(language === 'zh-TW' ? '接通後必須通話至少一分鐘！(陪睡模式可忽略)' : 'Must call for at least 1 minute! (Bedtime Mode ignores this)');
      return;
    }
    if (callData?.status === 'ringing' && !isInCall && user) {
        const receiver = callData.caller === user.uid ? partnerId : user.uid;
        if (receiver) push(ref(db, `users/${receiver}/history`), { type: 'missed', timestamp: Date.now() });
    }
    if (roomId) await remove(ref(db, `calls/${roomId}`));
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted);
        setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => t.enabled = isVideoOff);
        setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current || !localStreamRef.current) return;
    if (!isScreenSharing) {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) videoSender.replaceTrack(screenTrack);
            setLocalStream(screenStream);
            setIsScreenSharing(true);
            screenTrack.onended = () => {
                navigator.mediaDevices.getUserMedia({ video: true }).then(camStream => {
                    const camTrack = camStream.getVideoTracks()[0];
                    if (videoSender) videoSender.replaceTrack(camTrack);
                    setLocalStream(camStream);
                    localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
                    localStreamRef.current?.addTrack(camTrack);
                    setIsScreenSharing(false);
                });
            };
        } catch (e) { console.error(e); }
    } else {
        try {
            const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const camTrack = camStream.getVideoTracks()[0];
            const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) videoSender.replaceTrack(camTrack);
            setLocalStream(camStream);
            setIsScreenSharing(false);
        } catch(e) { console.error(e); }
    }
  };

  const takePhoto = () => {
    if (!remoteVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = remoteVideoRef.current.videoWidth;
    canvas.height = remoteVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(remoteVideoRef.current, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `CouplesConnect_${new Date().getTime()}.png`;
      a.click();
      alert(t.photoSaved);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() || !roomId || !user) return;
    await push(ref(db, `rooms/${roomId}/messages`), { text: msgInput, senderId: user.uid, timestamp: Date.now() });
    setMsgInput("");
  };

  const sendHeart = async () => {
    if (!roomId) return;
    await push(ref(db, `rooms/${roomId}/hearts`), { timestamp: Date.now() });
  };

  const triggerPartnerAlarm = async () => {
    if (!partnerId) return;
    await push(ref(db, `users/${partnerId}/alarms`), { timestamp: Date.now() });
    alert(t.alarmSent);
  };

  // Whiteboard drawing logic
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({x: 0, y: 0});
  const drawLine = (e: any) => {
    if (!drawing || !canvasRef.current || !roomId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    const currentX = x - rect.left;
    const currentY = y - rect.top;
    
    push(ref(db, `rooms/${roomId}/draw`), { x0: lastPos.x, y0: lastPos.y, x1: currentX, y1: currentY, color: theme === 'pink' ? '#ec4899' : '#3b82f6' });
    setLastPos({ x: currentX, y: currentY });
  };
  const startDrawing = (e: any) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setLastPos({ x: x - rect.left, y: y - rect.top });
    setDrawing(true);
  };

  if (!user) {
    return (
      <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`flex h-screen items-center justify-center ${curTheme.bg} transition-colors duration-500`}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="p-10 bg-white rounded-3xl shadow-xl text-center">
            <Heart className={`mx-auto ${curTheme.txt} mb-4 w-16 h-16`} />
            <h1 className="text-2xl font-bold mb-6 text-gray-800">{t.title}</h1>
            <button onClick={handleLogin} className={`${curTheme.btn} text-white font-semibold py-3 px-6 rounded-full transition-all`}>
              {t.login}
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!partnerId) {
    return (
      <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex h-screen items-center justify-center ${curTheme.bg} transition-colors duration-500`}>
          <motion.div initial={{ x: -50 }} animate={{ x: 0 }} className="p-8 bg-white rounded-3xl shadow-xl w-96 text-center relative">
            <button onClick={handleLogout} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><LogOut size={20} /></button>
            <Link2 className="mx-auto text-gray-400 mb-4 w-12 h-12" />
            <h2 className="text-xl font-bold mb-2">{t.pairTitle}</h2>
            <p className="text-sm text-gray-500 mb-6">{t.pairDesc}<br/><span className={`font-mono ${curTheme.light} p-1 rounded font-bold`}>{user.uid}</span></p>
            <input type="text" placeholder={t.pairInput} value={pairingCodeInput} onChange={(e) => setPairingCodeInput(e.target.value)} className={`w-full border rounded-lg p-3 mb-4 ${curTheme.ring} outline-none transition-shadow`} />
            <button onClick={handlePairing} className={`w-full text-white py-3 rounded-full font-bold shadow-md ${curTheme.btn} transition-colors`}>{t.pairBtn}</button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden items-center justify-center transition-all duration-500 ${curTheme.bg}`}>
      
      {/* Floating Hearts Layer */}
      {hearts.map(h => <FloatingHeart key={h.id} id={h.id} onComplete={(id) => setHearts(prev => prev.filter(heart => heart.id !== id))} />)}

      {/* Top Bar Navigation */}
      {!callData && (
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="absolute top-6 w-full px-6 flex justify-between items-start z-10">
           <div className="flex flex-col gap-2">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold shadow ${partnerOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {t.partnerStatus} {partnerOnline ? t.online : t.offline}
              </span>
              {partnerTime && partnerOnline && (
                 <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-md shadow-sm border border-gray-200 backdrop-blur inline-block w-fit">
                   {t.partnerTime}: {partnerTime}
                 </span>
              )}
           </div>
           <div className="flex gap-2 sm:gap-3 flex-wrap justify-end">
              <button onClick={triggerPartnerAlarm} className="p-3 bg-white/80 backdrop-blur rounded-full shadow hover:bg-white transition-colors" title={t.setAlarm}>
                 <AlarmClock className="text-orange-500" size={24} />
              </button>
              <button onClick={() => setShowChat(true)} className="p-3 bg-white/80 backdrop-blur rounded-full shadow hover:bg-white transition-colors relative">
                 <MessageCircle className="text-gray-700" size={24} />
              </button>
              <button onClick={() => setShowHistory(true)} className="p-3 bg-white/80 backdrop-blur rounded-full shadow hover:bg-white transition-colors">
                 <History className="text-gray-700" size={24} />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-3 bg-white/80 backdrop-blur rounded-full shadow hover:bg-white transition-colors">
                 <SettingsIcon className="text-gray-700" size={24} />
              </button>
           </div>
        </motion.div>
      )}

      {/* Main Home Screen */}
      {!callData && (
        <AnimatePresence>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-10 rounded-[3rem] shadow-2xl transition-all duration-300 bg-white flex flex-col items-center gap-6 relative`}>
            
            {daysTogether !== null && (
               <div className="absolute -top-6 bg-pink-100 border border-pink-200 text-pink-600 px-6 py-2 rounded-full font-bold shadow-md flex items-center gap-2">
                  <CalendarHeart size={20}/> {t.daysTogether} {daysTogether} {t.days}
               </div>
            )}

            <div className="text-center cursor-pointer group relative mt-4" onClick={startCall}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`w-48 h-48 rounded-full ${curTheme.light} flex items-center justify-center shadow-inner relative overflow-hidden`}>
                 <div className={`absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                 <Video className={`w-20 h-20 ${curTheme.txt} group-hover:scale-110 transition-transform duration-300 relative z-10`} />
              </motion.div>
              <p className="mt-6 text-xl font-bold text-gray-700">{t.triggerBtn}</p>
            </div>
            
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={sendHeart} className={`p-4 rounded-full bg-pink-100 text-pink-500 shadow hover:bg-pink-200 transition-colors`}>
               <HeartPulse size={32} />
            </motion.button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Incoming Alarm Overlay */}
      <AnimatePresence>
         {incomingAlarm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-orange-500/90 backdrop-blur-xl flex flex-col items-center justify-center text-white">
               <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>
                  <AlarmClock size={120} className="mb-8" />
               </motion.div>
               <h1 className="text-4xl font-bold mb-10">{t.alarmRinging}</h1>
               <button onClick={() => setIncomingAlarm(false)} className="px-10 py-4 bg-white text-orange-500 font-bold rounded-full text-2xl shadow-xl hover:scale-105 transition-transform">
                  關閉鬧鐘
               </button>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Active Call UI Layer */}
      {callData && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-40 flex items-center justify-center overflow-hidden ${isBedtimeMode ? 'bg-black' : 'bg-gray-900'}`}>
              
              <video ref={remoteVideoRef} autoPlay playsInline className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isBedtimeMode ? 'opacity-30' : 'opacity-100'} bg-black`} />
              
              {showWhiteboard && (
                 <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} onMouseDown={startDrawing} onMouseMove={drawLine} onMouseUp={() => setDrawing(false)} onTouchStart={startDrawing} onTouchMove={drawLine} onTouchEnd={() => setDrawing(false)} className="absolute inset-0 w-full h-full z-10 cursor-crosshair touch-none" />
              )}

              <motion.video drag dragConstraints={{ left: -300, right: 30, top: -500, bottom: 30 }} ref={localVideoRef} autoPlay playsInline muted className={`absolute bottom-32 right-6 w-32 h-48 bg-gray-800 border-2 border-white/50 rounded-2xl object-cover shadow-2xl cursor-grab active:cursor-grabbing transition-opacity z-20 ${isVideoOff || isBedtimeMode ? 'opacity-0' : 'opacity-100'}`} />

              {callData.status === 'ringing' && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white z-50">
                      {isReceivingCall ? (
                         <>
                           <motion.div animate={{ rotate: [0, -15, 15, -15, 15, 0] }} transition={{ repeat: Infinity, duration: 1 }}><BellRing className="w-24 h-24 text-green-400 mb-6" /></motion.div>
                           <h2 className="text-3xl font-bold text-green-400 mb-8">{t.ringingTitle}</h2>
                           <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={answerCall} className="bg-green-500 hover:bg-green-600 px-12 py-4 rounded-full text-2xl font-bold shadow-[0_0_40px_rgba(34,197,94,0.6)] flex items-center gap-3"><Phone size={32}/> {t.dismissBtn}</motion.button>
                         </>
                      ) : (
                         <>
                           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><Phone className="w-20 h-20 text-gray-300 mb-6" /></motion.div>
                           <h2 className="text-2xl font-bold text-gray-200 mb-8">{t.calling}</h2>
                           <button onClick={handleHangup} className="bg-red-500 hover:bg-red-600 px-10 py-3 rounded-full font-bold shadow-xl mt-10 flex items-center gap-2"><PhoneOff size={24}/> {t.cancel}</button>
                         </>
                      )}
                  </div>
              )}

              {isInCall && (
                  <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className={`absolute left-1/2 -translate-x-1/2 flex flex-wrap justify-center items-center gap-3 p-3 rounded-[2rem] z-50 shadow-2xl transition-all duration-500 w-[90%] max-w-2xl ${isBedtimeMode ? 'bottom-2 bg-black/80 border border-gray-800 opacity-30 hover:opacity-100' : 'bottom-6 bg-black/50 backdrop-blur-xl border border-white/10'}`}>
                      <button onClick={toggleMute} className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-200/90 text-gray-800 hover:bg-white'}`}>{isMuted ? <MicOff size={24}/> : <Mic size={24}/>}</button>
                      <button onClick={toggleVideo} className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-200/90 text-gray-800 hover:bg-white'}`}>{isVideoOff ? <VideoOff size={24}/> : <Video size={24}/>}</button>
                      <button onClick={takePhoto} className={`p-4 rounded-full transition-all bg-gray-200/90 text-gray-800 hover:bg-white`}><Camera size={24}/></button>
                      <button onClick={toggleScreenShare} className={`p-4 rounded-full transition-all ${isScreenSharing ? 'bg-blue-500 text-white' : 'bg-gray-200/90 text-gray-800 hover:bg-white'}`}><ScreenShare size={24}/></button>
                      <button onClick={() => setShowWhiteboard(!showWhiteboard)} className={`p-4 rounded-full transition-all ${showWhiteboard ? 'bg-blue-500 text-white' : 'bg-gray-200/90 text-gray-800 hover:bg-white'}`}><Brush size={24}/></button>
                      {showWhiteboard && <button onClick={() => { if(roomId) push(ref(db, `rooms/${roomId}/drawClear`), true) }} className={`p-4 rounded-full transition-all bg-red-100 text-red-500 hover:bg-red-200`}><Eraser size={24}/></button>}
                      <button onClick={() => setIsBedtimeMode(!isBedtimeMode)} className={`p-4 rounded-full transition-all ${isBedtimeMode ? 'bg-indigo-500 text-white shadow-[0_0_15px_indigo]' : 'bg-gray-200/90 text-gray-800 hover:bg-white'}`}><Moon size={24}/></button>
                      <button onClick={() => setShowChat(true)} className={`p-4 rounded-full transition-all bg-gray-200/90 text-gray-800 hover:bg-white`}><MessageCircle size={24}/></button>
                      <button onClick={handleHangup} disabled={callDuration < 60 && !isBedtimeMode} className={`p-4 ml-auto rounded-full text-white transition-all ${callDuration < 60 && !isBedtimeMode ? 'bg-gray-600 opacity-50' : 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.8)]'}`}><PhoneOff size={28} /></button>
                  </motion.div>
              )}

              {isInCall && !isBedtimeMode && (
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/40 text-white px-6 py-2 rounded-full font-mono text-xl tracking-widest z-50 shadow-xl backdrop-blur-md border border-white/10 flex flex-col items-center pointer-events-none">
                      <span>{Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}</span>
                  </div>
              )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Chat Drawer */}
      <AnimatePresence>
        {showChat && (
           <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white/95 backdrop-blur-xl z-50 shadow-2xl flex flex-col border-l border-gray-200">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                 <h3 className="font-bold text-lg flex items-center gap-2"><MessageCircle/> {t.chat}</h3>
                 <button onClick={() => setShowChat(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                 {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                       <div className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-sm ${msg.senderId === user?.uid ? `${curTheme.btn} text-white rounded-br-sm` : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'}`}>
                          {msg.text}
                       </div>
                       <span className="text-[10px] text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                 ))}
                 <div ref={chatBottomRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-2">
                 <input value={msgInput} onChange={(e) => setMsgInput(e.target.value)} type="text" placeholder={t.typeMessage} className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                 <button type="submit" className={`p-3 rounded-full text-white shadow-md transition-transform active:scale-95 ${curTheme.btn}`}><Send size={18}/></button>
              </form>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon/> {t.settings}</h3>
                   <button onClick={handleLogout} className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-semibold"><LogOut size={16}/> {t.logout}</button>
                </div>
                <div className="space-y-4 h-[50vh] overflow-y-auto pr-2">
                   <div>
                     <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2"><Palette size={16}/> {t.theme}</label>
                     <div className="flex gap-3">
                       {(['pink', 'blue', 'purple', 'teal'] as const).map(c => (
                          <button key={c} onClick={() => setTheme(c)} className={`w-10 h-10 rounded-full transition-all ${theme === c ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : ''}`} style={{backgroundColor: `var(--tw-color-${c}-400, ${c === 'pink' ? '#f472b6' : c === 'blue' ? '#60a5fa' : c === 'purple' ? '#c084fc' : '#2dd4bf'})`}} />
                       ))}
                     </div>
                   </div>
                   <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="text-sm font-semibold text-gray-700">{t.syncTheme}</span>
                      <button onClick={() => setSyncSettings(!syncSettings)} className={`w-12 h-6 rounded-full relative transition-colors ${syncSettings ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${syncSettings ? 'left-7' : 'left-1 shadow-sm'}`} />
                      </button>
                   </div>
                   <div>
                     <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2"><CalendarHeart size={16}/> {t.anniversary}</label>
                     <input type="date" value={anniversaryDate || ''} onChange={(e) => setAnniversaryDate(e.target.value)} className={`w-full border rounded-lg p-2 ${curTheme.ring} outline-none text-gray-700`} />
                   </div>
                   <div>
                     <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2"><Globe size={16}/> {t.language}</label>
                     <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setLanguage('zh-TW')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${language === 'zh-TW' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>中文</button>
                        <button onClick={() => setLanguage('en')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${language === 'en' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>English</button>
                     </div>
                   </div>
                   <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                         {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>} {t.sound}
                      </span>
                      <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-6 rounded-full relative transition-colors ${soundEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${soundEnabled ? 'left-7' : 'left-1 shadow-sm'}`} />
                      </button>
                   </div>
                </div>
                <button onClick={() => setShowSettings(false)} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-md ${curTheme.btn} transition-all mt-4`}>
                   <Save size={20}/> {t.save}
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-2xl font-bold flex items-center gap-2"><History/> {t.history}</h3>
                   <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-700 p-2"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {callHistory.length === 0 ? (
                    <p className="text-center text-gray-500 mt-10">{t.noHistory}</p>
                  ) : (
                    callHistory.map((item, index) => (
                      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
                         <div className={`p-3 rounded-full ${item.type === 'missed' ? 'bg-red-100 text-red-500' : item.type === 'outgoing' ? 'bg-blue-100 text-blue-500' : 'bg-green-100 text-green-500'}`}><Phone size={20} /></div>
                         <div className="flex-1">
                            <p className={`font-bold ${item.type === 'missed' ? 'text-red-500' : 'text-gray-800'}`}>{t[item.type as keyof typeof t]}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock size={12}/> {new Date(item.timestamp).toLocaleString()}</p>
                         </div>
                      </motion.div>
                    ))
                  )}
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}