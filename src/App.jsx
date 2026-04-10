import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  getDocs, 
  where 
} from 'firebase/firestore';

// 1. 更新後的 Firebase 配置資訊
const firebaseConfig = {
  apiKey: "AIzaSyC2MhDQ3igesAyy_CKBpsF9RZX9AH6zTgo",
  authDomain: "easystay-cloud-test.firebaseapp.com",
  projectId: "easystay-cloud-test",
  storageBucket: "easystay-cloud-test.firebasestorage.app",
  messagingSenderId: "570175625193",
  appId: "1:570175625193:web:1b156a870f8b9478975d78",
  measurementId: "G-NJ24N6VWP8"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 自定義 SVG 圖示組件，確保語法正確
const Icon = ({ name, size = 20, className = "" }) => {
  const icons = {
    dashboard: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    bed: <path d="M2 4v16M2 8h18M2 12h18M2 16h18M22 4v16" />,
    sprout: <path d="M7 20h10M12 20V10M12 10a4 4 0 0 1 4-4M12 10a4 4 0 0 0-4-4" />,
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    trendingUp: (
      <>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </>
    ),
    trendingDown: (
      <>
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </>
    ),
    chevronRight: <polyline points="9 18 15 12 9 6" />
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
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
    setTimeout(() => setIsLoading(false), 1200);
  }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (password === '1234') {
      setUserRole('admin');
      setActiveTab('dashboard');
      localStorage.setItem('farm_user_role', 'admin');
      setMessage({ type: 'success', text: '管理員歡迎回來！' });
    } else {
      setMessage({ type: 'error', text: '管理員密碼錯誤。' });
    }
  };

  const handleVisitorLogin = () => {
    setUserRole('visitor');
    setActiveTab('booking');
    localStorage.setItem('farm_user_role', 'visitor');
    setMessage({ type: 'success', text: '歡迎光臨綠色大地農場！' });
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('farm_user_role');
  };

  useEffect(() => {
    if (!userRole) return;

    const qBookings = query(collection(db, "bookings"), orderBy("date", "desc"));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubWork = () => {};
    let unsubFinance = () => {};

    if (userRole === 'admin') {
      const qWork = query(collection(db, "workRecords"), orderBy("date", "desc"));
      unsubWork = onSnapshot(qWork, (snapshot) => {
        setWorkRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qFinance = query(collection(db, "transactions"), orderBy("date", "desc"));
      unsubFinance = onSnapshot(qFinance, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubBookings();
      unsubWork();
      unsubFinance();
    };
  }, [userRole]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const DashboardView = () => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800">營運概況</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="總收入" value={`$${totalIncome.toLocaleString()}`} icon={<Icon name="trendingUp" className="text-emerald-500"/>} color="border-emerald-500" />
          <StatCard title="總支出" value={`$${totalExpense.toLocaleString()}`} icon={<Icon name="trendingDown" className="text-rose-500"/>} color="border-rose-500" />
          <StatCard title="目前結餘" value={`$${balance.toLocaleString()}`} icon={<Icon name="wallet" className="text-blue-500"/>} color="border-blue-500" />
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-4 text-gray-700">最新訂房動態</h3>
          <div className="space-y-3">
            {bookings.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Icon name="bed" size={18}/></div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">{b.guestName}</p>
                    <p className="text-xs text-gray-500">{b.date} · {b.roomType}</p>
                  </div>
                </div>
                <Icon name="chevronRight" size={16} className="text-gray-400"/>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-gray-400 text-center py-4">尚無訂房資訊</p>}
          </div>
        </div>
      </div>
    );
  };

  const BookingView = () => {
    const [formData, setFormData] = useState({ guestName: '', date: '', roomType: '雙人房' });

    const handleBooking = async (e) => {
      e.preventDefault();
      const q = query(collection(db, "bookings"), where("date", "==", formData.date), where("roomType", "==", formData.roomType));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setMessage({ type: 'error', text: `抱歉，${formData.date} 的 ${formData.roomType} 已被預訂。` });
        return;
      }
      await addDoc(collection(db, "bookings"), { ...formData, createdAt: new Date() });
      setMessage({ type: 'success', text: '訂房成功！農場見。' });
      setFormData({ guestName: '', date: '', roomType: '雙人房' });
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-600">
            <Icon name="calendar" size={20}/> 我要預約訂房
          </h3>
          <form onSubmit={handleBooking} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-gray-700">
            <div>
              <label className="block text-xs text-gray-500 mb-1">您的姓名</label>
              <input required value={formData.guestName} onChange={e=>setFormData({...formData, guestName: e.target.value})} className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">入住日期</label>
              <input required type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full p-2 bg-gray-50 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">房型</label>
              <select value={formData.roomType} onChange={e=>setFormData({...formData, roomType: e.target.value})} className="w-full p-2 bg-gray-50 border rounded-lg outline-none">
                <option>雙人房</option>
                <option>四人家庭房</option>
                <option>農場景觀房</option>
              </select>
            </div>
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition font-bold shadow-md shadow-blue-100">立即預約</button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-gray-700">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="p-4 font-bold">日期</th>
                <th className="p-4 font-bold">預約客</th>
                <th className="p-4 font-bold">房型</th>
                {userRole === 'admin' && <th className="p-4 font-bold">管理</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-blue-50/20 transition">
                  <td className="p-4 font-semibold text-gray-600">{b.date}</td>
                  <td className="p-4">{b.guestName}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-[10px] font-black uppercase">{b.roomType}</span></td>
                  {userRole === 'admin' && (
                    <td className="p-4">
                      <button onClick={()=>deleteDoc(doc(db, "bookings", b.id))} className="text-rose-400 hover:text-rose-600 transition"><Icon name="trash" size={18}/></button>
                    </td>
                  )}
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={userRole === 'admin' ? 4 : 3} className="p-10 text-center text-gray-300">目前尚無預約紀錄</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const FarmWorkView = () => {
    const [crop, setCrop] = useState('');
    const activities = ['栽種', '施肥', '澆水', '採收'];

    const handleRecord = async (act) => {
      if(!crop) return setMessage({type:'error', text:'請輸入作物名稱'});
      await addDoc(collection(db, "workRecords"), { 
        crop, 
        activity: act, 
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date() 
      });
      setMessage({type:'success', text:`已紀錄 ${crop} ${act}`});
      setCrop('');
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-600">
            <Icon name="sprout" size={20}/> 農場工作紀錄
          </h3>
          <input 
            placeholder="作物名稱 (如: 玉米)..." 
            value={crop} 
            onChange={e=>setCrop(e.target.value)}
            className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-emerald-200 rounded-xl mb-4 outline-none transition text-gray-700"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activities.map(act => (
              <button key={act} onClick={()=>handleRecord(act)} className="p-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white font-black transition">
                {act}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workRecords.map(w => (
            <div key={w.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
              <div>
                <p className="font-black text-gray-800">{w.crop}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{w.date} · {w.activity}</p>
              </div>
              <button onClick={()=>deleteDoc(doc(db, "workRecords", w.id))} className="text-gray-200 hover:text-rose-500 transition"><Icon name="trash" size={16}/></button>
            </div>
          ))}
          {workRecords.length === 0 && <p className="col-span-full text-center py-10 text-gray-300">尚無工作紀錄</p>}
        </div>
      </div>
    );
  };

  const FinanceView = () => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('income');
    const [note, setNote] = useState('');

    const handleFinance = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, "transactions"), {
        amount: Number(amount), type, note: note || (type === 'income' ? '一般收入' : '一般支出'),
        date: new Date().toISOString().split('T')[0], createdAt: new Date()
      });
      setMessage({type:'success', text:'收支已紀錄'});
      setAmount('');
      setNote('');
    };

    return (
      <div className="space-y-6 animate-fade-in text-gray-700">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-600">
            <Icon name="wallet" size={20}/> 財務收支登錄
          </h3>
          <form onSubmit={handleFinance} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">收支類型</label>
              <select value={type} onChange={e=>setType(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg font-bold">
                <option value="income">收入 (+)</option>
                <option value="expense">支出 (-)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">金額</label>
              <input required type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-bold uppercase">摘要/備註</label>
              <input value={note} onChange={e=>setNote(e.target.value)} placeholder="如: 賣玉米、買飼料" className="w-full p-2 bg-gray-50 border rounded-lg" />
            </div>
            <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded-lg font-black hover:bg-black transition">確認登錄</button>
          </form>
        </div>
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          <div className="bg-gray-50 p-3 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">近期流水帳</div>
          {transactions.map(t => (
            <div key={t.id} className="p-4 border-b flex justify-between items-center last:border-0 hover:bg-gray-50/50 transition">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  <Icon name={t.type === 'income' ? 'trendingUp' : 'trendingDown'} size={14} />
                </div>
                <div>
                  <p className="font-black text-gray-800">{t.note}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className={`font-black text-lg ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                </p>
                <button onClick={()=>deleteDoc(doc(db, "transactions", t.id))} className="text-gray-200 hover:text-rose-400 transition"><Icon name="trash" size={16}/></button>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-center py-10 text-gray-300">尚無財務紀錄</p>}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-emerald-600 font-black tracking-[0.2em] uppercase animate-pulse">正在開啟農場大門...</p>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border-8 border-white">
          <div className="w-full md:w-1/2 bg-emerald-600 p-12 text-white flex flex-col justify-center">
            <div className="p-5 bg-white/20 backdrop-blur-md inline-block rounded-2xl mb-8 self-start">
              <Icon name="sprout" size={40} />
            </div>
            <h1 className="text-5xl font-black mb-6 leading-tight tracking-tight">綠色大地<br/>管理系統</h1>
            <p className="opacity-90 text-lg font-medium">整合民宿預約、農作紀錄與財務分析的一站式解決方案。</p>
          </div>
          <div className="w-full md:w-1/2 p-12 flex flex-col justify-center space-y-10">
            <button onClick={handleVisitorLogin} className="p-8 bg-blue-50 hover:bg-blue-100 rounded-[2rem] flex items-center gap-6 transition-all border-2 border-blue-100 group shadow-sm active:scale-95">
              <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 group-hover:rotate-6 transition-transform">
                <Icon name="user" size={28} />
              </div>
              <div className="text-left">
                <p className="font-black text-gray-800 text-2xl tracking-tight">我是遊客</p>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">查詢空房與預約</p>
              </div>
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-gray-50"></div></div>
              <div className="relative flex justify-center text-[10px] text-gray-300 font-black uppercase tracking-[0.3em]"><span className="bg-white px-6">管理員驗證</span></div>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"><Icon name="lock" size={20} /></div>
                <input 
                  type="password" 
                  placeholder="管理員密碼" 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  className="w-full p-5 pl-14 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none focus:border-emerald-400 transition-all font-bold text-gray-800" 
                />
              </div>
              <button className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-xl hover:bg-black transition-all shadow-2xl shadow-gray-300 active:scale-95">進入後台系統</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      <nav className="w-full md:w-64 bg-white border-r-2 border-gray-50 p-6 flex flex-col shadow-sm sticky top-0 md:h-screen">
        <div className="flex items-center gap-4 mb-14 px-2">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-xl shadow-emerald-100"><Icon name="sprout" size={24} /></div>
          <div>
            <h1 className="font-black text-xl text-gray-800 tracking-tight">綠色大地</h1>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">{userRole==='admin'?'管理模式':'遊客模式'}</p>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {userRole === 'admin' && (
            <>
              <NavBtn active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon={<Icon name="dashboard"/>} label="營運總覽" />
              <NavBtn active={activeTab==='work'} onClick={()=>setActiveTab('work')} icon={<Icon name="sprout"/>} label="工作紀錄" />
              <NavBtn active={activeTab==='finance'} onClick={()=>setActiveTab('finance')} icon={<Icon name="wallet"/>} label="財務收支" />
            </>
          )}
          <NavBtn active={activeTab==='booking'} onClick={()=>setActiveTab('booking')} icon={<Icon name="bed"/>} label="民宿訂房" />
        </div>
        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 p-5 bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-3xl font-black transition-all text-xs uppercase tracking-widest">
          <Icon name="logout" size={20}/> 退出系統
        </button>
      </nav>
      <main className="flex-1 p-6 md:p-14 max-h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'booking' && <BookingView />}
          {activeTab === 'work' && <FarmWorkView />}
          {activeTab === 'finance' && <FinanceView />}
        </div>
        
        {message && (
          <div className={`fixed bottom-10 right-10 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-5 animate-slide-up z-50 border-4 ${message.type==='error'?'bg-rose-500 border-rose-400':'bg-emerald-600 border-emerald-500'} text-white`}>
            <div className="bg-white/20 p-3 rounded-2xl">
              <Icon name={message.type==='error'?'alert':'check'} size={24} /> 
            </div>
            <span className="font-black text-xl tracking-tight">{message.text}</span>
          </div>
        )}
      </main>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-black text-sm tracking-tight ${active ? 'bg-emerald-600 text-white shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)]' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
      <span className={active ? 'scale-110' : ''}>{icon}</span> {label}
    </button>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border-l-[12px] ${color} flex items-center justify-between hover:shadow-xl transition-all duration-300 group`}>
      <div>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">{title}</p>
        <p className="text-4xl font-black text-gray-800 tracking-tighter group-hover:scale-105 transition-transform origin-left">{value}</p>
      </div>
      <div className="p-5 bg-gray-50 rounded-3xl text-gray-600 group-hover:bg-gray-100 transition-colors">{icon}</div>
    </div>
  );
}
