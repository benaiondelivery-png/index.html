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
let TAXAS_LOCAIS = {
  "Agreste": 6, "Nova esperança": 6, "Prosperidade": 6, "Castanheira": 6,
  "Cajari": 7, "Rodovia do gogó": 8, "buritizal": 7, "Sarney": 8,
  "Nazaré mineiro": 10, "centro": 6, "mirilandia": 6, "Rio branco": 7,
  "José cesário": 6, "Malvinas": 8, "samaúma": 15, "monte dourado": 30
};

// Sincroniza taxas com o banco de dados (Para o Admin mudar pelo painel)
function sincronizarTaxas() {
  onSnapshot(doc(db, "configuracoes", "taxas"), (doc) => {
    if (doc.exists()) {
      TAXAS_LOCAIS = doc.data();
      console.log("✅ Taxas Benaion atualizadas via nuvem");
    }
  });
}
sincronizarTaxas();

// --- NÚCLEO API ---
const API = {
  // Lógica de cálculo flexível
  calcularTaxa(bairroRetirada, bairroEntrega, adicionais = 0) {
    const taxaRet = TAXAS_LOCAIS[bairroRetirada] || 6;
    const taxaEnt = TAXAS_LOCAIS[bairroEntrega] || 6;
    
    // Regra: Cobra a maior taxa entre os dois pontos + adicionais
    const maiorTaxa = Math.max(taxaRet, taxaEnt);
    return maiorTaxa + adicionais;
  },

  async getUserProfile(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async saveUserToFirestore(uid, userData) {
    await setDoc(doc(db, "users", uid), {
      ...userData,
      updated_at: new Date().toISOString()
    }, { merge: true });
  },

  // Facilitador para o Admin mudar as taxas
  async atualizarTabelaTaxas(novaTabela) {
    await setDoc(doc(db, "configuracoes", "taxas"), novaTabela);
  },

  // Escuta pedidos em tempo real (Usado no Admin e Parceiro)
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
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      let profile = await API.getUserProfile(user.uid);

      if (!profile) {
        const pendingType = localStorage.getItem('pending_user_type') || 'cliente';
        profile = {
          name: user.displayName,
          email: user.email,
          userType: pendingType,
          photo: user.photoURL,
          created_at: new Date().toISOString()
        };
        await API.saveUserToFirestore(user.uid, profile);
      }

      localStorage.setItem('benaion_user', JSON.stringify({ id: user.uid, ...profile }));
      this.redirectToDashboard();
    } catch (error) { throw error; }
  },

  async loginWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await API.getUserProfile(userCredential.user.uid);
      localStorage.setItem('benaion_user', JSON.stringify({ id: userCredential.user.uid, ...profile }));
      return profile;
    } catch (error) {
      throw new Error("E-mail ou senha inválidos.");
    }
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
      this.redirectToDashboard();
      return false;
    }
    return true;
  },

  redirectToDashboard() {
    const user = this.getCurrentUser();
    if (user) window.location.href = `${user.userType}.html`;
  }
};

// EXPOSIÇÃO GLOBAL (Crucial para funcionar em todos os arquivos)
window.API = API;
window.Auth = Auth;
window.db = db;

console.log("🚀 Benaion API v1.8 - Pronta para Laranjal do Jari");

