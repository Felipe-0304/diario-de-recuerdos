// @ts-check
'use strict';

import { dbAll, dbGet, dbRun } from '../models/db.js';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import { directories } from '../config/path.js';

/**
 * Crea un nuevo diario para el usuario autenticado.
 */
export const createDiario = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { nombre_diario_personalizado, fecha_nacimiento_bebe, genero_bebe } = req.body;
      const diarioId = uuidv4();
      await dbRun(
        'INSERT INTO diarios (id, user_id, nombre_diario_personalizado, fecha_nacimiento_bebe, genero_bebe) VALUES (?, ?, ?, ?, ?)',
        [diarioId, req.session.userId, nombre_diario_personalizado, fecha_nacimiento_bebe, genero_bebe]
      );
      // Establece el nuevo diario como activo en la sesión del usuario.
      req.session.activeDiarioId = diarioId;
      res.status(201).json({ message: 'Diario creado con éxito.', diarioId: diarioId });
    } catch (error) {
      next(error);
    }
};

/**
 * Obtiene todos los diarios asociados al usuario (propios y compartidos).
 */
export const getMisDiarios = async (req, res, next) => {
  try {
    const diarios = await dbAll(
      `SELECT d.id, d.nombre_diario_personalizado, d.fecha_nacimiento_bebe, d.genero_bebe,
              CASE WHEN d.user_id = ? THEN 'owner' ELSE dc.rol END AS rol_usuario
       FROM diarios d
       LEFT JOIN diarios_compartidos dc ON d.id = dc.diario_id AND dc.user_id = ?
       WHERE d.user_id = ? OR dc.user_id = ?
       ORDER BY d.fecha_creacion DESC`,
      [req.session.userId, req.session.userId, req.session.userId, req.session.userId]
    );
    res.json(diarios);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un diario específico por su ID.
 */
export const getDiarioById = async (req, res, next) => {
  try {
    // El middleware checkDiarioAccess ya verificó el acceso y estableció req.diarioId y req.userRole
    const diario = await dbGet('SELECT id, nombre_diario_personalizado, fecha_nacimiento_bebe, genero_bebe FROM diarios WHERE id = ?', [req.diarioId]);
    if (!diario) {
      return res.status(404).json({ error: 'Diario no encontrado.' });
    }
    // Incluye el rol del usuario para este diario en la respuesta
    res.json({ ...diario, userRole: req.userRole }); 
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un diario existente.
 */
export const updateDiario = async (req, res, next) => {
    // El middleware ya verificó el acceso, aquí solo verificamos el rol
    if (req.userRole !== 'owner' && req.userRole !== 'editor') {
      return res.status(403).json({ error: 'No tienes permiso para editar este diario.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { nombre_diario_personalizado, fecha_nacimiento_bebe, genero_bebe } = req.body;
      await dbRun(
        'UPDATE diarios SET nombre_diario_personalizado = ?, fecha_nacimiento_bebe = ?, genero_bebe = ? WHERE id = ?',
        [nombre_diario_personalizado, fecha_nacimiento_bebe, genero_bebe, req.diarioId]
      );
      res.json({ message: 'Diario actualizado con éxito.' });
    } catch (error) {
      next(error);
    }
};

/**
 * Elimina un diario.
 */
export const deleteDiario = async (req, res, next) => {
  if (req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Solo el propietario puede eliminar un diario.' });
  }
  try {
    // Usamos una transacción para asegurar que la eliminación del directorio y de la BD sea atómica
    await dbRun('BEGIN TRANSACTION;');
    try {
      // Eliminar la carpeta de medios asociada
      const mediaDir = path.join(directories.mediaUploads, req.diarioId);
      if (fs.existsSync(mediaDir)) {
        await fs.remove(mediaDir);
        console.log(`Directorio de medios eliminado: ${mediaDir}`);
      }

      const result = await dbRun('DELETE FROM diarios WHERE id = ?', [req.diarioId]);
      if (result.changes === 0) {
        throw new Error('Diario no encontrado o no autorizado para eliminar.');
      }

      // Si el diario eliminado era el activo, se limpia de la sesión
      if (req.session.activeDiarioId === req.diarioId) {
        delete req.session.activeDiarioId;
      }
      await dbRun('COMMIT;');
      res.json({ message: 'Diario eliminado con éxito.' });
    } catch (innerError) {
      await dbRun('ROLLBACK;');
      throw innerError; // Re-lanzar para que el manejador de errores global lo capture
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Establece un diario como activo en la sesión del usuario.
 */
export const setActiveDiario = async (req, res) => {
  // El middleware checkDiarioAccess ya verifica que el usuario tenga acceso al diario
  req.session.activeDiarioId = req.diarioId;
  res.json({ message: `Diario ${req.diarioId} establecido como activo.` });
};

/**
 * Obtiene el diario activo actual de la sesión.
 */
export const getActiveDiario = async (req, res, next) => {
  try {
    if (req.session.activeDiarioId) {
      const diario = await dbGet('SELECT id, nombre_diario_personalizado FROM diarios WHERE id = ?', [req.session.activeDiarioId]);
      if (diario) {
        return res.json(diario);
      }
    }
    res.json(null); // No hay diario activo o no se encontró
  } catch (error) {
    next(error);
  }
};

/**
 * Comparte un diario con otro usuario.
 */
export const shareDiario = async (req, res, next) => {
    if (req.userRole !== 'owner') {
      return res.status(403).json({ error: 'Solo el propietario puede compartir un diario.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { email_invitado, rol_asignado } = req.body;
      const invitado = await dbGet('SELECT id FROM usuarios WHERE email = ?', [email_invitado]);

      if (!invitado) {
        return res.status(404).json({ error: 'El usuario invitado no existe.' });
      }
      if (invitado.id === req.session.userId) {
        return res.status(400).json({ error: 'No puedes compartir un diario contigo mismo.' });
      }

      await dbRun(
        'INSERT OR REPLACE INTO diarios_compartidos (diario_id, user_id, rol) VALUES (?, ?, ?)',
        [req.diarioId, invitado.id, rol_asignado]
      );
      res.json({ message: 'Diario compartido/rol actualizado con éxito.' });
    } catch (error) {
      next(error);
    }
};

/**
 * Obtiene la lista de usuarios con los que se comparte un diario.
 */
export const getSharedUsers = async (req, res, next) => {
  if (req.userRole !== 'owner' && req.userRole !== 'editor') {
    return res.status(403).json({ error: 'No tienes permiso para ver los usuarios compartidos.' });
  }
  try {
    const sharedUsers = await dbAll(
      `SELECT u.id, u.nombre, u.email, dc.rol
       FROM diarios_compartidos dc
       JOIN usuarios u ON dc.user_id = u.id
       WHERE dc.diario_id = ?`,
      [req.diarioId]
    );
    res.json(sharedUsers);
  } catch (error) {
    next(error);
  }
};

/**
 * Deja de compartir un diario con un usuario específico.
 */
export const unshareDiario = async (req, res, next) => {
  if (req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Solo el propietario puede dejar de compartir un diario.' });
  }
  try {
    const { userIdToUnshare } = req.params;
    if (parseInt(userIdToUnshare, 10) === req.session.userId) {
      return res.status(400).json({ error: 'No puedes dejar de compartir el diario contigo mismo.' });
    }

    await dbRun(
      'DELETE FROM diarios_compartidos WHERE diario_id = ? AND user_id = ?',
      [req.diarioId, userIdToUnshare]
    );
    res.json({ message: 'Diario dejado de compartir con el usuario.' });
  } catch (error) {
    next(error);
  }
};