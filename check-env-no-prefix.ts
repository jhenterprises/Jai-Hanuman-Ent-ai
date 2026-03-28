
const key = process.env.FIREBASE_API_KEY;
if (key) {
  console.log('FIREBASE_API_KEY (first 20):', key.substring(0, 20));
} else {
  console.log('FIREBASE_API_KEY is MISSING');
}
