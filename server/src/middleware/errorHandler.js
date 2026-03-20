export function errorHandler(err, req, res, next) {
  console.error(err);

  const isDbError =
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseServerSelectionError' ||
    (err.message && err.message.includes('MongoNetworkError'));

  const status =
    err.statusCode ?? err.status ?? (isDbError ? 503 : 500);
  const message =
    err.statusCode ?? err.status
      ? err.message
      : isDbError
        ? 'Database unavailable. Set MONGODB_URI in server/.env and ensure MongoDB is running.'
        : err.message || 'Internal server error';

  res.status(status).json({ error: message });
}
