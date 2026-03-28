
const appId = process.env.VITE_FIREBASE_APP_ID;
if (appId) {
  console.log('VITE_FIREBASE_APP_ID:', appId);
} else {
  console.log('VITE_FIREBASE_APP_ID is MISSING');
}
