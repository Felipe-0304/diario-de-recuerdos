
// @ts-check
'use strict';

import bcrypt from 'bcrypt';
import { dbGet, dbRun } from '../models/db.js';
import { validationResult } from 'express-validator';

/**
 * Registra un nuevo usuario.
 */
export const registerUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const siteConfig = await dbGet('SELECT allow_new_registrations FROM configuracion_sitio WHERE id = 1');
      if (!siteConfig || !siteConfig.allow_new_registrations) {
        return res.status(403).json({ error: 'El registro de nuevos usuarios está deshabilitado.' });
      }

      const { nombre, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await dbRun('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, hashedPassword]);
      req.session.userId = result.id;
      res.status(201).json({ message: 'Usuario registrado con éxito.', userId: result.id });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed: usuarios.email')) {
        return res.status(409).json({ error: 'El email ya está registrado.' });
      }
      next(error);
    }
};

/**
 * Inicia sesión para un usuario existente.
 */
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await dbGet('SELECT id, password FROM usuarios WHERE email = ?', [email]);
    console.log('User found:', !!user);
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    req.session.userId = user.id;
    req.session.save(err => {
      if (err) {
        return next(err);
      }
      res.json({ message: 'Inicio de sesión exitoso.', userId: user.id });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cierra la sesión del usuario.
 */
export const logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error al cerrar sesión:", err);
      return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
    }
    res.clearCookie('connect.sid'); // Limpiar la cookie de sesión
    res.json({ message: 'Sesión cerrada.' });
  });
};

/**
 * Verifica el estado de la sesión actual y devuelve los datos del usuario.
 */
export const checkSession = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await dbGet('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?', [req.session.userId]);
      if (user) {
        let activeDiario = null;
        if (req.session.activeDiarioId) {
          activeDiario = await dbGet('SELECT id, nombre_diario_personalizado FROM diarios WHERE id = ?', [req.session.activeDiarioId]);
        }
        res.json({
          isAuthenticated: true,
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
          },
          activeDiario: activeDiario
        });
      } else {
        // Si el ID de usuario en la sesión no corresponde a un usuario real, se destruye la sesión.
        req.session.destroy(() => res.json({ isAuthenticated: false }));
      }
    } catch (error) {
      next(error);
    }
  } else {
    res.json({ isAuthenticated: false });
  }
};
