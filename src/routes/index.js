// @ts-check
'use strict';

import { Router } from 'express';
import authRoutes from './authRoutes.js';
import diarioRoutes from './diarioRoutes.js';
import configuracionRoutes from './configuracionRoutes.js';
import adminRoutes from './adminRoutes.js';
import backupRoutes from './backupRoutes.js';

const apiRouter = Router();

// Montar cada conjunto de rutas bajo su prefijo correspondiente.
apiRouter.use('/auth', authRoutes);
apiRouter.use('/configuracion', configuracionRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/backup', backupRoutes);

// El router de diarios ya se encarga de montar internamente 
// sus propias rutas anidadas (eventos, recuerdos).
apiRouter.use('/diarios', diarioRoutes);

export default apiRouter;