import type { RequestHandler } from 'express';

export function corsMiddleware(origins: string): RequestHandler {
  const allowed = new Set(origins.split(',').map(s => s.trim()).filter(Boolean));
  return (req, res, next) => {
    const origin = req.headers.origin;
    // Empty allowlist preserves the same-origin Firebase Hosting/emulator deployment.
    if (allowed.size && origin) {
      res.vary('Origin');
      if (!allowed.has(origin)) { res.status(403).json({error:'Origin is not allowed.'}); return; }
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization,Content-Type');
      res.set('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    next();
  };
}
