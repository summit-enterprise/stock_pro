import Link from 'next/link';

export const metadata = {
  title: 'About Us | StockPro',
  description: 'Learn about StockPro - Your comprehensive stock trading platform for tracking markets, analyzing trends, and making informed investment decisions.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        About StockPro
      </h1>
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Our Mission
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            StockPro is dedicated to democratizing access to professional-grade stock market tools and data. We believe that everyone, from seasoned traders to beginners, should have access to comprehensive market information, powerful analytics, and intuitive tools to make informed investment decisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            What We Offer
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            StockPro provides a comprehensive suite of features designed to help you navigate the stock market with confidence:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li><strong>Real-time Market Data:</strong> Access up-to-date stock prices, indices, commodities, and cryptocurrency data</li>
            <li><strong>Portfolio Management:</strong> Track your investments, monitor performance, and analyze your portfolio with detailed charts and analytics</li>
            <li><strong>Watchlists:</strong> Keep an eye on your favorite stocks and assets</li>
            <li><strong>Market Analytics:</strong> Comprehensive charts, technical indicators, and market insights</li>
            <li><strong>Financial News:</strong> Stay informed with the latest market news and analysis</li>
            <li><strong>Live Streams:</strong> Watch financial news and market commentary in real-time</li>
            <li><strong>Dividend Tracking:</strong> Monitor dividend payments and history</li>
            <li><strong>SEC Filings:</strong> Access company filings and regulatory documents</li>
            <li><strong>Analyst Ratings:</strong> View professional analyst recommendations and consensus</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Our Technology
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            StockPro is built with modern, scalable technology to ensure fast, reliable, and secure access to market data. We leverage:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Real-time data processing and caching for optimal performance</li>
            <li>Advanced charting and visualization tools</li>
            <li>Secure authentication and data protection</li>
            <li>Responsive design for seamless access across all devices</li>
            <li>Time-series database technology for efficient historical data storage</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Data Sources
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We aggregate data from multiple trusted sources to provide you with comprehensive and accurate market information, including:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Major stock exchanges and market data providers</li>
            <li>Financial news services and RSS feeds</li>
            <li>Regulatory filings from the SEC</li>
            <li>Cryptocurrency exchanges and data providers</li>
            <li>Analyst ratings and research firms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Our Commitment
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            At StockPro, we are committed to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li><strong>Transparency:</strong> Clear, honest communication about our services and data sources</li>
            <li><strong>Security:</strong> Protecting your personal information and account data with industry-standard security measures</li>
            <li><strong>Reliability:</strong> Maintaining high uptime and fast response times</li>
            <li><strong>Innovation:</strong> Continuously improving our platform with new features and enhancements</li>
            <li><strong>User Experience:</strong> Creating an intuitive, accessible platform for all users</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Disclaimer
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong className="text-gray-900 dark:text-white">Important:</strong> StockPro provides information and tools for educational and informational purposes only. We are not a registered investment advisor, broker-dealer, or financial planner. The information on this platform should not be construed as investment, financial, or trading advice.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Always conduct your own research and consult with qualified financial professionals before making investment decisions. All investments carry risk, and past performance does not guarantee future results.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Contact Us
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We'd love to hear from you! Whether you have questions, feedback, or need support, please don't hesitate to reach out:
          </p>
          <ul className="list-none text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>📧 Email: support@stockpro.com</li>
            <li>💬 <Link href="/support" className="text-blue-600 dark:text-blue-400 hover:underline">Support Center</Link></li>
            <li>📝 <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">Contact Form</Link></li>
          </ul>
        </section>

        <section className="mb-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Get Started Today
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Ready to take control of your investment journey? <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Create a free account</Link> and start exploring the markets with StockPro.
          </p>
        </section>
      </div>
    </div>
  );
}

