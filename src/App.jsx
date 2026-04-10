import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, query, 
  orderBy, deleteDoc, doc, getDocs, where 
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
const db = getFirestore(app);

// 核心圖示組件 (SVG)
const Icon = ({ name, size = 20, className = "" }) => {
  const icons = {
    dashboard: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    bed: <path d="M2 4v16M2 8h18M2 12h18M2 16h18M22 4v16" />,
    sprout: <path d="M7 20h10M12 20V10M12 10a4 4 0 0 1 4-4M12 10a4 4 0 0 0-4-4" />,
    wallet: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    trendingUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
    trendingDown: <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></>,
    chevronRight: <polyline points="9 18 15 12 9 6" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {icons[name] || null}
    </svg>
  );
};

export default function App() {
  const [userRole, setUserRole] = useState(null); 
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('booking'); 
  const [message, setMessage] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [workRecords, setWorkRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const savedRole = localStorage.getItem('farm_user_role');
    if (savedRole) {
      setUserRole(savedRole);
      if (savedRole === 'admin') setActiveTab('dashboard');
    }
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!userRole) return;
    const qBookings = query(collection(db, "bookings"), orderBy("date", "desc"));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    let unsubWork = () => {}, unsubFinance = () => {};
    if (userRole === 'admin') {
      unsubWork = onSnapshot(query(collection(db, "workRecords"), orderBy("date", "desc")), (snapshot) => setWorkRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      unsubFinance = onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc")), (snapshot) => setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }
    return () => { unsubBookings(); unsubWork(); unsubFinance(); };
  }, [userRole]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (password === '1234') {
      setUserRole('admin'); setActiveTab('dashboard');
      localStorage.setItem('farm_user_role', 'admin');
    } else { setMessage({ type: 'error', text: '密碼錯誤' }); }
  };

  const handleVisitorLogin = () => {
    setUserRole('visitor'); setActiveTab('booking');
    localStorage.setItem('farm_user_role', 'visitor');
  };

  const handleLogout = () => { setUserRole(null); localStorage.removeItem('farm_user_role'); };

  // --- UI 組件 ---

  if (isLoading) return (
    <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
      <h1 className="text-white font-black tracking-widest animate-pulse">GREEN LAND</h1>
    </div>
  );

  if (!userRole) return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden border-8 border-white">
        {/* 左側形象區 */}
        <div className="md:w-1/2 bg-emerald-600 p-16 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div>
            <div className="p-4 bg-white/20 backdrop-blur-md inline-block rounded-2xl mb-8">
              <Icon name="sprout" size={40} />
            </div>
            <h1 className="text-6xl font-black mb-6 leading-tight tracking-tighter">
              綠色大地<br/><span className="text-emerald-300">雲端農場</span>
            </h1>
            <p className="text-emerald-50/80 text-xl font-bold leading-relaxed">
              整合住宿、財務與耕作紀錄，<br/>打造現代化休閒農場新標準。
            </p>
          </div>
          <div className="text-emerald-200/50 text-xs font-black uppercase tracking-widest">
            EasyStay Cloud System v2.0
          </div>
        </div>

        {/* 右側登入區 */}
        <div className="md:w-1/2 p-16 flex flex-col justify-center space-y-12 bg-white">
          <button onClick={handleVisitorLogin} className="p-8 bg-white hover:bg-blue-50 rounded-[2.5rem] flex items-center gap-6 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-2 border-transparent hover:border-blue-100 group active:scale-95">
            <div className="p-5 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-200 group-hover:scale-110 transition-transform">
              <Icon name="user" size={32} />
            </div>
            <div className="text-left">
              <p className="font-black text-slate-800 text-3xl tracking-tight">我是遊客</p>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em]">查詢空房與預約</p>
            </div>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-slate-50"></div></div>
            <div className="relative flex justify-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]"><span className="bg-white px-6">管理者登入</span></div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"><Icon name="lock" size={20} /></div>
              <input 
                type="password" 
                placeholder="請輸入密碼" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-6 pl-16 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[2rem] outline-none transition-all font-bold text-slate-800 text-lg shadow-inner" 
              />
            </div>
            <button className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-95">進入管理後台</button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-slate-800">
      {/* 導覽列 */}
      <nav className="w-full md:w-72 bg-white border-r border-slate-100 p-8 flex flex-col sticky top-0 md:h-screen z-50">
        <div className="flex items-center gap-4 mb-16 px-2">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-2xl shadow-emerald-100"><Icon name="sprout" size={24} /></div>
          <div><h1 className="font-black text-xl tracking-tight">綠色大地</h1><p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{userRole === 'admin' ? 'Manager' : 'Visitor'}</p></div>
        </div>
        <div className="flex-1 space-y-4">
          {userRole === 'admin' && (
            <>
              <TabBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="dashboard" label="營運總覽" />
              <TabBtn active={activeTab === 'work'} onClick={() => setActiveTab('work')} icon="sprout" label="耕作紀錄" />
              <TabBtn active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon="wallet" label="收支帳目" />
            </>
          )}
          <TabBtn active={activeTab === 'booking'} onClick={() => setActiveTab('booking')} icon="bed" label="民宿預約" />
        </div>
        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 p-5 text-slate-400 hover:text-rose-500 font-black text-xs uppercase tracking-widest transition-all"><Icon name="logout" size={18} /> 退出登錄</button>
      </nav>

      {/* 主內容區 */}
      <main className="flex-1 p-8 md:p-16 max-w-7xl mx-auto w-full overflow-y-auto">
        {activeTab === 'dashboard' && <DashboardView transactions={transactions} bookings={bookings} />}
        {activeTab === 'booking' && <BookingView bookings={bookings} userRole={userRole} setMessage={setMessage} db={db} />}
        {activeTab === 'work' && <WorkPanel records={workRecords} db={db} setMessage={setMessage} />}
        {activeTab === 'finance' && <FinancePanel txs={transactions} db={db} setMessage={setMessage} />}
        
        {message && (
          <div className={`fixed bottom-12 right-12 p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-slide-up z-[100] border-2 ${message.type === 'error' ? 'bg-rose-500 border-rose-400' : 'bg-emerald-600 border-emerald-400'} text-white`}>
            <Icon name={message.type === 'error' ? 'alert' : 'check'} /> <span className="font-black text-lg">{message.text}</span>
          </div>
        )}
      </main>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}

// --- 介面組件 ---

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black text-sm transition-all ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 scale-105' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
      <Icon name={icon} size={20} /> {label}
    </button>
  );
}

const DashboardView = ({ transactions, bookings }) => {
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatBox title="總收入" value={`$${income.toLocaleString()}`} color="emerald" icon="trendingUp" />
        <StatBox title="總支出" value={`$${expense.toLocaleString()}`} color="rose" icon="trendingDown" />
        <StatBox title="目前結餘" value={`$${(income - expense).toLocaleString()}`} color="blue" icon="wallet" />
      </div>
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50">
        <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><div className="w-2 h-8 bg-blue-500 rounded-full"></div> 最新預約動態</h3>
        <div className="space-y-4">
          {bookings.slice(0, 3).map(b => (
            <div key={b.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-100 transition-all">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-white text-blue-600 rounded-2xl shadow-sm"><Icon name="bed" /></div>
                <div><p className="font-black text-xl text-slate-800">{b.guestName}</p><p className="text-xs text-slate-400 font-black uppercase tracking-widest">{b.date} · {b.roomType}</p></div>
              </div>
              <Icon name="chevronRight" className="text-slate-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BookingView = ({ bookings, userRole, setMessage, db }) => {
  const [form, setForm] = useState({ guestName: '', date: '', roomType: '雙人房' });
  const handleAdd = async (e) => {
    e.preventDefault();
    const q = query(collection(db, "bookings"), where("date", "==", form.date), where("roomType", "==", form.roomType));
    const snap = await getDocs(q);
    if (!snap.empty) return setMessage({ type: 'error', text: '抱歉，此時段房型已被預訂' });
    await addDoc(collection(db, "bookings"), { ...form, createdAt: new Date() });
    setMessage({ type: 'success', text: '預約成功！' });
    setForm({ ...form, guestName: '' });
  };
  return (
    <div className="space-y-10">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-50">
        <h3 className="text-3xl font-black text-blue-600 mb-10 flex items-center gap-4"><Icon name="calendar" size={32} /> 我要預約訂房</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
          <Input label="您的姓名" value={form.guestName} onChange={v => setForm({...form, guestName: v})} placeholder="請輸入姓名" />
          <Input label="入住日期" type="date" value={form.date} onChange={v => setForm({...form, date: v})} />
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">房型</label>
            <select value={form.roomType} onChange={e => setForm({...form, roomType: e.target.value})} className="bg-slate-50 p-5 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-200 transition-all appearance-none">
              <option>雙人房</option><option>四人家庭房</option><option>農場景觀房</option>
            </select>
          </div>
          <button className="bg-blue-600 text-white p-5 rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 hover:-translate-y-1">立即預約</button>
        </form>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white/50 text-[10px] font-black uppercase tracking-[0.3em]"><tr className="divide-x divide-white/10"><th className="p-6">日期</th><th className="p-6">旅客</th><th className="p-6">房型</th>{userRole === 'admin' && <th className="p-6">管理</th>}</tr></thead>
          <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
            {bookings.map(b => (
              <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-6">{b.date}</td><td className="p-6 text-slate-900">{b.guestName}</td>
                <td className="p-6"><span className="px-4 py-1.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">{b.roomType}</span></td>
                {userRole === 'admin' && <td className="p-6"><button onClick={() => deleteDoc(doc(db, "bookings", b.id))} className="text-slate-200 hover:text-rose-500 transition-colors"><Icon name="trash" /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatBox = ({ title, value, color, icon }) => (
  <div className={`bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-${color}-500 flex items-center justify-between hover:-translate-y-2 transition-all duration-500`}>
    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p><p className={`text-4xl font-black text-${color}-600 tracking-tighter`}>{value}</p></div>
    <div className={`p-4 bg-${color}-50 text-${color}-600 rounded-3xl`}><Icon name={icon} size={32} /></div>
  </div>
);

const Input = ({ label, type = "text", value, onChange, placeholder }) => (
  <div className="flex flex-col gap-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-slate-50 p-5 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-200 transition-all shadow-inner" />
  </div>
);

// --- 工作與財務面板 (同樣美化) ---
const WorkPanel = ({ records, db, setMessage }) => {
  const [crop, setCrop] = useState('');
  const acts = ['栽種', '施肥', '澆水', '採收'];
  return (
    <div className="space-y-12">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-emerald-50">
        <h3 className="text-3xl font-black text-emerald-600 mb-10 flex items-center gap-4"><Icon name="sprout" size={32} /> 田間管理</h3>
        <input placeholder="輸入作物名稱..." value={crop} onChange={e=>setCrop(e.target.value)} className="w-full p-6 bg-emerald-50/50 rounded-3xl mb-8 outline-none border-2 border-transparent focus:border-emerald-200 font-bold text-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {acts.map(a => <button key={a} onClick={async () => {
            if(!crop) return setMessage({type:'error', text:'請輸入作物'});
            await addDoc(collection(db, "workRecords"), { crop, activity: a, date: new Date().toISOString().split('T')[0], createdAt: new Date() });
            setMessage({type:'success', text:`紀錄已儲存`}); setCrop('');
          }} className="p-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95">{a}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {records.map(r => (
          <div key={r.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 flex justify-between items-center hover:shadow-lg transition-all">
            <div><p className="font-black text-2xl text-slate-800">{r.crop}</p><p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{r.date} · {r.activity}</p></div>
            <button onClick={()=>deleteDoc(doc(db,"workRecords",r.id))} className="text-slate-100 hover:text-rose-500 transition-colors"><Icon name="trash" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const FinancePanel = ({ txs, db, setMessage }) => {
  const [form, setForm] = useState({ amount: '', type: 'income', note: '' });
  return (
    <div className="space-y-12">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-amber-50">
        <h3 className="text-3xl font-black text-amber-600 mb-10 flex items-center gap-4"><Icon name="wallet" size={32} /> 財務登錄</h3>
        <form onSubmit={async (e)=>{
          e.preventDefault();
          await addDoc(collection(db, "transactions"), { ...form, amount: Number(form.amount), date: new Date().toISOString().split('T')[0], createdAt: new Date() });
          setMessage({type:'success', text:'帳目已更新'}); setForm({ ...form, amount: '', note: '' });
        }} className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">項目</label>
            <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} className="bg-amber-50 p-5 rounded-2xl font-bold">
              <option value="income">收入 (+)</option><option value="expense">支出 (-)</option>
            </select>
          </div>
          <Input label="金額" type="number" value={form.amount} onChange={v => setForm({...form, amount:v})} />
          <Input label="摘要" value={form.note} onChange={v => setForm({...form, note:v})} />
          <button className="bg-amber-600 text-white p-5 rounded-2xl font-black text-xl hover:bg-amber-700 shadow-xl shadow-amber-100">確認登錄</button>
        </form>
      </div>
      <div className="bg-white rounded-[3rem] border border-slate-50 overflow-hidden">
        {txs.map(t => (
          <div key={t.id} className="p-8 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-2xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><Icon name={t.type==='income'?'trendingUp':'trendingDown'} /></div>
              <div><p className="font-black text-xl text-slate-800">{t.note}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{t.date}</p></div>
            </div>
            <div className="flex items-center gap-8">
              <p className={`text-3xl font-black ${t.type==='income'?'text-emerald-500':'text-rose-500'}`}>{t.type==='income'?'+':'-'}${t.amount.toLocaleString()}</p>
              <button onClick={()=>deleteDoc(doc(db,"transactions",t.id))} className="text-slate-200 hover:text-rose-500 transition-colors"><Icon name="trash" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
