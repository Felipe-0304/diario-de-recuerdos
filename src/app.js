// @ts-check
'use strict';

import express from 'express';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import dotenv from 'dotenv';
import multer from 'multer';
import cookieParser from 'cookie-parser';

import { directories } from './config/path.js';
import apiRouter from './routes/index.js';

// --- Configuración Inicial ---
dotenv.config();
const app = express();

// --- Middlewares ---
const SQLiteStore = connectSqlite3(session);

app.use(session({
  store: new SQLiteStore({
    db: 'sessions_v3.db', // Usamos la v3 para consistencia
    dir: directories.db,
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 semana
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(directories.public));

// --- Rutas de la API ---
// Todas las rutas de la API se gestionan a través de este router.
app.use('/api', apiRouter);

// Redirección de la raíz a la página principal
app.get('/', (req, res) => {
    res.redirect('/index.html');
});


// --- Manejo de Errores Global ---
app.use((err, req, res, next) => {
  console.error("Error en Express:", err.message);
  if (process.env.NODE_ENV !== 'production') console.error("Stack:", err.stack);
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Archivo demasiado grande. Límite: 25MB.` });
    return res.status(400).json({ error: `Error de subida: ${err.message}` });
  }
  
  // Errores personalizados que ya tenías
  if (err.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message.includes('ID del diario no proporcionado')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Ocurrió un error inesperado.' : err.message
  });
});

export default app;