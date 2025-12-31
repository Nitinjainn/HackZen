const Newsletter = require("../model/NewsletterModel");
const sgMail = require('@sendgrid/mail');
require("dotenv").config();

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Helper: Generate styled HTML newsletter template
function generateNewsletterHTML(subject, content) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f3f4f6;
        font-family: 'Segoe UI', 'Roboto', sans-serif;
        color: #1f2937;
      }
      .email-container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.07);
        overflow: hidden;
        border: 1px solid #e5e7eb;
      }
      .header {
        background: linear-gradient(to right, #6366f1, #8b5cf6);
        color: white;
        padding: 30px 20px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
      }
      .header p {
        margin-top: 8px;
        font-size: 14px;
      }
      .body {
        padding: 30px 20px;
      }
      .body h2 {
        font-size: 20px;
        margin-bottom: 10px;
      }
      .body p {
        font-size: 15px;
        line-height: 1.6;
        margin: 8px 0;
      }
      .card {
        background-color: #f9fafb;
        padding: 20px;
        margin-top: 20px;
        border-left: 4px solid #6366f1;
        border-radius: 10px;
      }
      .card strong {
        display: block;
        margin-top: 10px;
      }
      .cta-button {
        display: inline-block;
        margin-top: 30px;
        background: linear-gradient(to right, #6366f1, #8b5cf6);
        color: #fff;
        padding: 12px 28px;
        border-radius: 30px;
        text-decoration: none;
        font-weight: bold;
        font-size: 15px;
      }
      .footer {
        background: #f3f4f6;
        text-align: center;
        font-size: 13px;
        color: #6b7280;
        padding: 20px;
        border-top: 1px solid #e5e7eb;
      }
      .footer a {
        color: #6366f1;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>📢 ${subject}</h1>
        <p>You’ve got a fresh update from HackZen!</p>
      </div>
      <div class="body">
        <h2>Hello there! 👋</h2>
        <p>${content
          .split("\n")
          .map((line) => `<p>${line.trim()}</p>`)
          .join("")}
        </p>
        <div class="card">
          <p><strong>🔗 Visit HackZen:</strong> <a href="https://hackzen.vercel.app" style="color:#4f46e5;">https://hackzen.vercel.app</a></p>
          <p><strong>💡 Need Help?</strong> Reach out anytime. We're here for you.</p>
        </div>
        <p style="text-align:center;">
  <a
    href="https://hackzen.vercel.app/dashboard/explore-hackathons"
    class="cta-button"
    style="color: white !important;"
  >
    🚀 Explore Now
  </a>
</p>
      </div>
      <div class="footer">
        You are receiving this email because you subscribed to HackZen.<br />
        <a href="#">Unsubscribe</a> if you no longer want to receive updates.
      </div>
    </div>
  </body>
  </html>
  `;
}


// Controller function to send newsletter
const sendNewsletter = async (req, res) => {
  const { subject, content } = req.body;

  if (!subject || !content) {
    return res.status(400).json({ message: "Subject and content are required." });
  }

  try {
    const subscribers = await Newsletter.find();

    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ message: "Email service not configured. Please set SENDGRID_API_KEY." });
    }
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'gjain0229@gmail.com';
    const fromName = process.env.SENDGRID_FROM_NAME || 'HackZen';
    
    const sendPromises = subscribers.map(async (subscriber) => {
      try {
        const msg = {
          to: subscriber.email,
          from: {
            email: fromEmail,
            name: fromName
          },
          subject: subject,
          html: generateNewsletterHTML(subject, content),
        };
        await sgMail.send(msg);
      } catch (err) {
        console.error(`❌ Failed to send to ${subscriber.email}:`, err.message);
      }
    });

    await Promise.all(sendPromises);

    res.status(200).json({ message: "✅ Newsletter sent to all subscribers." });
  } catch (error) {
    console.error("❌ Newsletter sending failed:", error.message);
    res.status(500).json({ message: "Server error while sending newsletter." });
  }
};

module.exports = { sendNewsletter };
