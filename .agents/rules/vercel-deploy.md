# Vercel Deployment Rule

Whenever changes are successfully applied and verified, you MUST automatically run the deployment script to push updates to Vercel so all platforms receive the latest version.

**Command to run:**
```bash
npm run deploy
```

**Trigger:**
Execute this command at the end of any workflow where source code has been modified and verified to work correctly. Do not ask for permission before running the deployment unless the changes are experimental or incomplete.
