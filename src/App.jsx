import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, query, 
  deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

/* Firebase */
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

const rawId = typeof __app_id !== 'undefined' ? __app_id : 'green-land-light-v1';
const appId = rawId.replace(/\//g, '_'); 

/* ✅ 日期安全解析 */
const parseDate = (d) => {
  if (!d) return 0;
  if (typeof d === 'string') return new Date(d).getTime();
  if (d?.seconds) return d.seconds * 1000;
  return 0;
};

/* Icon（補 home） */
const Icon = ({ name, size = 20, className = "" }) => {
  const icons = {
    dashboard: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" />, // ✅ 修正
    bed: <path d="M2 4v16M2 8h18M2 12h18M2 16h18M22 4v16" />,
    sprout: <path d="M7 20h10M12 20V10M12 10a4 4 0 0 1 4-4M12 10a4 4 0 0 0-4-4" />,
    wallet: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    calendar: <rect x="3" y="4" width="18" height="18" rx="2" />,
    user: <circle cx="12" cy="7" r="4" />,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
    trendingUp: <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />,
    loading: <path d="M12 2v4m0 12v4" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {icons[name]}
    </svg>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const [bookings, setBookings] = useState([]);

  const getColl = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
  const getDocRef = (coll, id) => doc(db, 'artifacts', appId, 'public', 'data', coll, id);

  /* ✅ 正確 loading */
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch {}
    };

    initAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  /* ✅ Firestore */
  useEffect(() => {
    if (!userRole) return;

    const unsub = onSnapshot(getColl("bookings"), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings(data.sort((a, b) => parseDate(b.date) - parseDate(a.date)));
    });

    return () => unsub();
  }, [userRole, user]);

  /* ✅ 刪除 */
  const handleDelete = async (id) => {
    try {
      await deleteDoc(getDocRef("bookings", id));
      setMessage({ type: 'success', text: '刪除成功' });
    } catch {
      setMessage({ type: 'error', text: '刪除失敗' });
    }
  };

  /* ✅ admin 密碼 */
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "1234";

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setUserRole('admin');
    } else {
      setMessage({ type: 'error', text: '驗證失敗' });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  if (!userRole) {
    return (
      <div>
        <button onClick={()=>setUserRole('visitor')}>訪客</button>
        <form onSubmit={handleLogin}>
          <input type="password" onChange={e=>setPassword(e.target.value)} />
          <button>登入</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1>預約系統</h1>

      {bookings.map(b => (
        <div key={b.id}>
          {b.guestName} - {b.date}
          <button onClick={() => handleDelete(b.id)}>刪除</button>
        </div>
      ))}

      {message && <p>{message.text}</p>}
    </div>
  );
}
