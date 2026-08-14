// --- CONFIGURACIÓN ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/drbiwjcd/image/upload";
const UPLOAD_PRESET = "apuntes_app";

let itemActual = "";
let tituloImagenPendiente = "";
let cropper;

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    activarArrastrarYSoltar();
});

// --- NAVEGACIÓN Y PESTAÑAS ---
function cambiarPestana(idPestana, botonElement) {
    document.querySelectorAll('.pestana').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('activo'));
    
    document.getElementById(idPestana).classList.add('activa');
    if(botonElement) botonElement.classList.add('activo');
}

function abrirDetalle(nombreItem) {
    itemActual = nombreItem;
    window.history.pushState({ pantalla: 'detalle' }, "", "#detalle");
    document.querySelector('.barra-navegacion').style.display = 'none';
    document.getElementById('pantalla-principal').style.display = 'none';
    document.getElementById('pantalla-detalle').style.display = 'block';
    document.getElementById('titulo-detalle').innerText = nombreItem;
    
    document.getElementById('contenido-detalle').innerHTML = localStorage.getItem('contenido_' + itemActual) || "";
    verificarContenido();
}

function cerrarDetalle() { 
    window.history.back(); 
}

window.addEventListener('popstate', function() {
    if (window.location.hash !== '#detalle') {
        document.querySelector('.barra-navegacion').style.display = 'flex';
        document.getElementById('pantalla-principal').style.display = 'block';
        document.getElementById('pantalla-detalle').style.display = 'none';
        document.getElementById('modal-recorte').style.display = 'none';
        if(cropper) { cropper.destroy(); cropper = null; }
    }
});

// --- LÓGICA PRINCIPAL DE CURSOS ---
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

function agregarItemLista(idLista, nombre) {
    let ul = document.getElementById(idLista);
    let li = document.createElement('div');
    li.className = 'item-lista';
    li.innerHTML = `
        <input type="checkbox" class="casilla-seleccion">
        <span onclick="abrirDetalle('${nombre}')" style="cursor:pointer; flex-grow:1;">${nombre}</span>
    `;
    ul.appendChild(li);
}

function borrarSeleccionados(idLista) {
    let lista = document.getElementById(idLista);
    lista.querySelectorAll('.casilla-seleccion:checked').forEach(c => c.closest('.item-lista').remove());
    guardarDatos();
}

// --- GUARDAR/CARGAR MEMORIA ---
function guardarDatos() {
    localStorage.setItem('universidad', document.getElementById('lista-cursos-universidad').innerHTML);
    localStorage.setItem('ingles', document.getElementById('lista-ciclos-ingles').innerHTML);
    localStorage.setItem('pendientes', document.getElementById('lista-pendientes').innerHTML);
}

function cargarDatos() {
    document.getElementById('lista-cursos-universidad').innerHTML = localStorage.getItem('universidad') || "";
    document.getElementById('lista-ciclos-ingles').innerHTML = localStorage.getItem('ingles') || "";
    document.getElementById('lista-pendientes').innerHTML = localStorage.getItem('pendientes') || "";
}

// --- LÓGICA INTERIOR DEL CURSO (Detalle) ---
function verificarContenido() {
    let contenedor = document.getElementById('contenido-detalle');
    let mensaje = contenedor.querySelector('.vacio-msg');
    
    if (contenedor.children.length === 0 && !mensaje) {
        contenedor.innerHTML = `
            <div class="vacio-msg">
                <span>Por el momento sin contenido</span>
                <span>Usa los iconos <b>T</b> o <b>🖼️</b> para agregar</span>
            </div>`;
    } else if (contenedor.children.length > 1 && mensaje) {
        mensaje.remove();
    }
}

function agregarBloqueTexto() {
    let texto = prompt("Ingresa tu texto:");
    if(texto) {
        let contenedor = document.getElementById('contenido-detalle');
        if(contenedor.querySelector('.vacio-msg')) contenedor.innerHTML = ''; 
        
        let div = document.createElement('div');
        div.className = 'bloque-detalle';
        div.innerHTML = `
            <div style="display: flex; gap:10px; align-items:flex-start;">
                <input type="checkbox" class="casilla-seleccion-detalle" style="margin-top:2px;">
                <p class="texto-detalle">${texto}</p>
            </div>
        `;
        contenedor.appendChild(div);
        guardarContenidoDetalle();
        verificarContenido();
    }
}

function borrarSeleccionadosDetalle() {
    let contenedor = document.getElementById('contenido-detalle');
    contenedor.querySelectorAll('.casilla-seleccion-detalle:checked').forEach(c => c.closest('.bloque-detalle').remove());
    guardarContenidoDetalle();
    verificarContenido();
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
        verificarContenido();
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
    const opc = { animation: 150, delay: 250, delayOnTouchOnly: true, onEnd: function() { guardarDatos(); } };
    new Sortable(document.getElementById('lista-cursos-universidad'), opc);
    new Sortable(document.getElementById('lista-ciclos-ingles'), opc);
    new Sortable(document.getElementById('lista-pendientes'), opc);
    new Sortable(document.getElementById('contenido-detalle'), { animation: 150, delay: 250, delayOnTouchOnly: true, onEnd: function() { guardarContenidoDetalle(); } });
}