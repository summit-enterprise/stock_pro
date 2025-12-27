require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');

// Generate a secure random password
function generatePassword() {
  const length = 16;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const SUPERUSER_EMAIL = 'admin@ma-summit-enterprise.com';
const SUPERUSER_PASSWORD = generatePassword();

async function createSuperuser() {
  try {
    // Check if superuser already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [SUPERUSER_EMAIL]
    );

    if (existing.rows.length > 0) {
      console.log('Superuser already exists. Updating to superuser status...');
      await pool.query(
        'UPDATE users SET is_superuser = TRUE, is_admin = TRUE WHERE email = $1',
        [SUPERUSER_EMAIL]
      );
      console.log('Superuser status updated successfully!');
      console.log('\n⚠️  Note: Password was not changed. If you need to reset it, delete the user and run this script again.');
      await pool.end();
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(SUPERUSER_PASSWORD, saltRounds);

    // Create superuser
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, auth_type, name, is_admin, is_superuser) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, is_superuser, is_admin`,
      [SUPERUSER_EMAIL, passwordHash, 'custom', 'Super Admin', true, true]
    );

    console.log('✅ Superuser created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', SUPERUSER_EMAIL);
    console.log('Password:', SUPERUSER_PASSWORD);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Please save this password securely!');
    console.log('⚠️  Change this password after first login!');
  } catch (error) {
    console.error('Error creating superuser:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createSuperuser();
