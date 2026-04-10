import React, { useState, useEffect, useMemo } from 'react';
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
  where,
  setDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  BedDouble, 
  Sprout, 
  Wallet, 
  LogOut, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Lock
} from 'lucide-react';

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

// --- 主程式開始 ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [message, setMessage] = useState(null);

  // 資料狀態
  const [bookings, setBookings] = useState([]);
  const [workRecords, setWorkRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // 登入驗證邏輯
  useEffect(() => {
    const savedAuth = localStorage.getItem('farm_auth');
    if (savedAuth === 'true') setIsLoggedIn(true);
    
    // 模擬載入過程
    setTimeout(() => setIsLoading(false), 1500);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '1234') {
      setIsLoggedIn(true);
      localStorage.setItem('farm_auth', 'true');
      setMessage({ type: 'success', text: '歡迎回來，農場主！' });
    } else {
      setMessage({ type: 'error', text: '密碼錯誤，請重新輸入。' });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('farm_auth');
  };

  // 資料庫監聽 (即時同步)
  useEffect(() => {
    if (!isLoggedIn) return;

    const qBookings = query(collection(db, "bookings"), orderBy("date", "desc"));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qWork = query(collection(db, "workRecords"), orderBy("date", "desc"));
    const unsubWork = onSnapshot(qWork, (snapshot) => {
      setWorkRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qFinance = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubFinance = onSnapshot(qFinance, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubBookings();
      unsubWork();
      unsubFinance();
    };
  }, [isLoggedIn]);

  // 顯示提示訊息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // --- 子組件與視圖 ---

  // 1. 儀表板視圖
  const DashboardView = () => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800">營運概況</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="總收入" value={`$${totalIncome.toLocaleString()}`} icon={<TrendingUp className="text-emerald-500"/>} color="border-emerald-500" />
          <StatCard title="總支出" value={`$${totalExpense.toLocaleString()}`} icon={<TrendingDown className="text-rose-500"/>} color="border-rose-500" />
          <StatCard title="目前結餘" value={`$${balance.toLocaleString()}`} icon={<Wallet className="text-blue-500"/>} color="border-blue-500" />
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-4 text-gray-700">最新訂房動態</h3>
          <div className="space-y-3">
            {bookings.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full text-blue-600"><BedDouble size={18}/></div>
                  <div>
                    <p className="font-medium">{b.guestName}</p>
                    <p className="text-xs text-gray-500">{b.date} · {b.roomType}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400"/>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-gray-400 text-center py-4">尚無訂房資訊</p>}
          </div>
        </div>
      </div>
    );
  };

  // 2. 民宿訂房視圖 (含防重複邏輯)
  const BookingView = () => {
    const [formData, setFormData] = useState({ guestName: '', date: '', roomType: '雙人房' });

    const handleBooking = async (e) => {
      e.preventDefault();
      // 防重複邏輯：檢查同一天、同一房型是否已被預定
      const q = query(collection(db, "bookings"), 
                where("date", "==", formData.date), 
                where("roomType", "==", formData.roomType));
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setMessage({ type: 'error', text: `抱歉，${formData.date} 的 ${formData.roomType} 已被預訂。` });
        return;
      }

      try {
        await addDoc(collection(db, "bookings"), { ...formData, createdAt: new Date() });
        setMessage({ type: 'success', text: '訂房成功！' });
        setFormData({ guestName: '', date: '', roomType: '雙人房' });
      } catch (err) {
        setMessage({ type: 'error', text: '系統錯誤，請稍後再試。' });
      }
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="text-blue-500" size={20}/> 新增預約
          </h3>
          <form onSubmit={handleBooking} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-500 mb-1">住客姓名</label>
              <input required value={formData.guestName} onChange={e=>setFormData({...formData, guestName: e.target.value})} className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">入住日期</label>
              <input required type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">房型選擇</label>
              <select value={formData.roomType} onChange={e=>setFormData({...formData, roomType: e.target.value})} className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition">
                <option>雙人房</option>
                <option>四人家庭房</option>
                <option>農場景觀房</option>
              </select>
            </div>
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition font-medium">確認訂房</button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="p-4">入住日期</th>
                <th className="p-4">住客</th>
                <th className="p-4">房型</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-medium">{b.date}</td>
                  <td className="p-4">{b.guestName}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs">{b.roomType}</span></td>
                  <td className="p-4">
                    <button onClick={()=>deleteDoc(doc(db, "bookings", b.id))} className="text-rose-400 hover:text-rose-600 transition"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 3. 農場工作紀錄視圖 (批次套用)
  const FarmWorkView = () => {
    const [crop, setCrop] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const activities = ['栽種', '施肥', '澆水', '除草', '噴灑驅蟲', '採收'];

    const handleWorkRecord = async (activity) => {
      if(!crop) { setMessage({type:'error', text:'請先輸入作物名稱'}); return; }
      await addDoc(collection(db, "workRecords"), { crop, date, activity, createdAt: new Date() });
      setMessage({ type: 'success', text: `已紀錄：${crop} ${activity}` });
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sprout className="text-emerald-500" size={20}/> 快速工作紀錄
          </h3>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input placeholder="輸入作物名稱 (如: 甜玉米)" value={crop} onChange={e=>setCrop(e.target.value)} className="flex-1 p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-400" />
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="p-3 bg-gray-50 border rounded-xl outline-none" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {activities.map(act => (
              <button key={act} onClick={()=>handleWorkRecord(act)} className="p-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white transition font-medium text-sm flex items-center justify-center gap-2">
                <CheckCircle2 size={14}/> {act}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workRecords.map(w => (
            <div key={w.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-gray-400">{w.date}</span>
                <button onClick={()=>deleteDoc(doc(db, "workRecords", w.id))} className="text-gray-300 hover:text-rose-500"><Trash2 size={16}/></button>
              </div>
              <p className="font-bold text-gray-800">{w.crop}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-xs font-bold">{w.activity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 4. 財務收支視圖
  const FinanceView = () => {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [type, setType] = useState('income');
    const [category, setCategory] = useState('民宿收入');

    const handleTransaction = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, "transactions"), {
        amount, note, type, category, 
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date()
      });
      setMessage({ type: 'success', text: '收支紀錄已儲存' });
      setAmount(''); setNote('');
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Wallet className="text-amber-500" size={20}/> 銷貨與支出登錄
          </h3>
          <form onSubmit={handleTransaction} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-500 mb-1">類型</label>
              <select value={type} onChange={e=>setType(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg">
                <option value="income">收入 (+)</option>
                <option value="expense">支出 (-)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">分類</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg">
                <option>民宿收入</option>
                <option>農產品銷貨</option>
                <option>體驗門票</option>
                <option>資材購買</option>
                <option>水電維護</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">金額</label>
              <input required type="number" placeholder="金額" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm text-gray-500 mb-1">備註</label>
              <input placeholder="摘要" value={note} onChange={e=>setNote(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <button type="submit" className="bg-gray-800 text-white p-2 rounded-lg hover:bg-black transition font-medium">記錄</button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="p-4">日期</th>
                <th className="p-4">分類/備註</th>
                <th className="p-4 text-right">金額</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="p-4 text-sm text-gray-400">{t.date}</td>
                  <td className="p-4">
                    <p className="font-medium">{t.category}</p>
                    <p className="text-xs text-gray-400">{t.note || '-'}</p>
                  </td>
                  <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={()=>deleteDoc(doc(db, "transactions", t.id))} className="text-gray-300 hover:text-rose-500"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- 頁面結構渲染 ---

  // 載入遮罩
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-emerald-600 font-bold animate-pulse text-lg">系統載入中，請稍候...</p>
      </div>
    );
  }

  // 登入頁面
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-emerald-50 rounded-2xl text-emerald-600 mb-4">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-800">綠色大地農場</h1>
            <p className="text-gray-400">請輸入管理密碼以存取系統</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="輸入密碼 (預設: 1234)" 
              value={password}
              onChange={e=>setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-emerald-400 transition"
            />
            <button className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
              登入管理系統
            </button>
          </form>
          {message && (
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${message.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
              <AlertCircle size={18}/> {message.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 主介面
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
      {/* 側邊導航 */}
      <nav className="w-full md:w-64 bg-white border-r border-gray-100 p-6 flex flex-col shadow-sm">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="p-2 bg-emerald-600 rounded-lg text-white"><Sprout size={20}/></div>
          <h1 className="font-black text-xl text-gray-800 tracking-tight">綠色大地</h1>
        </div>
        
        <div className="flex-1 space-y-2">
          <NavBtn active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="營運總覽" />
          <NavBtn active={activeTab==='booking'} onClick={()=>setActiveTab('booking')} icon={<BedDouble size={20}/>} label="民宿訂房" />
          <NavBtn active={activeTab==='work'} onClick={()=>setActiveTab('work')} icon={<Sprout size={20}/>} label="工作紀錄" />
          <NavBtn active={activeTab==='finance'} onClick={()=>setActiveTab('finance')} icon={<Wallet size={20}/>} label="財務收支" />
        </div>

        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 p-3 text-gray-400 hover:text-rose-500 transition font-medium">
          <LogOut size={20}/> 登出系統
        </button>
      </nav>

      {/* 內容區塊 */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto">
        {/* 手機版頂欄 */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <h1 className="font-bold text-gray-800">農場管理</h1>
          <button onClick={handleLogout} className="text-gray-400"><LogOut size={20}/></button>
        </div>

        {/* 動態顯示視圖 */}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'booking' && <BookingView />}
        {activeTab === 'work' && <FarmWorkView />}
        {activeTab === 'finance' && <FinanceView />}

        {/* 浮動訊息 */}
        {message && (
          <div className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-up z-50 ${message.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'}`}>
            {message.type === 'error' ? <AlertCircle /> : <CheckCircle2 />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}

// 輔助組件
function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-bold ${active ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
      {icon} {label}
    </button>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${color} flex items-center justify-between`}>
      <div>
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
      <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
    </div>
  );
}
