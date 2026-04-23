import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCl-U9X9qxohjDpgr8y2pdkS3j-qNm19pk",
  authDomain: "benaion-delivery.firebaseapp.com",
  projectId: "benaion-delivery",
  storageBucket: "benaion-delivery.firebasestorage.app",
  messagingSenderId: "309927409217",
  appId: "1:309927409217:web:7a105cb5237b2294b1b8c0",
  measurementId: "G-TK1KNW14WH"
};

// --- INICIALIZAÇÃO ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --- SISTEMA DE TAXAS DINÂMICAS ---
let TABELA_TAXAS_DINAMICA = {};

// Escuta as taxas do banco em tempo real (Você muda no Admin, atualiza aqui)
onSnapshot(doc(db, "configuracoes", "taxas"), (doc) => {
  if (doc.exists()) {
    TABELA_TAXAS_DINAMICA = doc.data();
    console.log("📍 Taxas Benaion Atualizadas:", TABELA_TAXAS_DINAMICA);
  }
});

// --- NÚCLEO API ---
const API = {
  // Cálculo flexível usando a tabela do banco
  calcularTaxa(bairroRetirada, bairroEntrega, adicionais = 0) {
    const baseMinima = TABELA_TAXAS_DINAMICA["config_minima"] || 5;
    const taxaRet = TABELA_TAXAS_DINAMICA[bairroRetirada] || baseMinima;
    const taxaEnt = TABELA_TAXAS_DINAMICA[bairroEntrega] || baseMinima;
    
    const diferenca = taxaEnt - baseMinima;
    return taxaRet + (diferenca > 0 ? diferenca : 0) + adicionais;
  },

  async getUserProfile(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async updateTaxas(novaTabela) {
    await setDoc(doc(db, "configuracoes", "taxas"), novaTabela, { merge: true });
  },

  // Monitorar pedidos em tempo real (Usado no Admin e Parceiro)
  escutarTodosPedidos(callback) {
    const q = query(collection(db, "pedidos"));
    return onSnapshot(q, (snapshot) => {
      const pedidos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(pedidos);
    });
  }
};

// --- NÚCLEO DE AUTENTICAÇÃO ---
const Auth = {
  async loginWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await API.getUserProfile(userCredential.user.uid);
      localStorage.setItem('benaion_user', JSON.stringify(profile));
      return profile;
    } catch (error) {
      throw new Error("E-mail ou senha inválidos.");
    }
  },

  async register(data) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const uid = userCredential.user.uid;
      const profile = {
        name: data.name,
        email: data.email,
        userType: data.userType,
        storeName: data.storeName || null,
        created_at: new Date().toISOString()
      };
      await setDoc(doc(db, "users", uid), profile);
      localStorage.setItem('benaion_user', JSON.stringify({ id: uid, ...profile }));
      return { id: uid, ...profile };
    } catch (error) { throw error; }
  },

  logout() {
    auth.signOut();
    localStorage.removeItem('benaion_user');
    window.location.href = 'index.html';
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('benaion_user'));
  },

  requireAuth(allowedTypes = []) {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return false;
    }
    if (allowedTypes.length > 0 && !allowedTypes.includes(user.userType)) {
      window.location.href = `${user.userType}.html`;
      return false;
    }
    return true;
  }
};

// EXPOSIÇÃO GLOBAL IMEDIATA
window.API = API;
window.Auth = Auth;
window.db = db;

export { db, auth, API, Auth };
