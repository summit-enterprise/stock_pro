# CI/CD Pipeline Setup

## Overview

A GitHub Actions CI pipeline has been set up to automatically validate code quality, security, and buildability on every push and pull request.

## What Gets Checked

### ✅ Code Quality
- **Frontend Linting**: ESLint checks for Next.js/React code
- **TypeScript Type Checking**: Validates type safety
- **Backend Syntax**: Validates JavaScript syntax

### ✅ Build Validation
- **Frontend Build**: Ensures Next.js app builds successfully
- **Backend Validation**: Checks backend code structure

### ✅ Security
- **npm Audit**: Scans for known vulnerabilities in dependencies
- **Secrets Detection**: Warns if API keys or secrets are hardcoded
- **Environment Files**: Ensures .env files are not committed

### ✅ Infrastructure
- **Docker Compose**: Validates docker-compose.yml syntax

## Workflow File

Located at: `.github/workflows/ci.yml`

## How It Works

1. **Triggers**: Runs on push/PR to `main` or `develop` branches
2. **Parallel Jobs**: All checks run in parallel for speed
3. **Status Badge**: Shows pass/fail status on GitHub

## Viewing Results

1. Go to your GitHub repository
2. Click the **Actions** tab
3. See all workflow runs and their status
4. Click any run to see detailed logs

## Adding a Status Badge

Add this to your README.md:

```markdown
![CI](https://github.com/summit-enterprise/stock_pro/workflows/CI%20Pipeline/badge.svg)
```

## Next Steps

### When Ready for Tests
1. Add test framework (Jest, Vitest, etc.)
2. Write unit/integration tests
3. Add test job to `ci.yml`

### When Ready for Deployment
1. Create `deploy-staging.yml` workflow
2. Create `deploy-production.yml` workflow
3. Add GitHub Secrets for deployment credentials
4. Configure deployment triggers

## GitHub Secrets Setup

For deployment workflows, you'll need to add secrets:

**Repository → Settings → Secrets and variables → Actions**

Common secrets:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- API keys (Polygon, CoinGecko, YouTube, etc.)

## Customization

### Adjust Node.js Version
Edit `node-version` in `.github/workflows/ci.yml`:
```yaml
node-version: '20'  # Change to '18', '22', etc.
```

### Add More Branches
Edit the `on:` section:
```yaml
on:
  push:
    branches: [ main, develop, feature/* ]
```

### Skip CI for Specific Commits
Add `[skip ci]` to your commit message:
```bash
git commit -m "Update docs [skip ci]"
```

## Troubleshooting

### Workflow Not Running
- Check that `.github/workflows/ci.yml` is committed
- Verify branch names match in `on:` section
- Check GitHub Actions is enabled for your repository

### Build Failures
- Check the Actions tab for detailed error logs
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

### False Secret Warnings
- If legitimate patterns trigger warnings, adjust the regex in `secrets-check` job
- Be careful not to disable legitimate security checks



