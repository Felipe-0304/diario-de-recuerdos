
// @ts-check
'use strict';

import { dbGet } from '../models/db.js';

/**
 * Middleware para verificar si el usuario ha iniciado sesión.
 * Si no está autenticado, devuelve un error 401.
 */
export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'No autorizado. Se requiere iniciar sesión.' });
};

/**
 * Middleware para verificar si el usuario es administrador.
 * Debe usarse DESPUÉS de isAuthenticated.
 * Si no es admin, devuelve un error 403.
 */
export const isAdmin = async (req, res, next) => {
  try {
    const user = await dbGet('SELECT rol FROM usuarios WHERE id = ?', [req.session.userId]);
    if (user && user.rol === 'admin') {
      return next();
    }
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  } catch (error) {
    console.error("Error al verificar rol de admin:", error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
