
// @ts-check
'use strict';

import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { directories } from '../config/path.js';

/**
 * Configuración de almacenamiento para Multer.
 * Define dónde y con qué nombre se guardarán los archivos subidos.
 */
const mediaStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // El ID del diario debe ser provisto por el middleware `checkDiarioAccess` que se ejecuta antes.
    const diarioId = req.diarioId;
    if (!diarioId) {
      // Este error será capturado por el manejador de errores global.
      return cb(new Error('ID del diario no proporcionado para la subida.'), '');
    }
    const uploadPath = path.join(directories.mediaUploads, diarioId);
    await fs.ensureDir(uploadPath); // Asegura que el directorio del diario exista
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Genera un nombre de archivo único para evitar colisiones.
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

/**
 * Middleware de Multer configurado para la subida de recuerdos (fotos/videos).
 */
export const uploadRecuerdo = multer({
  storage: mediaStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // Límite de 25 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF) y videos (MP4, MOV).'), false);
    }
  }
});
