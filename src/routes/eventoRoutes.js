// @ts-check
'use strict';

import { Router } from 'express';
import { body } from 'express-validator';
import {
    createEvento,
    getEventos,
    getEventoById,
    updateEvento,
    deleteEvento
} from '../controllers/eventoController.js';

// NOTA: Este router será montado bajo una ruta que ya contiene :diarioId,
// por ejemplo: /api/diarios/:diarioId/eventos.
// Por eso, necesitamos `mergeParams: true` para que este router pueda
// acceder al `req.params.diarioId` del router padre.
const router = Router({ mergeParams: true });

// Todas las rutas aquí ya han pasado por `isAuthenticated` y `checkDiarioAccess`
// en el router que monta este archivo, por lo que no es necesario repetirlos.

// === Rutas de Eventos ===

// GET y POST /api/diarios/:diarioId/eventos
router.route('/')
    .get(getEventos)
    .post(
        body('fecha').isISO8601().withMessage('Formato de fecha inválido.'),
        body('hora').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido.'),
        body('tipo').notEmpty().withMessage('El tipo de evento es requerido.'),
        createEvento
    );

// GET, PUT, DELETE /api/diarios/:diarioId/eventos/:id
router.route('/:id')
    .get(getEventoById)
    .put(
        body('fecha').isISO8601().withMessage('Formato de fecha inválido.'),
        body('hora').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido.'),
        body('tipo').notEmpty().withMessage('El tipo de evento es requerido.'),
        updateEvento
    )
    .delete(deleteEvento);

export default router;