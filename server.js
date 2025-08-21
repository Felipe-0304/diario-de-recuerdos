// @ts-check
'use strict';

/**
 * Punto de entrada principal de la aplicación.
 * Este archivo se encarga de inicializar los módulos y arrancar el servidor.
 */

import app from './src/app.js';
import { initDB } from './src/models/db.js';
import { initializeDirectories } from './src/config/path.js';

const PORT = process.env.PORT || 3000;

/**
 * Función principal de arranque.
 */
async function startServer() {
  try {
    // 1. Asegurar que los directorios necesarios existan antes de hacer nada más.
    initializeDirectories();
    
    // 2. Conectar e inicializar la base de datos.
    await initDB();
    
    // 3. Iniciar el servidor Express para que escuche las peticiones.
    app.listen(PORT, () => {
      console.log(`🚀 Servidor reestructurado corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ FALLO CRÍTICO AL INICIAR LA APLICACIÓN:", error.message, error.stack);
    process.exit(1);
  }
}

startServer();