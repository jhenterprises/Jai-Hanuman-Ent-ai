import app, { auth as libAuth, db as libDb, googleProvider as libGoogleProvider } from '../lib/firebase';

export const auth = libAuth;
export const db = libDb;
export const googleProvider = libGoogleProvider;

export default app;
