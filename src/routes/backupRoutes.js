
// @ts-check
'use strict';

import { Router } from 'express';
import { exportDiario } from '../controllers/backupController.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { checkDiarioAccess } from '../middlewares/diario.js';

const router = Router();

// La ruta de backup requiere autenticación y acceso al diario específico
// POST /api/backup/export/:diarioId
router.post('/export/:diarioId', isAuthenticated, checkDiarioAccess, exportDiario);

export default router;
