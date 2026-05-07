import { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { ref, set, onValue, update, onDisconnect } from "firebase/database";
import { Heart, BellRing, Link2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  
  // 互相呼叫的狀態
  const [isRinging, setIsRinging] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);

  // 1. 監聽目前登入狀態
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 設定自己在線狀態
        const myStatusRef = ref(db, `users/${currentUser.uid}/status`);
        set(myStatusRef, "online");
        onDisconnect(myStatusRef).set("offline"); // 關閉網頁自動離線

        // 監聽自己的資料庫 (是否有配對伴侶、是否被呼叫)
        const myDataRef = ref(db, `users/${currentUser.uid}`);
        onValue(myDataRef, (snapshot) => {
          const data = snapshot.val();
          if (data?.partnerId) setPartnerId(data.partnerId);
          if (data?.ringing) setIsRinging(true);
          else setIsRinging(false);
        });
      }
    });

    // 監聽網頁暫離 (Visibility API)
    const handleVisibilityChange = () => {
      if (user) {
        const myStatusRef = ref(db, `users/${user.uid}/status`);
        if (document.visibilityState === "hidden") {
          set(myStatusRef, "away"); // 對方跳出網頁或切換分頁
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
  }, [user]);

  // 2. 監聽伴侶狀態
  useEffect(() => {
    if (partnerId) {
      const partnerStatusRef = ref(db, `users/${partnerId}/status`);
      onValue(partnerStatusRef, (snapshot) => {
        setPartnerOnline(snapshot.val() === "online" || snapshot.val() === "away");
      });
    }
  }, [partnerId]);

  // Google 登入
  const handleLogin = () => signInWithPopup(auth, provider);

  // 綁定配對碼
  const handlePairing = async () => {
    if (!user || !pairingCodeInput) return;
    try {
        await update(ref(db, `users/${user.uid}`), { partnerId: pairingCodeInput });
        await update(ref(db, `users/${pairingCodeInput}`), { partnerId: user.uid });
        alert("配對成功！");
    } catch(err) {
        console.error("配對失敗", err);
        alert("配對失敗，請檢查權限或配對碼是否正確。");
    }
  };

  // 呼叫對方 (對方只能手動解除)
  const triggerAlarm = async () => {
    if (!partnerId) return;
    await update(ref(db, `users/${partnerId}`), { ringing: true });
  };

  // 關閉我的蜂鳴器 (回應對方)
  const dismissAlarm = async () => {
    if (!user) return;
    await update(ref(db, `users/${user.uid}`), { ringing: false });
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-pink-50">
        <div className="p-10 bg-white rounded-3xl shadow-xl text-center">
          <Heart className="mx-auto text-pink-500 mb-4 w-16 h-16" />
          <h1 className="text-2xl font-bold mb-6 text-gray-800">情侶專屬呼叫器</h1>
          <button onClick={handleLogin} className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-full transition-all">
            使用 Google 登入
          </button>
        </div>
      </div>
    );
  }

  // 畫面：如果是配對階段
  if (!partnerId) {
    return (
      <div className="flex h-screen items-center justify-center bg-pink-50">
        <div className="p-8 bg-white rounded-3xl shadow-xl w-96 text-center">
          <Link2 className="mx-auto text-gray-400 mb-4 w-12 h-12" />
          <h2 className="text-xl font-bold mb-2">配對你的另一半</h2>
          <p className="text-sm text-gray-500 mb-6">請將你的邀請碼傳給對方：<br/><span className="font-mono bg-pink-100 p-1 rounded font-bold">{user.uid}</span></p>
          <input 
            type="text" 
            placeholder="輸入對方的代碼" 
            value={pairingCodeInput}
            onChange={(e) => setPairingCodeInput(e.target.value)}
            className="w-full border rounded-lg p-3 mb-4 focus:outline-pink-400"
          />
          <button onClick={handlePairing} className="w-full bg-pink-500 text-white py-3 rounded-full font-bold shadow-md hover:bg-pink-600">
            開始配對
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen items-center justify-center transition-all duration-500 ${isRinging ? 'bg-red-500' : 'bg-pink-50'}`}>
      <div className="absolute top-6 w-full text-center">
         <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold shadow ${partnerOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
            對方狀態：{partnerOnline ? '在線中 ❤️' : '不在畫面上 (或關閉了)'}
         </span>
         
         <div className="mt-2 text-sm text-gray-500">
           你的代碼: {user.uid}
         </div>
      </div>

      <div className={`p-10 rounded-full shadow-2xl transition-all duration-300 ${isRinging ? 'bg-white scale-110 animate-bounce' : 'bg-white'}`}>
        {isRinging ? (
          <div className="text-center">
            <BellRing className="w-24 h-24 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-red-600 mb-4">寶貝在呼喚你！</h2>
            <button onClick={dismissAlarm} className="bg-red-500 hover:bg-red-600 text-white py-3 px-8 rounded-full font-bold shadow-lg text-xl">
              我來了 / 關閉通知
            </button>
          </div>
        ) : (
          <div className="text-center cursor-pointer group" onClick={triggerAlarm}>
            <div className="w-48 h-48 rounded-full bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-all shadow-inner">
               <Heart className="w-20 h-20 text-pink-500 group-hover:scale-125 transition-transform duration-300" />
            </div>
            <p className="mt-6 text-xl font-bold text-gray-700">按下呼叫對方</p>
          </div>
        )}
      </div>
    </div>
  );
}
