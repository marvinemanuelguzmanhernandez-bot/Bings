// Configuración de Firebase
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
const db = firebase.firestore();

let displayName = null;
let currentUser = null;
let photoURL = null;
let selectedAvatar = null;
let userCareer = null;
let unsubscribeMessages = null;

const userModal = document.getElementById("user-modal");
const startChatBtn = document.getElementById("start-chat-btn");
const usernameInput = document.getElementById("username-input");
const careerSelect = document.getElementById("career-select");
const avatarOptions = document.querySelectorAll(".avatar-option");
const chatContainer = document.getElementById("chat-container");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const logoutBtn = document.getElementById("logout-btn");
const chatRoomTitle = document.getElementById("chat-room-title");

const defaultAvatar = "assets/img/Woman free icons designed by Prosymbols Premium.jpeg";
let firebaseReady = false;

// Verificamos estado en Firebase al cargar
window.addEventListener("load", () => {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user.uid;
      firebaseReady = true;

      try {
        // Consultar si este usuario ya tiene un perfil guardado en Firestore
        const userDoc = await db.collection("usuarios").doc(user.uid).get();

        if (userDoc.exists) {
          // Si ya tiene perfil, cargarlo y entrar directo al chat
          const userData = userDoc.data();
          displayName = userData.name;
          photoURL = userData.photo || defaultAvatar;
          userCareer = userData.career || "Info";

          document.getElementById("p-name").innerText = displayName;
          document.getElementById("p-career").innerText = userCareer;
          chatRoomTitle.innerText = `Chat de Carrera: ${userCareer}`;
          const sidebarNameEl = document.getElementById("sidebar-career-name");
          if (sidebarNameEl) sidebarNameEl.innerText = `Chat de Carrera: ${userCareer}`;

          userModal.style.display = "none";
          chatContainer.style.display = "flex";
          logoutBtn.style.display = "block";
          sendBtn.disabled = true;

          listenForMessages();
        } else {
          // Si no tiene perfil (es nuevo), mostrar el modal para elegir nombre, carrera y avatar
          showLoginModal();
        }
      } catch (error) {
        console.error("Error al verificar perfil:", error);
        showLoginModal();
      }
    } else {
      // Si no hay sesión activa, mandarlo al login
      window.location.href = "login.html";
    }
  });
});

function showLoginModal() {
  userModal.style.display = "flex";
  chatContainer.style.display = "none";
  logoutBtn.style.display = "none";
}

// Validar formulario de entrada del modal
function checkStartReady() {
  if (usernameInput.value.trim() !== "" && careerSelect.value !== "" && selectedAvatar) {
    startChatBtn.disabled = false;
  } else {
    startChatBtn.disabled = true;
  }
}

avatarOptions.forEach(img => {
  img.addEventListener("click", () => {
    avatarOptions.forEach(i => i.classList.remove("selected"));
    img.classList.add("selected");
    selectedAvatar = img.src;
    checkStartReady();
  });
});

usernameInput.addEventListener("input", checkStartReady);
careerSelect.addEventListener("change", checkStartReady);

// Guardar perfil en Firestore al hacer clic en "Entrar al chat"
startChatBtn.addEventListener("click", async () => {
  displayName = usernameInput.value.trim();
  userCareer = careerSelect.value;
  photoURL = selectedAvatar || defaultAvatar;

  if (!currentUser) return;

  try {
    // Guardar los datos permanentemente vinculados al UID del usuario en Firestore
    await db.collection("usuarios").doc(currentUser).set({
      uid: currentUser,
      name: displayName,
      career: userCareer,
      photo: photoURL,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById("p-name").innerText = displayName;
    document.getElementById("p-career").innerText = careerSelect.options[careerSelect.selectedIndex].text;
    chatRoomTitle.innerText = `Chat de Carrera: ${userCareer}`;
    const sidebarNameEl = document.getElementById("sidebar-career-name");
    if (sidebarNameEl) sidebarNameEl.innerText = `Chat de Carrera: ${userCareer}`;

    userModal.style.display = "none";
    chatContainer.style.display = "flex";
    logoutBtn.style.display = "block";
    sendBtn.disabled = true;

    listenForMessages();

  } catch (error) {
    console.error("Error al guardar perfil:", error);
    alert("Hubo un error al guardar tu perfil en la base de datos.");
  }
});

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});
messageInput.addEventListener("input", () => {
  sendBtn.disabled = messageInput.value.trim() === "";
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (text === "" || !currentUser || !firebaseReady) return;

  const safeName = displayName.length > 30 ? displayName.substring(0, 30) : displayName;

  try {
    await db.collection("mensajes").add({
      uid: currentUser,
      career: userCareer, 
      name: safeName,
      photo: photoURL || defaultAvatar,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    messageInput.value = "";
    sendBtn.disabled = true;
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
  }
}

function listenForMessages() {
  if (unsubscribeMessages) unsubscribeMessages();

  unsubscribeMessages = db.collection("mensajes")
    .where("career", "==", userCareer)
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = "";

      let messagesList = [];
      snapshot.forEach(doc => {
        const msg = doc.data();
        if (msg.text) {
          messagesList.push(msg);
        }
      });

      messagesList.sort((a, b) => {
        let timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        let timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });

      messagesList.forEach(msg => {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message");
        msgDiv.classList.add(msg.uid === currentUser ? "mine" : "other");

        const img = document.createElement("img");
        img.src = msg.photo || defaultAvatar;
        img.onerror = () => { img.src = defaultAvatar; };

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
          timeNode.textContent = msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        contentDiv.appendChild(nameNode);
        contentDiv.appendChild(textNode);
        contentDiv.appendChild(timeNode);

        msgDiv.appendChild(img);
        msgDiv.appendChild(contentDiv);
        messagesDiv.appendChild(msgDiv);
      });

      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

function switchView(viewId) {
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');

  // Sincroniza tanto el riel lateral (PC/laptop) como la barra inferior (tablet/celular)
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });
}

// Abre el panel de "Nuevo estado" al estilo WhatsApp.
// En escritorio ya está visible al lado; en móvil/tablet lo desliza a pantalla completa.
function focusStatusCreator() {
  const layout = document.querySelector(".estados-layout");
  if (window.innerWidth <= 800) {
    layout.classList.add("creator-open");
  }
}

// Cierra el panel de creación de estado (botón "<" en móvil) y lo regresa a solo-info.
function closeStatusCreator() {
  document.querySelector(".estados-layout").classList.remove("creator-open");
  resetStatusComposer();
}

// Muestra/oculta el menú tipo WhatsApp (Foto o video / Texto) al tocar el "+" o "Mi estado".
function toggleStatusTypeMenu(event) {
  if (event) event.stopPropagation();
  const popup = document.getElementById("status-type-popup");
  popup.classList.toggle("hidden-init");
}

// Cierra el menú si se hace click fuera de él.
document.addEventListener("click", (e) => {
  const popup = document.getElementById("status-type-popup");
  if (popup && !popup.classList.contains("hidden-init") && !popup.contains(e.target)) {
    popup.classList.add("hidden-init");
  }
});

// El usuario elige "Foto o video" o "Texto" en el menú: pasa el panel derecho
// de solo-info al modo de composición y abre el creador (deslizante en móvil).
function chooseStatusType(type) {
  document.getElementById("status-type-popup").classList.add("hidden-init");
  document.getElementById("status-info-state").classList.add("hidden-init");
  document.getElementById("status-composer").classList.remove("hidden-init");

  focusStatusCreator();

  if (type === "image") {
    document.getElementById("status-file-input").click();
  } else {
    document.getElementById("status-text-input").focus();
  }
}

// Regresa el panel derecho a su estado de solo-info y limpia lo escrito/seleccionado.
function resetStatusComposer() {
  document.getElementById("status-info-state").classList.remove("hidden-init");
  document.getElementById("status-composer").classList.add("hidden-init");
  document.getElementById("status-text-input").value = "";
  removeImagePreview();
}

function handleFileSelected(input) {
  const wrapper = document.getElementById("image-preview-wrapper");
  const preview = document.getElementById("image-preview");

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function () {
      preview.src = reader.result;
      wrapper.classList.remove("hidden-init");
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    wrapper.classList.add("hidden-init");
    preview.src = "";
  }
}

function removeImagePreview() {
  const fileInput = document.getElementById("status-file-input");
  const wrapper = document.getElementById("image-preview-wrapper");
  const preview = document.getElementById("image-preview");
  if (fileInput) fileInput.value = "";
  if (wrapper) wrapper.classList.add("hidden-init");
  if (preview) preview.src = "";
}

function uploadStatus() {
  const textInput = document.getElementById("status-text-input");
  const fileInput = document.getElementById("status-file-input");
  const preview = document.getElementById("image-preview");
  const text = textInput.value.trim();
  const hasImage = fileInput.files.length > 0;

  if (text === "" && !hasImage) {
    alert("Escribe algo o selecciona una imagen para tu estado.");
    return;
  }

  // La imagen ya fue leída como dataURL para la vista previa; la reutilizamos directo.
  appendStatusToList(text, hasImage ? preview.src : null);
  closeStatusCreator();
}

function appendStatusToList(text, imgSrc) {
  const list = document.getElementById("estados-list");
  const card = document.createElement("div");
  card.className = "community-card";
  card.dataset.name = (displayName || "").toLowerCase();

  let htmlContent = `<strong>${displayName}</strong><p>${text || ""}</p>`;
  if (imgSrc) {
    htmlContent += `<img src="${imgSrc}" style="width:100%; border-radius:10px; margin-top:8px; max-height:200px; object-fit:cover;">`;
  }
  card.innerHTML = htmlContent;
  list.prepend(card);
}

// Filtra las tarjetas de "Actualizaciones recientes" por nombre (barra "Buscar estado")
function filterEstados(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll("#estados-list .community-card").forEach(card => {
    const matches = !q || (card.dataset.name || "").includes(q);
    card.style.display = matches ? "" : "none";
  });
}

// Muestra/oculta la barra de búsqueda dentro de la conversación (icono 🔍 del header del chat)
function toggleChatSearch() {
  const bar = document.getElementById("chat-search-bar");
  if (!bar) return;
  bar.classList.toggle("hidden-init");
  if (!bar.classList.contains("hidden-init")) {
    document.getElementById("chat-search-input").focus();
  } else {
    document.getElementById("chat-search-input").value = "";
    filterChatMessages("");
  }
}

// Filtra visualmente los mensajes ya cargados en pantalla por texto (no altera el envío/recepción real)
function filterChatMessages(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll("#messages .message").forEach(msg => {
    const matches = !q || msg.textContent.toLowerCase().includes(q);
    msg.style.display = matches ? "" : "none";
  });
}

async function logoutUser() {
  try {
    if (unsubscribeMessages) unsubscribeMessages();
    await auth.signOut();
    localStorage.removeItem("chatUser");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}