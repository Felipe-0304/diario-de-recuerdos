// @ts-check
'use strict';

import { Router } from 'express';
import { body } from 'express-validator';
import {
    createDiario,
    getMisDiarios,
    getDiarioById,
    updateDiario,
    deleteDiario,
    setActiveDiario,
    getActiveDiario,
    shareDiario,
    getSharedUsers,
    unshareDiario
} from '../controllers/diarioController.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { checkDiarioAccess } from '../middlewares/diario.js';
import eventoRoutes from './eventoRoutes.js';
import recuerdoRoutes from './recuerdoRoutes.js';

const router = Router();

// Todas las rutas en este archivo requieren que el usuario esté autenticado.
router.use(isAuthenticated);

// === Rutas de Diarios ===

router.route('/')
    .get(getMisDiarios)
    .post(
        body('nombre_diario_personalizado').trim().notEmpty().withMessage('El nombre del diario es requerido.'),
        createDiario
    );

router.get('/active', getActiveDiario);
router.post('/set-active/:diarioId', checkDiarioAccess, setActiveDiario);

router.route('/:diarioId')
    .get(checkDiarioAccess, getDiarioById)
    .put(
        checkDiarioAccess,
        body('nombre_diario_personalizado').trim().notEmpty().withMessage('El nombre del diario es requerido.'),
        updateDiario
    )
    .delete(checkDiarioAccess, deleteDiario);

// === Rutas para Compartir ===

router.post('/:diarioId/share',
    checkDiarioAccess,
    body('email_invitado').isEmail().withMessage('El email del invitado no es válido.'),
    body('rol_asignado').isIn(['editor', 'lector']).withMessage('Rol asignado no válido.'),
    shareDiario
);

router.get('/:diarioId/shared-users', checkDiarioAccess, getSharedUsers);
router.delete('/:diarioId/shared-users/:userIdToUnshare', checkDiarioAccess, unshareDiario);

// === Montaje de Rutas Anidadas ===
// Montamos las rutas de eventos y recuerdos aquí para que hereden el /:diarioId
router.use('/:diarioId/eventos', checkDiarioAccess, eventoRoutes);
router.use('/:diarioId/recuerdos', checkDiarioAccess, recuerdoRoutes);

export default router;