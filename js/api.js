import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// --- TABELA DE TAXAS OFICIAL BENAION ---
const TABELA_TAXAS = {
  "Agreste": 5, "Nova esperança": 6, "Prosperidade": 6, "Castanheira": 6,
  "Cajari": 7, "Rodovia do gogó": 7, "buritizal": 7, "Sarney": 8,
  "Nazaré mineiro": 10, "centro": 6, "mirilandia": 6, "Rio branco": 7,
  "José cesário": 6, "Malvinas": 8, "samaúma": 15, "monte dourado": 30
};

export function calcularTaxa(bairroRetirada, bairroEntrega, adicionais = 0) {
  const baseAgreste = 5;
  const taxaRet = TABELA_TAXAS[bairroRetirada] || 7;
  const taxaEnt = TABELA_TAXAS[bairroEntrega] || 7;
  const diferenca = taxaEnt - baseAgreste;
  return taxaRet + (diferenca > 0 ? diferenca : 0) + adicionais;
}

// --- NÚCLEO API ---
const API = {
  // Busca perfil no Firestore pelo ID do Firebase (UID)
  async getUserProfile(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async updateUser(uid, data) {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { ...data, last_update: new Date().toISOString() });
  },

  // Criar ou Atualizar usuário no banco
  async saveUserToFirestore(uid, userData) {
    await setDoc(doc(db, "users", uid), {
      ...userData,
      updated_at: new Date().toISOString()
    }, { merge: true });
  }
};

// --- NÚCLEO DE AUTENTICAÇÃO ---
const Auth = {
  // Login com Google aprimorado
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Busca se já existe perfil
      let profile = await API.getUserProfile(user.uid);

      if (!profile) {
        // Se é novo, salva como cliente por padrão (ou o que estiver no localStorage do registro)
        const pendingType = localStorage.getItem('pending_user_type') || 'cliente';
        profile = {
          name: user.displayName,
          email: user.email,
          userType: pendingType,
          photo: user.photoURL,
          online: false,
          created_at: new Date().toISOString()
        };
        await API.saveUserToFirestore(user.uid, profile);
      }

      localStorage.setItem('benaion_user', JSON.stringify({ id: user.uid, ...profile }));
      this.redirectToDashboard();
    } catch (error) {
      console.error("Erro Google:", error);
      throw error;
    }
  },

  // Cadastro com Email + Senha Real no Firebase Auth
  async register(data) {
    try {
      // 1. Cria o usuário no Firebase Auth (Seguro)
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const uid = userCredential.user.uid;

      // 2. Salva os dados extras no Firestore
      const profile = {
        name: data.name,
        email: data.email,
        userType: data.userType,
        storeName: data.storeName || null,
        online: false,
        created_at: new Date().toISOString()
      };

      await API.saveUserToFirestore(uid, profile);
      localStorage.setItem('benaion_user', JSON.stringify({ id: uid, ...profile }));
      return { id: uid, ...profile };
    } catch (error) {
      console.error("Erro Cadastro:", error);
      throw error;
    }
  },

  // Login com Email Real
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
    if (user) {
      window.location.href = `${user.userType}.html`;
    }
  }
};

// --- MONITOR DE ESTADO DO AUTH ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("🔥 Benaion: Usuário conectado via Firebase");
  } else {
    console.log("❄️ Benaion: Nenhum usuário ativo");
  }
});

// EXPOSIÇÃO GLOBAL
window.API = API;
window.Auth = Auth;
window.db = db; // Útil para debug ou chamadas diretas
console.log("Benaion API v1.6 - Firebase Nativo Ativo!");

