// @ts-check
'use strict';

import { dbAll, dbGet, dbRun } from '../models/db.js';
import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { directories } from '../config/path.js';

/**
 * Sube un nuevo recuerdo (foto/video) a un diario.
 */
export const createRecuerdo = async (req, res, next) => {
    if (req.userRole !== 'owner' && req.userRole !== 'editor') {
        return res.status(403).json({ error: 'No tienes permiso para subir recuerdos a este diario.' });
    }
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
        }

        const { fecha, descripcion, favorito } = req.body;
        const tipo = req.file.mimetype.startsWith('image/') ? 'foto' : 'video';
        const relativePath = path.relative(directories.public, req.file.path);
        const url = `/${relativePath.replace(/\\/g, '/')}`; // URL debe usar siempre barras inclinadas

        let thumbnailUrl = null;
        // Generar miniatura solo para fotos
        if (tipo === 'foto') {
            const thumbnailDir = path.join(directories.mediaUploads, req.diarioId, 'thumbnails');
            await fs.ensureDir(thumbnailDir);
            const thumbnailFilename = `thumb-${uuidv4()}.webp`;
            const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

            await sharp(req.file.path)
                .resize(300, 300, { fit: sharp.fit.inside, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(thumbnailPath);

            const relativeThumbnailPath = path.relative(directories.public, thumbnailPath);
            thumbnailUrl = `/${relativeThumbnailPath.replace(/\\/g, '/')}`;
        }

        const result = await dbRun(
            'INSERT INTO recuerdos (diario_id, tipo, url, thumbnail_url, fecha, descripcion, favorito) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.diarioId, tipo, url, thumbnailUrl, fecha, descripcion, favorito ? 1 : 0]
        );
        res.status(201).json({ message: 'Recuerdo subido con éxito.', recuerdoId: result.id, url: url, thumbnailUrl: thumbnailUrl });
    } catch (error) {
        console.error("Error al subir recuerdo:", error);
        next(error);
    }
};

/**
 * Obtiene una lista de recuerdos de un diario con filtros y paginación.
 */
export const getRecuerdos = async (req, res, next) => {
    try {
        const { limit = 12, offset = 0, tipo, favorito, searchQuery } = req.query;
        let sql = `SELECT * FROM recuerdos WHERE diario_id = ?`;
        let countSql = `SELECT COUNT(*) AS total FROM recuerdos WHERE diario_id = ?`;
        const params = [req.diarioId];
        const countParams = [req.diarioId];

        if (tipo) {
            sql += ` AND tipo = ?`;
            countSql += ` AND tipo = ?`;
            params.push(tipo);
            countParams.push(tipo);
        }
        if (favorito === '1') {
            sql += ` AND favorito = 1`;
            countSql += ` AND favorito = 1`;
        }
        if (searchQuery) {
            const searchPattern = `%${searchQuery}%`;
            sql += ` AND descripcion LIKE ?`;
            countSql += ` AND descripcion LIKE ?`;
            params.push(searchPattern);
            countParams.push(searchPattern);
        }

        sql += ` ORDER BY fecha DESC, fecha_subida DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit, 10), parseInt(offset, 10));

        const recuerdos = await dbAll(sql, params);
        const totalResult = await dbGet(countSql, countParams);
        const total = totalResult ? totalResult.total : 0;

        res.json({ recuerdos, total });
    } catch (error) {
        next(error);
    }
};

/**
 * Obtiene un recuerdo específico por su ID.
 */
export const getRecuerdoById = async (req, res, next) => {
    try {
        const recuerdo = await dbGet('SELECT * FROM recuerdos WHERE id = ? AND diario_id = ?', [req.params.id, req.diarioId]);
        if (!recuerdo) {
            return res.status(404).json({ error: 'Recuerdo no encontrado.' });
        }
        res.json(recuerdo);
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza la información de un recuerdo.
 */
export const updateRecuerdo = async (req, res, next) => {
    if (req.userRole !== 'owner' && req.userRole !== 'editor') {
        return res.status(403).json({ error: 'No tienes permiso para editar recuerdos en este diario.' });
    }
    try {
        const { fecha, descripcion, favorito } = req.body;
        const result = await dbRun(
            'UPDATE recuerdos SET fecha = ?, descripcion = ?, favorito = ? WHERE id = ? AND diario_id = ?',
            [fecha, descripcion, favorito ? 1 : 0, req.params.id, req.diarioId]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Recuerdo no encontrado o no autorizado para actualizar.' });
        }
        res.json({ message: 'Recuerdo actualizado con éxito.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina un recuerdo, incluyendo sus archivos físicos.
 */
export const deleteRecuerdo = async (req, res, next) => {
    if (req.userRole !== 'owner' && req.userRole !== 'editor') {
        return res.status(403).json({ error: 'No tienes permiso para eliminar recuerdos en este diario.' });
    }
    try {
        await dbRun('BEGIN TRANSACTION;');
        try {
            const recuerdo = await dbGet('SELECT url, thumbnail_url FROM recuerdos WHERE id = ? AND diario_id = ?', [req.params.id, req.diarioId]);
            if (!recuerdo) {
                throw new Error('Recuerdo no encontrado o no autorizado para eliminar.');
            }

            // Eliminar archivo y miniatura
            const filePath = path.join(directories.public, recuerdo.url);
            if (fs.existsSync(filePath)) await fs.remove(filePath);

            if (recuerdo.thumbnail_url) {
                const thumbnailPath = path.join(directories.public, recuerdo.thumbnail_url);
                if (fs.existsSync(thumbnailPath)) await fs.remove(thumbnailPath);
            }

            const result = await dbRun('DELETE FROM recuerdos WHERE id = ? AND diario_id = ?', [req.params.id, req.diarioId]);
            if (result.changes === 0) {
                throw new Error('La eliminación en la BD falló después de borrar archivos.');
            }
            await dbRun('COMMIT;');
            res.json({ message: 'Recuerdo eliminado con éxito.' });
        } catch (innerError) {
            await dbRun('ROLLBACK;');
            throw innerError;
        }
    } catch (error) {
        next(error);
    }
};
