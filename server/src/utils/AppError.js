/**
 * Centralized app error with statusCode for consistent API responses.
 * Controllers use: throw new AppError('Message', 403);
 * Global error handler reads err.statusCode and err.message.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}
