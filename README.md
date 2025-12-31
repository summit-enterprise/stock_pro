# Stock Pro - Stock Trading Application

A comprehensive stock trading application with real-time data, portfolio management, crypto support, and analytics.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- PostgreSQL 15+
- Redis
- Docker (optional, for local databases)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/summit-enterprise/stock_pro.git
   cd stock-pro
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   Create `backend/.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/stockdb
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-secret-key
   PORT=3001
   # Add your API keys
   POLYGON_API_KEY=your-key
   COINGECKO_API_KEY=your-key
   YOUTUBE_API_KEY=your-key
   # ... other API keys
   ```
   
   Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   # Add public API keys if needed
   ```

4. **Start databases (Docker)**
   ```bash
   npm run docker:up
   ```
   
   Or manually start PostgreSQL and Redis.

5. **Run the application**
   ```bash
   npm run dev
   ```
   
   This starts both backend (port 3001) and frontend (port 3000) concurrently.

## 📁 Project Structure

```
stock-pro/
├── backend/          # Express.js API server
├── frontend/         # Next.js React application
├── documentation/    # Project documentation
└── docker-compose.yml # Local database setup
```

## 🛠️ Available Scripts

### Root Level (from `stock-pro/`)
- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both applications for production
- `npm run start` - Start both applications in production mode
- `npm run install:all` - Install dependencies for all projects
- `npm run lint` - Lint frontend code
- `npm run docker:up` - Start PostgreSQL and Redis containers
- `npm run docker:down` - Stop containers
- `npm run docker:logs` - View container logs

### Backend (from `backend/`)
- `npm run dev` - Start development server
- `npm start` - Start production server

### Frontend (from `frontend/`)
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🔧 Development

### Running Services Separately

**Backend only:**
```bash
cd backend
npm run dev
```

**Frontend only:**
```bash
cd frontend
npm run dev
```

### Database Setup

The application uses:
- **PostgreSQL** - Main database (with TimescaleDB extension)
- **Redis** - Caching layer

See `documentation/DATABASE_CONNECTION_INFO.md` for connection details.

## 📚 Documentation

Comprehensive documentation is available in the `documentation/` folder:

- `API_ROUTES.md` - API endpoint documentation
- `DATABASE_SCHEMA_COMPLETE.md` - Database schema
- `CI_CD_SETUP.md` - CI/CD pipeline setup
- `CRYPTO_SERVICES.md` - Crypto integration guide
- And more...

## 🔐 Environment Variables

See `documentation/API_KEYS_SETUP.md` for required API keys and setup instructions.

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 🚢 Deployment

See `documentation/CI_CD_SETUP.md` for CI/CD and deployment information.

## 📝 License

ISC

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

---

For more information, see the [documentation](./documentation/) folder.

