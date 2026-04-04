require('dotenv').config();
const nodemailer = require('nodemailer');

// Check if .env file exists and has SMTP config
if (!process.env.SMTP_SERVER || !process.env.SMTP_EMAIL) {
  console.error('❌ SMTP configuration missing in .env file!');
  console.error('\nPlease create/update server/.env with:');
  console.error('SMTP_SERVER=smtp.gmail.com');
  console.error('SMTP_PORT=587');
  console.error('SMTP_SECURE=false');
  console.error('SMTP_EMAIL=your-email@gmail.com');
  console.error('SMTP_EMAIL_PASSWORD=your-app-password');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fromEmail = emailRegex.test((process.env.SMTP_FROM || '').trim())
  ? process.env.SMTP_FROM.trim()
  : (process.env.SMTP_EMAIL || '').trim();

console.log('\n🔍 Testing SMTP Connection...\n');
console.log(`Server: ${process.env.SMTP_SERVER}:${process.env.SMTP_PORT}`);
console.log(`Email: ${process.env.SMTP_EMAIL}`);
console.log(`Secure: ${process.env.SMTP_SECURE === 'true' ? 'Yes (TLS/SSL)' : 'No (STARTTLS)'}`);
console.log(`Name: ${process.env.SMTP_NAME || 'Not set'}`);
console.log(`From: ${fromEmail}`);
console.log('\n⏳ Verifying connection...\n');

transporter.verify(async (error, success) => {
  if (error) {
    console.error('❌ SMTP Authentication Failed!\n');
    console.error(`Error: ${error.message}\n`);
    
    // Hostinger-specific troubleshooting
    if (process.env.SMTP_SERVER && process.env.SMTP_SERVER.includes('hostinger')) {
      console.error('📧 Hostinger Email Troubleshooting:\n');
      console.error('1. ✅ Verify email password in Hostinger hPanel:');
      console.error('   → Login to hPanel → Email → Manage');
      console.error('   → Make sure password is correct\n');
      console.error('2. ✅ Try Port 587 with STARTTLS instead:');
      console.error('   SMTP_PORT=587');
      console.error('   SMTP_SECURE=false\n');
      console.error('3. ✅ Some Hostinger accounts require:');
      console.error('   - Full email address as username: info.ucasaapp@testatozas.in');
      console.error('   - Exact password (case-sensitive)');
      console.error('   - SMTP_NAME should match domain: testatozas.in\n');
      console.error('4. ✅ Check if email account is active in hPanel\n');
      console.error('5. ✅ Try alternative Hostinger SMTP settings:');
      console.error('   Option A: Port 465 (SSL)');
      console.error('   SMTP_SERVER=smtp.hostinger.com');
      console.error('   SMTP_PORT=465');
      console.error('   SMTP_SECURE=true\n');
      console.error('   Option B: Port 587 (STARTTLS)');
      console.error('   SMTP_SERVER=smtp.hostinger.com');
      console.error('   SMTP_PORT=587');
      console.error('   SMTP_SECURE=false\n');
    } else {
      console.error('📋 General Troubleshooting Steps:');
      console.error('1. ✅ Check SMTP_EMAIL and SMTP_EMAIL_PASSWORD are correct');
      console.error('2. ✅ For Gmail: Use App Password (not regular password)');
      console.error('   → Get it from: https://myaccount.google.com/apppasswords');
      console.error('3. ✅ Check SMTP_SECURE setting:');
      console.error('   → Port 587: SMTP_SECURE=false');
      console.error('   → Port 465: SMTP_SECURE=true');
      console.error('4. ✅ Verify SMTP_SERVER hostname is correct');
      console.error('5. ✅ Some servers require SMTP_NAME to match your domain\n');
    }
    
    if (error.code === 'EAUTH') {
      console.error('💡 Authentication Error - Most likely causes:');
      console.error('   - Wrong password (check in email provider dashboard)');
      console.error('   - Wrong email address');
      console.error('   - Account locked or requires password reset');
      console.error('   - Email provider requires app-specific password\n');
    }
    
    console.error('🔧 Quick Fix: Try updating your .env file with correct credentials\n');
    process.exit(1);
  } else {
    console.log('✅ SMTP Server is ready to send emails!\n');
    console.log('🎉 Your SMTP configuration is correct!');
    console.log('   You can now use feedback/contact forms.\n');

    // Optional: send a test email to confirm delivery (not just auth)
    const testTo =
      process.env.TEST_TO ||
      process.env.FEEDBACK_EMAIL ||
      process.env.CONTACT_EMAIL ||
      process.env.SMTP_EMAIL;

    try {
      console.log(`📨 Sending test email to: ${testTo}`);
      const info = await transporter.sendMail({
        from: fromEmail,
        to: testTo,
        subject: 'UCASA SMTP Test',
        text: `SMTP test mail sent at ${new Date().toISOString()}`,
      });
      console.log('✅ Test email sent');
      console.log('   accepted:', info?.accepted);
      console.log('   rejected:', info?.rejected);
      console.log('   messageId:', info?.messageId);
      console.log('   response:', info?.response);
      process.exit(0);
    } catch (sendErr) {
      console.error('❌ Test email send failed');
      console.error(`Error: ${sendErr?.message || sendErr}`);
      process.exit(1);
    }
  }
});

