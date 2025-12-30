# GitHub Actions CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Current Workflows

### `ci.yml` - Continuous Integration

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
1. **Frontend** - Lints and builds the Next.js frontend
2. **Backend** - Validates backend code syntax
3. **Security** - Runs npm audit for vulnerability checks
4. **Secrets Check** - Scans for hardcoded API keys or secrets
5. **Environment Check** - Verifies .env files are not committed
6. **Docker Compose** - Validates docker-compose.yml syntax
7. **TypeScript** - Type checks the frontend TypeScript code

## Adding Tests

When you're ready to add tests, you can:

1. **Add test scripts to package.json:**
   ```json
   {
     "scripts": {
       "test": "jest",
       "test:watch": "jest --watch"
     }
   }
   ```

2. **Add a test job to ci.yml:**
   ```yaml
   test:
     name: Run Tests
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
         with:
           node-version: '20'
       - run: npm ci
       - run: npm test
   ```

## Deployment Workflows

When ready for deployment, you can add:

- `deploy-staging.yml` - Deploy to staging environment
- `deploy-production.yml` - Deploy to production environment

These can be triggered manually or on tags/releases.

## Environment Variables

For workflows that need secrets (like deployment), add them in:
**Repository Settings → Secrets and variables → Actions**

Common secrets needed:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `GOOGLE_CLOUD_PROJECT_ID`
- API keys (Polygon, CoinGecko, etc.)

