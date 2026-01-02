# Top 25 Fintech Streamers - Channel ID Lookup Guide

## Current Channels (Need to verify IDs)

### 1. **Amit Investing** (@amitinvesting)
- **Channel ID**: `UCjZnbgPb08NFg7MHyPQRZ3Q` ✅ (Verified)
- **URL**: https://www.youtube.com/@amitinvesting
- **Focus**: Fintech and investing insights

### 2. **Dumb Money Live** (Chris Camillo)
- **Channel ID**: `UCS01CiRDAiyhR_mTHXDW23A` (Needs verification)
- **URL**: https://www.youtube.com/@DumbMoneyLive
- **Focus**: Retail investing and market analysis

### 3. **Chris Sain**
- **Channel ID**: `UC7SRE6_G0vV94_G93m4uD0Q` (Needs verification)
- **URL**: https://www.youtube.com/@ChrisSain
- **Focus**: Stock market education and trading

### 4. **Meet Kevin**
- **Channel ID**: `UC_86S3_KInp_9KAtKToL_8A` (Needs verification)
- **URL**: https://www.youtube.com/@MeetKevin
- **Focus**: Real estate, stocks, and finance

### 5. **Graham Stephan**
- **Channel ID**: `UCV6KDgJskWaEckne5aPA0aQ` (Needs verification)
- **URL**: https://www.youtube.com/@GrahamStephan
- **Focus**: Personal finance and investing

## Additional Top Fintech Streamers (Need Channel IDs)

### 6. **Andrei Jikh** (@AndreiJikh)
- **URL**: https://www.youtube.com/@AndreiJikh
- **Focus**: Personal finance, investing, crypto

### 7. **Ben Felix** (@BenFelixCSI)
- **URL**: https://www.youtube.com/@BenFelixCSI
- **Focus**: Evidence-based investing, portfolio theory

### 8. **The Plain Bagel** (@ThePlainBagel)
- **URL**: https://www.youtube.com/@ThePlainBagel
- **Focus**: Finance education, market analysis

### 9. **Patrick Boyle** (@PatrickBoyleOnFinance)
- **URL**: https://www.youtube.com/@PatrickBoyleOnFinance
- **Focus**: Finance professor, market commentary

### 10. **Two Cents** (@TwoCentsPBS)
- **URL**: https://www.youtube.com/@TwoCentsPBS
- **Focus**: Personal finance education

### 11. **Jeremy Lefebvre** (@FinancialEducation)
- **URL**: https://www.youtube.com/@FinancialEducation
- **Focus**: Stock market education, trading

### 12. **Trading 212** (@Trading212)
- **URL**: https://www.youtube.com/@Trading212
- **Focus**: Trading platform, market analysis

### 13. **Coin Bureau** (@CoinBureau)
- **URL**: https://www.youtube.com/@CoinBureau
- **Focus**: Cryptocurrency analysis and education

### 14. **Investing with Rose** (@InvestingwithRose)
- **URL**: https://www.youtube.com/@InvestingwithRose
- **Focus**: Value investing, stock analysis

### 15. **The Financial Diet** (@TheFinancialDiet)
- **URL**: https://www.youtube.com/@TheFinancialDiet
- **Focus**: Personal finance for millennials

### 16. **Mark Tilbury** (@MarkTilbury)
- **URL**: https://www.youtube.com/@MarkTilbury
- **Focus**: Personal finance, investing tips

### 17. **Sven Carlin** (@SvenCarlin)
- **URL**: https://www.youtube.com/@SvenCarlin
- **Focus**: Value investing, stock analysis

### 18. **Everything Money** (@EverythingMoney)
- **URL**: https://www.youtube.com/@EverythingMoney
- **Focus**: Stock analysis, value investing

### 19. **Joseph Carlson** (@JosephCarlson)
- **URL**: https://www.youtube.com/@JosephCarlson
- **Focus**: Dividend investing, portfolio updates

### 20. **GenExDividendInvestor** (@GenExDividendInvestor)
- **URL**: https://www.youtube.com/@GenExDividendInvestor
- **Focus**: Dividend investing, FIRE movement

### 21. **Our Rich Journey** (@OurRichJourney)
- **URL**: https://www.youtube.com/@OurRichJourney
- **Focus**: FIRE movement, early retirement

### 22. **The Money Guy Show** (@TheMoneyGuyShow)
- **URL**: https://www.youtube.com/@TheMoneyGuyShow
- **Focus**: Financial planning, wealth building

### 23. **Minority Mindset** (@MinorityMindset)
- **URL**: https://www.youtube.com/@MinorityMindset
- **Focus**: Financial education, entrepreneurship

### 24. **Ryan Scribner** (@RyanScribner)
- **URL**: https://www.youtube.com/@RyanScribner
- **Focus**: Investing, personal finance

### 25. **The Compound** (@TheCompound)
- **URL**: https://www.youtube.com/@TheCompound
- **Focus**: Market analysis, investing strategies

## How to Get Channel IDs

### Method 1: From Channel URL
1. Visit the channel URL (e.g., https://www.youtube.com/@amitinvesting)
2. View page source (Ctrl+U / Cmd+U)
3. Search for `"channelId"` or `"externalId"`
4. Copy the ID (format: `UCxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Method 2: Using YouTube API (if you have API key)
```bash
# Replace @amitinvesting with the channel handle
curl "https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=amitinvesting&key=YOUR_API_KEY"
```

### Method 3: Browser Console
1. Go to channel page
2. Open browser console (F12)
3. Type: `ytInitialData.metadata.channelMetadataRenderer.externalId`
4. Press Enter

## Quick Verification Script

You can use this to verify channel IDs work:

```bash
# Test if channel ID is valid
curl "https://www.googleapis.com/youtube/v3/channels?part=snippet&id=CHANNEL_ID&key=YOUR_API_KEY"
```

## Notes

- All channel IDs start with `UC` and are 24 characters long
- Channel handles (@username) can be resolved using the API
- Some channels may have custom URLs that need to be resolved
- Verify each ID before adding to the frontend



