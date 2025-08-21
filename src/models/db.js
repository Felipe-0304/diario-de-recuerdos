// @ts-check
'use strict';

import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// La carpeta 'db' está dos niveles arriba de 'src/models'
const dbDirectory = path.join(__dirname, '..', '..', 'db');
const dbPath = path.join(dbDirectory, 'diario_v3.db');

// Asegurarse de que el directorio de la base de datos exista
fs.ensureDirSync(dbDirectory);

let db;

/**
 * Inicializa la conexión con la base de datos y crea las tablas si no existen.
 * @returns {Promise<void>}
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error al conectar a la base de datos:", err.message);
        return reject(err);
      }
      console.log('Conectado a la base de datos SQLite.');

      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT DEFAULT 'usuario',
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) return reject(err);
          console.log('Tabla "usuarios" verificada/creada.');
          db.run('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email)');
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS diarios (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            nombre_diario_personalizado TEXT NOT NULL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_nacimiento_bebe DATE,
            genero_bebe TEXT,
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) return reject(err);
          console.log('Tabla "diarios" verificada/creada.');
          db.run('CREATE INDEX IF NOT EXISTS idx_diarios_user_id ON diarios (user_id)');
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS diarios_compartidos (
            diario_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            rol TEXT NOT NULL, -- 'editor', 'lector'
            fecha_compartido DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (diario_id, user_id),
            FOREIGN KEY (diario_id) REFERENCES diarios(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) return reject(err);
          console.log('Tabla "diarios_compartidos" verificada/creada.');
          db.run('CREATE INDEX IF NOT EXISTS idx_diarios_compartidos_diario_id ON diarios_compartidos (diario_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_diarios_compartidos_user_id ON diarios_compartidos (user_id)');
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            diario_id TEXT NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            tipo TEXT NOT NULL,
            descripcion TEXT,
            cantidad REAL,
            unidad TEXT,
            notas TEXT,
            favorito INTEGER DEFAULT 0,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (diario_id) REFERENCES diarios(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) return reject(err);
          console.log('Tabla "eventos" verificada/creada.');
          db.run('CREATE INDEX IF NOT EXISTS idx_eventos_diario_id ON eventos (diario_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_eventos_fecha_hora ON eventos (fecha DESC, hora DESC)');
          db.run('CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos (tipo)');
          db.run('CREATE INDEX IF NOT EXISTS idx_eventos_favorito ON eventos (favorito)');
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS recuerdos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            diario_id TEXT NOT NULL,
            tipo TEXT NOT NULL, -- 'foto', 'video'
            url TEXT NOT NULL,
            thumbnail_url TEXT,
            fecha TEXT NOT NULL,
            descripcion TEXT,
            favorito INTEGER DEFAULT 0,
            fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (diario_id) REFERENCES diarios(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) return reject(err);
          console.log('Tabla "recuerdos" verificada/creada.');
          db.all("PRAGMA table_info(recuerdos)", (err, rows) => {
            if (err) return console.error("Error al verificar esquema de recuerdos:", err.message);
            const hasThumbnailUrl = rows.some(col => col.name === 'thumbnail_url');
            if (!hasThumbnailUrl) {
              db.run("ALTER TABLE recuerdos ADD COLUMN thumbnail_url TEXT", (err) => {
                if (err) console.error("Error al añadir columna thumbnail_url a recuerdos:", err.message);
                else console.log("Columna 'thumbnail_url' añadida a la tabla 'recuerdos'.");
              });
            }
          });
          db.run('CREATE INDEX IF NOT EXISTS idx_recuerdos_diario_id ON recuerdos (diario_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_recuerdos_fecha_subida ON recuerdos (fecha DESC, fecha_subida DESC)');
          db.run('CREATE INDEX IF NOT EXISTS idx_recuerdos_tipo ON recuerdos (tipo)');
          db.run('CREATE INDEX IF NOT EXISTS idx_recuerdos_favorito ON recuerdos (favorito)');
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS configuracion_usuario (
            user_id INTEGER PRIMARY KEY,
            color_primario TEXT,
            color_secundario TEXT,
            color_accento TEXT,
            color_fondo TEXT,
            color_tarjetas TEXT,
            color_texto TEXT,
            color_texto_claro TEXT,
            color_bordes TEXT,
            fuente_principal TEXT,
            tamano_fuente TEXT,
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) return reject(err);
          console.log('Tabla "configuracion_usuario" verificada/creada.');
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS configuracion_sitio (
            id INTEGER PRIMARY KEY DEFAULT 1,
            site_global_name TEXT DEFAULT 'Mi Pequeño Tesoro',
            allow_new_registrations INTEGER DEFAULT 1
          )
        `, (err) => {
          if (err) return reject(err);
          console.log('Tabla "configuracion_sitio" verificada/creada.');
          db.run(`INSERT OR IGNORE INTO configuracion_sitio (id, site_global_name, allow_new_registrations) VALUES (1, 'Mi Pequeño Tesoro', 1)`);
        });

        resolve();
      });
    });
  });
};

/**
 * Ejecuta una consulta SQL GET (espera una sola fila).
 * @param {string} sql
 * @param {any[]} [params=[]]
 * @returns {Promise<any>}
 */
export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Ejecuta una consulta SQL ALL (espera múltiples filas).
 * @param {string} sql
 * @param {any[]} [params=[]]
 * @returns {Promise<any[]>}
 */
export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

/**
 * Ejecuta una consulta SQL RUN (INSERT, UPDATE, DELETE).
 * @param {string} sql
 * @param {any[]} [params=[]]
 * @returns {Promise<{id: number, changes: number}>}
 */
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Devuelve la instancia de la base de datos para transacciones manuales si es necesario
export const getDbInstance = () => db;