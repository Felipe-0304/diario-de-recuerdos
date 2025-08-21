
// @ts-check
'use strict';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
// La ruta base del proyecto está dos niveles arriba de /src/config
const projectRoot = path.dirname(path.dirname(path.dirname(__filename)));

export const directories = {
  root: projectRoot,
  db: path.join(projectRoot, 'db'),
  public: path.join(projectRoot, 'public'),
  mediaUploads: path.join(projectRoot, 'public', 'media', 'diarios'),
  temp: path.join(projectRoot, 'temp')
};

/**
 * Se asegura de que un directorio exista, y si no, lo crea.
 * @param {string} dirPath 
 */
const ensureDirectoryExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Directorio creado: ${dirPath}`);
    }
    return true;
  } catch (err) {
    console.error(`Error al crear/verificar directorio ${dirPath}:`, err);
    return false;
  }
};

/**
 * Verifica que todos los directorios esenciales para la aplicación existan.
 * Si no, los crea. Si falla, termina el proceso.
 */
export const initializeDirectories = () => {
    console.log('Verificando y creando directorios...');
    let allOk = true;
    // No es necesario verificar/crear la raíz, solo los subdirectorios.
    const { root, ...subdirectories } = directories;
    for (const dir of Object.values(subdirectories)) {
        if (!ensureDirectoryExists(dir)) {
            allOk = false;
        }
    }
    if (!allOk) {
        console.error(`No se pudieron crear todos los directorios críticos. Saliendo.`);
        process.exit(1);
    }
    console.log('Directorios verificados.');
};
