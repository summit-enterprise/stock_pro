# Market News API Setup

This application uses **NewsAPI.org** to fetch real-time market news. The news is cached in Redis for 2.5 hours to reduce API calls and improve performance.

## API Selection

We chose **NewsAPI.org** because:
- ✅ Free tier available (100 requests/day)
- ✅ Good coverage of business/finance news
- ✅ Simple REST API
- ✅ Reliable and well-documented

**Alternative APIs** (can be added later):
- Polygon.io News API (if you have a Polygon.io subscription)
- Alpha Vantage News & Sentiment API
- Financial Modeling Prep News API

## Setup Instructions

### 1. Get NewsAPI.org API Key

1. Go to [https://newsapi.org/](https://newsapi.org/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier: 100 requests/day (sufficient for our 2.5-hour cache)

### 2. Add API Key to Environment Variables

Add to your `.env` file:

```env
NEWS_API_KEY=your_newsapi_key_here
```

Or alternatively:

```env
NEWSAPI_KEY=your_newsapi_key_here
```

### 3. Redis Caching

The news is cached in Redis for **2.5 hours** (9000 seconds) to:
- Reduce API calls (stay within free tier limits)
- Improve response times
- Handle API failures gracefully (serves stale cache)

**Cache Strategy:**
- **Primary**: Redis cache (2.5 hours TTL)
- **Fallback**: In-memory cache (if Redis unavailable)
- **Final Fallback**: Mock news data (if API fails)

### 4. News Polling

The system automatically:
- Fetches fresh news when cache expires (every 2.5 hours)
- Updates cache with new articles
- Serves cached data to all requests during cache period

## Features

### Backend (`/api/news/market`)
- ✅ Fetches 15 top business news articles
- ✅ Redis caching (2.5 hours)
- ✅ In-memory cache fallback
- ✅ Mock data fallback if API fails
- ✅ Error handling and graceful degradation

### Frontend (`MarketNews` component)
- ✅ Displays 5 articles per page
- ✅ Pagination (3 pages total for 15 articles)
- ✅ Clickable articles (opens in new tab)
- ✅ Responsive design with dark mode support
- ✅ Loading states
- ✅ Smooth scrolling on page change

## API Endpoint

**GET** `/api/news/market`

**Response:**
```json
{
  "articles": [
    {
      "id": "news_0_1234567890",
      "title": "Stock Market Reaches New Highs",
      "description": "Market analysis...",
      "source": "Bloomberg",
      "author": "John Doe",
      "url": "https://example.com/article",
      "urlToImage": "https://example.com/image.jpg",
      "publishedAt": "2024-01-01T12:00:00Z",
      "publishedDate": "1/1/2024",
      "publishedTime": "12:00:00 PM"
    }
  ]
}
```

## Cache Behavior

1. **First Request**: Fetches from NewsAPI, stores in Redis + memory
2. **Subsequent Requests** (within 2.5 hours): Serves from Redis cache
3. **After 2.5 Hours**: Fetches fresh data, updates cache
4. **If Redis Down**: Falls back to in-memory cache
5. **If API Fails**: Serves stale cache or mock data

## Rate Limiting

- **Free Tier**: 100 requests/day
- **With 2.5-hour cache**: ~10 requests/day maximum
- **Well within limits**: 90% buffer remaining

## Testing Without API Key

If `NEWS_API_KEY` is not set, the system will:
- Use mock news data
- Still cache in Redis (for testing)
- Function normally (just with sample data)

## Production Considerations

1. **Upgrade API Plan**: If you need more than 100 requests/day
2. **Add Error Monitoring**: Track API failures and cache misses
3. **Add Webhook Support**: For real-time major news updates (NewsAPI Pro feature)
4. **Add News Filtering**: Filter by keywords, sources, or sentiment
5. **Add News Categories**: Separate sections for different market sectors

## Troubleshooting

**No news showing:**
- Check if `NEWS_API_KEY` is set in `.env`
- Check Redis is running: `docker-compose up redis`
- Check API key is valid: Test at [NewsAPI.org](https://newsapi.org/)

**News not updating:**
- Cache is 2.5 hours - wait or clear Redis cache
- Check Redis connection in logs
- Verify API key hasn't exceeded rate limit

**Articles not clickable:**
- Check browser console for errors
- Verify `url` field in article data
- Check if popup blocker is enabled

