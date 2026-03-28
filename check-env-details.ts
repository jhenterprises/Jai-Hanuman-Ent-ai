
const key = process.env.VITE_FIREBASE_API_KEY;
if (key) {
  console.log('VITE_FIREBASE_API_KEY (first 20):', key.substring(0, 20));
  console.log('VITE_FIREBASE_API_KEY (last 20):', key.substring(key.length - 20));
  try {
    const parsed = JSON.parse(key);
    console.log('VITE_FIREBASE_API_KEY is a JSON object with keys:', Object.keys(parsed));
  } catch (e) {
    console.log('VITE_FIREBASE_API_KEY is NOT a JSON object');
  }
} else {
  console.log('VITE_FIREBASE_API_KEY is MISSING');
}
