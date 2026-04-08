# Vercel Deployment Setup Guide

To ensure your application runs correctly on Vercel, please follow these steps to configure your environment variables and deployment settings.

## 1. Environment Variables

Go to your Vercel Project Settings > Environment Variables and add the following:

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Your Firebase Project ID | `jai-hanuman-ai` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Service Account Email | `firebase-adminsdk-xxx@...` |
| `FIREBASE_PRIVATE_KEY` | Firebase Service Account Private Key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` |
| `JWT_SECRET` | Secret key for JWT authentication | `your-random-secret-string` |
| `VITE_API_URL` | (Optional) URL of your backend API | `/api` (default) |

### Important: Firebase Private Key
When pasting the `FIREBASE_PRIVATE_KEY` into Vercel:
1. **Copy the entire value** from the JSON file (the part between the quotes).
2. It should look like `-----BEGIN PRIVATE KEY-----\nMII... \n-----END PRIVATE KEY-----\n`.
3. **DO NOT** wrap it in extra quotes in the Vercel dashboard.
4. If you are using the Vercel CLI, use `vercel env add FIREBASE_PRIVATE_KEY`.
5. The application is designed to automatically handle literal `\n` characters and convert them to actual newlines.

### Troubleshooting "Failed to update configuration"
If you see this error:
1. Visit `https://your-app.vercel.app/api/health`.
2. Check if `firebase.firestore` is `true`.
3. If it is `false`, your environment variables are likely incorrect or missing.
4. Check the Vercel Function logs for "CRITICAL ERROR: Firebase Service Account initialization failed".

## 4. Local Development vs Production

- **Local**: Run `npm run dev` to start the Express server and Vite in middleware mode.
- **Production (Vercel)**: Vercel will build the frontend using `npm run build` and serve the backend via the `api/index.ts` serverless function.
