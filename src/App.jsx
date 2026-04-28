import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

/* Firebase */
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const parseDate = (d) => {
  if (!d) return 0;
  if (typeof d === 'string') return new Date(d).getTime();
  if (d?.seconds) return d.seconds * 1000;
  return 0;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('booking');
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getColl = (name) => collection(db, 'artifacts/demo/public/data', name);
  const getDocRef = (coll, id) => doc(db, 'artifacts/demo/public/data', coll, id);

  /* Auth */
  useEffect(() => {
    signInAnonymously(auth);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  /* Firestore */
  useEffect(() => {
    if (!userRole) return;

    const unsub = onSnapshot(getColl("bookings"), (s) => {
      const data = s.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.id); // ✅ 防壞資料

      setBookings(data.sort((a, b) => parseDate(b.date) - parseDate(a.date)));
    });

    return () => unsub();
  }, [userRole]);

  /* delete */
  const handleDelete = async (id) => {
    try {
      await deleteDoc(getDocRef("bookings", id));
    } catch {}
  };

  if (isLoading) return <div>Loading...</div>;

  if (!userRole) {
    return (
      <div>
        <button onClick={() => setUserRole('visitor')}>訪客</button>
        <button onClick={() => setUserRole('admin')}>管理員</button>
      </div>
    );
  }

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('booking')}>預約</button>
        <button onClick={() => setActiveTab('other')}>其他</button>
      </nav>

      {/* ⭐⭐⭐ 這行是關鍵修正 */}
      <main key={activeTab}>
        
        {activeTab === 'booking' && (
          <div>
            {bookings.map(b => (
              <div key={b.id}>
                {b.guestName} - {b.date}
                <button onClick={() => handleDelete(b.id)}>刪除</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'other' && (
          <div>其他頁面</div>
        )}

      </main>
    </div>
  );
}
