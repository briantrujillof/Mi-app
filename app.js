const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/drbiwjcd/image/upload";
const UPLOAD_PRESET = "apuntes_app";

let itemActual = "";
let tituloImagenPendiente = "";
let cropper;

// === LÓGICA DE SWIPE ===
let touchstartX = 0; let touchstartY = 0; let touchendX = 0; let touchendY = 0;
const vistas = ['universidad', 'ingles', 'pendientes', 'tarjetas'];
let vistaActualIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    activarArrastrarYSoltar();
    cargarSaldosTarjetas();

    document.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; touchstartY = e.changedTouches[0].screenY; }, {passive: true});
    document.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX; touchendY = e.changedTouches[0].screenY;
        if (document.getElementById('pantalla-principal').style.display !== 'none' &&
            document.getElementById('modal-recorte').style.display === 'none' &&
            document.getElementById('modal-texto').style.display === 'none' &&
            !document.querySelector('.modo-eliminar')) {
            handleSwipe();
        }
    }, {passive: true});
});

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
}

// === VERIFICACIONES Y MENSAJES VACÍOS ===
function verificarContenidoPrincipal() {
    const listas = ['lista-cursos-universidad', 'lista-ciclos-ingles', 'lista-pendientes'];
    listas.forEach(id => {
        let lista = document.getElementById(id);
        if (!lista) return;
        let msg = lista.querySelector('.vacio-msg-principal');
        let itemsCount = lista.querySelectorAll('.item-lista').length;
        if (itemsCount === 0 && !msg) {
            lista.innerHTML = '<div class="vacio-msg-principal fade-in-up">Sin contenido por el momento. Usa el botón (+) para agregar.</div>';
        } else if (itemsCount > 0 && msg) msg.remove();
    });
}

function verificarContenidoDetalle() {
    let contenedor = document.getElementById('contenido-detalle');
    let mensaje = contenedor.querySelector('.vacio-msg');
    if (contenedor.children.length === 0 && !mensaje) {
        contenedor.innerHTML = '<div class="vacio-msg fade-in-up">Apuntes vacíos. Usa los botones inferiores.</div>';
    } else if (contenedor.children.length > 1 && mensaje) {
        mensaje.remove();
    }
}

// === ELIMINAR CURSOS/CICLOS ===
function activarModoEliminar(pestañaID, listaID) {
    document.getElementById(`flotantes-${pestañaID}`).style.display = 'none';
    document.getElementById(`confirmar-${pestañaID}`).style.display = 'flex';
    document.getElementById(listaID).classList.add('modo-eliminar');
}

function cancelarModoEliminar(pestañaID, listaID) {
    document.getElementById(`flotantes-${pestañaID}`).style.display = 'flex';
    document.getElementById(`confirmar-${pestañaID}`).style.display = 'none';
    document.getElementById(listaID).classList.remove('modo-eliminar');
    document.getElementById(listaID).querySelectorAll('.casilla-seleccion').forEach(c => c.checked = false);
}

function confirmarEliminacion(pestañaID, listaID) {
    let seleccionados = document.getElementById(listaID).querySelectorAll('.casilla-seleccion:checked');
    if (seleccionados.length === 0) { cancelarModoEliminar(pestañaID, listaID); return; }
    
    // Animación de salida antes de borrar
    seleccionados.forEach(c => {
        let item = c.closest('.item-lista');
        item.classList.remove('fade-in-up');
        item.classList.add('fade-out');
        setTimeout(() => item.remove(), 290);
    });
    
    setTimeout(() => {
        guardarDatos();
        verificarContenidoPrincipal();
        cancelarModoEliminar(pestañaID, listaID);
    }, 300);
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

// === TRANSICIÓN DE NAVEGACIÓN (ENTRAR A CURSO) ===
function abrirDetalle(nombreItem) {
    if (vistas[vistaActualIndex] === 'pendientes' || vistas[vistaActualIndex] === 'tarjetas') return; 
    if (document.querySelector('.modo-eliminar')) return;

    itemActual = nombreItem;
    window.history.pushState({ pantalla: 'detalle' }, "", "#detalle");
    
    // Preparar pantallas
    const main = document.getElementById('pantalla-principal');
    const nav = document.getElementById('nav-principal');
    const detalle = document.getElementById('pantalla-detalle');

    // Desaparecer menú principal
    main.style.display = 'none';
    nav.style.display = 'none';
    
    // Aparecer curso con animación
    detalle.style.display = 'block';
    detalle.classList.remove('slide-out');
    detalle.classList.add('slide-in');

    document.getElementById('titulo-detalle').innerText = nombreItem;
    document.getElementById('contenido-detalle').innerHTML = localStorage.getItem('contenido_' + itemActual) || "";
    verificarContenidoDetalle();
}

window.addEventListener('popstate', function() {
    if (window.location.hash !== '#detalle') {
        const main = document.getElementById('pantalla-principal');
        const nav = document.getElementById('nav-principal');
        const detalle = document.getElementById('pantalla-detalle');
        
        cancelarModoEliminarDetalle();
        
        // Animación de salida del curso
        detalle.classList.remove('slide-in');
        detalle.classList.add('slide-out');
        
        setTimeout(() => {
            detalle.style.display = 'none';
            nav.style.display = 'flex';
            main.style.display = 'block';
            
            // Animación de entrada al volver al menú principal
            main.classList.remove('fade-out');
            main.classList.add('fade-in-up');
            setTimeout(() => main.classList.remove('fade-in-up'), 300);

            document.getElementById('modal-recorte').style.display = 'none';
            document.getElementById('modal-texto').style.display = 'none';
            if(cropper) { cropper.destroy(); cropper = null; }
        }, 290);
    }
});

// === AGREGAR ITEMS ===
function agregarCurso() { let n = prompt("Nombre del curso:"); if (n) { agregarItemLista('lista-cursos-universidad', n); guardarDatos(); } }
function agregarCiclo() { let n = prompt("Nombre del ciclo:"); if (n) { agregarItemLista('lista-ciclos-ingles', n); guardarDatos(); } }
function agregarPendiente() { let n = prompt("Nuevo pendiente:"); if (n) { agregarItemLista('lista-pendientes', n); guardarDatos(); } }

function agregarItemLista(idLista, nombre) {
    let ul = document.getElementById(idLista);
    if(ul.querySelector('.vacio-msg-principal')) ul.innerHTML = ''; 

    let li = document.createElement('div');
    li.className = 'item-lista fade-in-up'; // Entra con animación
    
    if (idLista === 'lista-pendientes') {
        li.innerHTML = `<input type="checkbox" class="casilla-seleccion" onclick="event.stopPropagation()"><span style="flex-grow:1;">${nombre}</span>`;
    } else {
        li.innerHTML = `<input type="checkbox" class="casilla-seleccion" onclick="event.stopPropagation()"><span onclick="abrirDetalle('${nombre}')" style="cursor:pointer; flex-grow:1;">${nombre}</span>`;
    }
    ul.appendChild(li);
    verificarContenidoPrincipal();
}

function guardarDatos() {
    localStorage.setItem('universidad', document.getElementById('lista-cursos-universidad').innerHTML);
    localStorage.setItem('ingles', document.getElementById('lista-ciclos-ingles').innerHTML);
    localStorage.setItem('pendientes', document.getElementById('lista-pendientes').innerHTML);
}
function cargarDatos() {
    document.getElementById('lista-cursos-universidad').innerHTML = localStorage.getItem('universidad') || "";
    document.getElementById('lista-ciclos-ingles').innerHTML = localStorage.getItem('ingles') || "";
    document.getElementById('lista-pendientes').innerHTML = localStorage.getItem('pendientes') || "";
    verificarContenidoPrincipal();
}

// === TARJETAS DE PASAJES ===
function cargarSaldosTarjetas() {
    document.getElementById('saldo-corredor').innerText = parseFloat(localStorage.getItem('saldo_corredor') || 10).toFixed(2);
    document.getElementById('saldo-tren').innerText = parseFloat(localStorage.getItem('saldo_tren') || 5).toFixed(2);
}
function agregarSaldo(tipo) {
    let montoStr = prompt("¿Cuánto saldo deseas agregar?");
    if(montoStr) {
        let monto = parseFloat(montoStr);
        if(!isNaN(monto) && monto > 0) {
            let actual = parseFloat(localStorage.getItem('saldo_'+tipo) || (tipo==='corredor'?10:5));
            localStorage.setItem('saldo_'+tipo, actual + monto);
            cargarSaldosTarjetas();
        }
    }
}
function descontarPasaje(tipo, costo) {
    let actual = parseFloat(localStorage.getItem('saldo_'+tipo) || (tipo==='corredor'?10:5));
    if(tipo === 'corredor') costo = 1.21;
    if(tipo === 'tren') costo = 0.75;
    
    if(actual >= costo) {
        localStorage.setItem('saldo_'+tipo, (actual - costo).toFixed(2));
        cargarSaldosTarjetas();
    } else { alert("Saldo insuficiente."); }
}

// === MODO ELIMINAR Y APUNTES ===
function activarModoEliminarDetalle() {
    document.getElementById('flotantes-detalle').style.display = 'none';
    document.getElementById('confirmar-detalle').style.display = 'flex';
    document.getElementById('contenido-detalle').classList.add('modo-eliminar');
}
function cancelarModoEliminarDetalle() {
    document.getElementById('flotantes-detalle').style.display = 'flex';
    document.getElementById('confirmar-detalle').style.display = 'none';
    document.getElementById('contenido-detalle').classList.remove('modo-eliminar');
    document.getElementById('contenido-detalle').querySelectorAll('.casilla-seleccion-detalle').forEach(c => c.checked = false);
}
function confirmarEliminacionDetalle() {
    let seleccionados = document.getElementById('contenido-detalle').querySelectorAll('.casilla-seleccion-detalle:checked');
    if (seleccionados.length === 0) { cancelarModoEliminarDetalle(); return; }
    
    // Anima el borrado de apuntes
    seleccionados.forEach(c => {
        let bloque = c.closest('.bloque-detalle');
        bloque.classList.remove('fade-in-up');
        bloque.classList.add('fade-out');
        setTimeout(() => bloque.remove(), 290);
    });
    setTimeout(() => {
        guardarContenidoDetalle(); verificarContenidoDetalle(); cancelarModoEliminarDetalle();
    }, 300);
}

function abrirModalTexto() {
    document.getElementById('input-caja-titulo').value = ""; document.getElementById('input-caja-texto').value = "";
    document.getElementById('modal-texto').style.display = 'flex';
}
function cerrarModalTexto() { document.getElementById('modal-texto').style.display = 'none'; }

function guardarTextoDeCaja() {
    let titulo = document.getElementById('input-caja-titulo').value.trim();
    let texto = document.getElementById('input-caja-texto').value.trim();
    if (texto) {
        let contenedor = document.getElementById('contenido-detalle');
        if(contenedor.querySelector('.vacio-msg')) contenedor.innerHTML = '';
        let div = document.createElement('div');
        div.className = 'bloque-detalle fade-in-up'; // Entra con animación
        let textoFormateado = texto.replace(/\n/g, '<br>');
        
        div.innerHTML = `
            <div style="display: flex; gap:10px; align-items:flex-start;">
                <input type="checkbox" class="casilla-seleccion-detalle">
                <div style="width: 100%;">
                    ${titulo ? `<h4>${titulo}</h4>` : ''}
                    <p class="texto-detalle">${textoFormateado}</p>
                </div>
            </div>
        `;
        contenedor.appendChild(div);
        guardarContenidoDetalle(); cerrarModalTexto(); verificarContenidoDetalle();
    } else { alert("Por favor, ingresa contenido."); }
}

function guardarContenidoDetalle() { localStorage.setItem('contenido_' + itemActual, document.getElementById('contenido-detalle').innerHTML); }

function prepararImagen() { tituloImagenPendiente = prompt("Título para este apunte:") || "Apunte"; document.getElementById('input-imagen').click(); }
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
        div.className = 'bloque-detalle fade-in-up'; // Entra con animación
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" class="casilla-seleccion-detalle">
                <div style="width: 100%;">
                    <h4>${tituloImagenPendiente}</h4>
                    <img src="${urlImagen}" class="imagen-galeria">
                </div>
            </div>
        `;
        contenedor.appendChild(div);
        guardarContenidoDetalle(); verificarContenidoDetalle(); cropper.destroy(); cropper = null;
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

function activarArrastrarYSoltar() {
    const opc = { animation: 150, delay: 250, delayOnTouchOnly: true, filter: 'input, button', preventOnFilter: false, onEnd: function() { guardarDatos(); } };
    new Sortable(document.getElementById('lista-cursos-universidad'), opc);
    new Sortable(document.getElementById('lista-ciclos-ingles'), opc);
    new Sortable(document.getElementById('lista-pendientes'), opc);
    new Sortable(document.getElementById('contenido-detalle'), { animation: 150, delay: 250, delayOnTouchOnly: true, filter: 'input', preventOnFilter: false, onEnd: function() { guardarContenidoDetalle(); } });
}