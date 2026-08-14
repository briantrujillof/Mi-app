// --- CONFIGURACIÓN ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/drbiwjcd/image/upload";
const UPLOAD_PRESET = "apuntes_app";

// --- FUNCIONES DE DISEÑO ---
function verificarContenido() {
    const contenedor = document.getElementById('contenido-detalle');
    const yaTieneMensaje = contenedor.querySelector('.vacio-msg');
    
    if (contenedor.children.length === 0 && !yaTieneMensaje) {
        contenedor.innerHTML = '<p class="vacio-msg">Sin contenido por el momento...</p>';
    } else if (contenedor.children.length > 1 && yaTieneMensaje) {
        yaTieneMensaje.remove();
    }
}

// --- NAVEGACIÓN ---
function abrirDetalle(nombreItem) {
    itemActual = nombreItem;
    window.history.pushState({ pantalla: 'detalle' }, "", "#detalle");
    document.getElementById('pantalla-principal').style.display = 'none';
    document.getElementById('pantalla-detalle').style.display = 'block';
    document.getElementById('titulo-detalle').innerText = nombreItem;
    
    let contenidoGuardado = localStorage.getItem('contenido_' + itemActual);
    document.getElementById('contenido-detalle').innerHTML = contenidoGuardado ? contenidoGuardado : "";
    verificarContenido(); // <--- REVISAR SI ESTÁ VACÍO
}

function cerrarDetalle() { window.history.back(); }

window.addEventListener('popstate', function() {
    if (window.location.hash !== '#detalle') {
        document.getElementById('pantalla-principal').style.display = 'block';
        document.getElementById('pantalla-detalle').style.display = 'none';
    }
});

// --- LÓGICA DE SUBIDA (CLOUDINARY) ---
async function subirImagenACloudinary(dataUrl) {
    const formData = new FormData();
    formData.append("file", dataUrl);
    formData.append("upload_preset", UPLOAD_PRESET);
    const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const data = await response.json();
    return data.secure_url;
}

async function confirmarRecorte() {
    if(cropper) {
        document.getElementById('modal-recorte').style.display = 'none';
        let canvas = cropper.getCroppedCanvas({ maxWidth: 800, maxHeight: 800 });
        let urlImagen = await subirImagenACloudinary(canvas.toDataURL('image/jpeg', 0.6));

        let contenedor = document.getElementById('contenido-detalle');
        let nuevoBloque = document.createElement('div');
        nuevoBloque.className = 'bloque-detalle';
        nuevoBloque.innerHTML = `<h3>${tituloImagenPendiente}</h3><img src="${urlImagen}" class="imagen-galeria">`;
        contenedor.appendChild(nuevoBloque);
        guardarContenidoDetalle();
        cropper.destroy(); cropper = null;
        verificarContenido();
    }
}

function guardarContenidoDetalle() {
    localStorage.setItem('contenido_' + itemActual, document.getElementById('contenido-detalle').innerHTML);
}

function borrarSeleccionadosDetalle() {
    let contenedor = document.getElementById('contenido-detalle');
    contenedor.querySelectorAll('input:checked').forEach(c => c.closest('.bloque-detalle').remove());
    guardarContenidoDetalle();
    verificarContenido(); // <--- REVISAR SI QUEDÓ VACÍO
}