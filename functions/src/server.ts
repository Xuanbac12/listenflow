import { app } from './index';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.ALLOWED_ORIGINS) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON and ALLOWED_ORIGINS before starting the production API.');
  }
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Production must not use Firebase emulators.');
}
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
const server = app.listen(port, '0.0.0.0', () => console.log(`ListenFlow API listening on port ${port}`));
process.on('SIGTERM', () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref(); });
