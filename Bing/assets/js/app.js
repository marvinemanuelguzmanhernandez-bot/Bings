// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAOaehfWcmCGpayYFbSuVDT4-LMXqQpu8",
  authDomain: "chat-de-ultimo-anio.firebaseapp.com",
  projectId: "chat-de-ultimo-anio",
  storageBucket: "chat-de-ultimo-anio.firebasestorage.app",
  messagingSenderId: "582818641162",
  appId: "1:582818641162:web:2b45e88fc7787bc1adf6f3",
  measurementId: "G-76BDW3L3H"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let displayName = null;
let currentUser = null;
let photoURL = null;
let selectedAvatar = null;
let unsubscribeMessages = null;

const userModal = document.getElementById("user-modal");
const startChatBtn = document.getElementById("start-chat-btn");
const usernameInput = document.getElementById("username-input");
const avatarOptions = document.querySelectorAll(".avatar-option");
const chatContainer = document.getElementById("chat-container");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const logoutBtn = document.getElementById("logout-btn");

const defaultAvatar = "assets/img/Woman free icons designed by Prosymbols Premium.jpeg";

let firebaseReady = false;

// Ver si hay un usuario en el LocalStorage
window.addEventListener("load", () => {
  const savedUser = localStorage.getItem("chatUser");

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user.uid;
      firebaseReady = true;

      if (savedUser) {
        const userData = JSON.parse(savedUser);

        displayName = userData.name;
        photoURL = userData.photo || defaultAvatar;

        userModal.style.display = "none";
        chatContainer.style.display = "flex";
        logoutBtn.style.display = "block";
        sendBtn.disabled = true;

        listenForMessages();
      } else {
        userModal.style.display = "flex";
        chatContainer.style.display = "none";
        logoutBtn.style.display = "none";
      }
    } else {
      currentUser = null;
      firebaseReady = false;

      userModal.style.display = "flex";
      chatContainer.style.display = "none";
      logoutBtn.style.display = "none";
    }
  });
});

// Vamos a habilitar el botón de entrar al chat, solo si hay datos
function checkStartReady() {
  if (usernameInput.value.trim() !== "" && selectedAvatar) {
    startChatBtn.disabled = false;
  } else {
    startChatBtn.disabled = true;
  }
}

// Vamos a detectar la selección de nuestro avatar
avatarOptions.forEach(img => {
  img.addEventListener("click", () => {
    avatarOptions.forEach(i => i.classList.remove("selected"));
    img.classList.add("selected");
    selectedAvatar = img.src;
    checkStartReady();
  });
});

// Vamos detectar el cambio en el input del nombre
usernameInput.addEventListener("input", checkStartReady);

// Al hacer click en entrar al chat, el usuario inicia el chat
startChatBtn.addEventListener("click", async () => {
  displayName = usernameInput.value.trim();
  photoURL = selectedAvatar || defaultAvatar;

  try {
    let user = auth.currentUser;

    if (!user) {
      const result = await auth.signInAnonymously();
      user = result.user;
    }

    currentUser = user.uid;

    // Vamos a guardar la info del usuario en localStorage
    localStorage.setItem("chatUser", JSON.stringify({
      uid: currentUser,
      name: displayName,
      photo: photoURL
    }));

    userModal.style.display = "none";
    chatContainer.style.display = "flex";
    logoutBtn.style.display = "block";
    sendBtn.disabled = true;

    listenForMessages();

  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    alert("No se pudo iniciar el chat. Revisa la configuración de Firebase.");
  }
});

// Aquí vamos a guardar el mensaje en la db / collection de Firestore FB
sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

messageInput.addEventListener("input", () => {
  sendBtn.disabled = messageInput.value.trim() === "";
});

async function sendMessage() {
  const input = document.getElementById("message-input");
  const text = input.value.trim();

  // Aquí se evita guardar mensajes vacíos
  if (text === "") return;

  if (!currentUser || !firebaseReady) return;

  try {
    await db.collection("mensajes").add({
      uid: currentUser,
      name: displayName,
      photo: photoURL || defaultAvatar,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    input.value = "";
    sendBtn.disabled = true;

  } catch (error) {
    console.error("Error al enviar el mensaje:", error);
    alert("No se pudo enviar el mensaje.");
  }
}

// Aquí vamos a ver los mensajes en tiempo real
function listenForMessages() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  unsubscribeMessages = db.collection("mensajes")
    .orderBy("createdAt")
    .onSnapshot(snapshot => {
      const messagesDiv = document.getElementById("messages");
      messagesDiv.innerHTML = "";

      snapshot.forEach(doc => {
        const msg = doc.data();

        if (!msg.text || msg.text.trim() === "") return;

        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message");
        msgDiv.classList.add(msg.uid === currentUser ? "mine" : "other");

        const img = document.createElement("img");
        img.src = msg.photo || defaultAvatar;

        img.onerror = () => {
          img.src = defaultAvatar;
        };

        const contentDiv = document.createElement("div");
        contentDiv.classList.add("message-content");

        const nameNode = document.createElement("div");
        nameNode.classList.add("message-name");
        nameNode.textContent = msg.name || "Anónimo";

        const textNode = document.createElement("div");
        textNode.textContent = msg.text;

        const timeNode = document.createElement("div");
        timeNode.classList.add("timestamp");

        if (msg.createdAt?.toDate) {
          const time = msg.createdAt.toDate();

          timeNode.textContent = time.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          });
        }

        contentDiv.appendChild(nameNode);
        contentDiv.appendChild(textNode);
        contentDiv.appendChild(timeNode);

        msgDiv.appendChild(img);
        msgDiv.appendChild(contentDiv);

        messagesDiv.appendChild(msgDiv);
      });

      // Aquí vamos a dar auto scroll hacia abajo
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

    }, error => {
      console.error("Error cargando mensajes:", error);
    });
}

//funcion para cerrar sesion / remover datos del usuario
async function logoutUser() {
  try {
    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }

    await auth.signOut();

    localStorage.removeItem("chatUser");

    displayName = null;
    currentUser = null;
    photoURL = null;
    selectedAvatar = null;

    usernameInput.value = "";
    messageInput.value = "";

    avatarOptions.forEach(i => {
      i.classList.remove("selected");
    });

    startChatBtn.disabled = true;

    chatContainer.style.display = "none";
    userModal.style.display = "flex";
    logoutBtn.style.display = "none";

  } catch (error) {
    console.error("Error cerrando sesión:", error);
  }
}