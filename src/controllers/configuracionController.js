
// @ts-check
'use strict';

import { dbGet, dbRun } from '../models/db.js';

/**
 * Obtiene la configuración de apariencia para el usuario autenticado.
 */
export const getUserConfig = async (req, res, next) => {
  try {
    const config = await dbGet('SELECT * FROM configuracion_usuario WHERE user_id = ?', [req.session.userId]);
    res.json(config || {}); // Devuelve un objeto vacío si no hay configuración
  } catch (error) {
    next(error);
  }
};

/**
 * Guarda o actualiza la configuración de apariencia para el usuario autenticado.
 */
export const updateUserConfig = async (req, res, next) => {
  try {
    const {
      color_primario, color_secundario, color_accento, color_fondo,
      color_tarjetas, color_texto, color_texto_claro, color_bordes,
      fuente_principal, tamano_fuente
    } = req.body;

    await dbRun(
      `INSERT OR REPLACE INTO configuracion_usuario (
        user_id, color_primario, color_secundario, color_accento, color_fondo,
        color_tarjetas, color_texto, color_texto_claro, color_bordes,
        fuente_principal, tamano_fuente
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId, color_primario, color_secundario, color_accento, color_fondo,
        color_tarjetas, color_texto, color_texto_claro, color_bordes,
        fuente_principal, tamano_fuente
      ]
    );
    res.json({ message: 'Configuración de usuario guardada con éxito.' });
  } catch (error) {
    next(error);
  }
};
