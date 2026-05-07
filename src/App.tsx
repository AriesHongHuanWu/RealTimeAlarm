import { useState, useEffect, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { ref, set, onValue, update, onDisconnect } from "firebase/database";
import { Heart, BellRing, Link2, Settings as SettingsIcon, LogOut, Volume2, VolumeX, Moon, Palette, Globe, Save } from "lucide-react";
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
    ringingTitle: '寶貝在呼喚你！',
    dismissBtn: '我來了 / 關閉通知',
    triggerBtn: '按下呼叫對方',
    settings: '設定',
    logout: '登出',
    theme: '主題顏色',
    language: '語言 / Language',
    sound: '音效提示',
    syncTheme: '同步主題顏色給對方',
    save: '儲存並關閉',
    pairSuccess: '配對成功！',
    pairFail: '配對失敗，請檢查權限或配對碼是否正確。'
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
    ringingTitle: 'Baby is calling you!',
    dismissBtn: 'I am here / Dismiss',
    triggerBtn: 'Tap to call partner',
    settings: 'Settings',
    logout: 'Logout',
    theme: 'Theme Color',
    language: 'Language',
    sound: 'Sound Indicator',
    syncTheme: 'Sync Theme with Partner',
    save: 'Save & Close',
    pairSuccess: 'Pairing Successful!',
    pairFail: 'Pairing failed. Please check the code.'
  }
};

const themeStyles = {
  pink: { bg: 'bg-pink-50', btn: 'bg-pink-500 hover:bg-pink-600', ring: 'focus:outline-pink-400', txt: 'text-pink-500', light: 'bg-pink-100', hoverLight: 'group-hover:bg-pink-200' },
  blue: { bg: 'bg-blue-50', btn: 'bg-blue-500 hover:bg-blue-600', ring: 'focus:outline-blue-400', txt: 'text-blue-500', light: 'bg-blue-100', hoverLight: 'group-hover:bg-blue-200' },
  purple: { bg: 'bg-purple-50', btn: 'bg-purple-500 hover:bg-purple-600', ring: 'focus:outline-purple-400', txt: 'text-purple-500', light: 'bg-purple-100', hoverLight: 'group-hover:bg-purple-200' },
  teal: { bg: 'bg-teal-50', btn: 'bg-teal-500 hover:bg-teal-600', ring: 'focus:outline-teal-400', txt: 'text-teal-500', light: 'bg-teal-100', hoverLight: 'group-hover:bg-teal-200' }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  
  const [isRinging, setIsRinging] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { theme, language, soundEnabled, syncSettings, setTheme, setLanguage, setSoundEnabled, setSyncSettings } = useSettingsStore();
  const t = translations[language];
  const curTheme = themeStyles[theme];

  // Sound ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Basic beep sound via base64 for simplicity
    const beep = new Audio('data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    beep.loop = true;
    audioRef.current = beep;
  }, []);

  useEffect(() => {
    if (isRinging && soundEnabled) {
      audioRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [isRinging, soundEnabled]);

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
          setIsRinging(!!data?.ringing);
          
          if (data?.theme && syncSettings) {
             setTheme(data.theme);
          }
        });
      }
    });

    const handleVisibilityChange = () => {
      if (auth.currentUser) {
        const myStatusRef = ref(db, `users/${auth.currentUser.uid}/status`);
        if (document.visibilityState === "hidden") {
          set(myStatusRef, "away");
        } else {
          set(myStatusRef, "online");
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      unsubscribeAuth();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncSettings, setTheme]);

  useEffect(() => {
    if (partnerId) {
      const partnerStatusRef = ref(db, `users/${partnerId}/status`);
      onValue(partnerStatusRef, (snapshot) => {
        setPartnerOnline(snapshot.val() === "online" || snapshot.val() === "away");
      });
    }
  }, [partnerId]);

  // Sync theme to partner if enabled
  useEffect(() => {
    if (user && syncSettings) {
      update(ref(db, `users/${user.uid}`), { theme });
      if (partnerId) {
        update(ref(db, `users/${partnerId}`), { theme });
      }
    }
  }, [theme, syncSettings, user, partnerId]);

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

  const triggerAlarm = async () => {
    if (!partnerId) return;
    await update(ref(db, `users/${partnerId}`), { ringing: true });
  };

  const dismissAlarm = async () => {
    if (!user) return;
    await update(ref(db, `users/${user.uid}`), { ringing: false });
  };

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
    <div className={`flex flex-col h-screen items-center justify-center transition-all duration-500 ${isRinging ? 'bg-red-500' : curTheme.bg}`}>
      
      {/* Top Bar */}
      <div className="absolute top-6 w-full px-6 flex justify-between items-start">
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

      {/* Main Button */}
      <div className={`p-10 rounded-full shadow-2xl transition-all duration-300 ${isRinging ? 'bg-white scale-110 animate-bounce' : 'bg-white'}`}>
        {isRinging ? (
          <div className="text-center">
            <BellRing className="w-24 h-24 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-red-600 mb-4">{t.ringingTitle}</h2>
            <button onClick={dismissAlarm} className="bg-red-500 hover:bg-red-600 text-white py-3 px-8 rounded-full font-bold shadow-lg text-xl transition-colors">
              {t.dismissBtn}
            </button>
          </div>
        ) : (
          <div className="text-center cursor-pointer group" onClick={triggerAlarm}>
            <div className={`w-48 h-48 rounded-full ${curTheme.light} flex items-center justify-center ${curTheme.hoverLight} transition-all shadow-inner`}>
               <Heart className={`w-20 h-20 ${curTheme.txt} group-hover:scale-125 transition-transform duration-300`} />
            </div>
            <p className="mt-6 text-xl font-bold text-gray-700">{t.triggerBtn}</p>
          </div>
        )}
      </div>

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
                 {/* Theme */}
                 <div>
                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2"><Palette size={16}/> {t.theme}</label>
                   <div className="flex gap-3">
                     {(['pink', 'blue', 'purple', 'teal'] as const).map(c => (
                        <button key={c} onClick={() => setTheme(c)} className={`w-10 h-10 rounded-full bg-${c}-400 ${theme === c ? 'ring-4 ring-offset-2 ring-gray-400' : ''}`} style={{backgroundColor: `var(--tw-color-${c}-400, ${c === 'pink' ? '#f472b6' : c === 'blue' ? '#60a5fa' : c === 'purple' ? '#c084fc' : '#2dd4bf'})`}} />
                     ))}
                   </div>
                 </div>

                 {/* Sync Theme Switch */}
                 <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700">{t.syncTheme}</span>
                    <button onClick={() => setSyncSettings(!syncSettings)} className={`w-12 h-6 rounded-full relative transition-colors ${syncSettings ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${syncSettings ? 'left-7' : 'left-1'}`} />
                    </button>
                 </div>

                 {/* Language */}
                 <div>
                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2"><Globe size={16}/> {t.language}</label>
                   <div className="flex bg-gray-100 rounded-lg p-1">
                      <button onClick={() => setLanguage('zh-TW')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${language === 'zh-TW' ? 'bg-white shadow' : 'text-gray-500'}`}>中文</button>
                      <button onClick={() => setLanguage('en')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${language === 'en' ? 'bg-white shadow' : 'text-gray-500'}`}>English</button>
                   </div>
                 </div>

                 {/* Sound */}
                 <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                       {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>} {t.sound}
                    </span>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-6 rounded-full relative transition-colors ${soundEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${soundEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                 </div>
              </div>

              <button onClick={() => setShowSettings(false)} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-md ${curTheme.btn} transition-colors`}>
                 <Save size={20}/> {t.save}
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
