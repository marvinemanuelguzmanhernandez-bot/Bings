const firebaseConfig = {
  apiKey: "AIzaSyCUV_dIOyzJb9LYq3lFQnSBctbSidc_0Go",
  authDomain: "bings-61532.firebaseapp.com",
  projectId: "bings-61532",
  storageBucket: "bings-61532.firebasestorage.app",
  messagingSenderId: "102563196836",
  appId: "1:102563196836:web:878c7c32a51179a9365b31",
  measurementId: "G-FSXZGZDS7D"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const confirmPasswordInput = document.getElementById("confirm-password-input");
const confirmPasswordGroup = document.getElementById("confirm-password-group");
const startChatBtn = document.getElementById("start-chat-btn");
const toggleLink = document.getElementById("toggle-link");
const formTitle = document.getElementById("form-title");

let isRegistering = false;

// Alternar entre modo Iniciar Sesión y Registro (Versión corregida)
function actualizarModoAuth(e) {
  if (e) e.preventDefault();
  isRegistering = !isRegistering;
  
  if (isRegistering) {
    formTitle.innerText = "Registrarse";
    startChatBtn.innerText = "Crear Cuenta";
    confirmPasswordGroup.style.display = "block";
    document.getElementById("toggle-message").innerHTML = '¿Ya tienes cuenta? <a href="#" id="toggle-link">Inicia sesión</a>';
  } else {
    formTitle.innerText = "Iniciar sesión";
    startChatBtn.innerText = "Iniciar Sesión";
    confirmPasswordGroup.style.display = "none";
    document.getElementById("toggle-message").innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-link">Regístrate</a>';
  }
  
  // Re-asignar el evento al nuevo enlace generado dinámicamente de forma limpia
  document.getElementById("toggle-link").addEventListener("click", actualizarModoAuth);
}

// Asignar el evento inicial al enlace de registro/login
document.getElementById("toggle-link").addEventListener("click", actualizarModoAuth);

// Validación en tiempo real
function checkFormReady() {
  const emailValid = emailInput.value.trim() !== "";
  const passValid = passwordInput.value.trim().length >= 6;
  const matchValid = isRegistering ? (passwordInput.value === confirmPasswordInput.value) : true;
  startChatBtn.disabled = !(emailValid && passValid && matchValid);
}

[emailInput, passwordInput, confirmPasswordInput].forEach(el => el.addEventListener("input", checkFormReady));

// Autenticación
startChatBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  try {
    if (isRegistering) {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    window.location.href = "index.html";
  } catch (error) {
    alert("Error: " + error.message);
  }
});

// Google
document.getElementById("google-login-btn").addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    window.location.href = "index.html";
  } catch (err) { alert(err.message); }
});