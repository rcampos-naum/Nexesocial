// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Tu configuración real que acabas de obtener
export const firebaseConfig = {
    apiKey: "AIzaSyCX_lJY9F5jue5N7wniDFWBes0pL5MY1vI",
    authDomain: "nexesocial-bc6c4.firebaseapp.com",
    projectId: "nexesocial-bc6c4",
    storageBucket: "nexesocial-bc6c4.firebasestorage.app",
    messagingSenderId: "263220578646",
    appId: "1:263220578646:web:95c9537f4f65113ff32ef7",
    measurementId: "G-THBM71FXM7"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas para que index.html y perfil-usuari.html las vean
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Expose globally so plain (non-module) scripts can also use Firebase
window._nexeDB = db;
window._nexeAuth = auth;