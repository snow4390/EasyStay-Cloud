import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, query, 
  deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

// 1. Firebase 配置資訊 (保持您的原始配置)
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

// 確保路徑區段正確 (Rule 1)
const rawId = typeof __app_id !== 'undefined' ? __app_id : 'green-land-v6';
const appId = rawId.replace(/\//g, '_'); 

// 核心 SVG 圖示組件
const Icon = ({ name, size = 20, className = "" }) => {
  const icons = {
    dashboard: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    bed: <path d="M2 4v16M2 8h18M2 12h18M2 16h18M22 4v16" />,
    sprout: <path d="M7 20h10M12 20V10M12 10a4 4 0 0 1 4-4M12 10a4 4 0 0 0-4-4" />,
    wallet: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
    trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
    trendingUp: <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />,
    home: <><polyline points="9 22 9 12 15 12 15 22" /><path d="M20 22v-8L12 5l-8 9v8" /></>,
    loading: <><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {icons[name] || null}
    </svg>
  );
};

export default function App() {
  const [userRole, setUserRole] = useState(null); // 'admin' | 'visitor' | null
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('booking'); 
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle'); // idle, error

  // 資料狀態
  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [workRecords, setWorkRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const getColl = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
  const getDocRef = (coll, id) => doc(db, 'artifacts', appId, 'public', 'data', coll, id);

  // 初始化身份驗證
  useEffect(() => {
    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        setAuthStatus('error');
      }
    };
    init();
    const savedRole = localStorage.getItem('farm_user_role');
    if (savedRole) setUserRole(savedRole);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  // 資料監聽 (Rule 2: 前端排序避免 Vercel 空白)
  useEffect(() => {
    if (!userRole) return;
    
    const unsubBook = onSnapshot(getColl("bookings"), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });

    const unsubAct = onSnapshot(getColl("activityOrders"), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setActivities(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });

    let unsubWork = () => {}, unsubFin = () => {};
    if (userRole === 'admin') {
      unsubWork = onSnapshot(getColl("workRecords"), (s) => setWorkRecords(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      unsubFin = onSnapshot(getColl("transactions"), (s) => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
    return () => { unsubBook(); unsubAct(); unsubWork(); unsubFin(); };
  }, [userRole]);

  // 訊息自動關閉
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '1234') {
      setUserRole('admin');
      localStorage.setItem('farm_user_role', 'admin');
      setActiveTab('dashboard');
      setMessage({ type: 'success', text: '歡迎回來，管理員' });
    } else {
      setMessage({ type: 'error', text: '密碼錯誤' });
    }
  };

  if (isLoading) return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center text-emerald-600 font-bold tracking-widest">
      <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
      GREEN LAND
    </div>
  );

  if (!userRole) return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="bg-white/80 backdrop-blur-xl p-12 rounded-[4rem] shadow-2xl max-w-lg w-full text-center border-4 border-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-emerald-400"></div>
        <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl shadow-emerald-100 rotate-3">
          <Icon name="sprout" size={48} />
        </div>
        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter">綠色大地</h1>
        <p className="text-emerald-500 font-bold mb-12 tracking-[0.2em] uppercase text-xs">Leisure Farm System</p>
        
        {authStatus === 'error' && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-bold text-left border border-rose-100 leading-relaxed">
             ⚠️ 偵測到 Firebase 配置未完成：請在 Firebase Console 啟動「匿名登入 (Anonymous Auth)」。
          </div>
        )}

        <div className="space-y-4">
          <button onClick={() => {setUserRole('visitor'); localStorage.setItem('farm_user_role', 'visitor');}} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black text-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-4">
            我是遊客 <Icon name="user" size={24} />
          </button>
          <div className="flex items-center gap-4 py-6 text-slate-200"><div className="flex-1 h-px bg-slate-100"></div><span className="text-[10px] font-black uppercase text-slate-300">管理端登入</span><div className="flex-1 h-px bg-slate-100"></div></div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="密碼 (1234)" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-emerald-200 rounded-[1.5rem] font-bold outline-none text-center shadow-inner" />
            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black hover:bg-black transition-all shadow-lg active:scale-95">進入後台</button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col md:flex-row font-sans text-slate-800">
      {/* 側邊導覽 */}
      <nav className="fixed bottom-0 md:relative w-full md:w-72 bg-white border-t md:border-r border-slate-100 p-4 md:p-8 flex md:flex-col justify-around z-50">
        <div className="hidden md:flex items-center gap-4 mb-16 px-2">
          <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg"><Icon name="sprout" size={24} /></div>
          <div><h1 className="font-black text-2xl tracking-tighter">綠色大地</h1><p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Farm Admin</p></div>
        </div>
        
        <div className="flex md:flex-col gap-2 w-full">
          {userRole === 'admin' && <TabBtn active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon="dashboard" label="首頁概覽" color="emerald" />}
          <TabBtn active={activeTab==='booking'} onClick={()=>setActiveTab('booking')} icon="bed" label="住宿預約" color="blue" />
          <TabBtn active={activeTab==='activity'} onClick={()=>setActiveTab('activity')} icon="star" label="活動報名" color="amber" />
          {userRole === 'admin' && (
            <>
              <div className="hidden md:block h-px bg-slate-100 my-6"></div>
              <TabBtn active={activeTab==='work'} onClick={()=>setActiveTab('work')} icon="sprout" label="耕作紀錄" color="emerald" />
              <TabBtn active={activeTab==='finance'} onClick={()=>setActiveTab('finance')} icon="wallet" label="收支流水" color="emerald" />
            </>
          )}
        </div>

        <button onClick={()=>{setUserRole(null); localStorage.removeItem('farm_user_role');}} className="mt-auto flex items-center justify-center gap-3 p-5 text-slate-300 hover:text-rose-500 font-black text-xs uppercase tracking-widest transition-all md:w-full group">
          <Icon name="home" size={20} /> <span className="hidden md:inline">切換身分</span>
        </button>
      </nav>

      {/* 主內容區 */}
      <main className="flex-1 p-6 md:p-14 pb-32 md:pb-14 max-w-7xl mx-auto w-full overflow-y-auto">
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-emerald-100 shadow-sm">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             {userRole === 'admin' ? 'Administrative' : 'Visitor Terminal'}
          </div>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 capitalize">
            {activeTab === 'dashboard' && '營運分析數據'}
            {activeTab === 'booking' && '舒心住宿預約'}
            {activeTab === 'activity' && '體驗活動報名'}
            {activeTab === 'work' && '田間作業筆記'}
            {activeTab === 'finance' && '收支流水帳目'}
          </h2>
        </header>

        {activeTab === 'dashboard' && <DashboardView bookings={bookings} activities={activities} transactions={transactions} />}
        {activeTab === 'booking' && <FormView type="booking" data={bookings} isAdmin={userRole==='admin'} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
        {activeTab === 'activity' && <FormView type="activity" data={activities} isAdmin={userRole==='admin'} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
        {activeTab === 'work' && <WorkView records={workRecords} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
        {activeTab === 'finance' && <FinanceView txs={transactions} setMessage={setMessage} getColl={getColl} getDocRef={getDocRef} />}
      </main>

      {/* 全域通知 */}
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

// --- 視圖與組件 ---

function TabBtn({ active, onClick, icon, label, color }) {
  const styles = {
    emerald: active ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100' : 'text-slate-400 hover:text-emerald-500',
    blue: active ? 'bg-blue-500 text-white shadow-xl shadow-blue-100' : 'text-slate-400 hover:text-blue-500',
    amber: active ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : 'text-slate-400 hover:text-amber-500'
  };
  return (
    <button onClick={onClick} className={`flex-1 md:flex-none p-4 md:p-5 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 font-black transition-all ${styles[color]} ${active ? 'scale-105' : 'hover:bg-slate-50'}`}>
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

function DashboardView({ bookings, activities, transactions }) {
  const income = transactions.filter(t=>t.type==='income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const expense = transactions.filter(t=>t.type==='expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return (
    <div className="space-y-12 animate-fade-in text-slate-800 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <StatCard title="月預估總營收" value={`$${income.toLocaleString()}`} color="emerald" icon="trendingUp" />
        <StatCard title="住宿預約組數" value={`${bookings.length} 筆`} color="blue" icon="bed" />
        <StatCard title="活動報名人數" value={`${activities.length} 位`} color="amber" icon="star" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2"></div>
           <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-emerald-600 relative z-10"><Icon name="calendar" /> 最新預約概況</h3>
           <div className="space-y-4 relative z-10">
              {bookings.slice(0, 4).map(b => (
                <div key={b.id} className="p-5 bg-[#fafbfc] rounded-[2rem] hover:bg-white hover:shadow-md transition-all flex justify-between items-center border border-transparent hover:border-slate-100">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.date}</p><p className="text-lg font-black text-slate-800">{b.guestName}</p></div>
                  <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">{b.roomType}</span>
                </div>
              ))}
           </div>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white flex flex-col justify-between group">
           <div><h3 className="text-2xl font-black mb-1 text-emerald-400 tracking-tight">農場營運淨值</h3><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Operational Health</p></div>
           <div className="mt-12">
              <div className="flex justify-between items-end mb-6">
                 <p className="text-slate-400 font-bold">當前結餘</p>
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

function FormView({ type, data = [], isAdmin, setMessage, getColl, getDocRef }) {
  const [f, setF] = useState({ guestName: '', date: '', item: type==='booking'?'雙人房':'表演秀體驗', count: '1' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if(!f.guestName || !f.date) return setMessage({type:'error', text:'請填寫完整資訊'});
    setIsSubmitting(true);
    try {
      const collName = type === 'booking' ? "bookings" : "activityOrders";
      await addDoc(getColl(collName), { 
        guestName: f.guestName, date: f.date, 
        [type==='booking'?'roomType':'activity']: f.item,
        ...(type==='activity' && { playerCount: f.count }),
        createdAt: serverTimestamp() 
      });
      setF({...f, guestName:''}); setMessage({type:'success', text:'送出成功！農場主人已收到您的預定'});
    } catch (err) { setMessage({type:'error', text:'發送失敗，請檢查權限'}); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-12 animate-fade-in text-slate-800">
      <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-50 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 ${type==='booking'?'bg-blue-400':'bg-amber-400'}`}></div>
        <h3 className={`text-3xl font-black mb-10 flex items-center gap-4 ${type==='booking'?'text-blue-500':'text-amber-500'}`}>
          <Icon name={type==='booking'?'bed':'star'} size={36} /> {type==='booking'?'快速訂房系統':'活動體驗預約'}
        </h3>
        <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 items-end">
          <Input label="預約人姓名" value={f.guestName} onChange={v=>setF({...f, guestName:v})} placeholder="大名" />
          <Input label="預定日期" type="date" value={f.date} onChange={v=>setF({...f, date:v})} />
          <Select label={type==='booking'?'房型選擇':'活動項目'} value={f.item} onChange={v=>setF({...f, item:v})} options={type==='booking'?['雙人房','四人房','行政套房']:['表演秀體驗','餵食秀','生態導覽','披薩DIY']} />
          {type==='activity' && <Input label="參加人數" type="number" value={f.count} onChange={v=>setF({...f, count:v})} />}
          <button type="submit" disabled={isSubmitting} className={`p-5 rounded-[1.5rem] font-black shadow-lg text-white active:scale-95 transition-all text-lg flex items-center justify-center gap-2 ${type==='booking'?'bg-blue-500 shadow-blue-100':'bg-amber-500 shadow-amber-100'}`}>
            {isSubmitting ? <Icon name="loading" className="animate-spin" /> : '立即送出'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm mb-24">
        <table className="w-full text-left font-bold text-slate-600">
          <thead className="bg-[#fafbfc] text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 text-left">
            <tr><th className="p-8">日期</th><th className="p-8">預約人</th><th className="p-8">詳細項目</th>{isAdmin && <th className="p-8 text-center">操作</th>}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-left">
            {data.map(d => (
              <tr key={d.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="p-8 text-sm font-mono">{d.date}</td><td className="p-8 text-lg">{d.guestName}</td>
                <td className="p-8"><span className={`px-5 py-2 rounded-full text-[10px] uppercase font-black tracking-widest ${type==='booking'?'bg-blue-50 text-blue-500':'bg-amber-50 text-amber-600'}`}>{d.roomType || d.activity}</span></td>
                {isAdmin && <td className="p-8 text-center"><button onClick={()=>deleteDoc(getDocRef(type==='booking'?"bookings":"activityOrders", d.id))} className="text-slate-100 hover:text-rose-500 p-2 transition-all"><Icon name="trash" size={20} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({ label, type="text", value, onChange, placeholder, disabled }) {
  return (
    <div className="flex flex-col gap-3 text-left">
      <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="p-5 bg-[#fafbfc] rounded-[1.5rem] border-none font-bold shadow-inner outline-none focus:ring-4 ring-emerald-50 text-slate-700 disabled:opacity-50 w-full" />
    </div>
  );
}

function Select({ label, value, onChange, options, disabled }) {
  return (
    <div className="flex flex-col gap-3 text-left">
      <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} className="p-5 bg-[#fafbfc] rounded-[1.5rem] border-none font-bold shadow-inner outline-none focus:ring-4 ring-emerald-50 text-slate-700 appearance-none disabled:opacity-50 w-full">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// 耕作與財務視圖
const WorkView = ({ records = [], setMessage, getColl, getDocRef }) => {
  const [crop, setCrop] = useState('');
  const add = async (a) => {
    if(!crop) return setMessage({type:'error', text:'請輸入作物'});
    try {
      await addDoc(getColl("workRecords"), { crop, activity: a, date: new Date().toISOString().split('T')[0], createdAt: serverTimestamp() });
      setCrop(''); setMessage({type:'success', text:`${crop} ${a} 紀錄成功`});
    } catch (err) { setMessage({type:'error', text:'紀錄失敗'}); }
  };
  return (
    <div className="space-y-12 animate-fade-in text-slate-800 text-left">
      <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-emerald-50 border-b-8 border-emerald-500">
        <h3 className="text-3xl font-black text-emerald-600 mb-10 flex items-center gap-4"><Icon name="sprout" size={32}/> 農事管家筆記</h3>
        <input placeholder="今天照顧哪種作物？" value={crop} onChange={e=>setCrop(e.target.value)} className="w-full p-6 bg-[#fafbfc] rounded-[2.5rem] mb-10 font-black text-2xl outline-none shadow-inner border-none focus:ring-4 ring-emerald-50" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {['栽種','施肥','澆水','採收'].map(a => <button key={a} onClick={()=>add(a)} className="p-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xl hover:bg-emerald-900 shadow-xl shadow-emerald-50 active:scale-95 transition-all"> {a} </button>)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
        {records.map(r => <div key={r.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 flex justify-between items-center group hover:shadow-xl transition-all">
          <div><p className="font-black text-2xl text-slate-800 tracking-tight">{r.crop}</p><p className="text-[10px] text-emerald-500 font-bold uppercase mt-2 tracking-[0.3em]">{r.date} · {r.activity}</p></div>
          <button onClick={()=>deleteDoc(getDocRef("workRecords", r.id))} className="text-slate-100 hover:text-rose-500 opacity-0 group-hover:opacity-100 p-2 transition-all active:scale-90"><Icon name="trash" size={24} /></button>
        </div>)}
      </div>
    </div>
  );
};

const FinanceView = ({ txs = [], setMessage, getColl, getDocRef }) => {
  const [f, setF] = useState({ amount: '', type: 'income', note: '' });
  const add = async (e) => {
    e.preventDefault();
    if(!f.amount) return;
    try {
      await addDoc(getColl("transactions"), { ...f, amount: Number(f.amount), date: new Date().toISOString().split('T')[0], createdAt: serverTimestamp() });
      setF({...f, amount:'', note:''}); setMessage({type:'success', text:'收支更新成功'});
    } catch (err) { setMessage({type:'error', text:'紀錄失敗'}); }
  };
  return (
    <div className="space-y-12 animate-fade-in text-slate-800 text-left">
      <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-amber-50 border-b-8 border-amber-500">
        <h3 className="text-3xl font-black text-amber-500 mb-10 flex items-center gap-4"><Icon name="wallet" size={32} /> 農場收支登錄</h3>
        <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select label="收支項目" value={f.type} onChange={v=>setF({...f, type:v})} options={['income','expense']} />
          <Input label="金額" type="number" value={f.amount} onChange={v=>setF({...f, amount:v})} placeholder="0" />
          <Input label="備註摘要" value={f.note} onChange={v=>setF({...f, note:v})} placeholder="細項說明" />
          <button type="submit" className="bg-slate-900 text-white p-6 rounded-[2rem] font-black text-xl active:scale-95 transition-all shadow-lg hover:bg-black">確認入帳</button>
        </form>
      </div>
      <div className="bg-white rounded-[4rem] border border-slate-50 overflow-hidden shadow-sm mb-32 divide-y divide-slate-50">
        {txs.map(t => <div key={t.id} className="p-8 flex justify-between items-center hover:bg-[#fafbfc] transition-all">
          <div className="flex gap-6 items-center">
            <div className={`p-4 rounded-3xl ${t.type==='income'?'bg-emerald-50 text-emerald-600':'bg-rose-50 text-rose-600'} shadow-inner`}><Icon name={t.type==='income'?'trendingUp':'dashboard'} size={24} /></div>
            <div><p className="font-black text-2xl text-slate-800 tracking-tight">{t.note || (t.type==='income'?'銷售收入':'採購支出')}</p><p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">{t.date}</p></div>
          </div>
          <div className="flex items-center gap-8">
            <p className={`text-4xl font-black ${t.type==='income'?'text-emerald-500':'text-rose-500'} tracking-tighter`}>{t.type==='income'?'+':'-'}${Number(t.amount).toLocaleString()}</p>
            <button onClick={()=>deleteDoc(getDocRef("transactions", t.id))} className="text-slate-100 hover:text-rose-500 p-2 active:scale-90 transition-all"><Icon name="trash" size={20}/></button>
          </div>
        </div>)}
      </div>
    </div>
  );
}
