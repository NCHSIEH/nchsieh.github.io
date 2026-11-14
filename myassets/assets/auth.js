/* MyAssets：Google 登入＋每位使用者各自的清單（Firestore: myassets_users/{uid}） */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const cfg = {
  apiKey: 'AIzaSyByzButphIQElqo4E_eZ9Y8yEzRHn4zjHY',
  authDomain: 'nchsieh-lms.firebaseapp.com',
  projectId: 'nchsieh-lms',
  storageBucket: 'nchsieh-lms.firebasestorage.app',
  messagingSenderId: '928315004665',
  appId: '1:928315004665:web:f58b30b237f836d7c87428'
};
const app = initializeApp(cfg, 'myassets');
const auth = getAuth(app);
const db = getFirestore(app);
getRedirectResult(auth).catch(() => {});

const ref = () => doc(db, 'myassets_users', auth.currentUser.uid);

window.MAAuth = {
  user: null,
  onChange(cb) { onAuthStateChanged(auth, u => { this.user = u; cb(u); }); },
  async signIn() {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, p); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) await signInWithRedirect(auth, p);
      else if (e.code !== 'auth/popup-closed-by-user') throw e;
    }
  },
  signOut() { return signOut(auth); },
  async load() { const s = await getDoc(ref()); return s.exists() ? s.data() : null; },
  async save(d) {
    await setDoc(ref(), {
      list: d.list || [], hide: d.hide || [], sheetCsv: d.sheetCsv || '',
      email: auth.currentUser.email || '', updatedAt: serverTimestamp()
    });
  }
};
window.dispatchEvent(new Event('maauth-ready'));
