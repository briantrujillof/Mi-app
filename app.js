// === INYECCIÓN DINÁMICA DE ONESIGNAL ===
const scriptOneSignal = document.createElement('script');
scriptOneSignal.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
scriptOneSignal.defer = true;
document.head.appendChild(scriptOneSignal);

window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: "5fbec12b-4fff-48ca-8511-ae640dde6ebe",
        serviceWorkerParam: { scope: "/Mi-app/" },
        serviceWorkerPath: "/Mi-app/OneSignalSDKWorker.js",
        notifyButton: { enable: false }
    });
});

// === CONFIGURACIÓN FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyDjvG4ZU0WS4iWwFJ-qIuTNaYwTvfLuKig",
    authDomain: "help-57f3b.firebaseapp.com",
    projectId: "help-57f3b",
    storageBucket: "help-57f3b.firebasestorage.app",
    messagingSenderId: "221467386429",
    appId: "1:221467386429:web:035655afe326e557fcc054"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

db.enablePersistence().catch(err => console.log("Offline cache err:", err));

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/drbiwjcd/image/upload";
const UPLOAD_PRESET = "apuntes_app";

// === ESTADO GLOBAL ===
let currentUser = null;
let isLoginMode = false;
let itemActual = "";
let tituloImagenPendiente = "";
let cropper;
let pendienteEditando = null; 

let touchstartX = 0; let touchstartY = 0; let touchendX = 0; let touchendY = 0;
const vistas = ['universidad', 'ingles', 'pendientes', 'tarjetas'];
let vistaActualIndex = 0;

let cursoActual = "";
let claseActual = "";
let cicloActual = "";
let nivelActual = 0; 

// === INYECCIÓN BOTÓN AÑADIR CLASE ===
window.addEventListener('DOMContentLoaded', () => {
    const flotantesDetalle = document.getElementById('flotantes-detalle');
    if(flotantesDetalle) {
        const btnAddClase = document.createElement('button');
        btnAddClase.className = 'btn-cuadrado azul';
        btnAddClase.id = 'btn-add-clase';
        btnAddClase.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>';
        btnAddClase.onclick = agregarClase;
        btnAddClase.style.display = 'none';
        flotantesDetalle.prepend(btnAddClase);
    }
});

// === ALARMAS EN LA NUBE CON ONESIGNAL ===
function programarNotificacionOneSignal(texto, fecha, hora) {
    if (!currentUser) return;
    const ONESIGNAL_REST_API_KEY = "os_v2_app_l67mck2p75emvbirvzsa3xtox3mg7wgljeoekm46xbnb6ftomtzycyjj3yxfqbjmvuyx3oev7alsqwhfkcmo7jzhx5jo7zdewnjr2ia";
    const sendDate = new Date(`${fecha}T${hora}:00`).toUTCString();

    const payload = {
        app_id: "5fbec12b-4fff-48ca-8511-ae640dde6ebe",
        included_segments: ["Subscribed Users"], 
        headings: { en: "🔔 Recordatorio Académico" },
        contents: { en: texto },
        send_after: sendDate
    };

    fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify(payload)
    })
    .then(() => console.log("Alarma OneSignal programada con éxito."))
    .catch(err => console.error("Error programando notificación:", err));
}

// === CARGA INTELIGENTE Y AUTENTICACIÓN ===
auth.onAuthStateChanged(user => {
    const pantallaCarga = document.getElementById('pantalla-carga');
    const pantallaLogin = document.getElementById('pantalla-login');
    const navPrincipal = document.getElementById('nav-principal');
    const pantallaPrincipal = document.getElementById('pantalla-principal');

    if (user) {
        currentUser = user;
        
        OneSignalDeferred.push(function(OneSignal) {
            OneSignal.login(user.uid);
            OneSignal.Slidedown.promptPush(); 
        });

        db.collection('usuarios').doc(user.uid).get().then(doc => {
            if (doc.exists && Object.keys(doc.data()).length > 0) {
                const data = doc.data();
                // AQUÍ ESTÁ EL ESCUDO: Compara tiempos antes de borrar nada
                const localSync = parseInt(localStorage.getItem('ultimaSync') || '0');
                const nubeSync = parseInt(data['ultimaSync'] || '0');
                
                if (nubeSync >= localSync || localSync === 0) {
                    localStorage.clear();
                    Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
                } else if (localSync > nubeSync) {
                    sincronizarConNube();
                }
            } else {
                sincronizarConNube();
            }
            
            pantallaCarga.style.display = 'none';
            pantallaLogin.style.display = 'none';
            navPrincipal.style.display = 'flex';
            pantallaPrincipal.style.display = 'block';
            
            cargarDatos();
            cargarSaldosTarjetas();
            activarArrastrarYSoltar();
            retrocompatibilidadPendientes(); 
            actualizarControles();
            
        }).catch(err => {
            console.error("Error obteniendo datos:", err);
            pantallaCarga.style.display = 'none';
            alert("Error de conexión con la nube. Intenta de nuevo.");
        });
    } else {
        currentUser = null;
        localStorage.clear(); 
        pantallaCarga.style.display = 'none';
        navPrincipal.style.display = 'none';
        pantallaPrincipal.style.display = 'none';
        document.querySelectorAll('.pantalla, .controles-flotantes, .controles-confirmar').forEach(el => el.style.display = 'none');
        pantallaLogin.style.display = 'flex';
    }
});

function sincronizarConNube() {
    if (!currentUser) return;
    
    // AQUÍ CREAMOS EL SELLO DE TIEMPO para proteger tu información
    const timestamp = new Date().getTime().toString();
    localStorage.setItem('ultimaSync', timestamp);
    
    const dataObj = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        dataObj[key] = localStorage.getItem(key);
    }
    
    db.collection('usuarios').doc(currentUser.uid).set(dataObj)
      .catch(e => console.error("Error sincronizando:", e));
}

function loginConGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        document.getElementById('login-error').innerText = "Error al iniciar con Google.";
        document.getElementById('login-error').style.display = 'block';
    });
}

function toggleLogin() {
    isLoginMode = !isLoginMode;
    document.getElementById('login-titulo').innerText = isLoginMode ? "Bienvenido" : "Crear Cuenta";
    document.getElementById('btn-login-action').innerText = isLoginMode ? "Iniciar Sesión" : "Registrarse";
    document.getElementById('login-toggle-text').innerText = isLoginMode ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?";
    document.querySelector('#login-toggle-text + a').innerText = isLoginMode ? "Regístrate aquí" : "Inicia sesión";
    document.getElementById('login-error').style.display = 'none';
}

function procesarAuth() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const errorEl = document.getElementById('login-error');
    
    if(!email || !pass) { errorEl.innerText = "Llena todos los campos."; errorEl.style.display = 'block'; return; }
    
    document.getElementById('btn-login-action').innerText = "Cargando...";
    errorEl.style.display = 'none';

    if (isLoginMode) {
        auth.signInWithEmailAndPassword(email, pass).catch(err => {
            errorEl.innerText = "Error: Correo o contraseña incorrectos.";
            errorEl.style.display = 'block';
            document.getElementById('btn-login-action').innerText = "Iniciar Sesión";
        });
    } else {
        auth.createUserWithEmailAndPassword(email, pass).catch(err => {
            errorEl.innerText = "Error al registrar. Verifica el formato del correo.";
            errorEl.style.display = 'block';
            document.getElementById('btn-login-action').innerText = "Registrarse";
        });
    }
}

function cerrarSesion() {
    if(confirm("¿Seguro que deseas cerrar sesión? (Tu información está segura en la nube)")) {
        localStorage.clear();
        auth.signOut();
    }
}

// === GESTOS TÁCTILES ===
document.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; touchstartY = e.changedTouches[0].screenY; }, {passive: true});
document.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX; touchendY = e.changedTouches[0].screenY;
    if (currentUser && document.getElementById('pantalla-principal').style.display !== 'none' &&
        document.getElementById('modal-recorte').style.display === 'none' && document.getElementById('modal-texto').style.display === 'none' &&
        document.getElementById('modal-pendiente').style.display === 'none' &&
        !document.querySelector('.modo-eliminar') && !document.querySelector('.modo-editar')) {
        handleSwipe();
    }
}, {passive: true});

function handleSwipe() {
    const diffX = touchendX - touchstartX; const diffY = touchendY - touchstartY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
        if (diffX < 0) { if (vistaActualIndex < vistas.length - 1) cambiarPestana(vistas[vistaActualIndex + 1]); } 
        else { if (vistaActualIndex > 0) cambiarPestana(vistas[vistaActualIndex - 1]); }
    }
}

function cambiarPestana(idPestana) {
    vistaActualIndex = vistas.indexOf(idPestana);
    document.querySelectorAll('.pestana').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('activo'));
    document.getElementById(idPestana).classList.add('activa');
    const botonesNav = document.querySelectorAll('.btn-nav');
    if(botonesNav[vistaActualIndex]) botonesNav[vistaActualIndex].classList.add('activo');
    
    document.querySelectorAll('.lista-estricta, .contenedor-lista').forEach(el => {
        el.classList.remove('modo-eliminar'); el.classList.remove('modo-editar');
        el.querySelectorAll('.casilla-seleccion').forEach(c => c.checked = false);
    });
    actualizarControles();
}

function actualizarControles() {
    document.querySelectorAll('.controles-flotantes, .controles-confirmar').forEach(el => el.style.display = 'none');
    const enDetalle = document.getElementById('pantalla-detalle').style.display === 'block';
    
    if (enDetalle) {
        if (itemActual && itemActual.startsWith('historial_')) return; 
        if (document.getElementById('contenido-detalle').classList.contains('modo-eliminar')) { 
            document.getElementById('confirmar-detalle').style.display = 'flex';
        } else { 
            document.getElementById('flotantes-detalle').style.display = 'flex'; 
            
            const btnAddClase = document.getElementById('btn-add-clase');
            const btnTexto = document.getElementById('flotantes-detalle').children[1];
            const btnImg = document.getElementById('flotantes-detalle').children[2];
            
            if (nivelActual === 1) {
                if(btnAddClase) btnAddClase.style.display = 'flex';
                if(btnTexto) btnTexto.style.display = 'none';
                if(btnImg) btnImg.style.display = 'none';
            } else if (nivelActual === 2) {
                if(btnAddClase) btnAddClase.style.display = 'none';
                if(btnTexto) btnTexto.style.display = 'flex';
                if(btnImg) btnImg.style.display = 'flex';
            }
        }
    } else {
        const pestanaActual = vistas[vistaActualIndex];
        let listaAsociada = '';
        if (pestanaActual === 'universidad') listaAsociada = 'lista-cursos-universidad';
        if (pestanaActual === 'ingles') listaAsociada = 'lista-ciclos-ingles';
        if (pestanaActual === 'pendientes') listaAsociada = 'lista-pendientes';
        
        if (listaAsociada && document.getElementById(listaAsociada).classList.contains('modo-eliminar')) {
            if (document.getElementById(`confirmar-${pestanaActual}`)) document.getElementById(`confirmar-${pestanaActual}`).style.display = 'flex';
        } else if (listaAsociada && document.getElementById(listaAsociada).classList.contains('modo-editar')) {
            if (document.getElementById(`confirmar-editar-${pestanaActual}`)) document.getElementById(`confirmar-editar-${pestanaActual}`).style.display = 'flex';
        } else {
            if (document.getElementById(`flotantes-${pestanaActual}`)) document.getElementById(`flotantes-${pestanaActual}`).style.display = 'flex';
        }
    }
}

function retrocompatibilidadPendientes() {
    document.querySelectorAll('#lista-pendientes .item-lista').forEach(item => {
        if (item.querySelector('.pendiente-info')) return; 
        let oldSpan = item.querySelector('span:not(.pend-texto)');
        if (oldSpan && !oldSpan.classList.contains('titulo-item')) {
            let texto = oldSpan.innerText;
            item.innerHTML = `
                <input type="checkbox" class="casilla-seleccion" onclick="event.stopPropagation()">
                <div class="pendiente-info" onclick="abrirModalPendiente(this.parentElement)">
                    <span class="pend-texto">${texto}</span>
                </div>
            `;
        }
    });
}

function verificarContenidoPrincipal() {
    const listas = ['lista-cursos-universidad', 'lista-ciclos-ingles', 'lista-pendientes'];
    listas.forEach(id => {
        let lista = document.getElementById(id);
        if (!lista) return;
        let msg = lista.querySelector('.vacio-msg-principal');
        let itemsCount = lista.querySelectorAll('.item-lista').length;
        if (itemsCount === 0 && !msg) { lista.innerHTML = '<div class="vacio-msg-principal fade-in-up">Sin contenido por el momento. Usa el botón (+) para agregar.</div>'; } 
        else if (itemsCount > 0 && msg) msg.remove();
    });
}

function verificarContenidoDetalle() {
    if (itemActual && itemActual.startsWith('historial_')) return;
    let contenedor = document.getElementById('contenido-detalle');
    let mensaje = contenedor.querySelector('.vacio-msg');
    let textoVacio = nivelActual === 1 ? 'Clases vacías. Usa el botón (+) inferior.' : 'Apuntes vacíos. Usa los botones inferiores.';
    if (contenedor.children.length === 0 && !mensaje) { 
        contenedor.innerHTML = `<div class="vacio-msg fade-in-up">${textoVacio}</div>`; 
    } 
    else if (contenedor.children.length > 1 && mensaje) { mensaje.remove(); }
}

function activarModoEliminar(pestañaID, listaID) { document.getElementById(listaID).classList.add('modo-eliminar'); actualizarControles(); }
function cancelarModoEliminar(pestañaID, listaID) { document.getElementById(listaID).classList.remove('modo-eliminar'); document.getElementById(listaID).querySelectorAll('.casilla-seleccion').forEach(c => c.checked = false); actualizarControles(); }
function confirmarEliminacion(pestañaID, listaID) {
    let seleccionados = document.getElementById(listaID).querySelectorAll('.casilla-seleccion:checked');
    if (seleccionados.length === 0) { cancelarModoEliminar(pestañaID, listaID); return; }
    seleccionados.forEach(c => { let item = c.closest('.item-lista'); item.classList.remove('fade-in-up'); item.classList.add('fade-out'); setTimeout(() => item.remove(), 290); });
    setTimeout(() => { guardarDatos(); verificarContenidoPrincipal(); cancelarModoEliminar(pestañaID, listaID); }, 300);
}
function borrarSeleccionadosPendientes() {
    let seleccionados = document.getElementById('lista-pendientes').querySelectorAll('.casilla-seleccion:checked');
    if (seleccionados.length > 0 && confirm("¿Eliminar los pendientes seleccionados?")) {
        seleccionados.forEach(c => { 
            let item = c.closest('.item-lista'); 
            item.classList.remove('fade-in-up'); 
            item.classList.add('fade-out'); 
            setTimeout(() => item.remove(), 290); 
        });
        setTimeout(() => { guardarDatos(); verificarContenidoPrincipal(); }, 300);
    }
}

function activarModoEditar(pestañaID, listaID) { document.getElementById(listaID).classList.add('modo-editar'); actualizarControles(); }
function cancelarModoEditar(pestañaID, listaID) { document.getElementById(listaID).classList.remove('modo-editar'); actualizarControles(); }
function confirmarEdicion(pestañaID, listaID) { cancelarModoEditar(pestañaID, listaID); }

function renombrarCursoCiclo(nombreActual, pestanaActual) {
    let nuevoNombre = prompt("Editar nombre:", nombreActual);
    if (nuevoNombre && nuevoNombre.trim() !== "" && nuevoNombre !== nombreActual) {
        nuevoNombre = nuevoNombre.trim();
        let isUniversidad = pestanaActual === 'universidad';

        if (isUniversidad) {
            let data = localStorage.getItem('clases_' + nombreActual);
            if (data) { localStorage.setItem('clases_' + nuevoNombre, data); localStorage.removeItem('clases_' + nombreActual); }
        } else {
            let data = localStorage.getItem('contenido_' + nombreActual);
            if (data) { localStorage.setItem('contenido_' + nuevoNombre, data); localStorage.removeItem('contenido_' + nombreActual); }
        }

        let listaID = isUniversidad ? 'lista-cursos-universidad' : 'lista-ciclos-ingles';
        let spans = document.getElementById(listaID).querySelectorAll('span.titulo-item');
        spans.forEach(span => { 
            if (span.innerText === nombreActual) { 
                span.innerText = nuevoNombre; 
                span.setAttribute('onclick', isUniversidad ? `abrirClases('${nuevoNombre}')` : `abrirApuntes('${nuevoNombre}', 'ciclo')`); 
            } 
        });
        guardarDatos();
    }
}

function abrirModalPendiente(elementoDOM = null) {
    const lista = document.getElementById('lista-pendientes');
    if (lista.classList.contains('modo-eliminar')) return;

    pendienteEditando = elementoDOM;
    document.getElementById('login-error').style.display = 'none';

    if (pendienteEditando) {
        document.getElementById('titulo-modal-pendiente').innerText = "Editar Pendiente";
        document.getElementById('input-pend-texto').value = pendienteEditando.querySelector('.pend-texto').innerText;
        document.getElementById('input-pend-fecha').value = pendienteEditando.getAttribute('data-fecha') || "";
        document.getElementById('input-pend-hora').value = pendienteEditando.getAttribute('data-hora') || "";
    } else {
        document.getElementById('titulo-modal-pendiente').innerText = "Nuevo Pendiente";
        document.getElementById('input-pend-texto').value = "";
        document.getElementById('input-pend-fecha').value = "";
        document.getElementById('input-pend-hora').value = "";
    }
    
    const modal = document.getElementById('modal-pendiente');
    modal.style.display = 'flex'; 
    modal.classList.add('solo-fade-in'); 
    setTimeout(() => modal.classList.remove('solo-fade-in'), 200);
}

function cerrarModalPendiente() {
    document.getElementById('modal-pendiente').style.display = 'none';
    pendienteEditando = null;
}

function guardarPendienteDesdeModal() {
    let texto = document.getElementById('input-pend-texto').value.trim();
    let fecha = document.getElementById('input-pend-fecha').value;
    let hora = document.getElementById('input-pend-hora').value;

    if (!texto) { alert("Debes escribir qué vas a hacer."); return; }

    let badgeHTML = "";
    if (fecha && hora) {
        let arrF = fecha.split('-');
        let fechaLimpia = `${arrF[2]}/${arrF[1]}/${arrF[0]}`;
        badgeHTML = `<span class="badge-fecha">${fechaLimpia} - ${hora}</span>`;
    }

    let innerContent = `
        <input type="checkbox" class="casilla-seleccion" onclick="event.stopPropagation()">
        <div class="pendiente-info" onclick="abrirModalPendiente(this.parentElement)">
            <span class="pend-texto">${texto}</span>
            ${badgeHTML}
        </div>
    `;

    if (pendienteEditando) {
        pendienteEditando.innerHTML = innerContent;
        if(fecha && hora) {
            pendienteEditando.setAttribute('data-fecha', fecha);
            pendienteEditando.setAttribute('data-hora', hora);
            programarNotificacionOneSignal(texto, fecha, hora);
        } else {
            pendienteEditando.removeAttribute('data-fecha');
            pendienteEditando.removeAttribute('data-hora');
        }
    } else {
        let ul = document.getElementById('lista-pendientes');
        if(ul.querySelector('.vacio-msg-principal')) ul.innerHTML = ''; 
        let li = document.createElement('div'); 
        li.className = 'item-lista fade-in-up'; 
        
        if(fecha && hora) {
            li.setAttribute('data-fecha', fecha);
            li.setAttribute('data-hora', hora);
            programarNotificacionOneSignal(texto, fecha, hora);
        }
        
        li.innerHTML = innerContent;
        ul.appendChild(li); 
    }

    guardarDatos();
    verificarContenidoPrincipal();
    cerrarModalPendiente();
}

function agregarCurso() { let n = prompt("Nombre del curso:"); if (n) { agregarItemListaBasico('lista-cursos-universidad', n, 'curso'); guardarDatos(); } }
function agregarCiclo() { let n = prompt("Nombre del ciclo:"); if (n) { agregarItemListaBasico('lista-ciclos-ingles', n, 'ciclo'); guardarDatos(); } }

function agregarItemListaBasico(idLista, nombre, tipo) {
    let ul = document.getElementById(idLista);
    if(ul.querySelector('.vacio-msg-principal')) ul.innerHTML = ''; 
    let li = document.createElement('div'); li.className = 'item-lista fade-in-up'; 
    let func = tipo === 'curso' ? `abrirClases('${nombre}')` : `abrirApuntes('${nombre}', 'ciclo')`;
    li.innerHTML = `<input type="checkbox" class="casilla-seleccion" onclick="event.stopPropagation()"><span class="titulo-item" onclick="${func}" style="cursor:pointer; flex-grow:1;">${nombre}</span>`;
    ul.appendChild(li); verificarContenidoPrincipal();
}

function agregarClase() { 
    let n = prompt("Nombre de la clase (Ej: Clase 1):"); 
    if (n) { 
        let ul = document.getElementById('contenido-detalle');
        if(ul.querySelector('.vacio-msg')) ul.innerHTML = ''; 
        let li = document.createElement('div'); li.className = 'item-lista fade-in-up'; 
        li.innerHTML = `<input type="checkbox" class="casilla-seleccion-detalle" onclick="event.stopPropagation()"><span class="titulo-item" onclick="abrirApuntes('${n}', 'clase')" style="cursor:pointer; flex-grow:1;">${n}</span>`;
        ul.appendChild(li); 
        guardarContenidoDetalle();
        verificarContenidoDetalle();
    } 
}

function abrirClases(nombreCurso) {
    if (document.getElementById('lista-cursos-universidad').classList.contains('modo-editar')) { renombrarCursoCiclo(nombreCurso, 'universidad'); return; }
    if (document.getElementById('lista-cursos-universidad').classList.contains('modo-eliminar')) return;

    cursoActual = nombreCurso;
    nivelActual = 1;
    window.history.pushState({ pantalla: 'clases' }, "", "#clases");
    
    document.getElementById('pantalla-principal').style.display = 'none';
    document.getElementById('nav-principal').style.display = 'none';
    
    let detalle = document.getElementById('pantalla-detalle');
    detalle.style.display = 'block';
    detalle.classList.remove('slide-out');
    detalle.classList.add('slide-in');

    document.getElementById('titulo-detalle').innerText = nombreCurso;
    document.getElementById('contenido-detalle').innerHTML = localStorage.getItem('clases_' + cursoActual) || "";
    
    actualizarControles();
    verificarContenidoDetalle();
}

function abrirApuntes(nombre, tipo) {
    if (tipo === 'ciclo' && document.getElementById('lista-ciclos-ingles').classList.contains('modo-editar')) { renombrarCursoCiclo(nombre, 'ingles'); return; }
    if (tipo === 'ciclo' && document.getElementById('lista-ciclos-ingles').classList.contains('modo-eliminar')) return;
    if (tipo === 'clase' && document.getElementById('contenido-detalle').classList.contains('modo-eliminar')) return;

    nivelActual = 2;
    if (tipo === 'clase') claseActual = nombre;
    if (tipo === 'ciclo') cicloActual = nombre;
    
    window.history.pushState({ pantalla: 'apuntes' }, "", "#apuntes");
    
    document.getElementById('pantalla-principal').style.display = 'none';
    document.getElementById('nav-principal').style.display = 'none';
    
    let detalle = document.getElementById('pantalla-detalle');
    detalle.style.display = 'block';
    detalle.classList.remove('slide-out');
    detalle.classList.add('slide-in');

    document.getElementById('titulo-detalle').innerText = nombre;
    
    let key = tipo === 'clase' ? 'contenido_' + claseActual + '_' + cursoActual : 'contenido_' + cicloActual;
    document.getElementById('contenido-detalle').innerHTML = localStorage.getItem(key) || "";
    
    document.querySelectorAll('#contenido-detalle .bloque-detalle').forEach(bloque => {
        let divContenido = bloque.querySelector('div[style*="width: 100%"]');
        if(divContenido && !divContenido.hasAttribute('onclick')) { divContenido.setAttribute('onclick', 'abrirLectura(this)'); divContenido.style.cursor = 'pointer'; }
    });
    
    actualizarControles();
    verificarContenidoDetalle();
}

function abrirLectura(elemento) {
    if (document.getElementById('contenido-detalle').classList.contains('modo-eliminar')) return;
    let clon = elemento.cloneNode(true);
    clon.removeAttribute('onclick'); clon.style.cursor = 'default';
    let h4 = clon.querySelector('h4');
    let titulo = h4 && h4.innerText.trim() !== '' ? h4.innerText : "Apunte";
    if(h4) h4.remove(); 
    
    window.history.pushState({ pantalla: 'lectura' }, "", "#lectura");
    document.getElementById('pantalla-detalle').style.display = 'none';
    document.querySelectorAll('.controles-flotantes, .controles-confirmar').forEach(el => el.style.display = 'none');
    
    let pantallaLectura = document.getElementById('pantalla-lectura');
    pantallaLectura.style.display = 'block';
    pantallaLectura.classList.remove('slide-out');
    pantallaLectura.classList.add('slide-in');
    
    document.getElementById('titulo-lectura').innerText = titulo;
    document.getElementById('contenido-lectura').innerHTML = '';
    document.getElementById('contenido-lectura').appendChild(clon);
}

window.addEventListener('popstate', function() {
    const hash = window.location.hash;
    const main = document.getElementById('pantalla-principal');
    const nav = document.getElementById('nav-principal');
    const detalle = document.getElementById('pantalla-detalle');
    const lectura = document.getElementById('pantalla-lectura');
    
    if (hash === '#apuntes' || hash === '#detalle') {
        if (lectura.style.display === 'block') {
            lectura.classList.remove('slide-in'); lectura.classList.add('slide-out');
            setTimeout(() => { lectura.style.display = 'none'; detalle.style.display = 'block'; actualizarControles(); }, 290);
        }
    } else if (hash === '#clases') {
        if (lectura.style.display === 'block') { lectura.style.display = 'none'; detalle.style.display = 'block'; }
        
        nivelActual = 1;
        document.getElementById('titulo-detalle').innerText = cursoActual;
        document.getElementById('contenido-detalle').innerHTML = localStorage.getItem('clases_' + cursoActual) || "";
        
        if(document.getElementById('contenido-detalle').classList.contains('modo-eliminar')) {
            document.getElementById('contenido-detalle').classList.remove('modo-eliminar');
            document.getElementById('contenido-detalle').querySelectorAll('.casilla-seleccion-detalle').forEach(c => c.checked = false);
        }
        
        actualizarControles();
        verificarContenidoDetalle();
        
    } else if (hash === '' || hash === '#') {
        if (lectura.style.display === 'block') lectura.style.display = 'none';
        if(document.getElementById('contenido-detalle').classList.contains('modo-eliminar')) {
            document.getElementById('contenido-detalle').classList.remove('modo-eliminar');
            document.getElementById('contenido-detalle').querySelectorAll('.casilla-seleccion-detalle').forEach(c => c.checked = false);
        }
        detalle.classList.remove('slide-in'); detalle.classList.add('slide-out');
        document.querySelectorAll('.controles-flotantes, .controles-confirmar').forEach(el => el.style.display = 'none');
        
        setTimeout(() => {
            detalle.style.display = 'none';
            if(currentUser) { nav.style.display = 'flex'; main.style.display = 'block'; main.classList.add('fade-in-up'); setTimeout(() => main.classList.remove('fade-in-up'), 300); }
            nivelActual = 0; itemActual = ""; actualizarControles(); 
        }, 290);
    }
});

function guardarDatos() {
    localStorage.setItem('universidad', document.getElementById('lista-cursos-universidad').innerHTML);
    localStorage.setItem('ingles', document.getElementById('lista-ciclos-ingles').innerHTML);
    localStorage.setItem('pendientes', document.getElementById('lista-pendientes').innerHTML);
    sincronizarConNube();
}

function cargarDatos() {
    document.getElementById('lista-cursos-universidad').innerHTML = localStorage.getItem('universidad') || "";
    document.getElementById('lista-ciclos-ingles').innerHTML = localStorage.getItem('ingles') || "";
    document.getElementById('lista-pendientes').innerHTML = localStorage.getItem('pendientes') || "";
    
    document.querySelectorAll('#lista-cursos-universidad span.titulo-item').forEach(span => {
        if(span.getAttribute('onclick').includes('abrirDetalle')) {
            let nombre = span.innerText; span.setAttribute('onclick', `abrirClases('${nombre}')`);
        }
    });
    document.querySelectorAll('#lista-ciclos-ingles span.titulo-item').forEach(span => {
        if(span.getAttribute('onclick').includes('abrirDetalle')) {
            let nombre = span.innerText; span.setAttribute('onclick', `abrirApuntes('${nombre}', 'ciclo')`);
        }
    });
    
    verificarContenidoPrincipal();
}

function registrarMovimiento(tipo, monto, desc) {
    let movs = JSON.parse(localStorage.getItem('movs_' + tipo) || '[]');
    let ahora = new Date();
    movs.push({ monto: monto, desc: desc, timestamp: ahora.getTime(), fecha: ahora.toLocaleString() });
    const treintaDiasEnMs = 30 * 24 * 60 * 60 * 1000;
    let movsLimpios = movs.filter(m => (ahora.getTime() - m.timestamp) < treintaDiasEnMs);
    localStorage.setItem('movs_' + tipo, JSON.stringify(movsLimpios));
    sincronizarConNube();
}

function abrirHistorial(tipo) {
    itemActual = "historial_" + tipo;
    window.history.pushState({ pantalla: 'detalle' }, "", "#detalle");
    const main = document.getElementById('pantalla-principal');
    const nav = document.getElementById('nav-principal');
    const detalle = document.getElementById('pantalla-detalle');
    main.style.display = 'none'; nav.style.display = 'none';
    document.querySelectorAll('.controles-flotantes, .controles-confirmar').forEach(el => el.style.display = 'none');

    detalle.style.display = 'block'; detalle.classList.remove('slide-out'); detalle.classList.add('slide-in');
    
    let nombreDisplay = tipo === 'corredor' ? 'Corredor' : 'Tren Eléctrico';
    document.getElementById('titulo-detalle').innerText = "Historial: " + nombreDisplay;
    
    let movimientos = JSON.parse(localStorage.getItem('movs_' + tipo) || '[]');
    const treintaDiasEnMs = 30 * 24 * 60 * 60 * 1000;
    const ahora = new Date().getTime();
    movimientos = movimientos.filter(m => (ahora - m.timestamp) < treintaDiasEnMs);
    localStorage.setItem('movs_' + tipo, JSON.stringify(movimientos));
    sincronizarConNube();

    let html = movimientos.length > 0 ? '' : '<div class="vacio-msg fade-in-up">Sin movimientos recientes.</div>';
    movimientos.reverse().forEach(m => {
        html += `<div class="movimiento-item fade-in-up"><div class="mov-info"><span style="font-weight:600; color:white;">${m.desc}</span><span class="mov-fecha">${m.fecha}</span></div><span class="mov-monto ${m.monto > 0 ? 'color-positivo' : 'color-negativo'}">${m.monto > 0 ? '+' : ''}${m.monto.toFixed(2)}</span></div>`;
    });
    document.getElementById('contenido-detalle').innerHTML = html;
}

function cargarSaldosTarjetas() {
    document.getElementById('saldo-corredor').innerText = parseFloat(localStorage.getItem('saldo_corredor') || 10).toFixed(2);
    document.getElementById('saldo-tren').innerText = parseFloat(localStorage.getItem('saldo_tren') || 5).toFixed(2);
}

function agregarSaldo(tipo) {
    let m = prompt("Monto a recargar:");
    if(m) {
        let monto = parseFloat(m);
        if(!isNaN(monto) && monto > 0) {
            let actual = parseFloat(localStorage.getItem('saldo_'+tipo) || (tipo==='corredor'?10:5));
            localStorage.setItem('saldo_'+tipo, actual + monto);
            registrarMovimiento(tipo, monto, "Recarga de saldo");
            cargarSaldosTarjetas();
        }
    }
}

function descontarPasaje(tipo, costo) {
    let actual = parseFloat(localStorage.getItem('saldo_'+tipo) || (tipo==='corredor'?10:5));
    if(actual >= costo) {
        localStorage.setItem('saldo_'+tipo, (actual - costo).toFixed(2));
        registrarMovimiento(tipo, -costo, "Viaje");
        cargarSaldosTarjetas();
    } else { alert("Saldo insuficiente."); }
}

function activarModoEliminarDetalle() { document.getElementById('contenido-detalle').classList.add('modo-eliminar'); actualizarControles(); }
function cancelarModoEliminarDetalle() { document.getElementById('contenido-detalle').classList.remove('modo-eliminar'); document.getElementById('contenido-detalle').querySelectorAll('.casilla-seleccion-detalle').forEach(c => c.checked = false); actualizarControles(); }
function confirmarEliminacionDetalle() {
    let seleccionados = document.getElementById('contenido-detalle').querySelectorAll('.casilla-seleccion-detalle:checked');
    if (seleccionados.length === 0) { cancelarModoEliminarDetalle(); return; }
    seleccionados.forEach(c => { let bloque = c.closest('.bloque-detalle, .item-lista'); bloque.classList.remove('fade-in-up'); bloque.classList.add('fade-out'); setTimeout(() => bloque.remove(), 290); });
    setTimeout(() => { guardarContenidoDetalle(); verificarContenidoDetalle(); cancelarModoEliminarDetalle(); }, 300);
}

function abrirModalTexto() {
    document.getElementById('input-caja-titulo').value = ""; document.getElementById('input-caja-texto').value = "";
    const modal = document.getElementById('modal-texto');
    modal.style.display = 'flex'; modal.classList.add('solo-fade-in'); setTimeout(() => modal.classList.remove('solo-fade-in'), 200);
}
function cerrarModalTexto() { document.getElementById('modal-texto').style.display = 'none'; }

function guardarTextoDeCaja() {
    let titulo = document.getElementById('input-caja-titulo').value.trim();
    let texto = document.getElementById('input-caja-texto').value.trim();
    if (texto) {
        let contenedor = document.getElementById('contenido-detalle');
        if(contenedor.querySelector('.vacio-msg')) contenedor.innerHTML = '';
        let div = document.createElement('div'); div.className = 'bloque-detalle fade-in-up'; 
        let textoFormateado = texto.replace(/\n/g, '<br>');
        div.innerHTML = `<div style="display: flex; gap:10px; align-items:flex-start;"><input type="checkbox" class="casilla-seleccion-detalle"><div style="width: 100%; cursor: pointer;" onclick="abrirLectura(this)">${titulo ? `<h4>${titulo}</h4>` : '<h4 style="display:none;"></h4>'}<p class="texto-detalle">${textoFormateado}</p></div></div>`;
        contenedor.appendChild(div);
        guardarContenidoDetalle(); cerrarModalTexto(); verificarContenidoDetalle();
    } else { alert("Por favor, ingresa contenido."); }
}

function guardarContenidoDetalle() { 
    let key = "";
    if (nivelActual === 1) key = 'clases_' + cursoActual;
    else if (nivelActual === 2) {
        if (vistas[vistaActualIndex] === 'universidad') key = 'contenido_' + claseActual + '_' + cursoActual;
        else key = 'contenido_' + cicloActual;
    } else if (itemActual && itemActual.startsWith('historial_')) return; 
    
    if(key) {
        localStorage.setItem(key, document.getElementById('contenido-detalle').innerHTML); 
        sincronizarConNube(); 
    }
}

// AQUÍ ESTÁ EL ARREGLO DE LAS IMÁGENES: El prompt solo sale después de elegir archivo
function prepararImagen() { 
    document.getElementById('input-imagen').click(); 
}

function cargarImagen(event) {
    let file = event.target.files[0];
    if(file) {
        tituloImagenPendiente = prompt("Título para este apunte:") || "Apunte"; 
        
        let reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagen-a-recortar').src = e.target.result;
            const modal = document.getElementById('modal-recorte');
            modal.style.display = 'flex'; modal.classList.add('solo-fade-in'); setTimeout(() => modal.classList.remove('solo-fade-in'), 200);
            if(cropper) cropper.destroy();
            cropper = new Cropper(document.getElementById('imagen-a-recortar'), { viewMode: 1 });
        };
        reader.readAsDataURL(file);
    }
    event.target.value = ""; 
}

function cancelarRecorte() { document.getElementById('modal-recorte').style.display = 'none'; if(cropper) { cropper.destroy(); cropper = null; } }

async function confirmarRecorte() {
    if(cropper) {
        document.getElementById('modal-recorte').style.display = 'none';
        let contenedor = document.getElementById('contenido-detalle');
        if(contenedor.querySelector('.vacio-msg')) contenedor.innerHTML = '';
        let canvas = cropper.getCroppedCanvas({ maxWidth: 1000, maxHeight: 1000 });
        let urlImagen = await subirImagenACloudinary(canvas.toDataURL('image/jpeg', 0.7));

        let div = document.createElement('div'); div.className = 'bloque-detalle fade-in-up'; 
        div.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><input type="checkbox" class="casilla-seleccion-detalle"><div style="width: 100%; cursor: pointer;" onclick="abrirLectura(this)">${tituloImagenPendiente ? `<h4>${tituloImagenPendiente}</h4>` : '<h4 style="display:none;"></h4>'}<img src="${urlImagen}" class="imagen-galeria"></div></div>`;
        contenedor.appendChild(div);
        guardarContenidoDetalle(); verificarContenidoDetalle(); cropper.destroy(); cropper = null;
    }
}

async function subirImagenACloudinary(dataUrl) {
    const formData = new FormData();
    formData.append("file", dataUrl); formData.append("upload_preset", UPLOAD_PRESET);
    const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const data = await response.json(); return data.secure_url;
}

function activarArrastrarYSoltar() {
    const opc = { animation: 250, delay: 200, delayOnTouchOnly: true, fallbackTolerance: 5, ghostClass: 'sortable-ghost', dragClass: 'sortable-drag', filter: 'input, button', preventOnFilter: false, onEnd: function() { guardarDatos(); } };
    new Sortable(document.getElementById('lista-cursos-universidad'), opc);
    new Sortable(document.getElementById('lista-ciclos-ingles'), opc);
    new Sortable(document.getElementById('lista-pendientes'), opc);
    new Sortable(document.getElementById('contenido-detalle'), { animation: 250, delay: 200, delayOnTouchOnly: true, fallbackTolerance: 5, ghostClass: 'sortable-ghost', dragClass: 'sortable-drag', filter: 'input', preventOnFilter: false, onEnd: function() { guardarContenidoDetalle(); } });
}