// Vercel serverless function: every /api/* request is rewritten here (see vercel.json).
// The built frontend in dist/ is served by Vercel's CDN.
import { appFromEnv } from '../server/config.js';

const { app } = appFromEnv();
export default app;
