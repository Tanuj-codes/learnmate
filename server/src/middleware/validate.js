import ApiError from '../utils/errors.js';

/**
 * Validates request parts against Zod schemas. Replaces params/query/body with
 * parsed values so controllers only see typed, sanitized input.
 */
export function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      next();
    } catch (error) {
      if (error?.issues) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.') || 'request',
          message: issue.message,
        }));
        return next(ApiError.unprocessable('Please check the highlighted fields.', details));
      }
      next(error);
    }
  };
}

export default validate;
