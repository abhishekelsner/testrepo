import mongoose from 'mongoose';

/** Respond with 503 if MongoDB is not connected. Use on routes that need the DB. */
export function requireDb(req, res, next) {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  res.status(503).json({
    error: 'Database unavailable',
    message: process.env.MONGODB_URI ? 'Database connection not ready.' : 'MONGODB_URI not set. Add it to server/.env (see server/env/.env.sample).',
  });
}
