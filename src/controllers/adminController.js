
// @ts-check
'use strict';

import { dbGet, dbRun } from '../models/db.js';
import { validationResult } from 'express-validator';

/**
 * Obtiene la configuración global del sitio (solo para admins).
 */
export const getSiteSettings = async (req, res, next) => {
  try {
    const config = await dbGet('SELECT site_global_name, allow_new_registrations FROM configuracion_sitio WHERE id = 1');
    res.json(config || {});
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza la configuración global del sitio (solo para admins).
 */
export const updateSiteSettings = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { siteGlobalName, allowNewRegistrations } = req.body;
      await dbRun(
        'UPDATE configuracion_sitio SET site_global_name = ?, allow_new_registrations = ? WHERE id = 1',
        [siteGlobalName, allowNewRegistrations ? 1 : 0]
      );
      res.json({ message: 'Configuración del sitio actualizada con éxito.' });
    } catch (error) {
      next(error);
    }
};
