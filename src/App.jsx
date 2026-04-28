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

// 1. Firebase 配置資訊 (使用您提供的資訊)
const firebaseConfig = {
  apiKey: "AIzaSyAo5sUQkdHAaANO_KMHuJ7YPUbbRrf4B6k",
  authDomain: "easystay-cloud-47e6d.firebaseapp.com",
  projectId: "easystay-cloud-47e6d",
  storageBucket: "easystay-cloud-47e6d.firebasestorage.app",
  messagingSenderId: "658044361739",
  appId: "1:658044361739:web:39f4e5f3fe990094e57b0e",
  measurementId: "G-8LH29W939J"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 自定義 SVG 圖示組件
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
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {icons[name] || null}
    </svg>
  );
};

// --- 主程式開始 ---
export default function App() {
  const [userRole, setUserRole] = useState(null); 
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('booking'); 
  const [message, setMessage] = useState(null);

  // 資料庫狀態
  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]); // 新增活動狀態
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
    setPassword('');
  };

  // 即時監聽資料
  useEffect(() => {
    if (!userRole) return;

    // 所有角色都可以看到訂房與活動，確保資料同步
    const unsubBookings = onSnapshot(query(collection(db, "bookings"), orderBy("date", "desc")), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubActivities = onSnapshot(query(collection(db, "activities"), orderBy("date", "desc")), (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubWork = () => {};
    let unsubFinance = () => {};

    if (userRole === 'admin') {
      unsubWork = onSnapshot(query(collection(db, "workRecords"), orderBy("date", "desc")), (snapshot) => {
        setWorkRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      unsubFinance = onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc")), (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubBookings();
      unsubActivities();
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#f8fafc] flex flex-col items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-emerald-600 font-bold tracking-widest animate-pulse">正在開啟農場大門...</p>
      </div>
    );
  }

  // --- 登入畫面 (明亮風格) ---
  if (!userRole) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] shadow-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border border-slate-100">
          <div className="w-full md:w-1/2 bg-emerald-50 p-12 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-2xl opacity-60"></div>
            <div className="p-4 bg-emerald-500 text-white inline-block rounded-2xl mb-8 self-start shadow-lg shadow-emerald-200">
              <Icon name="sprout" size={40} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight text-slate-800">綠色大地<br/><span className="text-emerald-500">休閒農場</span></h1>
            <p className="text-slate-500 font-medium">預約住宿、體驗農作，享受純粹的自然生活。</p>
          </div>
          <div className="w-full md:w-1/2 p-12 flex flex-col justify-center space-y-8 bg-white z-10">
            <button onClick={handleVisitorLogin} className="p-6 bg-blue-50 hover:bg-blue-100 rounded-3xl flex items-center gap-5 transition-all group shadow-sm">
              <div className="p-4 bg-blue-500 text-white rounded-2xl shadow-md group-hover:scale-110 transition-transform">
                <Icon name="user" size={24} />
              </div>
              <div className="text-left">
                <p className="font-black text-slate-800 text-xl">我是遊客</p>
                <p className="text-xs text-slate-500 font-medium mt-1">查詢空房與預約活動</p>
              </div>
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest"><span className="bg-white px-4">或使用管理員登入</span></div>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="lock" size={18} /></div>
                <input 
                  type="password" 
                  placeholder="管理員密碼 (1234)" 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-400 focus:ring-2 ring-emerald-50 transition-all font-medium" 
                />
              </div>
              <button className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black hover:bg-black transition-all shadow-md active:scale-95">登入後台</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-slate-800">
      {/* 側邊導覽列 */}
      <nav className="w-full md:w-64 bg-white border-r border-slate-100 p-6 flex flex-col shadow-sm sticky top-0 md:h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2.5 bg-emerald-500 rounded-xl text-white shadow-md shadow-emerald-100"><Icon name="sprout" size={24} /></div>
          <div>
            <h1 className="font-black text-xl text-slate-800 tracking-tight">綠色大地</h1>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{userRole==='admin'?'管理員模式':'訪客模式'}</p>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {userRole === 'admin' && (
            <NavBtn active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon={<Icon name="dashboard"/>} label="營運總覽" color="emerald" />
          )}
          <NavBtn active={activeTab==='booking'} onClick={()=>setActiveTab('booking')} icon={<Icon name="bed"/>} label="民宿訂房" color="blue" />
          <NavBtn active={activeTab==='activity'} onClick={()=>setActiveTab('activity')} icon={<Icon name="star"/>} label="農場活動" color="amber" />
          
          {userRole === 'admin' && (
            <>
              <div className="h-px bg-slate-100 my-4 mx-4"></div>
              <NavBtn active={activeTab==='work'} onClick={()=>setActiveTab('work')} icon={<Icon name="sprout"/>} label="工作紀錄" color="emerald" />
              <NavBtn active={activeTab==='finance'} onClick={()=>setActiveTab('finance')} icon={<Icon name="wallet"/>} label="財務收支" color="emerald" />
            </>
          )}
        </div>
        <button onClick={handleLogout} className="mt-auto flex items-center justify-center gap-3 p-4 bg-slate-50 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-2xl font-bold transition-all text-sm">
          <Icon name="logout" size={18}/> 退出系統
        </button>
      </nav>

      {/* 主內容區 - 使用 Key 確保切換時平滑過渡且防止 DOM 報錯 */}
      <main key={activeTab} className="flex-1 p-6 md:p-12 overflow-y-auto animate-fade-in">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView transactions={transactions} bookings={bookings} activities={activities} />}
          {activeTab === 'booking' && <BookingView bookings={bookings} db={db} userRole={userRole} setMessage={setMessage} />}
          {activeTab === 'activity' && <ActivityView activities={activities} db={db} userRole={userRole} setMessage={setMessage} />}
          {activeTab === 'work' && <FarmWorkView workRecords={workRecords} db={db} setMessage={setMessage} />}
          {activeTab === 'finance' && <FinanceView transactions={transactions} db={db} setMessage={setMessage} />}
        </div>
        
        {/* 通知彈窗 */}
        {message && (
          <div className={`fixed bottom-8 right-8 p-5 rounded-2xl shadow-xl flex items-center gap-4 animate-slide-up z-50 border ${message.type==='error'?'bg-rose-50 border-rose-200 text-rose-600':'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <div className={`p-2 rounded-lg text-white ${message.type==='error'?'bg-rose-500':'bg-emerald-500'}`}>
              <Icon name={message.type==='error'?'alert':'check'} size={18} /> 
            </div>
            <span className="font-bold">{message.text}</span>
          </div>
        )}
      </main>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}

// --- 分離出的視圖元件 (徹底解決 Vercel 切換報錯) ---

function NavBtn({ active, onClick, icon, label, color }) {
  const styles = {
    emerald: active ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600',
    blue: active ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600',
    amber: active ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-500 hover:bg-slate-100 hover:text-amber-600'
  };
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm ${styles[color]}`}>
      <span className={active ? 'scale-110 transition-transform' : ''}>{icon}</span> {label}
    </button>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group`}>
      <div>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
      </div>
      <div className={`p-4 rounded-2xl ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
  );
}

function DashboardView({ transactions, bookings, activities }) {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-3xl font-black text-slate-800">營運總覽</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="目前結餘" value={`$${balance.toLocaleString()}`} icon={<Icon name="wallet" className="text-emerald-600"/>} color="bg-emerald-50" />
        <StatCard title="近期訂房" value={`${bookings.length} 筆`} icon={<Icon name="bed" className="text-blue-600"/>} color="bg-blue-50" />
        <StatCard title="活動報名" value={`${activities.length} 組`} icon={<Icon name="star" className="text-amber-600"/>} color="bg-amber-50" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="font-bold mb-6 text-slate-700 flex items-center gap-2"><Icon name="bed" className="text-blue-500" /> 最新訂房動態</h3>
          <div className="space-y-3">
            {bookings.slice(0, 4).map(b => (
              <div key={b.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Icon name="user" size={16}/></div>
                  <div><p className="font-bold text-sm text-slate-800">{b.guestName}</p><p className="text-xs text-slate-500">{b.date} · {b.roomType}</p></div>
                </div>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-slate-400 text-center py-6 text-sm font-medium">尚無訂房資訊</p>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="font-bold mb-6 text-slate-700 flex items-center gap-2"><Icon name="star" className="text-amber-500" /> 最新活動報名</h3>
          <div className="space-y-3">
            {activities.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-amber-100 rounded-full text-amber-600"><Icon name="star" size={16}/></div>
                  <div><p className="font-bold text-sm text-slate-800">{a.guestName} <span className="text-amber-600 text-xs">({a.count}人)</span></p><p className="text-xs text-slate-500">{a.date} · {a.activity}</p></div>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="text-slate-400 text-center py-6 text-sm font-medium">尚無活動報名</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingView({ bookings, db, userRole, setMessage }) {
  const [formData, setFormData] = useState({ guestName: '', date: '', roomType: '雙人房' });

  const handleBooking = async (e) => {
    e.preventDefault();
    if(!formData.guestName || !formData.date) return setMessage({type:'error', text:'請填寫完整資訊'});
    
    // 檢查是否重複預訂
    const q = query(collection(db, "bookings"), where("date", "==", formData.date), where("roomType", "==", formData.roomType));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return setMessage({ type: 'error', text: `抱歉，該日期的 ${formData.roomType} 已滿。` });
    }

    await addDoc(collection(db, "bookings"), { ...formData, createdAt: new Date() });
    setMessage({ type: 'success', text: '訂房成功！期待您的到來。' });
    setFormData({ guestName: '', date: '', roomType: '雙人房' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-blue-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-400"></div>
        <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-blue-600">
          <Icon name="calendar" size={24}/> 我要預約訂房
        </h3>
        <form onSubmit={handleBooking} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">您的姓名</label>
            <input required value={formData.guestName} onChange={e=>setFormData({...formData, guestName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-200 font-medium transition" placeholder="填寫大名" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">入住日期</label>
            <input required type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-200 font-medium transition text-slate-600" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">選擇房型</label>
            <select value={formData.roomType} onChange={e=>setFormData({...formData, roomType: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-200 font-medium transition">
              <option>雙人房</option>
              <option>四人家庭房</option>
              <option>農場景觀房</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 transition font-black shadow-lg shadow-blue-200 active:scale-95 text-lg">立即預約</button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-6">預訂日期</th>
                <th className="p-6">預約客</th>
                <th className="p-6">房型</th>
                {userRole === 'admin' && <th className="p-6 text-center">管理</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-medium">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-6 font-bold text-slate-600">{b.date}</td>
                  <td className="p-6 text-slate-800">{b.guestName}</td>
                  <td className="p-6"><span className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black">{b.roomType}</span></td>
                  {userRole === 'admin' && (
                    <td className="p-6 text-center">
                      <button onClick={()=>deleteDoc(doc(db, "bookings", b.id))} className="text-slate-300 hover:text-rose-500 p-2 transition-colors active:scale-90"><Icon name="trash" size={18}/></button>
                    </td>
                  )}
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={userRole === 'admin' ? 4 : 3} className="p-16 text-center text-slate-300 font-bold tracking-widest">目前尚無紀錄</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 🆕 新增：農場活動預訂模組
function ActivityView({ activities, db, userRole, setMessage }) {
  const [form, setForm] = useState({ guestName: '', date: '', activity: '可愛動物餵食秀', count: '1' });
  
  const handleBooking = async (e) => {
    e.preventDefault();
    if(!form.guestName || !form.date) return setMessage({type:'error', text:'請完整填寫資訊'});
    await addDoc(collection(db, "activityOrders"), { ...form, createdAt: new Date() });
    setMessage({ type: 'success', text: '報名成功！準備好享受自然吧' });
    setForm({ ...form, guestName: '', count: '1' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-amber-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-400"></div>
        <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-amber-500">
          <Icon name="star" size={24}/> 農場活動體驗報名
        </h3>
        <form onSubmit={handleBooking} className="grid grid-cols-1 md:grid-cols-5 gap-5 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">參加者姓名</label>
            <input required value={form.guestName} onChange={e=>setForm({...form, guestName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-200 font-medium transition" placeholder="姓名" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">活動日期</label>
            <input required type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-200 font-medium transition text-slate-600" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">體驗項目</label>
            <select value={form.activity} onChange={e=>setForm({...form, activity: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-200 font-medium transition">
              <option>可愛動物餵食秀</option>
              <option>生態導覽解說</option>
              <option>手作窯烤披薩</option>
              <option>草地音樂晚會</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">人數</label>
            <input required type="number" min="1" max="20" value={form.count} onChange={e=>setForm({...form, count: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-200 font-medium transition" />
          </div>
          <button type="submit" className="bg-amber-500 text-white p-4 rounded-2xl hover:bg-amber-600 transition font-black shadow-lg shadow-amber-200 active:scale-95 text-lg">確認報名</button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-6">活動日期</th>
                <th className="p-6">參加者</th>
                <th className="p-6">報名項目</th>
                <th className="p-6">人數</th>
                {userRole === 'admin' && <th className="p-6 text-center">管理</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-medium">
              {activities.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-6 font-bold text-slate-600">{a.date}</td>
                  <td className="p-6 text-slate-800">{a.guestName}</td>
                  <td className="p-6"><span className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black">{a.activity}</span></td>
                  <td className="p-6 text-slate-500">{a.count} 位</td>
                  {userRole === 'admin' && (
                    <td className="p-6 text-center">
                      <button onClick={()=>deleteDoc(doc(db, "activityOrders", a.id))} className="text-slate-300 hover:text-rose-500 p-2 transition-colors active:scale-90"><Icon name="trash" size={18}/></button>
                    </td>
                  )}
                </tr>
              ))}
              {activities.length === 0 && <tr><td colSpan={userRole === 'admin' ? 5 : 4} className="p-16 text-center text-slate-300 font-bold tracking-widest">目前尚無報名</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FarmWorkView({ workRecords, db, setMessage }) {
  const [crop, setCrop] = useState('');
  const activities = ['栽種', '施肥', '澆水', '採收'];

  const handleRecord = async (act) => {
    if(!crop) return setMessage({type:'error', text:'請輸入作物名稱'});
    await addDoc(collection(db, "workRecords"), { 
      crop, activity: act, date: new Date().toISOString().split('T')[0], createdAt: new Date() 
    });
    setMessage({type:'success', text:`已紀錄 ${crop} ${act}`});
    setCrop('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-emerald-100">
        <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-emerald-600">
          <Icon name="sprout" size={24}/> 田間工作紀錄
        </h3>
        <input 
          placeholder="正在照顧哪種作物？ (例如: 高麗菜)" 
          value={crop} 
          onChange={e=>setCrop(e.target.value)}
          className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-emerald-300 font-bold text-lg"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activities.map(act => (
            <button key={act} onClick={()=>handleRecord(act)} className="p-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl hover:bg-emerald-500 hover:text-white font-black transition-all active:scale-95 shadow-sm">
              {act}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workRecords.map(w => (
          <div key={w.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="font-black text-xl text-slate-800">{w.crop}</p>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">{w.date} · {w.activity}</p>
            </div>
            <button onClick={()=>deleteDoc(doc(db, "workRecords", w.id))} className="text-slate-300 hover:text-rose-500 p-2 transition-colors"><Icon name="trash" size={20}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceView({ transactions, db, setMessage }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');
  const [note, setNote] = useState('');

  const handleFinance = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "transactions"), {
      amount: Number(amount), type, note: note || (type === 'income' ? '銷售收入' : '一般支出'),
      date: new Date().toISOString().split('T')[0], createdAt: new Date()
    });
    setMessage({type:'success', text:'收支帳目登錄成功'});
    setAmount(''); setNote('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-emerald-100">
        <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-emerald-600">
          <Icon name="wallet" size={24}/> 農場收支記帳
        </h3>
        <form onSubmit={handleFinance} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">類型</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-200 font-medium">
              <option value="income">收入 (+)</option>
              <option value="expense">支出 (-)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">金額 (NTD)</label>
            <input required type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-200 font-medium" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">備註說明</label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="如: 門票收入、飼料費" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-200 font-medium" />
          </div>
          <button type="submit" className="bg-slate-800 text-white p-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg active:scale-95 text-lg">確認記帳</button>
        </form>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8">近期收支明細</div>
        <div className="divide-y divide-slate-50">
          {transactions.map(t => (
            <div key={t.id} className="p-6 md:px-8 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-5">
                <div className={`p-3 rounded-xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                  <Icon name={t.type === 'income' ? 'trendingUp' : 'trendingDown'} size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">{t.note}</p>
                  <p className="text-[10px] text-slate-400 font-bold tracking-widest">{t.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <p className={`font-black text-2xl tracking-tighter ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                </p>
                <button onClick={()=>deleteDoc(doc(db, "transactions", t.id))} className="text-slate-300 hover:text-rose-500 p-2 transition-colors"><Icon name="trash" size={18}/></button>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-center py-16 text-slate-300 font-bold tracking-widest">尚無財務紀錄</p>}
        </div>
      </div>
    </div>
  );
}
