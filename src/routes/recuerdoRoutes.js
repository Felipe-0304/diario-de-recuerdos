
// @ts-check
'use strict';

import { Router } from 'express';
import {
    createRecuerdo,
    getRecuerdos,
    getRecuerdoById,
    updateRecuerdo,
    deleteRecuerdo
} from '../controllers/recuerdoController.js';
import { uploadRecuerdo } from '../middlewares/upload.js';

// Router para rutas anidadas bajo /api/diarios/:diarioId/recuerdos
const router = Router({ mergeParams: true });

// El middleware de subida de archivos se aplica solo a la ruta de creación.
router.route('/')
    .post(uploadRecuerdo.single('media'), createRecuerdo)
    .get(getRecuerdos);

router.route('/:id')
    .get(getRecuerdoById)
    .put(updateRecuerdo)
    .delete(deleteRecuerdo);

export default router;
