// public/js/utils.js
'use strict';

// Hacemos que las funciones sean explícitamente globales adjuntándolas al objeto window
window.fetchAPI = async (endpoint, method = 'GET', body = null, isFormData = false) => {
    const options = {
        method,
        credentials: 'include',
        headers: {}
    };

    if (body) {
        if (isFormData) {
            options.body = body;
        } else {
            options.body = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
        }
    }

    try {
        const response = await fetch(endpoint, options);

        if (response.status === 401) {
            console.warn('Usuario no autorizado o sesión expirada. Redirigiendo a login.');
            if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('/login')) {
                 window.location.href = '/login.html';
            }
            // Lanzar un error para detener el procesamiento posterior en la función que llama
            throw new Error('No autorizado');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.error || errorData.message || 'Error en la petición API');
        }

        return response.json();
    } catch (error) {
        console.error('Error en fetchAPI:', error);
        throw error;
    }
};

/**
 * Muestra un mensaje global en la UI.
 * @param {string} mensaje - El texto del mensaje.
 * @param {string} tipo - Clase CSS para el tipo de mensaje ('exito', 'error', 'carga', 'vacio').
 * @param {HTMLElement} [elementoMensaje=document.getElementById('global-message')] - El elemento donde mostrar el mensaje.
 * @param {number} [duracion=0] - Duración en ms antes de ocultar el mensaje (0 para no ocultar automáticamente).
 */
window.mostrarMensajeGlobal = (mensaje, tipo, elementoMensaje = document.getElementById('global-message'), duracion = 0) => {
    const el = elementoMensaje;
    if (!el) {
        console.warn('Elemento de mensaje global no encontrado.');
        return;
    }
    el.textContent = mensaje;
    el.className = `mensaje ${tipo}`; // Reemplazar clases existentes

    if (duracion > 0) {
        setTimeout(() => {
            el.textContent = '';
            el.className = 'mensaje';
        }, duracion);
    }
};

/**
 * Cierra la sesión del usuario.
 */
window.cerrarSesion = async () => {
    try {
        await window.fetchAPI('/api/logout', 'POST');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.mostrarMensajeGlobal('Error al cerrar sesión.', 'error');
    }
};

/**
 * Inicializa la página cargando la configuración del diario activo y adaptando la UI.
 * @param {object} opciones - Opciones para la inicialización.
 * @param {object} opciones.elementosComunes - Objeto con referencias a elementos HTML comunes.
 * @param {HTMLElement} opciones.elementosComunes.globalMessageEl - Elemento para mensajes globales.
 * @param {HTMLElement} opciones.elementosComunes.nombreDiarioActualEl - Elemento para mostrar el nombre del diario activo.
 * @param {HTMLElement} opciones.elementosComunes.diarioActivoInfoEl - Contenedor de información del diario activo.
 * @param {HTMLElement} opciones.elementosComunes.tituloPrincipalEl - Título principal de la aplicación.
 * @param {function} [opciones.callbackConConfig] - Callback a ejecutar con la configuración del diario activo.
 */
window.inicializarPaginaConDiarioActivo = async ({ elementosComunes, callbackConConfig }) => {
    try {
                const sessionInfo = await window.fetchAPI('/api/auth/check-session');
        if (!sessionInfo.isAuthenticated) {
            // fetchAPI ya redirige, pero para asegurar el flujo si la llamada no falla con 401
            window.location.href = '/login.html';
            return;
        }

        const { userId, userName, userRole, activeDiario } = sessionInfo;

        // Actualizar información del usuario en el header si aplica
        const userNameEl = document.getElementById('user-name'); // Asumiendo que existe en alguna página
        if (userNameEl) {
            userNameEl.textContent = userName;
        }

        // Cargar y aplicar configuración visual del usuario
        const userConfig = await window.fetchAPI('/api/configuracion/usuario');
        // Asegurarse de que aplicarConfiguracionVisual esté disponible globalmente
        if (typeof window.aplicarConfiguracionVisual === 'function') {
            window.aplicarConfiguracionVisual(userConfig);
        } else {
            console.warn("La función 'aplicarConfiguracionVisual' no está disponible. Asegúrate de que theme-manager.js se cargue correctamente y sus funciones sean globales.");
        }


        let configDiarioActual = null;
        if (activeDiario && activeDiario.id) {
            configDiarioActual = await window.fetchAPI(`/api/diarios/${activeDiario.id}`);
            // Guardar el diario activo en la sesión del frontend para consistencia
            // Esto es más un concepto, el backend ya lo maneja en req.session.activeDiarioId
        } else {
            // Si no hay diario activo en sesión, intentar cargar el primero del usuario
            const userDiarios = await window.fetchAPI('/api/diarios');
            if (userDiarios && userDiarios.length > 0) {
                const firstDiario = userDiarios[0];
                await window.fetchAPI(`/api/diarios/set-active/${firstDiario.id}`, 'POST');
                configDiarioActual = await window.fetchAPI(`/api/diarios/${firstDiario.id}`);
            }
        }

        if (!configDiarioActual) {
            // Si después de todo no hay diario activo, mostrar mensaje y ocultar info
            if (elementosComunes.diarioActivoInfoEl) {
                elementosComunes.diarioActivoInfoEl.style.display = 'none';
            }
            if (elementosComunes.globalMessageEl) {
                window.mostrarMensajeGlobal('No tienes un diario activo. Por favor, crea uno nuevo o selecciona uno existente.', 'vacio', elementosComunes.globalMessageEl);
            }
            // No llamar a callbackConConfig si no hay diario activo
            return;
        }

        const activeDiarioId = configDiarioActual.id;
        if (elementosComunes.diarioActivoInfoEl && elementosComunes.nombreDiarioActualEl) {
            elementosComunes.nombreDiarioActualEl.textContent = configDiarioActual.nombre_diario_personalizado || `Diario ID: ${activeDiarioId}`;
            elementosComunes.diarioActivoInfoEl.style.display = 'block';
        }

        if (elementosComunes.tituloPrincipalEl && configDiarioActual.nombre_diario_personalizado) {
            const tituloOriginal = elementosComunes.tituloPrincipalEl.textContent;
            const emoji = tituloOriginal.split(' ')[0];
            const tituloBase = document.title.split(' - ')[1] || 'Mi Pequeño Tesoro';
            elementosComunes.tituloPrincipalEl.textContent = `${emoji} ${configDiarioActual.nombre_diario_personalizado}`;
            document.title = `${configDiarioActual.nombre_diario_personalizado} - ${tituloBase}`;
        }
        
        if (callbackConConfig && typeof callbackConConfig === 'function') {
            callbackConConfig(configDiarioActual);
        }

    } catch (error) {
        if (error.message !== 'No autorizado') { // Evitar doble mensaje si fetchAPI ya redirige
            console.error("Error fatal en la inicialización de la página:", error);
            if (elementosComunes.globalMessageEl) {
                window.mostrarMensajeGlobal('Error crítico al cargar los datos del diario. Recarga la página.', 'error', elementosComunes.globalMessageEl);
            }
        }
    }
};
