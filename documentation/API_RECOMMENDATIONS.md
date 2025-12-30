# API Recommendations for Stock Data

## 1. Stock Filings API (13F, 10-K, 10-Q, etc.)

### 🏆 **Best Option: SEC EDGAR API (FREE)**
**Official SEC filings database**

- **URL**: https://www.sec.gov/edgar/sec-api-documentation
- **Cost**: FREE
- **Coverage**: All SEC filings (13F, 10-K, 10-Q, 8-K, etc.)
- **API Endpoints**:
  - Company filings: `https://data.sec.gov/submissions/CIK{cik}.json`
  - Filing content: `https://www.sec.gov/cgi-bin/viewer?action=view&cik={cik}&accession_number={accession}`
  - 13F filings: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=13F&CIK={cik}`
- **Pros**:
  - Official SEC data source
  - Completely free
  - Comprehensive coverage
  - Real-time updates
- **Cons**:
  - Requires parsing XML/HTML
  - Rate limits (10 requests/second)
  - No official REST API (need to scrape or use wrapper)
  - Requires User-Agent header

**Alternative Services**:
- **SEC API** (https://sec-api.io) - Paid wrapper around EDGAR
  - Cost: $49/month (Starter), $199/month (Professional)
  - Easy REST API access
  - Webhook support
  - Better for production use
- **Alpha Vantage** - Limited filing data, free tier available
- **Polygon.io** - Some filing metadata, requires paid plan

---

## 2. Analyst Ratings API

### 🏆 **Best Option: Finnhub API**
**Comprehensive analyst recommendations**

- **URL**: https://finnhub.io/docs/api/stock-recommendation-trends
- **Cost**: Free tier (60 calls/minute), Paid ($9-99/month)
- **Coverage**: Analyst recommendations, price targets, EPS estimates
- **Endpoints**:
  - Recommendations: `GET /api/v1/stock/recommendation?symbol=AAPL`
  - Price targets: `GET /api/v1/stock/price-target?symbol=AAPL`
  - EPS estimates: `GET /api/v1/stock/eps-estimate?symbol=AAPL`
- **Response Format**:
  ```json
  {
    "strongBuy": 5,
    "buy": 10,
    "hold": 8,
    "sell": 2,
    "strongSell": 1
  }
  ```
- **Pros**:
  - Free tier available (60 calls/minute)
  - Multiple analysts per stock
  - Historical recommendations
  - Price targets included
  - EPS estimates
- **Cons**:
  - Rate limits on free tier
  - May not cover all stocks

### **Alternative Options**:

**Alpha Vantage**
- **URL**: https://www.alphavantage.co/documentation/#earnings
- **Cost**: Free tier (5 calls/minute), Paid ($49.99/month+)
- **Coverage**: Earnings, analyst estimates
- **Pros**: Free tier, easy integration
- **Cons**: Limited to earnings data, not full ratings

**TipRanks API** (Paid)
- **URL**: https://www.tipranks.com/api
- **Cost**: $99-499/month
- **Coverage**: Comprehensive analyst ratings, price targets, insider trading
- **Pros**: Very comprehensive, high quality
- **Cons**: Expensive, no free tier

**Zacks Investment Research API** (Paid)
- **URL**: https://www.zacks.com/investment-research/api
- **Cost**: Custom pricing
- **Coverage**: Zacks ratings, earnings estimates
- **Pros**: Well-known ratings system
- **Cons**: Expensive, enterprise-focused

---

## 3. Dividend Data API

### 🏆 **Best Option: Polygon.io** (You're already using it!)
**Historical dividend data**

- **URL**: https://polygon.io/docs/stocks/get_v2_reference_dividends
- **Cost**: Included in your existing Polygon.io plan
- **Endpoint**: `GET /v2/reference/dividends/{ticker}`
- **Coverage**: Historical dividends, ex-dividend dates, payment dates
- **Pros**:
  - Already integrated
  - Historical data available
  - Free tier available
  - Reliable data source
- **Cons**:
  - Rate limits on free tier
  - May need paid plan for bulk access

### **Alternative Options**:

**Alpha Vantage**
- **URL**: https://www.alphavantage.co/documentation/#earnings
- **Cost**: Free tier (5 calls/minute)
- **Endpoint**: `OVERVIEW` function includes dividend yield
- **Pros**: Free tier available
- **Cons**: Limited historical data

**IEX Cloud**
- **URL**: https://iexcloud.io/docs/api/#dividends
- **Cost**: Free tier (50,000 messages/month), Paid ($9-999/month)
- **Endpoint**: `/stock/{symbol}/dividends/{range}`
- **Pros**: Good free tier, historical data
- **Cons**: Rate limits

**Yahoo Finance API** (Unofficial)
- **URL**: Various libraries (yfinance, yahoo-finance2)
- **Cost**: FREE
- **Coverage**: Dividend history, ex-dates
- **Pros**: Free, comprehensive
- **Cons**: Unofficial, may break, rate limits

---

## Recommendation Summary

### For Filings (13F, etc.):
1. **SEC EDGAR API** (Free) - Best for official filings
2. **SEC API** (Paid) - Best for easy integration
3. **Polygon.io** - If you need filing metadata only

### For Analyst Ratings:
1. **Finnhub** - Best balance of free tier and features
2. **Alpha Vantage** - Good free tier option
3. **TipRanks** - Best if budget allows

### For Dividends:
1. **Polygon.io** - Best since you're already using it
2. **IEX Cloud** - Good alternative with free tier
3. **Alpha Vantage** - Free tier option

---

## Implementation Notes

### SEC EDGAR Integration:
- Use `sec-api.io` wrapper or build custom scraper
- Parse XML filings (13F is XML format)
- Store filing metadata in PostgreSQL
- Cache filing documents (they don't change)

### Analyst Ratings Integration:
- Use Finnhub `/stock/recommendation` endpoint
- Store ratings with analyst name, date, rating, price target
- Update weekly/monthly (ratings don't change daily)

### Dividend Integration:
- Use Polygon.io `/v2/reference/dividends/{ticker}` endpoint
- Store in PostgreSQL with ex-date, payment date, amount
- Update quarterly (most dividends are quarterly)
- Can batch fetch for all equities

