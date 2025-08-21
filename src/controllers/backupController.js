
// @ts-check
'use strict';

import { dbGet, dbAll } from '../models/db.js';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { directories } from '../config/path.js';

/**
 * Exporta los datos de un diario (DB y archivos) a un archivo ZIP.
 */
export const exportDiario = async (req, res, next) => {
  // El middleware checkDiarioAccess ya se ha ejecutado.
  // Solo el propietario puede exportar.
  if (req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Solo el propietario puede exportar el diario.' });
  }

  const diarioId = req.diarioId;
  const backupDir = path.join(directories.temp, `backup_${diarioId}_${Date.now()}`);
  const dataDir = path.join(backupDir, 'data');
  const mediaBackupDir = path.join(backupDir, 'media');
  const outputZipPath = path.join(directories.temp, `diario_backup_${diarioId}.zip`);

  try {
    // 1. Crear directorios temporales para el backup
    await fs.ensureDir(dataDir);
    await fs.ensureDir(mediaBackupDir);

    // 2. Exportar datos de la base de datos a archivos JSON
    const diarioData = await dbGet('SELECT * FROM diarios WHERE id = ?', [diarioId]);
    const eventosData = await dbAll('SELECT * FROM eventos WHERE diario_id = ?', [diarioId]);
    const recuerdosData = await dbAll('SELECT * FROM recuerdos WHERE diario_id = ?', [diarioId]);
    const sharedUsersData = await dbAll('SELECT * FROM diarios_compartidos WHERE diario_id = ?', [diarioId]);

    await fs.writeJson(path.join(dataDir, 'diario.json'), diarioData || {});
    await fs.writeJson(path.join(dataDir, 'eventos.json'), eventosData);
    await fs.writeJson(path.join(dataDir, 'recuerdos.json'), recuerdosData);
    await fs.writeJson(path.join(dataDir, 'diarios_compartidos.json'), sharedUsersData);

    // 3. Copiar archivos de medios
    const sourceMediaDir = path.join(directories.mediaUploads, diarioId);
    if (fs.existsSync(sourceMediaDir)) {
      await fs.copy(sourceMediaDir, mediaBackupDir);
    }

    // 4. Crear archivo ZIP
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Archivo ZIP creado: ${archive.pointer()} total bytes`);
      res.download(outputZipPath, `diario_backup_${diarioId}.zip`, async (err) => {
        if (err) {
          console.error("Error al enviar el archivo ZIP:", err);
        }
        // Limpiar siempre los archivos temporales después de la descarga (o si falla)
        await fs.remove(backupDir);
        await fs.remove(outputZipPath);
        console.log(`Archivos temporales de backup eliminados.`);
      });
    });

    archive.on('error', (err) => { throw err; });
    archive.pipe(output);
    archive.directory(backupDir, false);
    await archive.finalize();

  } catch (error) {
    console.error("Error en la exportación del diario:", error);
    // Asegurarse de limpiar directorios temporales en caso de error
    await fs.remove(backupDir).catch(err => console.error("Error al limpiar backupDir en el catch principal:", err));
    await fs.remove(outputZipPath).catch(err => console.error("Error al limpiar outputZipPath en el catch principal:", err));
    next(error);
  }
};
