const { pool } = require('../db.js');

async function checkSuperuser() {
  try {
    const result = await pool.query(
      'SELECT id, email, name, is_admin, is_superuser, created_at FROM users WHERE email = $1',
      ['admin@ma-summit-enterprise.com']
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ User found:');
      console.log(JSON.stringify(user, null, 2));
      console.log(`\nIs Admin: ${user.is_admin}`);
      console.log(`Is Superuser: ${user.is_superuser}`);
    } else {
      console.log('❌ No user found with email: admin@ma-summit-enterprise.com');
    }
  } catch (error) {
    console.error('Error checking user:', error.message);
  } finally {
    await pool.end();
  }
}

checkSuperuser();

