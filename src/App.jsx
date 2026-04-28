import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, query, 
  deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

// 1. Firebase 配置資訊 (保持您的最新配置)
const firebaseConfig = {
  apiKey: "AIzaSyC2MhDQ3igesAyy_CKBpsF9RZX9AH6zTgo",
  authDomain: "easystay-cloud-test.firebaseapp.com",
  projectId: "easystay-cloud-test",
  storageBucket: "easystay-cloud-test.firebasestorage.app",
  messagingSenderId: "570175625193",
  appId: "1:570175625193:web:1b156a870f8b9478975d78",
  measurementId: "G-NJ24N6VWP8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 嚴格遵守 RULE 1: 確保 appId 無斜線，路徑段數為 5 (artifacts/{appId}/public/data/{coll})
const rawId = typeof __app_id !== 'undefined' ? __app_id : 'green-land-v5-final';
const appId = rawId.replace(/\//g, '_'); 

// 核心圖示組件 (SVG)
const Icon = ({ name, size = 20, className = "" }) => {
  const icons = {
    dashboard: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    bed: <path d="M2 4v16M2 8h18M2 12h18M2 16h18M22 4v16" />,
    sprout: <path d="M7 20h10M12 20V10M12 10a4 4 0 0 1 4-4M12 10a4 4 0 0 0-4-4" />,
    wallet: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
    trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    trendingUp: <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />,
    map: <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />,
    home: <><polyline points="9 22 9 12 15 12 15 22" /><path d="M20 22v-8L12 5l-8 9v8" /></>,
    message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {icons[name] || null}
    </svg>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); 
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('booking'); 
  const [message, setMessage] = useState(null);
  
  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [workRecords, setWorkRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [farmMessages, setFarmMessages] = useState([]);

  // Firestore 路徑 Helpers
  const getColl = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
  const getDocRef = (coll, id) => doc(db, 'artifacts', appId, 'public', 'data', coll, id);

  // 1. 初始化身份驗證 (遵守 RULE 3 - 解決 configuration-not-found)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // 嘗試匿名登入，若失敗則記錄錯誤但不中斷應用
          await signInAnonymously(auth).catch(err => console.warn("Anonymous Auth skipped or not configured:", err.message));
        }
      } catch (e) { 
        console.error("Auth init failure:", e); 
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // 2. 載入本地儲存的角色狀態
  useEffect(() => {
    const saved = localStorage.getItem('farm_user_role');
    if (saved) {
      setUserRole(saved);
      if (saved === 'admin') setActiveTab('dashboard');
    }
    setTimeout(() => setIsLoading(false), 1200);
  }, []);

  // 安全的時間轉換函數，解決 serverTimestamp() 初期為 null 的排序問題
  const safeGetTime = (ts) => {
    if (!ts) return Date.now(); 
    if (ts.toMillis) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    return 0;
  };

  // 遵守 RULE 2: 不在查詢中使用複雜排序，改在 JS 排序
  useEffect(() => {
    if (!user || !userRole) return;
    
    // 監聽旅客留言 - 確保全角色都能讀取以保持同步
    const unsubMsg = onSnapshot(getColl("messages"), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setFarmMessages([...data].sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt)));
    }, (err) => console.error("Messages fetch error:", err));

    const unsubBook = onSnapshot(getColl("bookings"), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
    });

    const unsubAct = onSnapshot(getColl("activityOrders"), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setActivities([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
    });

    let unsubWork = () => {}, unsubFin = () => {};
    if (userRole === 'admin') {
      unsubWork = onSnapshot(getColl("workRecords"), (s) => {
        const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setWorkRecords([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
      });
      unsubFin = onSnapshot(getColl("transactions"), (s) => {
        const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setTransactions([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
      });
    }

    return () => { unsubMsg(); unsubBook(); unsubAct(); unsubWork(); unsubFin(); };
  }, [user, userRole]);

  // 全域通知自動關閉
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '1234') {
      setUserRole('admin'); setActiveTab('dashboard');
      localStorage.setItem('farm_user_role', 'admin');
      setMessage({ type: 'success', text: '歡迎回來，管理員阿秋' });
    } else { setMessage({ type: 'error', text: '驗證失敗' }); }
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('farm_user_role');
    setPassword('');
    setMessage({ type: 'success', text: '已登出系統' });
  };

  if (isLoading) return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center text-emerald-500 font-bold tracking-[0.4em]">
      <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
      <p className="animate-pulse">MORNING LAND...</p>
    </div>
  );

  if (!userRole) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 bg-gradient-to-br from-white via-emerald-50 to-blue-50">
      <div className="bg-white/90 backdrop-blur-xl p-12 rounded-[4rem] shadow-2xl max-w-lg w-full text-center border-4 border-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-emerald-400"></div>
        <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl shadow-emerald-100">
          <Icon name="sprout" size={48} />
        </div>
        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter">綠色大地</h1>
        <p className="text-emerald-500 font-bold mb-12 tracking-[0.2em] uppercase text-xs">Farm Cloud Management</p>
        
        <div className="space-y-4">
          <button onClick={() => {setUserRole('visitor'); setActiveTab('booking'); localStorage.setItem('farm_user_role', 'visitor');}} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black text-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 active:scale-95 flex items-center justify-center gap-4">
            我是遊客 <Icon name="user" size={24} />
          </button>
          
          <div className="flex items-center gap-4 py-8"><div className="flex-1 h-px bg-slate-100"></div><span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">管理者入口</span><div className="flex-1 h-px bg-slate-100"></div></div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="密碼 (預設: 1234)" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-emerald-200 rounded-[1.5rem] font-bold outline-none text-center shadow-inner" />
            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black hover:bg-black transition-all shadow-lg">登入後台</button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans text-slate-800">
      {/* 側邊導覽列 - 明亮風格 */}
      <nav className="fixed bottom-0 md:relative w-full md:w-72 bg-[#fdfdfd] border-t md:border-r border-slate-100 p-4 md:p-8 flex md:flex-col justify-around z-50">
        <div className="hidden md:flex items-center gap-4 mb-16 px-2">
          <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg"><Icon name="sprout" size={24} /></div>
          <div><h1 className="font-black text-2xl tracking-tighter">綠色大地</h1><p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Leisure Farm</p></div>
        </div>
        
        <div className="flex md:flex-col gap-2 w-full">
          {userRole === 'admin' && <TabBtn active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon="dashboard" label="總覽首頁" />}
          <TabBtn active={activeTab==='booking'} onClick={()=>setActiveTab('booking')} icon="bed" label="住宿預約" />
          <TabBtn active={activeTab==='activity'} onClick={()=>setActiveTab('activity')} icon="map" label="體驗預訂" />
          <TabBtn active={activeTab==='chat'} onClick={()=>setActiveTab('chat')} icon="message" label="旅人留影" />
          {userRole === 'admin' && (
            <>
              <div className="hidden md:block h-px bg-slate-100 my-6"></div>
              <TabBtn active={activeTab==='work'} onClick={()=>setActiveTab('work')} icon="sprout" label="耕作紀錄" />
              <TabBtn active={activeTab==='finance'} onClick={()=>setActiveTab('finance')} icon="wallet" label="收支帳目" />
            </>
          )}
        </div>

        <button onClick={handleLogout} className="mt-auto flex items-center justify-center gap-3 p-5 text-slate-300 hover:text-emerald-500 font-black text-xs uppercase tracking-widest transition-all md:w-full group">
          <Icon name="home" size={20} className="group-hover:scale-110 transition-transform" /> <span className="hidden md:inline">切換身分</span>
        </button>
      </nav>

      {/* 主內容區 */}
      <main className="flex-1 p-6 md:p-14 pb-32 md:pb-14 max-w-7xl mx-auto w-full overflow-y-auto bg-white">
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-emerald-100 shadow-sm">
             <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
             {userRole === 'admin' ? 'Administrative Center' : 'Visitor Mode'}
          </div>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 capitalize">
            {activeTab === 'dashboard' && '營運分析概覽'}
            {activeTab === 'booking' && '舒心住宿預約'}
            {activeTab === 'activity' && '體驗報名中心'}
            {activeTab === 'chat' && '旅人留言互動'}
            {activeTab === 'work' && '田間作業紀錄'}
            {activeTab === 'finance' && '收支流水帳目'}
          </h2>
        </header>

        {activeTab === 'dashboard' && <DashboardView bookings={bookings} activities={activities} transactions={transactions} messages={farmMessages} />}
        {activeTab === 'booking' && <FormView type="booking" data={bookings} isAdmin={userRole==='admin'} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
        {activeTab === 'activity' && <FormView type="activity" data={activities} isAdmin={userRole==='admin'} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
        {activeTab === 'chat' && <ChatView messages={farmMessages} userRole={userRole} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
        {activeTab === 'work' && <WorkView records={workRecords} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
        {activeTab === 'finance' && <FinanceView txs={transactions} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
      </main>

      {message && (
        <div className={`fixed bottom-24 right-6 md:bottom-12 md:right-12 p-6 rounded-[2.5rem] shadow-2xl z-[100] animate-slide-up flex items-center gap-5 border-2 ${message.type==='error'?'bg-rose-500 border-rose-400':'bg-slate-900 border-slate-700'} text-white`}>
           <div className="p-3 bg-white/20 rounded-2xl"><Icon name={message.type==='error'?'trash':'check'} size={24} /></div>
           <span className="font-bold text-xl tracking-tight">{message.text}</span>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// --- UI 原子組件 ---

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex-1 md:flex-none p-3 md:p-5 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 font-black transition-all ${active ? 'bg-white text-emerald-600 shadow-xl shadow-slate-100 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
      <Icon name={icon} size={22} /> <span className="text-[10px] md:text-sm tracking-tight uppercase tracking-widest">{label}</span>
    </button>
  );
}

function StatCard({ title, value, color, icon }) {
  const map = { emerald: 'text-emerald-500', blue: 'text-blue-500', amber: 'text-amber-500' };
  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 flex items-center justify-between group hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
      <div><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">{title}</p><p className={`text-5xl font-black ${map[color]} tracking-tighter`}>{value}</p></div>
      <div className={`p-5 bg-slate-50 ${map[color]} rounded-3xl shadow-inner group-hover:rotate-12 transition-transform`}><Icon name={icon} size={32} /></div>
    </div>
  );
}

// --- 視圖組件 ---

function DashboardView({ bookings, activities, transactions, messages }) {
  const income = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount), 0);
  const expense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount), 0);
  return (
    <div className="space-y-12 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="月預估總營收" value={`$${income.toLocaleString()}`} color="emerald" icon="trendingUp" />
        <StatCard title="住宿預約組數" value={`${bookings.length} 筆`} color="blue" icon="bed" />
        <StatCard title="活動報名人數" value={`${activities.length} 位`} color="amber" icon="map" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-[#fcfdfe] p-10 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2"></div>
           <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-emerald-600 relative z-10">
              <Icon name="message" /> 最新旅人留言 <span className="px-2 py-0.5 bg-emerald-100 rounded-full text-xs">{messages.length}</span>
           </h3>
           <div className="space-y-4 relative z-10">
              {messages.slice(0, 3).map(m => (
                <div key={m.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 hover:shadow-lg transition-all group">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">{m.guestName}</p>
                    <p className="text-[10px] text-slate-300 font-bold">{m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleDateString() : '剛剛'}</p>
                  </div>
                  <p className="text-slate-600 font-bold line-clamp-2 leading-relaxed text-sm">{m.content}</p>
                </div>
              ))}
              {messages.length === 0 && <div className="text-center py-16 text-slate-200 font-bold italic tracking-widest uppercase">暫無旅客留言</div>}
           </div>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white flex flex-col justify-between group">
           <div><h3 className="text-2xl font-black mb-1 text-emerald-400 tracking-tight">農場經營概覽</h3><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Operational Health</p></div>
           <div className="mt-12">
              <div className="flex justify-between items-end mb-6">
                 <p className="text-slate-400 font-bold">淨利結餘 (Balance)</p>
                 <p className="text-5xl font-black tracking-tighter text-white">${(income - expense).toLocaleString()}</p>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-400 transition-all duration-1000" style={{width: income > 0 ? `${Math.min(100, ((income-expense)/income)*100)}%` : '50%'}}></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ChatView({ messages, userRole, setMessage, getColl, getDocRef }) {
  const [guestName, setGuestName] = useState('');
  const [content, setContent] = useState('');
  
  const send = async (e) => {
    e.preventDefault();
    if(!guestName || !content) return setMessage({type:'error', text:'請填寫完整內容'});
    await addDoc(getColl("messages"), { 
      guestName, 
      content, 
      createdAt: serverTimestamp() 
    });
    setGuestName(''); setContent('');
    setMessage({ type:'success', text: '感謝您的溫暖回饋！' });
  };

  return (
    <div className="space-y-12 animate-fade-in text-slate-800">
      {userRole === 'visitor' && (
        <div className="bg-white p-12 rounded-[4rem] shadow-xl border-4 border-emerald-50">
          <h3 className="text-3xl font-black text-emerald-600 mb-6 flex items-center gap-4"><Icon name="message" size={32} /> 旅人留影簿</h3>
          <p className="text-slate-400 font-bold mb-10 ml-2">歡迎留下您對農場的建議或旅途的心情小語！</p>
          <form onSubmit={send} className="space-y-6">
            <input placeholder="如何稱呼您？" value={guestName} onChange={e=>setGuestName(e.target.value)} className="w-full p-6 bg-slate-50 rounded-3xl font-bold outline-none border-2 border-transparent focus:border-emerald-200 shadow-inner text-xl" />
            <textarea placeholder="寫下您的回饋..." value={content} onChange={e=>setContent(e.target.value)} className="w-full h-48 p-6 bg-slate-50 rounded-[2.5rem] font-bold outline-none border-2 border-transparent focus:border-emerald-200 resize-none shadow-inner text-xl" />
            <button type="submit" className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black text-xl hover:bg-emerald-600 shadow-xl shadow-emerald-100 active:scale-95 transition-all">送出留言</button>
          </form>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-24">
        {messages.map(m => (
          <div key={m.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 relative group transition-all hover:shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner"><Icon name="user" size={20}/></div>
              <div>
                <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">{m.guestName}</p>
                <p className="text-[10px] text-slate-300 font-bold">
                  {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : '同步中...'}
                </p>
              </div>
            </div>
            <p className="text-slate-600 font-bold text-lg leading-relaxed">{m.content}</p>
            {userRole === 'admin' && (
              <button onClick={()=>deleteDoc(getDocRef("messages", m.id))} className="absolute top-8 right-8 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 p-2"><Icon name="trash" size={18} /></button>
            )}
          </div>
        ))}
        {messages.length === 0 && <div className="col-span-full py-32 text-center text-slate-200 font-black tracking-[0.5em] italic uppercase">Currently No Messages</div>}
      </div>
    </div>
  );
}

function FormView({ type, data, isAdmin, setMessage, getColl, getDocRef }) {
  const [f, setF] = useState({ guestName: '', date: '', item: type==='booking'?'雙人房':'採果體驗', slot: '上午場' });
  const add = async (e) => {
    e.preventDefault();
    if(!f.guestName || !f.date) return setMessage({type:'error', text:'請完整填寫'});
    const collName = type === 'booking' ? "bookings" : "activityOrders";
    await addDoc(getColl(collName), { 
      guestName: f.guestName, 
      date: f.date, 
      [type==='booking'?'roomType':'activity']: f.item,
      ...(type==='activity' && { timeSlot: f.slot }),
      createdAt: serverTimestamp() 
    });
    setF({...f, guestName:''}); setMessage({type:'success', text:'預約成功'});
  };
  return (
    <div className="space-y-12 animate-fade-in text-slate-800">
      <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-50 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 ${type==='booking'?'bg-blue-400':'bg-emerald-400'}`}></div>
        <h3 className={`text-3xl font-black mb-10 flex items-center gap-4 ${type==='booking'?'text-blue-500':'text-emerald-500'}`}>
          <Icon name={type==='booking'?'bed':'map'} size={36} /> {type==='booking'?'快速訂房系統':'活動報名中心'}
        </h3>
        <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 items-end">
          <Input label="預約人姓名" value={f.guestName} onChange={v=>setF({...f, guestName:v})} placeholder="大名" />
          <Input label="預定日期" type="date" value={f.date} onChange={v=>setF({...f, date:v})} />
          <Select label={type==='booking'?'房型':'活動'} value={f.item} onChange={v=>setF({...f, item:v})} options={type==='booking'?['雙人房','四人家庭房','景觀套房']:['採果體驗','手作披薩','生態導覽']} />
          {type==='activity' && <Select label="場次" value={f.slot} onChange={v=>setF({...f, slot:v})} options={['上午場','下午場']} />}
          <button className={`p-5 rounded-[1.5rem] font-black shadow-lg text-white active:scale-95 transition-all text-lg ${type==='booking'?'bg-blue-500 shadow-blue-100':'bg-emerald-500 shadow-emerald-100'}`}>立即預約</button>
        </form>
      </div>
      <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm mb-24">
        <table className="w-full text-left font-bold text-slate-600">
          <thead className="bg-slate-50/50 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
            <tr><th className="p-8">日期</th><th className="p-8">預約人</th><th className="p-8">項目細節</th>{isAdmin && <th className="p-8 text-center">操作</th>}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map(d => (
              <tr key={d.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="p-8 text-sm font-mono">{d.date}</td><td className="p-8 text-lg">{d.guestName}</td>
                <td className="p-8"><span className={`px-5 py-2 rounded-full text-[10px] uppercase font-black tracking-widest ${type==='booking'?'bg-blue-50 text-blue-500':'bg-emerald-50 text-emerald-600'}`}>{d.roomType || d.activity}</span></td>
                {isAdmin && <td className="p-8 text-center"><button onClick={()=>deleteDoc(getDocRef(type==='booking'?"bookings":"activityOrders", d.id))} className="text-slate-100 hover:text-rose-500 p-2 transition-all"><Icon name="trash" size={20} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({ label, type="text", value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold shadow-inner outline-none focus:ring-4 ring-emerald-50 text-slate-700" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} className="p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold shadow-inner outline-none focus:ring-4 ring-emerald-50 text-slate-700 appearance-none">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const WorkView = ({ records, setMessage, getColl, getDocRef }) => {
  const [crop, setCrop] = useState('');
  const add = async (a) => {
    if(!crop) return setMessage({type:'error', text:'請輸入作物名稱'});
    await addDoc(getColl("workRecords"), { crop, activity: a, date: new Date().toISOString().split('T')[0], createdAt: serverTimestamp() });
    setCrop(''); setMessage({type:'success', text:`${crop}${a}紀錄已儲存`});
  };
  return (
    <div className="space-y-12 animate-fade-in text-slate-800">
      <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-emerald-50 relative">
        <div className="absolute top-8 right-8 text-emerald-50"><Icon name="sprout" size={100}/></div>
        <h3 className="text-3xl font-black text-emerald-600 mb-10 flex items-center gap-4 relative z-10"><Icon name="sprout" size={32}/> 農事管家筆記</h3>
        <input placeholder="今天要照顧哪種作物？" value={crop} onChange={e=>setCrop(e.target.value)} className="w-full p-6 bg-slate-50 rounded-[2.5rem] mb-10 font-black text-2xl outline-none shadow-inner border-none focus:ring-4 ring-emerald-50 relative z-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {['栽種','施肥','澆水','採收'].map(a => <button key={a} onClick={()=>add(a)} className="p-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xl hover:bg-emerald-700 shadow-xl shadow-emerald-50 active:scale-95 transition-all"> {a} </button>)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
        {records.map(r => <div key={r.id} className="bg-white p-8 rounded-[3rem] border border-slate-50 flex justify-between items-center group hover:shadow-2xl transition-all">
          <div><p className="font-black text-2xl text-slate-800 tracking-tight">{r.crop}</p><p className="text-[10px] text-emerald-500 font-bold uppercase mt-2 tracking-[0.3em]">{r.date} · {r.activity}</p></div>
          <button onClick={()=>deleteDoc(getDocRef("workRecords", r.id))} className="text-slate-100 hover:text-rose-500 opacity-0 group-hover:opacity-100 p-2 transition-all active:scale-90"><Icon name="trash" size={24} /></button>
        </div>)}
      </div>
    </div>
  );
};

const FinanceView = ({ txs, setMessage, getColl, getDocRef }) => {
  const [f, setF] = useState({ amount: '', type: 'income', note: '' });
  const add = async (e) => {
    e.preventDefault();
    if(!f.amount) return;
    await addDoc(getColl("transactions"), { ...f, amount: Number(f.amount), date: new Date().toISOString().split('T')[0], createdAt: serverTimestamp() });
    setF({...f, amount:'', note:''}); setMessage({type:'success', text:'收支帳目更新成功'});
  };
  return (
    <div className="space-y-12 animate-fade-in text-slate-800">
      <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-amber-50">
        <h3 className="text-3xl font-black text-amber-500 mb-10 flex items-center gap-4"><Icon name="wallet" size={32} /> 農場收支登錄</h3>
        <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
          <Select label="收支項目" value={f.type} onChange={v=>setF({...f, type:v})} options={['income','expense']} />
          <Input label="金額 (NTD)" type="number" value={f.amount} onChange={v=>setF({...f, amount:v})} placeholder="0" />
          <Input label="細節摘要" value={f.note} onChange={v=>setF({...f, note:v})} placeholder="來源說明" />
          <button type="submit" className="bg-slate-900 text-white p-6 rounded-[2rem] font-black text-xl active:scale-95 transition-all shadow-lg hover:bg-black">確認入帳</button>
        </form>
      </div>
      <div className="bg-white rounded-[4rem] border border-slate-50 overflow-hidden shadow-sm mb-32 divide-y divide-slate-50">
        {txs.map(t => <div key={t.id} className="p-8 flex justify-between items-center hover:bg-slate-50 transition-all">
          <div className="flex gap-6 items-center">
            <div className={`p-4 rounded-3xl ${t.type==='income'?'bg-emerald-50 text-emerald-500':'bg-rose-50 text-rose-500'} shadow-inner`}><Icon name={t.type==='income'?'trendingUp':'logout'} size={24} /></div>
            <div><p className="font-black text-2xl text-slate-800 tracking-tight">{t.note || (t.type==='income'?'銷售收入':'採購支出')}</p><p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">{t.date}</p></div>
          </div>
          <div className="flex items-center gap-8">
            <p className={`text-4xl font-black ${t.type==='income'?'text-emerald-500':'text-rose-500'} tracking-tighter`}>{t.type==='income'?'+':'-'}${t.amount.toLocaleString()}</p>
            <button onClick={()=>deleteDoc(getDocRef("transactions", t.id))} className="text-slate-100 hover:text-rose-500 p-2 active:scale-90 transition-all"><Icon name="trash" size={20}/></button>
          </div>
        </div>)}
      </div>
    </div>
  );
}
