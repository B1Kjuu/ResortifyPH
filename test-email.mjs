import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Manual env loading from .env.local
function loadEnv() {
  try {
    const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) return;
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        env[key] = value;
      }
    });
    return env;
  } catch (err) {
    console.error('❌ Could not load .env.local:', err.message);
    process.exit(1);
  }
}

async function testEmail() {
  console.log('\n🧪 Testing Email Configuration...\n');
  
  const env = loadEnv();
  
  // Check env vars
  console.log('Environment Check:');
  console.log('  RESEND_API_KEY:', env.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('  NOTIFY_FROM_EMAIL:', env.NOTIFY_FROM_EMAIL || '❌ Missing');
  console.log('  NOTIFY_REPLY_TO:', env.NOTIFY_REPLY_TO || '❌ Missing');
  console.log('  NOTIFY_TEST_TO:', env.NOTIFY_TEST_TO || '❌ Missing');
  console.log('');

  if (!env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set!');
    process.exit(1);
  }

  if (!env.NOTIFY_FROM_EMAIL) {
    console.error('❌ NOTIFY_FROM_EMAIL is not set!');
    process.exit(1);
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const testEmail = env.NOTIFY_TEST_TO || 'resortifyph@gmail.com';

  try {
    console.log(`📧 Sending test email to: ${testEmail}...`);
    
    const { data, error } = await resend.emails.send({
      from: env.NOTIFY_FROM_EMAIL,
      to: testEmail,
      subject: '🧪 ResortifyPH Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">✅ Email System Working!</h1>
          <p>This is a test email from ResortifyPH to verify the email notification system.</p>
          <p>If you received this, your email configuration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 12px;">
            Sent at: ${new Date().toLocaleString()}<br>
            From: ${env.NOTIFY_FROM_EMAIL}<br>
            API: Resend
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Email Send Failed:', error);
      process.exit(1);
    }

    console.log('✅ Email Sent Successfully!');
    console.log('   Email ID:', data.id);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Check your inbox at:', testEmail);
    console.log('  2. Check spam folder if not in inbox');
    console.log('  3. Start your dev server and test booking notifications');
    console.log('');
  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    process.exit(1);
  }
}

testEmail();
