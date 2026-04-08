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
When pasting the `FIREBASE_PRIVATE_KEY`, make sure it includes the `\n` characters if you are pasting it as a single line, or ensure Vercel handles the multi-line string correctly. The application is designed to handle both literal `\n` and actual newlines.

## 2. Deployment Configuration

The project includes a `vercel.json` file that configures:
- **API Routes**: All `/api/*` requests are routed to the Express server.
- **Static Assets**: The React frontend is served from the `dist` directory.

## 3. Troubleshooting "Services temporarily unavailable"

If you still see this message:
1. **Check Vercel Logs**: Look for "CRITICAL: Firestore 'db' is not initialized" or other Firebase errors.
2. **Verify Firebase Credentials**: Ensure the Service Account has "Cloud Datastore User" or "Firebase Admin" permissions.
3. **Database ID**: If you are using a named Firestore database (not `(default)`), ensure `FIREBASE_DATABASE_ID` is set or correctly picked up from `firebase-applet-config.json`.

## 4. Local Development vs Production

- **Local**: Run `npm run dev` to start the Express server and Vite in middleware mode.
- **Production (Vercel)**: Vercel will build the frontend using `npm run build` and serve the backend via the `api/index.ts` serverless function.
