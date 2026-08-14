const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/drbiwjcd/image/upload";
const UPLOAD_PRESET = "apuntes_app";

let itemActual = "";
let tituloImagenPendiente = "";
let cropper;

// === LÓGICA DE SWIPE (Deslizar Pantallas) ===
let touchstartX = 0;
let touchendX = 0;
const vistas = ['universidad', 'ingles', 'pendientes', 'tarjetas'];
let vistaActualIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    activarArrastrarYSoltar();

    // Activar detectores de deslizamiento táctil en la pantalla principal
    const pantallaPrincipal = document.getElementById('pantalla-principal');
    pantallaPrincipal.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
    }, {passive: true});
    
    pantallaPrincipal.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});
});

function handleSwipe() {
    const umbral = 70; // Sensibilidad del swipe
    if (touchendX < touchstartX - umbral) { 
        // Swipe a la Izquierda (Siguiente)
        if (vistaActualIndex < vistas.length - 1) cambiarPestana(vistas[vistaActualIndex + 1]);
    }
    if (touchendX > touchstartX + umbral) { 
        // Swipe a la Derecha (Anterior)
        if (vistaActualIndex > 0) cambiarPestana(vistas[vistaActualIndex - 1]);
    }
}

function cambiarPestana(idPestana) {
    vistaActualIndex = vistas.indexOf(idPestana);
    
    document.querySelectorAll('.pestana').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('activo'));
    
    document.getElementById(idPestana).classList.add('activa');
    const botonesNav = document.querySelectorAll('.btn-nav');
    if(botonesNav[vistaActualIndex]) botonesNav[vistaActualIndex].classList.add('activo');
}

// --- VERIFICAR CONTENIDO VACÍO (Nuevo) ---
function verificarContenidoPrincipal() {
    const listas = ['lista-cursos-universidad', 'lista-ciclos-ingles', 'lista-pendientes', 'lista-tarjetas'];
    listas.forEach(id => {
        let lista = document.getElementById(id);
        if (!lista) return;
        
        let msg = lista.querySelector('.vacio-msg-principal');
        let itemsCount = lista.querySelectorAll('.item-lista').length;

        if (itemsCount === 0 && !msg) {
            lista.innerHTML = '<div class="vacio-msg-principal">Sin contenido por el momento. Usa el botón (+) para agregar.</div>';
        } else if (itemsCount > 0 && msg) {
            msg.remove();
        }
    });
}

// --- NAVEGACIÓN DE CURSOS ---
function abrirDetalle(nombreItem) {
    itemActual = nombreItem;
    window.history.pushState({ pantalla: 'detalle' }, "", "#detalle");
    document.querySelector('.barra-navegacion').style.display = 'none';
    document.getElementById('pantalla-principal').style.display = 'none';
    document.getElementById('pantalla-detalle').style.display = 'block';
    document.getElementById('titulo-detalle').innerText = nombreItem;
    document.getElementById('contenido-detalle').innerHTML = localStorage.getItem('contenido_' + itemActual) || "";
    verificarContenidoDetalle();
}

function cerrarDetalle() { window.history.back(); }

window.addEventListener('popstate', function() {
    if (window.location.hash !== '#detalle') {
        document.querySelector('.barra-navegacion').style.display = 'flex';
        document.getElementById('pantalla-principal').style.display = 'block';
        document.getElementById('pantalla-detalle').style.display = 'none';
        document.getElementById('modal-recorte').style.display = 'none';
        document.getElementById('modal-texto').style.display = 'none';
        if(cropper) { cropper.destroy(); cropper = null; }
    }
});

// --- AGREGAR ITEMS ---
function agregarCurso() {
    let nombre = prompt("Nombre del curso:");
    if (nombre) { agregarItemLista('lista-cursos-universidad', nombre); guardarDatos(); }
}
function agregarCiclo() {
    let nombre = prompt("Nombre del ciclo:");
    if (nombre) { agregarItemLista('lista-ciclos-ingles', nombre); guardarDatos(); }
}
function agregarPendiente() {
    let nombre = prompt("Nuevo pendiente:");
    if (nombre) { agregarItemLista('lista-pendientes', nombre); guardarDatos(); }
}
function agregarTarjeta() {
    let nombre = prompt("Nombre de la tarjeta/pasaje:");
    if (nombre) { agregarItemLista('lista-tarjetas', nombre); guardarDatos(); }
}

function agregarItemLista(idLista, nombre) {
    let ul = document.getElementById(idLista);
    if(ul.querySelector('.vacio-msg-principal')) ul.innerHTML = ''; // Limpiar mensaje si hay

    let li = document.createElement('div');
    li.className = 'item-lista';
    li.innerHTML = `
        <input type="checkbox" class="casilla-seleccion" onclick="event.stopPropagation()">
        <span onclick="abrirDetalle('${nombre}')" style="cursor:pointer; flex-grow:1;">${nombre}</span>
    `;
    ul.appendChild(li);
    verificarContenidoPrincipal();
}

function borrarSeleccionados(idLista) {
    let lista = document.getElementById(idLista);
    let seleccionados = lista.querySelectorAll('.casilla-seleccion:checked');
    
    if (seleccionados.length === 0) return;

    let tipo = "item";
    if (idLista === 'lista-cursos-universidad') tipo = "curso";
    else if (idLista === 'lista-ciclos-ingles') tipo = "ciclo";
    else if (idLista === 'lista-pendientes') tipo = "pendiente";
    else if (idLista === 'lista-tarjetas') tipo = "tarjeta";

    if (confirm(`¿Estás seguro de eliminar este ${tipo}?`)) {
        seleccionados.forEach(c => c.closest('.item-lista').remove());
        guardarDatos();
        verificarContenidoPrincipal();
    }
}

function guardarDatos() {
    localStorage.setItem('universidad', document.getElementById('lista-cursos-universidad').innerHTML);
    localStorage.setItem('ingles', document.getElementById('lista-ciclos-ingles').innerHTML);
    localStorage.setItem('pendientes', document.getElementById('lista-pendientes').innerHTML);
    localStorage.setItem('tarjetas', document.getElementById('lista-tarjetas').innerHTML);
}

function cargarDatos() {
    document.getElementById('lista-cursos-universidad').innerHTML = localStorage.getItem('universidad') || "";
    document.getElementById('lista-ciclos-ingles').innerHTML = localStorage.getItem('ingles') || "";
    document.getElementById('lista-pendientes').innerHTML = localStorage.getItem('pendientes') || "";
    document.getElementById('lista-tarjetas').innerHTML = localStorage.getItem('tarjetas') || "";
    verificarContenidoPrincipal();
}

// --- LÓGICA DE DETALLE Y CAJA DE TEXTO ---
function verificarContenidoDetalle() {
    let contenedor = document.getElementById('contenido-detalle');
    let mensaje = contenedor.querySelector('.vacio-msg');
    if (contenedor.children.length === 0 && !mensaje) {
        contenedor.innerHTML = '<div class="vacio-msg">Apuntes vacíos. Usa los botones T o 🖼️.</div>';
    } else if (contenedor.children.length > 1 && mensaje) {
        mensaje.remove();
    }
}

function abrirModalTexto() {
    document.getElementById('input-caja-texto').value = "";
    document.getElementById('modal-texto').style.display = 'flex';
}

function cerrarModalTexto() {
    document.getElementById('modal-texto').style.display = 'none';
}

function guardarTextoDeCaja() {
    let texto = document.getElementById('input-caja-texto').value.trim();
    if (texto) {
        let contenedor = document.getElementById('contenido-detalle');
        if(contenedor.querySelector('.vacio-msg')) contenedor.innerHTML = '';
        
        let div = document.createElement('div');
        div.className = 'bloque-detalle';
        let textoFormateado = texto.replace(/\n/g, '<br>');
        
        div.innerHTML = `
            <div style="display: flex; gap:10px; align-items:flex-start;">
                <input type="checkbox" class="casilla-seleccion-detalle" style="margin-top:4px;">
                <p class="texto-detalle">${textoFormateado}</p>
            </div>
        `;
        contenedor.appendChild(div);
        guardarContenidoDetalle();
        cerrarModalTexto();
        verificarContenidoDetalle();
    }
}

function borrarSeleccionadosDetalle() {
    let seleccionados = document.getElementById('contenido-detalle').querySelectorAll('.casilla-seleccion-detalle:checked');
    if (seleccionados.length > 0 && confirm("¿Estás seguro de eliminar este apunte?")) {
        seleccionados.forEach(c => c.closest('.bloque-detalle').remove());
        guardarContenidoDetalle();
        verificarContenidoDetalle();
    }
}

function guardarContenidoDetalle() {
    localStorage.setItem('contenido_' + itemActual, document.getElementById('contenido-detalle').innerHTML);
}

// --- CLOUDINARY Y RECORTES ---
function prepararImagen() {
    tituloImagenPendiente = prompt("Título para este apunte:") || "Apunte";
    document.getElementById('input-imagen').click();
}

function cargarImagen(event) {
    let file = event.target.files[0];
    if(file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagen-a-recortar').src = e.target.result;
            document.getElementById('modal-recorte').style.display = 'flex';
            if(cropper) cropper.destroy();
            cropper = new Cropper(document.getElementById('imagen-a-recortar'), { viewMode: 1 });
        };
        reader.readAsDataURL(file);
    }
    event.target.value = ""; 
}

function cancelarRecorte() {
    document.getElementById('modal-recorte').style.display = 'none';
    if(cropper) { cropper.destroy(); cropper = null; }
}

async function confirmarRecorte() {
    if(cropper) {
        document.getElementById('modal-recorte').style.display = 'none';
        let contenedor = document.getElementById('contenido-detalle');
        if(contenedor.querySelector('.vacio-msg')) contenedor.innerHTML = '';
        
        let canvas = cropper.getCroppedCanvas({ maxWidth: 1000, maxHeight: 1000 });
        let urlImagen = await subirImagenACloudinary(canvas.toDataURL('image/jpeg', 0.7));

        let div = document.createElement('div');
        div.className = 'bloque-detalle';
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" class="casilla-seleccion-detalle">
                <h4>${tituloImagenPendiente}</h4>
            </div>
            <img src="${urlImagen}" class="imagen-galeria">
        `;
        contenedor.appendChild(div);
        guardarContenidoDetalle();
        verificarContenidoDetalle();
        cropper.destroy(); cropper = null;
    }
}

async function subirImagenACloudinary(dataUrl) {
    const formData = new FormData();
    formData.append("file", dataUrl);
    formData.append("upload_preset", UPLOAD_PRESET);
    const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const data = await response.json();
    return data.secure_url;
}

// --- ARRASTRAR Y SOLTAR ---
function activarArrastrarYSoltar() {
    const opc = { animation: 150, delay: 250, delayOnTouchOnly: true, filter: 'input', preventOnFilter: false, onEnd: function() { guardarDatos(); } };
    new Sortable(document.getElementById('lista-cursos-universidad'), opc);
    new Sortable(document.getElementById('lista-ciclos-ingles'), opc);
    new Sortable(document.getElementById('lista-pendientes'), opc);
    new Sortable(document.getElementById('lista-tarjetas'), opc);
    new Sortable(document.getElementById('contenido-detalle'), { animation: 150, delay: 250, delayOnTouchOnly: true, filter: 'input', preventOnFilter: false, onEnd: function() { guardarContenidoDetalle(); } });
}