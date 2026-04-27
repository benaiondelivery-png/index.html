import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCl-U9X9qxohjDpgr8y2pdkS3j-qNm19pk",
  authDomain: "benaion-delivery.firebaseapp.com",
  projectId: "benaion-delivery",
  storageBucket: "benaion-delivery.firebasestorage.app",
  messagingSenderId: "309927409217",
  appId: "1:309927409217:web:7a105cb5237b2294b1b8c0",
  measurementId: "G-TK1KNW14WH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Taxas iniciais (serão atualizadas pelo Firestore se houver dados lá)
let TAXAS_LOCAIS = {
  "Agreste": 6, "Nova esperança": 6, "Prosperidade": 6, "Castanheira": 6,
  "Cajari": 7, "Rodovia do gogó": 8, "buritizal": 7, "Sarney": 8,
  "Nazaré mineiro": 10, "centro": 6, "mirilandia": 6, "Rio branco": 7,
  "José cesário": 6, "Malvinas": 8, "samaúma": 15, "monte dourado": 30
};

// Sincronização em tempo real das taxas do banco
onSnapshot(doc(db, "configuracoes", "taxas"), (doc) => {
    if (doc.exists()) {
        TAXAS_LOCAIS = doc.data();
        console.log("✅ Taxas sincronizadas com o Firestore");
    }
});

const API = {
  // Lógica de Taxa Benaion
  calcularTaxa(bairroOrigem, bairroDestino) {
    const TAXA_MINIMA_GERAL = 6;
    if (!bairroOrigem || !bairroDestino) return TAXA_MINIMA_GERAL;
    if (bairroOrigem.toLowerCase() === bairroDestino.toLowerCase()) return TAXA_MINIMA_GERAL;
    
    const taxaRet = TAXAS_LOCAIS[bairroOrigem] || TAXA_MINIMA_GERAL;
    const taxaEnt = TAXAS_LOCAIS[bairroDestino] || TAXA_MINIMA_GERAL;
    return Math.max(taxaRet, taxaEnt);
  },

  async getUserProfile(uid) {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async saveUserToFirestore(uid, userData) {
    await setDoc(doc(db, "users", uid), { ...userData, updated_at: new Date().toISOString() }, { merge: true });
  },

  // FUNÇÕES DE PEDIDOS
  async createPedido(pedidoData) {
    return await addDoc(collection(db, "pedidos"), {
      ...pedidoData,
      status: pedidoData.status || 'aguardando_entregador',
      created_at: new Date().toISOString()
    });
  },

  async updatePedido(id, data) {
    const docRef = doc(db, "pedidos", id);
    return await updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
  },

  async deletePedido(pedidoId) {
    await deleteDoc(doc(db, "pedidos", pedidoId));
  },

  escutarTodosPedidos(callback) {
    return onSnapshot(collection(db, "pedidos"), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  // FUNÇÃO PARA STATUS DO ENTREGADOR (Online/Offline)
  async updateUser(uid, data) {
    const docRef = doc(db, "users", uid);
    return await updateDoc(docRef, data);
  }
};

const Auth = {
  async loginWithGoogle() {
    await signInWithRedirect(auth, googleProvider);
  },

  async handleRedirect() {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        let profile = await API.getUserProfile(result.user.uid);
        if (!profile) {
          profile = { 
            name: result.user.displayName, 
            email: result.user.email, 
            userType: 'cliente', 
            online: false,
            created_at: new Date().toISOString() 
          };
          await API.saveUserToFirestore(result.user.uid, profile);
        }
        localStorage.setItem('benaion_user', JSON.stringify({ id: result.user.uid, ...profile }));
        window.location.href = `${profile.userType}.html`;
      }
    } catch (e) { 
      console.error("Erro no redirect:", e); 
    }
  },

  async recuperarSenha(email) {
    if(!email) return window.Utils.showToast("Digite seu e-mail primeiro", "info");
    try {
        await sendPasswordResetEmail(auth, email);
        window.Utils.showToast("E-mail de recuperação enviado!", "success");
    } catch (e) {
        window.Utils.showToast("Erro ao enviar e-mail", "error");
    }
  },

  async loginWithEmail(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await API.getUserProfile(userCredential.user.uid);
    if (!profile) throw new Error("Perfil não encontrado");
    
    localStorage.setItem('benaion_user', JSON.stringify({ id: userCredential.user.uid, ...profile }));
    window.location.href = `${profile.userType}.html`;
  },

  logout() {
    auth.signOut();
    localStorage.removeItem('benaion_user');
    window.location.href = 'index.html';
  },

  getCurrentUser() { return JSON.parse(localStorage.getItem('benaion_user')); },

  requireAuth(allowedTypes = []) {
    const user = this.getCurrentUser();
    if (!user) { window.location.href = 'index.html'; return false; }
    if (allowedTypes.length > 0 && !allowedTypes.includes(user.userType)) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
  }
};

// Executa o handleRedirect caso o usuário venha do login social
Auth.handleRedirect();

// Exportação global para os outros arquivos .html conseguirem usar as funções
window.API = API;
window.Auth = Auth;
window.auth = auth;
window.db = db;
window.authService = { createUserWithEmailAndPassword, signInWithEmailAndPassword };
