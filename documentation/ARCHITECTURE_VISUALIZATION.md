# System Architecture Visualization

## Complete System Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js - Port 3000)"
        A[Home Page] --> B[Dashboard]
        A --> C[Asset Detail]
        A --> D[Watchlist]
        A --> E[News]
        A --> F[Admin Panel]
        B --> C
        B --> D
        C --> G[PriceChart Component]
        C --> H[AssetNews Component]
        B --> I[MarketTiles]
        B --> J[SearchBar]
        B --> K[WatchlistSection]
        B --> L[MarketMovers]
        B --> M[PortfolioSummary]
        B --> N[MarketNews]
    end

    subgraph "Backend API (Express - Port 3001)"
        O[/api/auth] --> P[Auth Routes]
        Q[/api/admin] --> R[Admin Routes]
        S[/api/assets] --> T[Asset Routes]
        U[/api/watchlist] --> V[Watchlist Routes]
        W[/api/market] --> X[Market Routes]
        Y[/api/news] --> Z[News Routes]
        AA[/api/portfolio] --> AB[Portfolio Routes]
        AC[/api/ratings] --> AD[Ratings Routes]
        AE[/api/search] --> AF[Search Routes]
        AG[/api/user] --> AH[User Routes]
        AI[/api/stock/:symbol] --> AJ[Legacy Stock Route]
    end

    subgraph "Services Layer"
        T --> AK[assetGenerator.js]
        T --> AL[mockData.js]
        Z --> AM[newsService.js]
        Z --> AN[assetNewsService.js]
        AD --> AO[ratingsService.js]
    end

    subgraph "Database Layer"
        P --> AP[(PostgreSQL)]
        R --> AP
        T --> AP
        V --> AP
        X --> AP
        AB --> AP
        AD --> AP
        AF --> AP
        AH --> AP
    end

    subgraph "Cache Layer"
        T --> AQ[(Redis)]
        Z --> AQ
        X --> AQ
        AJ --> AQ
    end

    subgraph "External APIs"
        T --> AR[Polygon.io API]
        Z --> AS[NewsAPI]
        AN --> AS
        AJ --> AR
    end

    B --> O
    B --> S
    B --> W
    B --> Y
    C --> S
    C --> U
    C --> AC
    D --> U
    E --> Y
    F --> R
    A --> O

    style AP fill:#336791,color:#fff
    style AQ fill:#DC382D,color:#fff
    style AR fill:#4CAF50,color:#fff
    style AS fill:#4CAF50,color:#fff
```

---

## API Routes Architecture

```mermaid
graph LR
    subgraph "Authentication & User Management"
        A1[POST /api/auth/register] --> DB[(PostgreSQL)]
        A2[POST /api/auth/login] --> DB
        A3[POST /api/auth/google] --> DB
        A4[POST /api/admin/login] --> DB
        A5[GET /api/admin/users] --> DB
        A6[GET /api/admin/admins] --> DB
        A7[PUT /api/admin/users/:id] --> DB
        A8[DELETE /api/admin/users/:id] --> DB
    end

    subgraph "Asset & Market Data"
        B1[GET /api/assets/:symbol] --> DB
        B1 --> REDIS[(Redis Cache)]
        B1 --> EXT1[Polygon.io]
        B2[GET /api/market/overview] --> DB
        B2 --> REDIS
        B2 --> EXT1
        B3[GET /api/market/movers] --> DB
        B3 --> REDIS
        B4[GET /api/search?q=] --> DB
    end

    subgraph "User Features"
        C1[GET /api/watchlist] --> DB
        C2[POST /api/watchlist] --> DB
        C3[DELETE /api/watchlist/:symbol] --> DB
        C4[GET /api/watchlist/check/:symbol] --> DB
        C5[GET /api/portfolio] --> DB
        C6[GET /api/user/profile] --> DB
    end

    subgraph "News & Ratings"
        D1[GET /api/news] --> REDIS
        D1 --> EXT2[NewsAPI]
        D2[GET /api/news/:category] --> REDIS
        D2 --> EXT2
        D3[GET /api/ratings/:symbol] --> DB
        D3 --> SVC[ratingsService]
    end

    style DB fill:#336791,color:#fff
    style REDIS fill:#DC382D,color:#fff
    style EXT1 fill:#4CAF50,color:#fff
    style EXT2 fill:#4CAF50,color:#fff
```

---

## Data Flow Diagrams

### Asset Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Redis
    participant PostgreSQL
    participant Polygon

    User->>Frontend: View Asset (AAPL)
    Frontend->>Backend: GET /api/assets/AAPL?range=5Y
    Backend->>Redis: Check cache: stock:AAPL
    alt Cache Hit
        Redis-->>Backend: Return cached data
        Backend-->>Frontend: Return data
    else Cache Miss
        Backend->>PostgreSQL: SELECT FROM asset_data WHERE symbol='AAPL'
        alt Data in DB
            PostgreSQL-->>Backend: Return historical data
            Backend->>Polygon: Fetch current price
            Polygon-->>Backend: Return current price
            Backend->>Redis: Cache stock:AAPL (60s TTL)
            Backend-->>Frontend: Return combined data
        else No Data in DB
            Backend->>Polygon: Fetch full data
            Polygon-->>Backend: Return stock data
            Backend->>PostgreSQL: INSERT INTO asset_data
            Backend->>Redis: Cache stock:AAPL (60s TTL)
            Backend-->>Frontend: Return data
        end
    end
    Frontend-->>User: Display chart & data
```

### News Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Redis
    participant NewsAPI

    User->>Frontend: View News
    Frontend->>Backend: GET /api/news/business
    Backend->>Redis: Check cache: news:business
    alt Cache Hit (TTL: 2.5 hours)
        Redis-->>Backend: Return cached articles
        Backend-->>Frontend: Return news
    else Cache Miss
        Backend->>NewsAPI: Fetch news articles
        NewsAPI-->>Backend: Return articles
        Backend->>Redis: Cache news:business (9000s TTL)
        Backend-->>Frontend: Return news
    end
    Frontend-->>User: Display news
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant PostgreSQL
    participant Google

    alt Custom Auth
        User->>Frontend: Enter email/password
        Frontend->>Backend: POST /api/auth/login
        Backend->>PostgreSQL: SELECT user WHERE email=?
        PostgreSQL-->>Backend: Return user
        Backend->>Backend: Verify password (bcrypt)
        Backend-->>Frontend: Return JWT token
        Frontend->>Frontend: Store token in localStorage
    else Google OAuth
        User->>Frontend: Click "Login with Google"
        Frontend->>Google: OAuth flow
        Google-->>Frontend: Return Google ID token
        Frontend->>Backend: POST /api/auth/google
        Backend->>PostgreSQL: Check/Insert user
        PostgreSQL-->>Backend: Return user
        Backend-->>Frontend: Return JWT token
        Frontend->>Frontend: Store token in localStorage
    end
```

---

## Service Layer Architecture

```mermaid
graph TB
    subgraph "Backend Services"
        A[assetGenerator.js] --> B[Generate Asset List]
        A --> C[Generate Asset Metadata]
        
        D[mockData.js] --> E[Generate Mock Prices]
        D --> F[Generate Historical Data]
        D --> G[Get Current Price]
        
        H[newsService.js] --> I[Fetch News from NewsAPI]
        H --> J[Cache News in Redis]
        H --> K[Generate Mock News]
        
        L[assetNewsService.js] --> M[Fetch Asset-Specific News]
        L --> N[Cache in Redis]
        
        O[ratingsService.js] --> P[Calculate Technical Ratings]
        O --> Q[Generate Buy/Sell Signals]
    end

    subgraph "Route Handlers"
        R1[Asset Routes] --> A
        R1 --> D
        R2[News Routes] --> H
        R2 --> L
        R3[Ratings Routes] --> O
        R4[Market Routes] --> D
    end

    style A fill:#E3F2FD
    style D fill:#E3F2FD
    style H fill:#E3F2FD
    style L fill:#E3F2FD
    style O fill:#E3F2FD
```

---

## Database Schema with TimescaleDB

```mermaid
erDiagram
    users ||--o{ watchlist : "has"
    asset_info ||--o{ asset_data : "references"
    asset_info ||--o{ watchlist : "references"
    
    users {
        serial id PK
        varchar email UK "UNIQUE NOT NULL"
        varchar password_hash
        varchar auth_type "CHECK: 'custom', 'google', 'both'"
        varchar google_id UK "UNIQUE"
        varchar name
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "DEFAULT CURRENT_TIMESTAMP"
        boolean is_admin "DEFAULT FALSE"
        boolean is_superuser "DEFAULT FALSE"
    }
    
    asset_info {
        varchar symbol PK "UNIQUE"
        varchar name
        varchar type "stock, crypto, etf, etc."
        varchar exchange
        varchar currency "DEFAULT 'USD'"
        numeric market_cap
        numeric pe_ratio
        numeric dividend_yield
        timestamp updated_at "DEFAULT CURRENT_TIMESTAMP"
    }
    
    asset_data {
        varchar symbol PK "Composite PK"
        date date PK "Composite PK, TimescaleDB dimension"
        numeric open "NUMERIC(18,8)"
        numeric high "NUMERIC(18,8)"
        numeric low "NUMERIC(18,8)"
        numeric close "NUMERIC(18,8)"
        bigint volume
        numeric adjusted_close "NUMERIC(18,8)"
    }
    
    watchlist {
        integer user_id PK "Composite PK, FK -> users.id"
        varchar symbol PK "Composite PK, FK -> asset_info.symbol"
        timestamp added_at "DEFAULT CURRENT_TIMESTAMP"
    }
    
    note right of asset_data
        TimescaleDB Hypertable
        - Chunk interval: 30 days
        - Compression enabled
        - Compression policy: 7 days
        - Automatic partitioning by date
    end note
```

---

## Redis Cache Structure

```mermaid
graph TB
    subgraph "Redis Cache Keys"
        A[stock:AAPL<br/>TTL: 60s<br/>Data: OHLCV array]
        B[stock:MSFT<br/>TTL: 60s<br/>Data: OHLCV array]
        C[news:business<br/>TTL: 9000s<br/>Data: Articles array]
        D[news:business:us<br/>TTL: 9000s<br/>Data: US business news]
        E[news:general:crypto<br/>TTL: 9000s<br/>Data: Crypto news]
    end

    subgraph "Cache Sources"
        F[Polygon.io API] --> A
        F --> B
        G[NewsAPI] --> C
        G --> D
        G --> E
    end

    style A fill:#DC382D,color:#fff
    style B fill:#DC382D,color:#fff
    style C fill:#DC382D,color:#fff
    style D fill:#DC382D,color:#fff
    style E fill:#DC382D,color:#fff
```

---

## Component Architecture (Frontend)

```mermaid
graph TB
    subgraph "Pages"
        A[Home Page] --> B[Navbar]
        C[Dashboard] --> B
        C --> D[SearchBar]
        C --> E[MarketTiles]
        C --> F[WatchlistSection]
        C --> G[MarketMovers]
        C --> H[PortfolioSummary]
        C --> I[MarketNews]
        J[Asset Detail] --> B
        J --> K[PriceChart]
        J --> L[AssetNews]
        M[Watchlist] --> B
        N[News] --> B
        O[Admin] --> B
    end

    subgraph "Components"
        B --> P[LoginModal]
        B --> Q[RegisterModal]
        B --> R[GoogleOAuthProvider]
        D --> S[Search Results]
        K --> T[Technical Indicators]
        K --> U[Chart Controls]
    end

    subgraph "Contexts"
        V[SidebarContext] --> W[Sidebar State]
        V --> C
        V --> J
    end

    style A fill:#E3F2FD
    style C fill:#E3F2FD
    style J fill:#E3F2FD
    style K fill:#FFF3E0
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Lightweight Charts 5.1.0
- **OAuth**: @react-oauth/google 0.13.4
- **Indicators**: technicalindicators 3.1.0

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.2.1
- **Database**: PostgreSQL 15 (with TimescaleDB)
- **Cache**: Redis (alpine)
- **Auth**: JWT (jsonwebtoken), bcryptjs
- **HTTP Client**: axios

### External Services
- **Stock Data**: Polygon.io API
- **News**: NewsAPI

---

## Port Configuration

```
Frontend:  http://localhost:3000
Backend:   http://localhost:3001
PostgreSQL: localhost:5432
Redis:     localhost:6379
```

---

## Environment Variables

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stockdb
DB_USER=user
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key-change-in-production

# APIs
POLYGON_API_KEY=your_polygon_api_key
NEWS_API_KEY=your_newsapi_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Environment
NODE_ENV=development
USE_MOCK_DATA=true
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Request Flow Summary

1. **User Request** → Frontend (Next.js)
2. **API Call** → Backend (Express) on port 3001
3. **Cache Check** → Redis (if applicable)
4. **Database Query** → PostgreSQL (if needed)
5. **External API** → Polygon.io or NewsAPI (if cache miss)
6. **Response** → Backend → Frontend → User

---

## Key Features

✅ **Authentication**: Custom auth + Google OAuth  
✅ **Real-time Data**: Stock prices and market data  
✅ **Historical Data**: 5 years of OHLCV data (TimescaleDB)  
✅ **Caching**: Redis for stock data (60s) and news (2.5h)  
✅ **Charts**: Interactive price charts with 100+ indicators  
✅ **Watchlist**: User-specific asset tracking  
✅ **News**: Market and asset-specific news  
✅ **Ratings**: Technical analysis ratings  
✅ **Admin Panel**: User management system  

