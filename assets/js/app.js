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
let currentChatType = "grupo";
let currentPrivateChatId = null;
let unsubscribePrivateChats = null;
let allUsersCache = [];

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
        listenForMyPrivateChats();
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
    listenForMyPrivateChats();

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
    if (currentChatType === "privado" && currentPrivateChatId) {
      const chatRef = db.collection("chats_privados").doc(currentPrivateChatId);

      await chatRef.collection("mensajes").add({
        uid: currentUser,
        name: safeName,
        photo: photoURL || defaultAvatar,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await chatRef.update({
        ultimoMensaje: text,
        ultimaActividad: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await db.collection("mensajes").add({
        uid: currentUser,
        career: userCareer,
        name: safeName,
        photo: photoURL || defaultAvatar,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    messageInput.value = "";
    sendBtn.disabled = true;
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
  }
}

 function renderMessageBubble(msg) {
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
        if (msg.text) messagesList.push(msg);
      });

      messagesList.sort((a, b) => {
        let timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        let timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });

      messagesList.forEach(renderMessageBubble);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

function listenForPrivateMessages(chatId) {
  // 1. IMPORTANTE: Cancelar la escucha del chat anterior (o del grupo)
  if (unsubscribeMessages) unsubscribeMessages();

  // 2. Escuchar la subcolección del chat privado actual
  unsubscribeMessages = db.collection("chats_privados")
    .doc(chatId)
    .collection("mensajes")
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = "";

      let messagesList = [];
      snapshot.forEach(doc => {
        const msg = doc.data();
        if (msg.text) messagesList.push(msg);
      });

      // Ordenar por fecha en JS de forma segura
      messagesList.sort((a, b) => {
        let timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
        let timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
        return timeA - timeB;
      });

      // Renderizar mensajes
      messagesList.forEach(renderMessageBubble);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, error => {
      console.error("Error al escuchar mensajes privados:", error);
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

async function uploadStatus() {
  const textInput = document.getElementById("status-text-input");
  const fileInput = document.getElementById("status-file-input");
  const preview = document.getElementById("image-preview");
  const text = textInput.value.trim();
  const hasImage = fileInput.files.length > 0;

  if (text === "" && !hasImage) {
    alert("Escribe algo o selecciona una imagen para tu estado.");
    return;
  }

  if (!currentUser || !displayName) {
    console.error("Usuario no autenticado");
    return;
  }

  const ahora = Date.now();
  const expiracion = ahora + (24 * 60 * 60 * 1000); // 24 horas

  try {
    await db.collection("estados").add({
      usuario_id: displayName,
      uid: currentUser,
      texto: text,
      imagen_url: hasImage ? preview.src : null, // Si da error por tamaño, habrá que usar Firebase Storage
      creado_en: ahora,
      expira_en: expiracion
    });

    // Limpiar inputs al terminar
    textInput.value = "";
    fileInput.value = "";
    if (preview) preview.src = "";

    closeStatusCreator();
  } catch (error) {
    console.error("Error al subir el estado:", error);
    alert("Hubo un error al publicar tu estado.");
  }
}

function listenForEstados() {
  if (typeof unsubscribeEstados === "function") {
    unsubscribeEstados();
  }

  const ahora = Date.now();

  // Quitamos .orderBy("expira_en") para evitar el error de índice en Firestore
  unsubscribeEstados = db.collection("estados")
    .where("expira_en", ">", ahora)
    .onSnapshot(snapshot => {
      const list = document.getElementById("estados-list");
      if (!list) return;

      list.innerHTML = "";

      let estados = [];
      snapshot.forEach(doc => {
        estados.push({ id_documento: doc.id, ...doc.data() });
      });

      // Ordenar: los más recientes primero
      estados.sort((a, b) => b.creado_en - a.creado_en);

      // Renderizar
      estados.forEach(renderEstado);
    }, error => {
      console.error("Error escuchando estados:", error);
    });
}

listenForEstados();

function renderEstado(estado) {
  const list = document.getElementById("estados-list");
  if (!list) return; // Validación por si no existe el contenedor en la página

  const card = document.createElement("div");
  card.className = "community-card";
  card.dataset.name = (estado.usuario_id || "").toLowerCase();

  // 1. Agregamos comillas invertidas `` al HTML principal
  let html = `<strong>${estado.usuario_id || "Usuario"}</strong><p>${estado.texto || ""}</p>`;

  // 2. Agregamos comillas invertidas `` al fragmento de la imagen
  if (estado.imagen_url) {
    html += `<img src="${estado.imagen_url}" style="width:100%; border-radius:10px; margin-top:8px; max-height:200px; object-fit:cover;">`;
  }

  card.innerHTML = html;
  list.appendChild(card);
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

function openNewChatPanel() {
  const panel = document.getElementById("new-chat-panel");
  if (!panel) return;
  
  panel.classList.remove("hidden-init"); // Se muestra el panel
  loadUsersList(); // Cargar la lista de usuarios si es necesario
}

function closeNewChatPanel() {
  const panel = document.getElementById("new-chat-panel");
  if (!panel) return;

  panel.classList.add("hidden-init"); // Se oculta el panel
}

function listenForMyPrivateChats() {
  if (unsubscribePrivateChats) unsubscribePrivateChats();

  unsubscribePrivateChats = db.collection("chats_privados")
    .where("participantes", "array-contains", currentUser)
    .onSnapshot(snapshot => {
      const list = document.getElementById("private-chats-list");
      list.innerHTML = "";

      let chats = [];
      snapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));

      chats.sort((a, b) => {
        const ta = a.ultimaActividad?.toMillis ? a.ultimaActividad.toMillis() : 0;
        const tb = b.ultimaActividad?.toMillis ? b.ultimaActividad.toMillis() : 0;
        return tb - ta;
      });

      chats.forEach(chat => {
        const otherUid = chat.participantes.find(uid => uid !== currentUser);
        const otherInfo = chat.participantesInfo?.[otherUid] || { name: "Usuario", photo: defaultAvatar };

        const item = document.createElement("div");
        item.className = "wa-chat-list-item";
        item.innerHTML = `
          <img src="${otherInfo.photo || defaultAvatar}" alt="${otherInfo.name}">
          <div class="wa-chat-list-info">
            <strong>${otherInfo.name}</strong>
            <span>${chat.ultimoMensaje || "Di hola 👋"}</span>
          </div>
        `;
        item.addEventListener("click", () => openPrivateChat(chat.id, otherInfo));
        list.appendChild(item);
      });
    });
}

function loadUsersList() {
  const usersListDiv = document.getElementById("users-list");
  if (!usersListDiv) return;

  usersListDiv.innerHTML = "<p style='padding:15px; color:#888;'>Cargando usuarios...</p>";

  db.collection("usuarios").onSnapshot(snapshot => {
    usersListDiv.innerHTML = ""; // Limpiar mensaje de carga

    snapshot.forEach(doc => {
      const userData = doc.data();
      const uid = doc.id; // O userData.uid

      // Ignorar a tu propio usuario para no darte chat privado a ti mismo
      if (uid === currentUser) return;

      const userItem = document.createElement("div");
      userItem.className = "wa-chat-list-item";
      userItem.innerHTML = `
        <img src="${userData.photo || defaultAvatar}" alt="${userData.name}">
        <div class="wa-chat-list-info">
          <strong>${userData.name || "Usuario"}</strong>
          <span>${userData.career || "Estudiante"}</span>
        </div>
      `;

      // Al hacer clic, iniciar o abrir el chat privado con esta persona
      userItem.addEventListener("click", () => {
        startOrOpenPrivateChat(uid, userData);
      });

      usersListDiv.appendChild(userItem);
    });

    if (usersListDiv.children.length === 0) {
      usersListDiv.innerHTML = "<p style='padding:15px; color:#888;'>No hay otros usuarios registrados aún.</p>";
    }
  }, error => {
    console.error("Error al cargar usuarios:", error);
  });
}

async function startOrOpenPrivateChat(otherUid, otherData) {
  try {
    // Generar un ID único predecible uniendo los dos UIDs en orden alfabético
    // Esto evita duplicar salas para el mismo par de usuarios
    const chatId = [currentUser, otherUid].sort().join("_");
    const chatRef = db.collection("chats_privados").doc(chatId);
    const chatDoc = await chatRef.get();

    // Si el chat aún no existe en Firestore, lo creamos
    if (!chatDoc.exists) {
      await chatRef.set({
        participantes: [currentUser, otherUid],
        participantesInfo: {
          [currentUser]: {
            name: displayName,
            photo: photoURL || defaultAvatar
          },
          [otherUid]: {
            name: otherData.name || "Usuario",
            photo: otherData.photo || defaultAvatar
          }
        },
        ultimoMensaje: "Chat iniciado",
        ultimaActividad: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    // Cerramos el panel de "Nuevo Chat"
    closeNewChatPanel();

    // Abrimos el chat privado recién creado/encontrado
    openPrivateChat(chatId, {
      name: otherData.name || "Usuario",
      photo: otherData.photo || defaultAvatar
    });

  } catch (error) {
    console.error("Error al iniciar chat privado:", error);
  }
}

function openPrivateChat(chatId, otherInfo) {
  // 1. Cambiamos las variables de control global
  currentChatType = "privado";
  currentPrivateChatId = chatId;

  // 2. Elementos del DOM de la cabecera
  const headerAvatar = document.querySelector(".wa-header-avatar");
  const headerTitle = document.getElementById("chat-room-title");
  const headerStatus = document.querySelector(".wa-header-status");

  // 3. Inyectamos los datos específicos del usuario seleccionado
  if (headerAvatar) headerAvatar.src = otherInfo.photo || defaultAvatar;
  if (headerTitle) headerTitle.textContent = otherInfo.name || "Usuario";
  if (headerStatus) headerStatus.textContent = otherInfo.career ? `Carrera: ${otherInfo.career}` : "Chat Privado";

  // 4. Cerramos el panel de "Nuevo Chat" deslizante para ver la conversación
  closeNewChatPanel();

  // 5. Cargar los mensajes específicos de este chatId desde Firestore
  listenForPrivateMessages(chatId);
}

function openGroupChat() {
  // 1. Cambiar el estado global del chat
  currentChatType = "grupo";
  currentPrivateChatId = null;

  // 2. Restaurar la cabecera del grupo
  const headerAvatar = document.querySelector(".wa-header-avatar");
  const headerTitle = document.getElementById("chat-room-title");
  const headerStatus = document.querySelector(".wa-header-status");

  if (headerAvatar) headerAvatar.src = "assets/img/foto de perfil del grupo.jpeg";
  if (headerTitle) headerTitle.textContent = "Chat de Carrera";
  if (headerStatus) headerStatus.textContent = "Activo en INTEC";

  // 3. Marcar activo el item del grupo
  document.querySelectorAll(".wa-chat-list-item").forEach(item => item.classList.remove("active"));
  const groupItem = document.getElementById("group-chat-item");
  if (groupItem) groupItem.classList.add("active");

  // 4. Volver a escuchar los mensajes globales/de carrera
  listenForMessages();
}