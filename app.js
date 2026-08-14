function cambiarPestana(idPestana) {
    document.querySelectorAll('.pestana').forEach(p => p.classList.remove('activa'));
    document.getElementById(idPestana).classList.add('activa');
}

function guardarDatos() {
    localStorage.setItem('saldoCorredor', document.querySelector('.tarjeta-transporte.corredor .saldo-numero').textContent);
    localStorage.setItem('saldoTren', document.querySelector('.tarjeta-transporte.tren .saldo-numero').textContent);
    localStorage.setItem('listaCursos', document.getElementById('lista-cursos-universidad').innerHTML);
    localStorage.setItem('listaCiclos', document.getElementById('lista-ciclos-ingles').innerHTML);
    localStorage.setItem('listaPendientes', document.getElementById('lista-pendientes').innerHTML);
}

function cargarDatos() {
    if (localStorage.getItem('saldoCorredor')) document.querySelector('.tarjeta-transporte.corredor .saldo-numero').textContent = localStorage.getItem('saldoCorredor');
    if (localStorage.getItem('saldoTren')) document.querySelector('.tarjeta-transporte.tren .saldo-numero').textContent = localStorage.getItem('saldoTren');
    if (localStorage.getItem('listaCursos')) document.getElementById('lista-cursos-universidad').innerHTML = localStorage.getItem('listaCursos');
    if (localStorage.getItem('listaCiclos')) document.getElementById('lista-ciclos-ingles').innerHTML = localStorage.getItem('listaCiclos');
    if (localStorage.getItem('listaPendientes')) document.getElementById('lista-pendientes').innerHTML = localStorage.getItem('listaPendientes');
    
    activarArrastrarYSoltar();
}

window.onload = cargarDatos;

function activarArrastrarYSoltar() {
    const opciones = {
        animation: 150,
        delay: 200, 
        delayOnTouchOnly: true,
        fallbackTolerance: 5,
        onEnd: function () { guardarDatos(); }
    };
    new Sortable(document.getElementById('lista-cursos-universidad'), opciones);
    new Sortable(document.getElementById('lista-ciclos-ingles'), opciones);
    new Sortable(document.getElementById('lista-pendientes'), opciones);
    
    new Sortable(document.getElementById('contenido-detalle'), {
        animation: 150,
        delay: 200,
        delayOnTouchOnly: true,
        fallbackTolerance: 5,
        onEnd: function() { guardarContenidoDetalle(); }
    });
}

function registrarViajeCorredor() {
    let el = document.querySelector('.tarjeta-transporte.corredor .saldo-numero');
    let saldo = parseFloat(el.textContent.replace('S/ ', ''));
    if (saldo >= 1.21) { el.textContent = 'S/ ' + (saldo - 1.21).toFixed(2); guardarDatos(); } else alert('¡Saldo insuficiente!');
}

function registrarViajeTren() {
    let el = document.querySelector('.tarjeta-transporte.tren .saldo-numero');
    let saldo = parseFloat(el.textContent.replace('S/ ', ''));
    if (saldo >= 0.75) { el.textContent = 'S/ ' + (saldo - 0.75).toFixed(2); guardarDatos(); } else alert('¡Saldo insuficiente!');
}

function agregarSaldoCorredor() {
    let monto = parseFloat(prompt("¿Cuánto recargaste en el Corredor?"));
    if (!isNaN(monto) && monto > 0) {
        let el = document.querySelector('.tarjeta-transporte.corredor .saldo-numero');
        el.textContent = 'S/ ' + (parseFloat(el.textContent.replace('S/ ', '')) + monto).toFixed(2); guardarDatos();
    }
}

function agregarSaldoTren() {
    let monto = parseFloat(prompt("¿Cuánto recargaste en el Tren Eléctrico?"));
    if (!isNaN(monto) && monto > 0) {
        let el = document.querySelector('.tarjeta-transporte.tren .saldo-numero');
        el.textContent = 'S/ ' + (parseFloat(el.textContent.replace('S/ ', '')) + monto).toFixed(2); guardarDatos();
    }
}

function agregarCurso() {
    let nombre = prompt("¿Cuál es el nombre del curso?");
    if (nombre) {
        let contenedor = document.getElementById("lista-cursos-universidad");
        let nuevoItem = document.createElement("div");
        nuevoItem.className = "item-lista";
        nuevoItem.innerHTML = `<input type="checkbox" class="casilla-seleccion"> <span class="texto-clickeable" onclick="abrirDetalle('${nombre}')">${nombre}</span>`;
        contenedor.appendChild(nuevoItem); guardarDatos(); 
    }
}

function agregarCiclo() {
    let nombre = prompt("¿Qué ciclo vas a agregar?");
    if (nombre) {
        let contenedor = document.getElementById("lista-ciclos-ingles");
        let nuevoItem = document.createElement("div");
        nuevoItem.className = "item-lista";
        nuevoItem.innerHTML = `<input type="checkbox" class="casilla-seleccion"> <span class="texto-clickeable" onclick="abrirDetalle('${nombre}')">${nombre}</span>`;
        contenedor.appendChild(nuevoItem); guardarDatos(); 
    }
}

function agregarPendiente() {
    let nombre = prompt("¿Qué tarea tienes pendiente?");
    if (nombre) {
        let contenedor = document.getElementById("lista-pendientes");
        let nuevoItem = document.createElement("div");
        nuevoItem.className = "item-lista";
        nuevoItem.innerHTML = `<input type="checkbox" class="casilla-seleccion"> <span>${nombre}</span>`;
        contenedor.appendChild(nuevoItem); guardarDatos(); 
    }
}

function borrarSeleccionados(idLista) {
    let contenedor = document.getElementById(idLista);
    let checkboxes = contenedor.querySelectorAll('.casilla-seleccion');
    let haySeleccionados = Array.from(checkboxes).some(box => box.checked);

    if (haySeleccionados) {
        if (confirm("¿Deseas eliminar los elementos seleccionados?")) {
            checkboxes.forEach(box => { if (box.checked) box.parentElement.remove(); });
            guardarDatos(); 
        }
    } else alert("Primero marca el cuadradito.");
}

let itemActual = "";
let tituloImagenPendiente = "";
let cropper; 

// --- NUEVO SISTEMA DE NAVEGACIÓN Y BOTÓN ATRÁS NATIVO ---
function abrirDetalle(nombreItem) {
    itemActual = nombreItem;
    
    // ESTO ES LO NUEVO: Fuerza a la memoria del celular a registrar esta pantalla
    window.history.pushState({ pantalla: 'detalle' }, "", "#detalle"); 
    
    document.querySelector('.barra-navegacion').style.display = 'none';
    document.getElementById('pantalla-principal').style.display = 'none';
    document.getElementById('pantalla-detalle').style.display = 'block';
    document.getElementById('titulo-detalle').innerText = nombreItem;

    let contenidoGuardado = localStorage.getItem('contenido_' + itemActual);
    document.getElementById('contenido-detalle').innerHTML = contenidoGuardado ? contenidoGuardado : "";
}

function cerrarDetalle() {
    // Cuando toques el botón "Atrás" de la app, simulará el botón físico
    window.history.back(); 
}

function ejecutarCerrarDetalle() {
    document.querySelector('.barra-navegacion').style.display = 'flex';
    document.getElementById('pantalla-principal').style.display = 'block';
    document.getElementById('pantalla-detalle').style.display = 'none';
}

// El evento 'popstate' es el detector oficial del botón físico de Android
window.addEventListener('popstate', function() {
    // Si la URL ya no tiene el #detalle, significa que el celular retrocedió
    if (window.location.hash !== '#detalle') {
        ejecutarCerrarDetalle();
        
        // Si estaba recortando una foto, lo cancela por seguridad
        document.getElementById('modal-recorte').style.display = 'none';
        if(cropper) { cropper.destroy(); cropper = null; }
        tituloImagenPendiente = "";
    }
});
// ---------------------------------------------------------

function agregarBloqueTexto() {
    let titulo = prompt("¿Qué título tendrá este texto?");
    if (titulo) {
        let contenedor = document.getElementById('contenido-detalle');
        let nuevoBloque = document.createElement('div');
        nuevoBloque.className = 'bloque-detalle';
        nuevoBloque.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <input type="checkbox" class="casilla-seleccion-detalle">
                <h3 style="margin: 0; color: #ffffff; font-size: 16px;">${titulo}</h3>
            </div>
            <textarea class="bloque-texto" placeholder="Escribe aquí..." oninput="this.textContent = this.value; guardarContenidoDetalle()"></textarea>
        `;
        contenedor.appendChild(nuevoBloque);
        guardarContenidoDetalle();
    }
}

function prepararImagen() {
    let titulo = prompt("¿Qué título le pondrás a esta imagen?");
    if (titulo) {
        tituloImagenPendiente = titulo;
        document.getElementById('input-imagen').click(); 
    }
}

function cargarImagen(event) {
    let archivo = event.target.files[0];
    if (archivo && tituloImagenPendiente) {
        let lector = new FileReader();
        lector.onload = function(e) {
            document.getElementById('modal-recorte').style.display = 'flex';
            let imgRecorte = document.getElementById('imagen-a-recortar');
            imgRecorte.src = e.target.result;
            
            if(cropper) cropper.destroy(); 
            cropper = new Cropper(imgRecorte, {
                viewMode: 1,
                autoCropArea: 0.8,
                background: false
            });
        };
        lector.readAsDataURL(archivo);
    }
    event.target.value = ''; 
}

function confirmarRecorte() {
    if(cropper) {
        document.getElementById('modal-recorte').style.display = 'none';
        
        // COMPRESIÓN DE IMAGEN: Evita que el celular bloquee el guardado por exceso de memoria
        let canvas = cropper.getCroppedCanvas({ maxWidth: 800, maxHeight: 800 });
        let imagenRecortada = canvas.toDataURL('image/jpeg', 0.6); 

        let contenedor = document.getElementById('contenido-detalle');
        let nuevoBloque = document.createElement('div');
        nuevoBloque.className = 'bloque-detalle';
        nuevoBloque.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <input type="checkbox" class="casilla-seleccion-detalle">
                <h3 style="margin: 0; color: #ffffff; font-size: 16px;">${tituloImagenPendiente}</h3>
            </div>
            <img src="${imagenRecortada}" class="imagen-galeria">
        `;
        contenedor.appendChild(nuevoBloque);
        guardarContenidoDetalle();
        
        cropper.destroy(); 
        cropper = null; 
        tituloImagenPendiente = "";
    }
}

function cancelarRecorte() {
    document.getElementById('modal-recorte').style.display = 'none';
    if(cropper) { cropper.destroy(); cropper = null; }
    tituloImagenPendiente = "";
}

function guardarContenidoDetalle() {
    let htmlContenido = document.getElementById('contenido-detalle').innerHTML;
    try {
        localStorage.setItem('contenido_' + itemActual, htmlContenido);
    } catch (error) {
        alert("Aviso: Memoria local llena. Por favor borra apuntes antiguos para guardar imágenes nuevas.");
    }
}

function borrarSeleccionadosDetalle() {
    let contenedor = document.getElementById('contenido-detalle');
    let checkboxes = contenedor.querySelectorAll('.casilla-seleccion-detalle');
    let haySeleccionados = Array.from(checkboxes).some(box => box.checked);

    if (haySeleccionados) {
        if (confirm("¿Deseas eliminar los apuntes o imágenes seleccionadas?")) {
            checkboxes.forEach(box => { 
                if (box.checked) box.closest('.bloque-detalle').remove(); 
            });
            guardarContenidoDetalle(); 
        }
    } else {
        alert("Primero marca el cuadradito del título que quieres eliminar.");
    }
}