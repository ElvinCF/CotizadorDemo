export class AppError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message, code = null) => new AppError(message, 400, code);
export const unauthorized = (message, code = null) => new AppError(message, 401, code);
export const forbidden = (message, code = null) => new AppError(message, 403, code);
export const notFound = (message, code = null) => new AppError(message, 404, code);
export const conflict = (message, code = null) => new AppError(message, 409, code);

export const getErrorStatus = (error, fallback = 500) =>
  error instanceof AppError && Number.isInteger(error.statusCode) ? error.statusCode : fallback;
