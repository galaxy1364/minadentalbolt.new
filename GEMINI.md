# Automatic Vercel Production Deployment Instructions

## 1. Automatic Vercel Production Deployment (MANDATORY)
After ANY code modification, enhancement, or bug fix:
1. Ensure the code builds and tests pass: `npm test`
2. Commit and push the changes to GitHub `origin main`:
   ```bash
   git add -A
   git commit -m "..."
   git push origin main
   ```
3. **Trigger Automatic Vercel Production Deployment**:
   ```bash
   npm run deploy
   ```
   or:
   ```bash
   node scripts/deploy-vercel.mjs
   ```

## 2. Permanent Credentials & Tokens
The project deployment credentials must ALWAYS be preserved and loaded from `.env.local`:
- **VERCEL_TOKEN**: Persistently saved in `.env.local` (local disk)
- **VERCEL_TEAM_ID**: `team_K4mkyTW2Ju9Xqg9uR39S3c3d`
- **VERCEL_PROJECT_ID**: `prj_aaz8FPTn53zNAzHEE2Rfw1Lr28Pq`
- **VERCEL_PROJECT_NAME**: `minadentalbolt-new`
- **VERCEL_ORG**: `galaxymehdi1364-6831s-projects`
- **Production Live URL**: `https://minadentalbolt-new.vercel.app`

DO NOT ask the user for this token again; always execute the automatic deploy pipeline autonomously.
