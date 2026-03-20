/**
 * Log every request: method, url, status code, duration.
 * Skips in test or when LOG_REQUESTS=false.
 */
export function requestLogger(req, res, next) {
  if (process.env.LOG_REQUESTS === 'false') return next();

  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const out = status >= 400 ? 'stderr' : 'stdout';
    const log = `[${new Date().toISOString()}] ${method} ${url} ${status} ${ms}ms`;
    if (out === 'stderr') {
      console.error(log);
    } else {
      console.log(log);
    }
  });
  next();
}
