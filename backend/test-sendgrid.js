require('dotenv').config();
const sgMail = require('@sendgrid/mail');

// Set API key from environment variable
if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY is not set in environment variables!');
  console.error('Please add SENDGRID_API_KEY to your .env file');
  process.exit(1);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log('✅ SendGrid API key set');

// Get recipient email from command line or use default
const recipientEmail = process.argv[2] || process.env.TEST_EMAIL || 'gjain0229@gmail.com';

console.log(`📧 Sending test email to: ${recipientEmail}`);

const msg = {
  to: recipientEmail,
  from: {
    email: process.env.SENDGRID_FROM_EMAIL || 'gjain0229@gmail.com',
    name: process.env.SENDGRID_FROM_NAME || 'HackZen'
  },
  subject: 'Test Email from HackZen - SendGrid Setup',
  text: 'This is a test email to verify SendGrid is working correctly!',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #4F46E5;">✅ SendGrid Test Email</h1>
      <p>Congratulations! Your SendGrid integration is working correctly.</p>
      <p>This email was sent from the HackZen platform to verify that email functionality is properly configured.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">If you received this email, your SendGrid API key is valid and emails are being sent successfully!</p>
    </div>
  `
};

sgMail
  .send(msg)
  .then(() => {
    console.log('✅ Email sent successfully!');
    console.log(`📬 Check your inbox at: ${recipientEmail}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error sending email:');
    console.error(error);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
    process.exit(1);
  });

