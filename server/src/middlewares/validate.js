const { errorResponse } = require('../utils/response');

/**
 * Validate request against a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} property
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[property]);
      req[property] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const validationErrors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return errorResponse(res, 'Validation error', 400, validationErrors);
      }
      return errorResponse(res, 'Invalid request payload', 400);
    }
  };
};

module.exports = {
  validate,
};
