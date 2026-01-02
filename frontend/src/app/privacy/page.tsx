export const metadata = {
  title: 'Privacy Policy | StockPro',
  description: 'StockPro Privacy Policy - Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        Privacy Policy
      </h1>
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            1. Introduction
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            StockPro ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our stock trading platform and services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            2. Information We Collect
          </h2>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            2.1 Personal Information
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We may collect personal information that you provide to us, including:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Name and contact information (email address, phone number)</li>
            <li>Account credentials and authentication information</li>
            <li>Profile information and preferences</li>
            <li>Payment and billing information (if applicable)</li>
            <li>Support and communication records</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            2.2 Usage Information
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We automatically collect information about how you use our platform, including:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Device information and browser type</li>
            <li>IP address and location data</li>
            <li>Pages visited and features used</li>
            <li>Time and date of access</li>
            <li>Search queries and interactions</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            3. How We Use Your Information
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and manage your account</li>
            <li>Send you updates, notifications, and support communications</li>
            <li>Personalize your experience and content</li>
            <li>Analyze usage patterns and improve platform performance</li>
            <li>Detect, prevent, and address technical issues and security threats</li>
            <li>Comply with legal obligations and enforce our terms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            4. Information Sharing and Disclosure
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We do not sell your personal information. We may share your information only in the following circumstances:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>With your explicit consent</li>
            <li>To comply with legal obligations or respond to lawful requests</li>
            <li>To protect our rights, property, or safety, or that of our users</li>
            <li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li>
            <li>In connection with a business transfer or merger</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            5. Data Security
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            6. Your Rights and Choices
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Access and review your personal information</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt-out of certain communications and data processing</li>
            <li>Export your data in a portable format</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            7. Cookies and Tracking Technologies
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We use cookies and similar tracking technologies to enhance your experience, analyze usage, and assist with marketing efforts. You can control cookie preferences through your browser settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            8. Children's Privacy
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            9. Changes to This Privacy Policy
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            10. Contact Us
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If you have questions about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Email: privacy@stockpro.com<br />
            Address: [Your Company Address]
          </p>
        </section>
      </div>
    </div>
  );
}



