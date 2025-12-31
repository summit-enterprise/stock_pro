#!/bin/bash

# Database Setup Script
# Creates PostgreSQL databases for local, dev, and prod environments
# Also sets up TimescaleDB extension

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}📊 Setting up databases for StockPro...${NC}\n"

# Get database credentials from environment or use defaults
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# Database names
DB_LOCAL=${DB_NAME_LOCAL:-stockdb_local}
DB_DEV=${DB_NAME_DEV:-stockdb_dev}
DB_PROD=${DB_NAME_PROD:-stockdb_prod}

echo -e "${YELLOW}Using PostgreSQL user: ${DB_USER}${NC}"
echo -e "${YELLOW}Host: ${DB_HOST}:${DB_PORT}${NC}\n"

# Function to create database and enable TimescaleDB
create_database() {
    local db_name=$1
    local env_name=$2
    
    echo -e "${GREEN}Creating database: ${db_name} (${env_name})...${NC}"
    
    # Create database
    psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "CREATE DATABASE ${db_name};" 2>/dev/null || {
        echo -e "${YELLOW}Database ${db_name} already exists, skipping...${NC}"
    }
    
    # Enable TimescaleDB extension
    echo -e "${GREEN}Enabling TimescaleDB extension for ${db_name}...${NC}"
    psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${db_name} -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || {
        echo -e "${RED}Warning: Could not enable TimescaleDB. Make sure it's installed.${NC}"
    }
    
    echo -e "${GREEN}✅ Database ${db_name} is ready!${NC}\n"
}

# Create all databases
create_database ${DB_LOCAL} "local/mock"
create_database ${DB_DEV} "development"
create_database ${DB_PROD} "production"

echo -e "${GREEN}🎉 All databases created successfully!${NC}\n"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update your .env file with the correct database credentials"
echo -e "2. Set NODE_ENV to 'local', 'development', or 'production'"
echo -e "3. Start your application - the schema will be created automatically\n"

