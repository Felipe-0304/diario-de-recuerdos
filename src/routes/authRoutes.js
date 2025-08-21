
// @ts-check
'use strict';

import { Router } from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, logoutUser, checkSession } from '../controllers/authController.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = Router();

// === Rutas de Autenticación y Usuarios ===

// POST /api/auth/registro
router.post('/registro',
  // Validación de los datos de entrada
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido.'),
  body('email').isEmail().withMessage('El email no es válido.'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
  registerUser
);

// POST /api/auth/login
router.post('/login', loginUser);

// POST /api/auth/logout
router.post('/logout', isAuthenticated, logoutUser);

// GET /api/auth/check-session
router.get('/check-session', checkSession);

export default router;
