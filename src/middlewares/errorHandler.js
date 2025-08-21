export default (err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    error: 'Error interno del servidor'
  });
};
