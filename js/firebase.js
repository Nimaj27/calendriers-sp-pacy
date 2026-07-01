// ============================================================
// firebase.js — Configuration et initialisation Firebase
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCj7etN5gV8CckkOBiFaKn38D_onZCIE2A",
  authDomain:        "calendrier-pacy.firebaseapp.com",
  projectId:         "calendrier-pacy",
  storageBucket:     "calendrier-pacy.firebasestorage.app",
  messagingSenderId: "767402684897",
  appId:             "1:767402684897:web:134c456b1de29b2dace2a0"
};

// Import Firebase SDK v12.15.0 modulaire via CDN ESM
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  enableNetwork,
  disableNetwork
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

// Init
const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Firestore avec cache persistant IndexedDB (mode hors-ligne)
// Single-tab manager : plus robuste sur mobile que multi-tab
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: false })
    })
  });
} catch (e) {
  console.warn("Persistence hors-ligne indisponible, fallback mémoire :", e?.message || e);
  db = getFirestore(app);
}

// ── Collections ──────────────────────────────────────────────
const COLLECTIONS = {
  CONFIG:   "config",
  EQUIPES:  "equipes",
  SECTEURS: "secteurs",
  PASSAGES: "passages",
  ADMINS:   "admins"
};

// ── Helpers Firestore ─────────────────────────────────────────
const fsCollection = (name)           => collection(db, name);
const fsDoc        = (path, ...id)    => doc(db, path, ...id);
const fsAdd        = (col, data)      => addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() });
const fsSet        = (col, id, data)  => setDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
const fsUpdate     = (col, id, data)  => updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() });
const fsDelete     = (col, id)        => deleteDoc(doc(db, col, id));
const fsGet        = async (col, id)  => { const s = await getDoc(doc(db, col, id)); return s.exists() ? { id: s.id, ...s.data() } : null; };
const fsGetAll     = async (col)      => { const s = await getDocs(collection(db, col)); return s.docs.map(d => ({ id: d.id, ...d.data() })); };
const fsQuery      = async (col, ...constraints) => {
  const s = await getDocs(query(collection(db, col), ...constraints));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
};
const fsListen     = (col, cb, ...constraints) => {
  const q = constraints.length ? query(collection(db, col), ...constraints) : collection(db, col);
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};
const fsListenDoc  = (col, id, cb) =>
  onSnapshot(doc(db, col, id), snap => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null));

// ── Auth Google ───────────────────────────────────────────────
const loginGoogle      = () => signInWithPopup(auth, googleProvider);
const getLoginRedirect = () => Promise.resolve(null);
const logoutGoogle = () => signOut(auth);
const onAuth       = (cb) => onAuthStateChanged(auth, cb);

// ── Vérification rôle admin ───────────────────────────────────
async function isAdmin(email) {
  if (!email) return false;
  const snap = await getDoc(doc(db, COLLECTIONS.ADMINS, email));
  return snap.exists();
}

// ── Auth PIN équipier ─────────────────────────────────────────
async function loginPin(pin) {
  const equipes = await fsQuery(COLLECTIONS.EQUIPES, where("pin", "==", pin));
  if (equipes.length === 0) return null;
  return equipes[0];
}

// ── État réseau (pour badge hors-ligne dans l'UI) ──────────────
// On combine navigator.onLine (rapide mais imprécis) avec l'état réel
// du flux réseau du navigateur, mis à jour en continu.
const _networkListeners = [];
let _isOnline = navigator.onLine;

window.addEventListener("online",  () => { _isOnline = true;  _networkListeners.forEach(cb => cb(true)); });
window.addEventListener("offline", () => { _isOnline = false; _networkListeners.forEach(cb => cb(false)); });

function isOnline() { return _isOnline; }
function onNetworkChange(cb) {
  _networkListeners.push(cb);
  return () => {
    const idx = _networkListeners.indexOf(cb);
    if (idx > -1) _networkListeners.splice(idx, 1);
  };
}


