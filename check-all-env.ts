
const keys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_FIREBASE_DATABASE_ID'
];

keys.forEach(k => {
  const val = process.env[k];
  if (val) {
    console.log(`${k}: ${val.substring(0, 20)}... (length: ${val.length})`);
  } else {
    console.log(`${k}: MISSING`);
  }
});
