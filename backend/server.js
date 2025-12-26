const express = require('express');
const redis = require('redis');
const axios = require('axios');
const app = express();

const client = redis.createClient({ url: 'redis://localhost:6379' });
client.connect();

// Logic: Check Cache -> Fetch API -> Store Cache
app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `stock:${symbol}`;
  
    // 1. Try to get data from Redis
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache Hit!");
      return res.json(JSON.parse(cachedData));
    }
  
    // 2. Cache Miss: Fetch from Polygon.io
    try {
      const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/2023-01-01/2023-12-31?apiKey=${process.env.POLYGON_KEY}`);
      
      // 3. Save to Redis with 1-minute expiry (60 seconds)
      await client.setEx(cacheKey, 60, JSON.stringify(response.data.results));
      
      res.json(response.data.results);
    } catch (error) {
      res.status(500).send("API Error");
    }
  });
  
  app.listen(3001, () => console.log("Backend on port 3001"));