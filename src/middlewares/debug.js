/**
 * Creates a middleware that logs a custom message on every request.
 *
 * @param {string} message - The message to log for each incoming request.
 */
export function log(message) {
  /**
   * Express middleware that logs incoming requests with a fixed prefix.
   *
   * @param {import('express').Request} req - The HTTP request object.
   * @param {import('express').Response} _res - The HTTP response object.
   * @param {import('express').NextFunction} next - Callback to pass control to the next middleware.
   */
  return function (req, _res, next) {
    console.log(`LOG: ${req.method} ${req.url} --> ${message}`);
    next();
  };
}
