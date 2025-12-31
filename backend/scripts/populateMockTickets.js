require('dotenv').config();
const { pool, initDb } = require('../db');

// Mock ticket data
const MOCK_CATEGORIES = ['bug', 'feature', 'technical', 'account', 'billing', 'data', 'api', 'other'];
const MOCK_PRIORITIES = ['unknown', 'low', 'medium', 'high', 'urgent'];
const MOCK_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const MOCK_SUBJECTS = [
  'Chart not displaying correctly',
  'Unable to add asset to portfolio',
  'Price data is outdated',
  'Login issue with Google OAuth',
  'Request for new feature: Dark mode toggle',
  'API rate limit exceeded error',
  'Watchlist not syncing',
  'Dividend data missing for some stocks',
  'Search functionality not working',
  'Portfolio performance calculation incorrect',
  'Email notifications not sending',
  'Asset logo not loading',
  'Market overview chart broken',
  'Need help with API integration',
  'Billing question about subscription',
];

const MOCK_DESCRIPTIONS = [
  'The price chart on the asset page is not displaying correctly. The X-axis labels are overlapping.',
  'When I try to add an asset to my portfolio, I get an error message saying "Failed to add to portfolio".',
  'The price data shown for AAPL is from yesterday, not today. Is there a delay in data updates?',
  'I am unable to log in using my Google account. The OAuth redirect is not working properly.',
  'It would be great to have a dark mode toggle in the settings. The current dark mode is too dark.',
  'I keep getting "API rate limit exceeded" errors when trying to fetch market data. How can I increase my limit?',
  'My watchlist items are not syncing across devices. Changes made on my phone do not appear on my desktop.',
  'I noticed that dividend data is missing for some stocks like MSFT. Can you check this?',
  'The search bar is not returning results for assets I know exist in the system.',
  'The portfolio performance calculation seems incorrect. My total value does not match the sum of individual positions.',
  'I have enabled email notifications but I am not receiving any emails about price alerts.',
  'Asset logos are not loading for many stocks. They show as placeholder images.',
  'The market overview chart on the homepage is broken and shows "No data available".',
  'I need help integrating your API into my application. Can you provide documentation?',
  'I have a question about my subscription billing. When will I be charged next?',
];

// Generate unique ticket number
function generateTicketNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

// Get random element from array
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Get random date within last N days
function getRandomDate(daysAgo) {
  const now = new Date();
  const days = Math.floor(Math.random() * daysAgo);
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date;
}

async function populateMockTickets() {
  try {
    console.log('🔄 Initializing database...');
    await initDb();

    // Get all users
    const usersResult = await pool.query('SELECT id FROM users LIMIT 10');
    const userIds = usersResult.rows.map(row => row.id);

    if (userIds.length === 0) {
      console.log('⚠️  No users found. Please create users first.');
      return;
    }

    console.log(`📝 Generating mock tickets for ${userIds.length} users...`);

    const ticketsToInsert = [];
    const numTickets = parseInt(process.env.MOCK_TICKETS_COUNT || '50');

    for (let i = 0; i < numTickets; i++) {
      const userId = getRandomElement(userIds);
      const category = getRandomElement(MOCK_CATEGORIES);
      const priority = getRandomElement(MOCK_PRIORITIES);
      const status = getRandomElement(MOCK_STATUSES);
      const subjectIndex = Math.floor(Math.random() * MOCK_SUBJECTS.length);
      const subject = MOCK_SUBJECTS[subjectIndex];
      const description = MOCK_DESCRIPTIONS[subjectIndex] || MOCK_DESCRIPTIONS[0];
      const ticketNumber = generateTicketNumber();
      const createdDate = getRandomDate(90); // Within last 90 days
      const updatedDate = getRandomDate(30); // Updated within last 30 days
      const resolvedDate = status === 'resolved' || status === 'closed' 
        ? getRandomDate(15) 
        : null;

      ticketsToInsert.push({
        user_id: userId,
        ticket_number: ticketNumber,
        category,
        subject,
        description,
        priority,
        status,
        created_at: createdDate,
        updated_at: updatedDate,
        resolved_at: resolvedDate,
      });
    }

    // Insert tickets one by one to handle unique ticket_number constraint
    for (const ticket of ticketsToInsert) {
      await pool.query(
        `INSERT INTO support_tickets (
          user_id, ticket_number, category, subject, description, 
          priority, status, created_at, updated_at, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (ticket_number) DO NOTHING`,
        [
          ticket.user_id,
          ticket.ticket_number,
          ticket.category,
          ticket.subject,
          ticket.description,
          ticket.priority,
          ticket.status,
          ticket.created_at,
          ticket.updated_at,
          ticket.resolved_at,
        ]
      );
    }

    console.log(`✅ Successfully created ${ticketsToInsert.length} mock tickets`);

    // Generate some mock contact messages
    console.log('📧 Generating mock contact messages...');
    const contactMessages = [];
    const numMessages = parseInt(process.env.MOCK_CONTACT_MESSAGES_COUNT || '20');

    const mockNames = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];
    const mockEmails = ['john@example.com', 'jane@example.com', 'bob@example.com', 'alice@example.com', 'charlie@example.com'];

    for (let i = 0; i < numMessages; i++) {
      const nameIndex = Math.floor(Math.random() * mockNames.length);
      const name = mockNames[nameIndex];
      const email = mockEmails[nameIndex];
      const subjectIndex = Math.floor(Math.random() * MOCK_SUBJECTS.length);
      const subject = MOCK_SUBJECTS[subjectIndex];
      const message = MOCK_DESCRIPTIONS[subjectIndex] || MOCK_DESCRIPTIONS[0];
      const status = getRandomElement(['new', 'read', 'replied', 'archived']);
      const userId = Math.random() > 0.5 ? getRandomElement(userIds) : null;
      const createdDate = getRandomDate(60);

      contactMessages.push({
        user_id: userId,
        name,
        email,
        subject,
        message,
        status,
        created_at: createdDate,
        updated_at: createdDate,
      });
    }

    // Insert contact messages one by one
    for (const msg of contactMessages) {
      await pool.query(
        `INSERT INTO contact_messages (
          user_id, name, email, subject, message, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          msg.user_id,
          msg.name,
          msg.email,
          msg.subject,
          msg.message,
          msg.status,
          msg.created_at,
          msg.updated_at,
        ]
      );
    }

    console.log(`✅ Successfully created ${contactMessages.length} mock contact messages`);

    // Generate mock replies for some tickets
    console.log('💬 Generating mock ticket replies...');
    const ticketIdsResult = await pool.query('SELECT id FROM support_tickets ORDER BY RANDOM() LIMIT 30');
    const ticketIds = ticketIdsResult.rows.map(row => row.id);
    const adminUserIds = await pool.query('SELECT id FROM users WHERE is_admin = true OR is_superuser = true LIMIT 3');
    const adminIds = adminUserIds.rows.map(row => row.id);

    const mockReplies = [
      'Thank you for reporting this issue. We are looking into it and will update you soon.',
      'This has been fixed in the latest update. Please refresh your browser.',
      'We have escalated this to our technical team. They will investigate and get back to you within 24 hours.',
      'Can you provide more details about when this issue occurs? This will help us reproduce the problem.',
      'This feature is on our roadmap. We expect to release it in the next quarter.',
      'We have identified the issue and are working on a fix. It should be resolved within the next few days.',
      'Thank you for your feedback. We appreciate your input and will consider this for future updates.',
      'I have reviewed your account and everything looks correct. Please try logging out and back in.',
      'This appears to be a temporary issue with our data provider. We are monitoring the situation.',
      'We have updated your account settings. The changes should take effect immediately.',
    ];

    let replyCount = 0;
    for (const ticketId of ticketIds) {
      const numReplies = Math.floor(Math.random() * 3) + 1; // 1-3 replies per ticket
      for (let i = 0; i < numReplies; i++) {
        const isAdmin = Math.random() > 0.3; // 70% chance of admin reply
        const userId = isAdmin && adminIds.length > 0 
          ? adminIds[Math.floor(Math.random() * adminIds.length)]
          : getRandomElement(userIds);
        const message = getRandomElement(mockReplies);
        const replyDate = getRandomDate(20); // Replies within last 20 days

        await pool.query(
          `INSERT INTO ticket_replies (ticket_id, user_id, is_admin, message, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [ticketId, userId, isAdmin, message, replyDate]
        );
        replyCount++;
      }
    }
    console.log(`✅ Successfully created ${replyCount} mock ticket replies`);

    // Generate mock replies for some contact messages
    console.log('💬 Generating mock contact message replies...');
    const contactIdsResult = await pool.query('SELECT id FROM contact_messages WHERE status IN ($1, $2) ORDER BY RANDOM() LIMIT 10', ['read', 'replied']);
    const contactIds = contactIdsResult.rows.map(row => row.id);

    const contactReplies = [
      'Thank you for contacting us. We have received your message and will respond shortly.',
      'We appreciate your inquiry. Our team will review this and get back to you within 24 hours.',
      'Thank you for your feedback. This helps us improve our service.',
      'We have forwarded your request to the appropriate department. You will hear from us soon.',
      'Thank you for your interest. We will send you more information via email.',
    ];

    let contactReplyCount = 0;
    for (const contactId of contactIds) {
      const userId = adminIds.length > 0 
        ? adminIds[Math.floor(Math.random() * adminIds.length)]
        : getRandomElement(userIds);
      const message = getRandomElement(contactReplies);
      const replyDate = getRandomDate(15); // Replies within last 15 days

      await pool.query(
        `INSERT INTO contact_replies (contact_message_id, user_id, is_admin, message, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [contactId, userId, true, message, replyDate]
      );
      contactReplyCount++;
    }
    console.log(`✅ Successfully created ${contactReplyCount} mock contact message replies`);

    // Print summary
    const ticketStats = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM support_tickets 
      GROUP BY status
    `);
    console.log('\n📊 Ticket Statistics:');
    ticketStats.rows.forEach(stat => {
      console.log(`   ${stat.status}: ${stat.count}`);
    });

    const contactStats = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM contact_messages 
      GROUP BY status
    `);
    console.log('\n📧 Contact Message Statistics:');
    contactStats.rows.forEach(stat => {
      console.log(`   ${stat.status}: ${stat.count}`);
    });

    console.log('\n✅ Mock data population complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating mock tickets:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateMockTickets();
}

module.exports = { populateMockTickets };

