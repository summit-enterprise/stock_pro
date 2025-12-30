# Fixing Google Cloud SDK Installation

## Problem
Homebrew installation is failing because it's looking for Python 3.13 at a path that doesn't exist.

## Solution Options

### Option 1: Use Official Installer (Recommended)

The official Google Cloud SDK installer is more reliable and handles Python versions better.

```bash
# Download and run the official installer
curl https://sdk.cloud.google.com | bash

# Restart your shell or run:
exec -l $SHELL

# Verify installation
gcloud --version
```

### Option 2: Fix Homebrew Installation with Python Path

If you want to use Homebrew, set the Python path:

```bash
# Set Python path for gcloud
export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3

# Add to your shell config (.zshrc or .bashrc)
echo 'export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3' >> ~/.zshrc

# Then try installing again
brew install --cask google-cloud-sdk
```

### Option 3: Use Python 3.11 or 3.12 (Most Compatible)

Install a more stable Python version that gcloud supports better:

```bash
# Install Python 3.12
brew install python@3.12

# Set it as the default for gcloud
export CLOUDSDK_PYTHON=/opt/homebrew/opt/python@3.12/bin/python3
echo 'export CLOUDSDK_PYTHON=/opt/homebrew/opt/python@3.12/bin/python3' >> ~/.zshrc

# Then install gcloud
brew install --cask google-cloud-sdk
```

## After Installation

Once gcloud is installed, run:

```bash
# Authenticate
gcloud auth login admin@ma-summit-enterprise.com

# Set up ADC
gcloud auth application-default login

# Set project
gcloud config set project project-finance-482417
```

## Quick Test

```bash
gcloud --version
gcloud auth list
```

