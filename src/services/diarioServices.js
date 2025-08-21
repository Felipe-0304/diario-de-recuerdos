export const crearEntrada = async (db, { fecha, texto }) => {
  const stmt = await db.prepare(
    'INSERT INTO diario (fecha, texto) VALUES (?, ?)'
  );
  const info = await stmt.run(fecha, texto);
  await stmt.finalize();
  return info.lastID;
};

export const obtenerEntradas = async (db) => {
  return db.all('SELECT id, fecha, texto FROM diario ORDER BY fecha DESC');
};
