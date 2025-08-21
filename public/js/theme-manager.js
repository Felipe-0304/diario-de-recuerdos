// js/theme-manager.js

/**
 * Aplica la configuración visual al documento.
 * @param {object} config - El objeto de configuración con las propiedades del tema.
 */
window.aplicarConfiguracionVisual = function(config) { // Adjuntado a window
    const root = document.documentElement;
    const defaults = {
        color_primario: '#FFB6C1',
        color_secundario: '#FFD1DC',
        color_accento: '#FFD700', // Usado en algunos CSS, asegurémonos que se pueda configurar
        color_fondo: '#FFF9FB',
        color_tarjetas: '#FFFFFF', // Usado en algunos CSS
        color_texto: '#5D3B45',
        color_texto_claro: '#A78B94',
        color_bordes: '#F0D6DE',
        fuente_principal: "'Comic Neue', cursive",
        tamano_fuente: '16px'
    };

    // Usar valor de config o el default si no está definido
    root.style.setProperty('--color-primario', config.color_primario || defaults.color_primario);
    root.style.setProperty('--color-secundario', config.color_secundario || defaults.color_secundario);
    root.style.setProperty('--color-accento', config.color_accento || defaults.color_accento);
    root.style.setProperty('--color-fondo', config.color_fondo || defaults.color_fondo);
    root.style.setProperty('--color-tarjetas', config.color_tarjetas || defaults.color_tarjetas);
    root.style.setProperty('--color-texto', config.color_texto || defaults.color_texto);
    root.style.setProperty('--color-texto-claro', config.color_texto_claro || defaults.color_texto_claro);
    root.style.setProperty('--color-bordes', config.color_bordes || defaults.color_bordes);
    root.style.setProperty('--fuente-principal', config.fuente_principal || defaults.fuente_principal);
    root.style.setProperty('--tamano-fuente', config.tamano_fuente || defaults.tamano_fuente);
}

/**
 * Carga y aplica la configuración del tema desde la API.
 * Aplica estilos por defecto si no hay configuración o si hay un error.
 */
async function cargarYAplicarTema() {
    try {
        // Verificar si el usuario está autenticado antes de intentar cargar la configuración personalizada
        // window.fetchAPI ya maneja la redirección a login si no hay sesión
        const response = await window.fetchAPI('/api/configuracion/usuario'); // Usar window.fetchAPI

        if (response.status === 401) {
            console.warn('Usuario no autenticado, se aplicarán estilos por defecto.');
            window.aplicarConfiguracionVisual({}); // Usar window.aplicarConfiguracionVisual
            return;
        }

        // fetchAPI ya lanza un error si response.ok no es true, así que no necesitamos la verificación explícita aquí.
        const config = response; // fetchAPI ya devuelve el JSON parseado
        if (config) {
            window.aplicarConfiguracionVisual(config); // Usar window.aplicarConfiguracionVisual
        } else {
            window.aplicarConfiguracionVisual({}); // Aplica defaults si la config está vacía
        }
    } catch (error) {
        console.error('Fallo al cargar y aplicar tema:', error);
        // En caso de error, aplica los estilos por defecto para asegurar que la página sea usable.
        window.aplicarConfiguracionVisual({});
    }
}

// Ejecutar cuando el DOM esté completamente cargado.
document.addEventListener('DOMContentLoaded', () => {
    if (document.body) {
        cargarYAplicarTema();
    } else {
        window.addEventListener('load', cargarYAplicarTema);
    }
});
