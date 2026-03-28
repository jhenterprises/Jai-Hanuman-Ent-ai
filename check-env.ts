
console.log('--- Environment Variable Check ---');
console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? 'EXISTS (length: ' + process.env.FIREBASE_API_KEY.length + ')' : 'MISSING');
console.log('VITE_FIREBASE_API_KEY:', process.env.VITE_FIREBASE_API_KEY ? 'EXISTS (length: ' + process.env.VITE_FIREBASE_API_KEY.length + ')' : 'MISSING');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'MISSING');
console.log('---------------------------------');
