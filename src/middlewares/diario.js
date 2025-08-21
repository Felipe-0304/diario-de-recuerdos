
// @ts-check
'use strict';

import { dbGet } from '../models/db.js';

/**
 * Middleware para verificar que un usuario tiene acceso a un diario específico.
 * Adjunta `req.diarioId` y `req.userRole` (`owner`, `editor`, `lector`) al objeto de solicitud.
 * El ID del diario se busca en los parámetros de la ruta, el cuerpo de la solicitud o la query.
 */
export const checkDiarioAccess = async (req, res, next) => {
  // Obtener diarioId de params, body o query para flexibilidad
  const diarioId = req.params.diarioId || req.body.diario_id || req.query.diario_id;
  
  if (!diarioId) {
    return res.status(400).json({ error: 'ID del diario no proporcionado en la petición.' });
  }

  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'No autorizado para esta acción.' });
  }

  try {
    // 1. Verificar si el usuario es el propietario del diario
    const isOwner = await dbGet('SELECT id FROM diarios WHERE id = ? AND user_id = ?', [diarioId, req.session.userId]);
    if (isOwner) {
      req.diarioId = diarioId; // Adjuntar diarioId al request para uso posterior
      req.userRole = 'owner';   // Adjuntar el rol del usuario para este diario
      return next();
    }

    // 2. Si no es propietario, verificar si tiene acceso compartido
    const sharedAccess = await dbGet('SELECT rol FROM diarios_compartidos WHERE diario_id = ? AND user_id = ?', [diarioId, req.session.userId]);
    if (sharedAccess) {
      req.diarioId = diarioId;
      req.userRole = sharedAccess.rol;
      return next();
    }

    // 3. Si no es ninguna de las anteriores, no tiene acceso
    return res.status(403).json({ error: 'Acceso denegado al diario especificado.' });
  } catch (error) {
    console.error("Error al verificar acceso al diario:", error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
