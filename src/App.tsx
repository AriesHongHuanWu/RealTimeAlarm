import { useState, useEffect, useRef } from "react";
import { auth, provider, db } from "./firebase";
import type { User } from "firebase/auth";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onValue, update, onDisconnect, remove, push, onChildAdded } from "firebase/database";
import { Heart, BellRing, Link2, Settings as SettingsIcon, LogOut, Volume2, VolumeX, Palette, Globe, Save, Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useSettingsStore } from "./store";

// UI Strings for i18n
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
    save: '儲存並關閉',
    pairSuccess: '配對成功！',
    pairFail: '配對失敗，請檢查權限或配對碼是否正確。',
    calling: '正在呼叫對方...',
    cancel: '取消',
    minCallTime: '需通話1分鐘',
    mediaError: '需要相機與麥克風權限！'
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
    save: 'Save & Close',
    pairSuccess: 'Pairing Successful!',
    pairFail: 'Pairing failed. Please check the code.',
    calling: 'Calling partner...',
    cancel: 'Cancel',
    minCallTime: '1 min limit',
    mediaError: 'Camera and Mic permission required!'
  }
};

const themeStyles = {
  pink: { bg: 'bg-pink-50', btn: 'bg-pink-500 hover:bg-pink-600', ring: 'focus:outline-pink-400', txt: 'text-pink-500', light: 'bg-pink-100', hoverLight: 'group-hover:bg-pink-200' },
  blue: { bg: 'bg-blue-50', btn: 'bg-blue-500 hover:bg-blue-600', ring: 'focus:outline-blue-400', txt: 'text-blue-500', light: 'bg-blue-100', hoverLight: 'group-hover:bg-blue-200' },
  purple: { bg: 'bg-purple-50', btn: 'bg-purple-500 hover:bg-purple-600', ring: 'focus:outline-purple-400', txt: 'text-purple-500', light: 'bg-purple-100', hoverLight: 'group-hover:bg-purple-200' },
  teal: { bg: 'bg-teal-50', btn: 'bg-teal-500 hover:bg-teal-600', ring: 'focus:outline-teal-400', txt: 'text-teal-500', light: 'bg-teal-100', hoverLight: 'group-hover:bg-teal-200' }
};

// Standard STUN servers for WebRTC P2P connection
const RTC_CONFIG = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }] };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  const { theme, language, soundEnabled, syncSettings, setTheme, setLanguage, setSoundEnabled, setSyncSettings } = useSettingsStore();
  const t = translations[language];
  const curTheme = themeStyles[theme];

  // Helper flags
  const isReceivingCall = callData?.status === 'ringing' && callData.caller !== user?.uid;
  const isInCall = callData?.status === 'connected';

  useEffect(() => {
    const beep = new Audio('data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    beep.loop = true;
    audioRef.current = beep;
  }, []);

  // Handle ringing sounds
  useEffect(() => {
    if (isReceivingCall && soundEnabled) {
      audioRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [isReceivingCall, soundEnabled]);

  // Initial Auth hook
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const myStatusRef = ref(db, `users/${currentUser.uid}/status`);
        set(myStatusRef, "online");
        onDisconnect(myStatusRef).set("offline");

        const myDataRef = ref(db, `users/${currentUser.uid}`);
        onValue(myDataRef, (snapshot) => {
          const data = snapshot.val();
          if (data?.partnerId) setPartnerId(data.partnerId);
          if (data?.theme && syncSettings) setTheme(data.theme);
        });
      }
    });

    const handleVisibilityChange = () => {
      if (auth.currentUser) {
        set(ref(db, `users/${auth.currentUser.uid}/status`), document.visibilityState === "hidden" ? "away" : "online");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      unsubscribeAuth();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncSettings, setTheme]);

  // Partner status & Room ID derivation
  useEffect(() => {
    if (partnerId) {
      onValue(ref(db, `users/${partnerId}/status`), (snap) => setPartnerOnline(snap.val() === "online" || snap.val() === "away"));
    }
  }, [partnerId]);

  useEffect(() => {
    if (user && partnerId) {
      setRoomId([user.uid, partnerId].sort().join('_'));
    }
  }, [user, partnerId]);

  // Sync settings
  useEffect(() => {
    if (user && syncSettings) {
      update(ref(db, `users/${user.uid}`), { theme });
      if (partnerId) update(ref(db, `users/${partnerId}`), { theme });
    }
  }, [theme, syncSettings, user, partnerId]);

  // Call Data Listener
  useEffect(() => {
    if (!roomId) return;
    const callRef = ref(db, `calls/${roomId}`);
    onDisconnect(callRef).remove(); // Extra safety
    const unsub = onValue(callRef, (snap) => {
      const data = snap.val();
      setCallData(data);
      if (!data) cleanupCall();
    });
    return () => unsub();
  }, [roomId]);

  // Call Duration Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isInCall) {
      timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isInCall]);

  // Bind video streams to refs
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream, callData]);
  
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream, callData]);

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
  };

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => signOut(auth);

  const handlePairing = async () => {
    if (!user || !pairingCodeInput) return;
    try {
        await update(ref(db, `users/${user.uid}`), { partnerId: pairingCodeInput });
        await update(ref(db, `users/${pairingCodeInput}`), { partnerId: user.uid });
        alert(t.pairSuccess);
    } catch(err) {
        console.error(err);
        alert(t.pairFail);
    }
  };

  // --- WebRTC Logic ---

  const startCall = async () => {
    if (!roomId || !user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => setRemoteStream(event.streams[0]);

      // Push caller candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(db, `calls/${roomId}/callerCandidates`), event.candidate.toJSON());
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await set(ref(db, `calls/${roomId}`), {
        caller: user.uid,
        status: 'ringing',
        offer: { type: offer.type, sdp: offer.sdp }
      });

      // Listen for answer dynamically
      onValue(ref(db, `calls/${roomId}/answer`), (snap) => {
        const answer = snap.val();
        if (answer && pc.signalingState !== 'stable') {
          pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(() => {});
        }
      });

      // Listen for remote ICE
      onChildAdded(ref(db, `calls/${roomId}/calleeCandidates`), (snap) => {
        if (snap.val()) pc.addIceCandidate(new RTCIceCandidate(snap.val())).catch(() => {});
      });

    } catch (e) {
      console.error(e);
      alert(t.mediaError);
    }
  };

  const answerCall = async () => {
    if (!roomId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => setRemoteStream(event.streams[0]);

      // Push callee candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(db, `calls/${roomId}/calleeCandidates`), event.candidate.toJSON());
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await update(ref(db, `calls/${roomId}`), {
        status: 'connected',
        answer: { type: answer.type, sdp: answer.sdp }
      });

      // Listen for remote ICE
      onChildAdded(ref(db, `calls/${roomId}/callerCandidates`), (snap) => {
        if (snap.val()) pc.addIceCandidate(new RTCIceCandidate(snap.val())).catch(() => {});
      });

    } catch (e) {
      console.error(e);
      alert(t.mediaError);
    }
  };

  const handleHangup = async () => {
    if (isInCall && callDuration < 60) {
      alert(`接通後必須通話至少一分鐘！(Must call for at least 1 minute)`);
      return;
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


  // --- UI Renders ---

  if (!user) {
    return (
      <div className={`flex h-screen items-center justify-center ${curTheme.bg} transition-colors duration-500`}>
        <div className="p-10 bg-white rounded-3xl shadow-xl text-center">
          <Heart className={`mx-auto ${curTheme.txt} mb-4 w-16 h-16`} />
          <h1 className="text-2xl font-bold mb-6 text-gray-800">{t.title}</h1>
          <button onClick={handleLogin} className={`${curTheme.btn} text-white font-semibold py-3 px-6 rounded-full transition-all`}>
            {t.login}
          </button>
        </div>
      </div>
    );
  }

  if (!partnerId) {
    return (
      <div className={`flex h-screen items-center justify-center ${curTheme.bg} transition-colors duration-500`}>
        <div className="p-8 bg-white rounded-3xl shadow-xl w-96 text-center relative">
          <button onClick={handleLogout} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
             <LogOut size={20} />
          </button>
          <Link2 className="mx-auto text-gray-400 mb-4 w-12 h-12" />
          <h2 className="text-xl font-bold mb-2">{t.pairTitle}</h2>
          <p className="text-sm text-gray-500 mb-6">{t.pairDesc}<br/><span className={`font-mono ${curTheme.light} p-1 rounded font-bold`}>{user.uid}</span></p>
          <input 
            type="text" 
            placeholder={t.pairInput} 
            value={pairingCodeInput}
            onChange={(e) => setPairingCodeInput(e.target.value)}
            className={`w-full border rounded-lg p-3 mb-4 ${curTheme.ring} outline-none transition-shadow`}
          />
          <button onClick={handlePairing} className={`w-full text-white py-3 rounded-full font-bold shadow-md ${curTheme.btn} transition-colors`}>
            {t.pairBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen items-center justify-center transition-all duration-500 ${curTheme.bg}`}>
      
      {/* Top Bar Navigation (Hidden during call) */}
      {!callData && (
        <div className="absolute top-6 w-full px-6 flex justify-between items-start z-10">
           <div className="flex flex-col">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold shadow ${partnerOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {t.partnerStatus} {partnerOnline ? t.online : t.offline}
              </span>
              <div className="mt-2 text-sm text-gray-500 font-mono opacity-60">
                {t.yourCode} {user.uid}
              </div>
           </div>
           <button onClick={() => setShowSettings(true)} className="p-3 bg-white/80 backdrop-blur rounded-full shadow hover:bg-white transition-colors">
              <SettingsIcon className="text-gray-700" size={24} />
           </button>
        </div>
      )}

      {/* Main Home Screen (Idle) */}
      {!callData && (
        <div className={`p-10 rounded-full shadow-2xl transition-all duration-300 bg-white`}>
          <div className="text-center cursor-pointer group" onClick={startCall}>
            <div className={`w-48 h-48 rounded-full ${curTheme.light} flex items-center justify-center ${curTheme.hoverLight} transition-all shadow-inner`}>
               <Video className={`w-20 h-20 ${curTheme.txt} group-hover:scale-125 transition-transform duration-300`} />
            </div>
            <p className="mt-6 text-xl font-bold text-gray-700">{t.triggerBtn}</p>
          </div>
        </div>
      )}

      {/* Active Call UI Layer */}
      {callData && (
        <div className="fixed inset-0 bg-gray-900 z-40 flex items-center justify-center overflow-hidden">
            {/* Main Remote Video */}
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />
            
            {/* Small Local Video */}
            <video ref={localVideoRef} autoPlay playsInline muted className={`absolute bottom-32 right-6 w-28 h-40 bg-gray-800 border-2 border-white/50 rounded-xl object-cover shadow-2xl transition-all ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} />

            {/* Video Off Placeholder */}
            {isVideoOff && (
              <div className="absolute bottom-32 right-6 w-28 h-40 bg-gray-800 border-2 border-gray-600 rounded-xl flex items-center justify-center shadow-2xl">
                 <VideoOff className="text-gray-500 w-10 h-10"/>
              </div>
            )}

            {/* Calling overlay if not connected */}
            {callData.status === 'ringing' && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
                    {isReceivingCall ? (
                       <>
                         <BellRing className="w-24 h-24 text-green-400 animate-pulse mb-6" />
                         <h2 className="text-3xl font-bold text-green-400 mb-8">{t.ringingTitle}</h2>
                         <button onClick={answerCall} className="bg-green-500 hover:bg-green-600 px-12 py-4 rounded-full text-2xl font-bold shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-bounce flex items-center gap-3">
                           <Phone size={32}/> {t.dismissBtn}
                         </button>
                       </>
                    ) : (
                       <>
                         <Phone className="w-20 h-20 text-gray-300 animate-pulse mb-6" />
                         <h2 className="text-2xl font-bold text-gray-200 mb-8">{t.calling}</h2>
                         <button onClick={handleHangup} className="bg-red-500 hover:bg-red-600 px-10 py-3 rounded-full font-bold shadow-xl mt-10 flex items-center gap-2">
                           <PhoneOff size={24}/> {t.cancel}
                         </button>
                       </>
                    )}
                </div>
            )}

            {/* In-Call HUD Controls */}
            {isInCall && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/60 backdrop-blur-xl p-4 rounded-full z-50 shadow-2xl border border-white/10">
                    <button onClick={toggleMute} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-white'}`}>
                        {isMuted ? <MicOff size={24}/> : <Mic size={24}/>}
                    </button>
                    
                    <button 
                        onClick={handleHangup} 
                        disabled={callDuration < 60} 
                        className={`p-6 rounded-full text-white transition-all ${callDuration < 60 ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.8)] scale-110'}`}
                    >
                        <PhoneOff size={32} />
                    </button>

                    <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-white'}`}>
                        {isVideoOff ? <VideoOff size={24}/> : <Video size={24}/>}
                    </button>
                </div>
            )}

            {/* Timer HUD */}
            {isInCall && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/60 text-white px-6 py-2 rounded-full font-mono text-xl tracking-widest z-50 shadow-xl backdrop-blur-md border border-white/10 flex flex-col items-center">
                    <span>{Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}</span>
                    {callDuration < 60 && <span className="text-[10px] text-red-400 -mt-1 font-sans">{t.minCallTime}</span>}
                </div>
            )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
           <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon/> {t.settings}</h3>
                 <button onClick={handleLogout} className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-semibold">
                    <LogOut size={16}/> {t.logout}
                 </button>
              </div>

              <div className="space-y-4">
                 <div>
                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2"><Palette size={16}/> {t.theme}</label>
                   <div className="flex gap-3">
                     {(['pink', 'blue', 'purple', 'teal'] as const).map(c => (
                        <button key={c} onClick={() => setTheme(c)} className={`w-10 h-10 rounded-full bg-${c}-400 transition-all ${theme === c ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : ''}`} style={{backgroundColor: `var(--tw-color-${c}-400, ${c === 'pink' ? '#f472b6' : c === 'blue' ? '#60a5fa' : c === 'purple' ? '#c084fc' : '#2dd4bf'})`}} />
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
           </div>
        </div>
      )}
    </div>
  );
}