
// @ts-check
'use strict';

import { dbAll, dbGet, dbRun } from '../models/db.js';
import { validationResult } from 'express-validator';

/**
 * Crea un nuevo evento en un diario.
 */
export const createEvento = async (req, res, next) => {
    // El middleware checkDiarioAccess ya ha verificado el acceso general al diario.
    // Aquí verificamos si el rol permite la escritura.
    if (req.userRole !== 'owner' && req.userRole !== 'editor') {
      return res.status(403).json({ error: 'No tienes permiso para añadir eventos a este diario.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { fecha, hora, tipo, descripcion, cantidad, unidad, notas, favorito } = req.body;
      const result = await dbRun(
        'INSERT INTO eventos (diario_id, fecha, hora, tipo, descripcion, cantidad, unidad, notas, favorito) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        // req.diarioId es adjuntado por el middleware checkDiarioAccess
        [req.diarioId, fecha, hora, tipo, descripcion, cantidad, unidad, notas, favorito ? 1 : 0]
      );
      res.status(201).json({ message: 'Evento creado con éxito.', eventId: result.id });
    } catch (error) {
      next(error);
    }
};

/**
 * Obtiene una lista de eventos de un diario con filtros y paginación.
 */
export const getEventos = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, tipo, fechaInicio, fechaFin, favorito, searchQuery } = req.query;
    let sql = `SELECT * FROM eventos WHERE diario_id = ?`;
    let countSql = `SELECT COUNT(*) AS total FROM eventos WHERE diario_id = ?`;
    const params = [req.diarioId];
    const countParams = [req.diarioId];

    if (tipo) {
      sql += ` AND tipo = ?`;
      countSql += ` AND tipo = ?`;
      params.push(tipo);
      countParams.push(tipo);
    }
    if (fechaInicio) {
      sql += ` AND fecha >= ?`;
      countSql += ` AND fecha >= ?`;
      params.push(fechaInicio);
      countParams.push(fechaInicio);
    }
    if (fechaFin) {
      sql += ` AND fecha <= ?`;
      countSql += ` AND fecha <= ?`;
      params.push(fechaFin);
      countParams.push(fechaFin);
    }
    if (favorito === '1') {
      sql += ` AND favorito = 1`;
      countSql += ` AND favorito = 1`;
    }
    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      sql += ` AND (descripcion LIKE ? OR notas LIKE ?)`;
      countSql += ` AND (descripcion LIKE ? OR notas LIKE ?)`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
    }

    sql += ` ORDER BY fecha DESC, hora DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const eventos = await dbAll(sql, params);
    const totalResult = await dbGet(countSql, countParams);
    const total = totalResult ? totalResult.total : 0;

    res.json({ eventos, total });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un evento específico por su ID.
 */
export const getEventoById = async (req, res, next) => {
  try {
    const evento = await dbGet('SELECT * FROM eventos WHERE id = ? AND diario_id = ?', [req.params.id, req.diarioId]);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }
    res.json(evento);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un evento existente.
 */
export const updateEvento = async (req, res, next) => {
    if (req.userRole !== 'owner' && req.userRole !== 'editor') {
      return res.status(403).json({ error: 'No tienes permiso para editar eventos en este diario.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { fecha, hora, tipo, descripcion, cantidad, unidad, notas, favorito } = req.body;
      const result = await dbRun(
        'UPDATE eventos SET fecha = ?, hora = ?, tipo = ?, descripcion = ?, cantidad = ?, unidad = ?, notas = ?, favorito = ? WHERE id = ? AND diario_id = ?',
        [fecha, hora, tipo, descripcion, cantidad, unidad, notas, favorito ? 1 : 0, req.params.id, req.diarioId]
      );
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Evento no encontrado o no autorizado para actualizar.' });
      }
      res.json({ message: 'Evento actualizado con éxito.' });
    } catch (error) {
      next(error);
    }
};

/**
 * Elimina un evento.
 */
export const deleteEvento = async (req, res, next) => {
  if (req.userRole !== 'owner' && req.userRole !== 'editor') {
    return res.status(403).json({ error: 'No tienes permiso para eliminar eventos en este diario.' });
  }
  try {
    const result = await dbRun('DELETE FROM eventos WHERE id = ? AND diario_id = ?', [req.params.id, req.diarioId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Evento no encontrado o no autorizado para eliminar.' });
    }
    res.json({ message: 'Evento eliminado con éxito.' });
  } catch (error) {
    next(error);
  }
};
