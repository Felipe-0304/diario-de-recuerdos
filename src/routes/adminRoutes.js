
// @ts-check
'use strict';

import { Router } from 'express';
import { body } from 'express-validator';
import { getSiteSettings, updateSiteSettings } from '../controllers/adminController.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas en este archivo requieren que el usuario sea un administrador.
router.use(isAuthenticated, isAdmin);

// GET y PUT /api/admin/site-settings
router.route('/site-settings')
    .get(getSiteSettings)
    .put(
        body('siteGlobalName').trim().notEmpty().withMessage('El nombre global del sitio es requerido.'),
        body('allowNewRegistrations').isBoolean().withMessage('El valor para permitir nuevos registros debe ser booleano.'),
        updateSiteSettings
    );

export default router;
