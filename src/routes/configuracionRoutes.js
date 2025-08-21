
// @ts-check
'use strict';

import { Router } from 'express';
import { getUserConfig, updateUserConfig } from '../controllers/configuracionController.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas de configuración de usuario requieren autenticación
router.use(isAuthenticated);

// GET y PUT /api/configuracion/usuario
router.route('/usuario')
    .get(getUserConfig)
    .put(updateUserConfig);

export default router;
