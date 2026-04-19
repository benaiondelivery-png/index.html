import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCl-U9X9qxohjDpgr8y2pdkS3j-qNm19pk",
  authDomain: "benaion-delivery.firebaseapp.com",
  projectId: "benaion-delivery",
  storageBucket: "benaion-delivery.firebasestorage.app",
  messagingSenderId: "309927409217",
  appId: "1:309927409217:web:7a105cb5237b2294b1b8c0",
  measurementId: "G-TK1KNW14WH"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const API = {
  async createUser(data) {
    try {
      const docRef = await addDoc(collection(db, "users"), {
        ...data,
        created_at: new Date().toISOString()
      });
      return { id: docRef.id, ...data };
    } catch (e) {
      console.error("Erro no Firestore (createUser):", e);
      throw new Error("Erro ao salvar no banco de dados.");
    }
  },
  async getUserByEmail(email) {
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    } catch (e) {
      console.error("Erro no Firestore (getUserByEmail):", e);
      throw new Error("Erro ao consultar usuário.");
    }
  }
};

const Auth = {
  async loginWithEmail(email, password) {
    const user = await API.getUserByEmail(email);
    if (!user || user.password !== password) throw new Error('E-mail ou senha incorretos');
    localStorage.setItem('benaion_user', JSON.stringify(user));
    return user;
  },
  async register(data) {
    // Verificação básica antes de enviar ao Firebase
    if (!data.email || !data.password) throw new Error("Dados incompletos");
    
    const user = await API.createUser(data);
    localStorage.setItem('benaion_user', JSON.stringify(user));
    return user;
  },
  redirectToDashboard() {
    const user = JSON.parse(localStorage.getItem('benaion_user'));
    if (user && user.userType) {
      window.location.href = `${user.userType}.html`; 
    } else {
      window.location.href = 'index.html';
    }
  },
  // Adicionei isso para ajudar o index.html a saber quem está logado
  getCurrentUser() {
    return JSON.parse(localStorage.getItem('benaion_user'));
  }
};

// GARANTIA DE EXPOSIÇÃO GLOBAL
window.API = API;
window.Auth = Auth;

console.log("Benaion API carregada com sucesso!");
