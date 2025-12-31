export const metadata = {
  title: 'Terms of Service | StockPro',
  description: 'StockPro Terms of Service - Read our terms and conditions for using our stock trading platform.',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        Terms of Service
      </h1>
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            By accessing and using StockPro ("the Platform"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            2. Description of Service
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            StockPro provides a comprehensive stock trading platform that offers market data, analytics, portfolio management, and related financial information services. Our services are provided for informational and educational purposes only.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            3. User Accounts
          </h2>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            3.1 Account Registration
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            To use certain features of the Platform, you must register for an account. You agree to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your information as necessary</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized access</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            3.2 Account Eligibility
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You must be at least 18 years old and have the legal capacity to enter into these Terms. By using the Platform, you represent and warrant that you meet these requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            4. Acceptable Use
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You agree not to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Use the Platform for any illegal or unauthorized purpose</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe upon intellectual property rights</li>
            <li>Transmit viruses, malware, or harmful code</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the Platform's operation</li>
            <li>Use automated systems to access the Platform without permission</li>
            <li>Impersonate any person or entity</li>
            <li>Collect or harvest user information without consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            5. Financial Information Disclaimer
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong className="text-gray-900 dark:text-white">IMPORTANT:</strong> The information provided on StockPro is for informational and educational purposes only. It does not constitute financial, investment, or trading advice. You should:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Conduct your own research and due diligence</li>
            <li>Consult with qualified financial advisors before making investment decisions</li>
            <li>Understand that all investments carry risk of loss</li>
            <li>Not rely solely on information from this Platform for investment decisions</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We are not a registered investment advisor, broker-dealer, or financial planner. Past performance does not guarantee future results.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            6. Intellectual Property
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The Platform and its content, including but not limited to text, graphics, logos, software, and data, are owned by StockPro or its licensors and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our express written permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            7. User Content
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You retain ownership of any content you submit to the Platform. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content for the purpose of operating and promoting the Platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            8. Service Availability
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We strive to provide reliable service but do not guarantee uninterrupted or error-free operation. We reserve the right to modify, suspend, or discontinue any part of the Platform at any time without notice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            9. Limitation of Liability
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, STOCKPRO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE PLATFORM.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            10. Indemnification
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You agree to indemnify and hold harmless StockPro, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Platform or violation of these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            11. Termination
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We may terminate or suspend your account and access to the Platform immediately, without prior notice, for any violation of these Terms or for any other reason we deem necessary.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            12. Changes to Terms
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page. Your continued use of the Platform after changes become effective constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            13. Governing Law
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            14. Contact Information
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If you have questions about these Terms, please contact us at:
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Email: legal@stockpro.com<br />
            Address: [Your Company Address]
          </p>
        </section>
      </div>
    </div>
  );
}

