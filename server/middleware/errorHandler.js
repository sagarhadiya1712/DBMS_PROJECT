function errorHandler(err, req, res, next) {
  console.error('🔥 Server Error:', err);

  // SQLite Constraint Violations
  if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      error: 'Data conflict: a record with these unique details already exists.'
    });
  }

  // Zod Validation Errors
  if (err.name === 'ZodError') {
    const firstMsg = err.errors[0]?.message || 'Validation failed';
    return res.status(400).json({
      error: firstMsg,
      message: firstMsg,
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error occurred. Please try again later.'
  });
}

module.exports = errorHandler;
