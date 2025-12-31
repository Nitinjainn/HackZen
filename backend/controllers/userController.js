const User = require('../model/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Organization = require('../model/OrganizationModel');
const Project = require('../model/ProjectModel');
const Hackathon = require('../model/HackathonModel');
const RoleInvite = require('../model/RoleInviteModel');
const Score = require('../model/ScoreModel');
const PendingUser = require('../model/PendingUserModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PasswordResetToken = require('../model/PasswordResetTokenModel');

// Additional models for complete user deletion
const SubmissionModel = require('../model/SubmissionModel');
const SubmissionHistoryModel = require('../model/SubmissionHistoryModel');
const HackathonRegistrationModel = require('../model/HackathonRegistrationModel');
const TeamModel = require('../model/TeamModel');
const TeamInviteModel = require('../model/TeamInviteModel');
const JudgeAssignmentModel = require('../model/JudgeAssignmentModel');
const ChatMessageModel = require('../model/ChatMessageModel');
const ChatRoomModel = require('../model/ChatRoomModel');
const NotificationModel = require('../model/NotificationModel');
const MessageModel = require('../model/MessageModel');
const ArticleModel = require('../model/ArticleModel');
const AnnouncementModel = require('../model/AnnouncementModel');
const SponsorProposalModel = require('../model/SponsorProposalModel');
const CertificatePageModel = require('../model/CertificatePageModel');
// ✅ Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// ✅ Invite user to organization
const inviteToOrganization = async (req, res) => {
  const { email, role } = req.body;
  const inviter = req.user;

  try {
    if (!inviter.organization) {
      return res.status(403).json({ message: "Inviter must belong to an organization." });
    }

    const domain = email.split("@")[1];
    const inviterDomain = inviter.email.split("@")[1];
    const isSameDomain = domain === inviterDomain;

    if (inviter.role !== "admin" && !isSameDomain) {
      return res.status(403).json({ message: "Only same-domain invitations are allowed." });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        role,
        organization: inviter.organization,
        applicationStatus: "pending"
      });
    } else {
      user.role = role;
      user.organization = inviter.organization;
      user.applicationStatus = "pending";
    }

    await user.save();
    res.status(200).json({ message: "User invited successfully.", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Register a new user (email only)
const registerUser = async (req, res) => {
  console.log('[registerUser] Registration request received');
  const { name, email, password, role } = req.body;

  try {
    console.log('[registerUser] Validating input data...', { name, email, role, hasPassword: !!password });
    
    // Validate required fields
    if (!name || !email || !password) {
      console.log('[registerUser] Missing required fields');
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('[registerUser] Invalid email format:', email);
      return res.status(400).json({ message: 'Invalid email format' });
    }

    console.log('[registerUser] Checking if user already exists...');
    // Check if user already exists in main User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('[registerUser] User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }
    
    console.log('[registerUser] Checking for pending registrations...');
    // Check if pending user exists and not expired
    const pending = await PendingUser.findOne({ email });
    if (pending && pending.codeExpiresAt > new Date()) {
      console.log('[registerUser] Verification code already sent and not expired:', email);
      console.log('[registerUser] Code expires at:', pending.codeExpiresAt);
      console.log('[registerUser] Current time:', new Date());
      // Return success status so frontend shows the popup
      return res.status(200).json({ 
        message: 'Verification code already sent. Please check your email.',
        codeAlreadySent: true
      });
    }
    
    // If pending exists but expired, delete it
    if (pending && pending.codeExpiresAt <= new Date()) {
      console.log('[registerUser] Old pending registration found but expired, deleting...');
      await PendingUser.deleteOne({ email });
    }
    
    console.log('[registerUser] Hashing password...');
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    console.log('[registerUser] Generating verification code...');
    // Generate 6-digit code
    const verificationCode = (Math.floor(100000 + Math.random() * 900000)).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log('[registerUser] Storing pending user in database...');
    // Store in PendingUser
    await PendingUser.findOneAndUpdate(
      { email },
      { name, email, passwordHash, verificationCode, codeExpiresAt, createdAt: new Date(), role },
      { upsert: true }
    );
    console.log('[registerUser] Pending user stored successfully');
    
    // Prepare email template (used by both Resend and SMTP)
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #f4f6fb; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">Verify Your Email</h2>
        </div>
        <div style="background: #fff; padding: 32px 24px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="color: #333; font-size: 16px;">Hi <b>${name || email}</b>,</p>
          <p style="color: #555;">Thank you for registering! Please use the code below to verify your email address. This code is valid for <b>10 minutes</b>.</p>
          <div style="margin: 32px 0;">
            <span style="display: inline-block; font-size: 32px; letter-spacing: 8px; background: #f4f6fb; color: #764ba2; padding: 16px 32px; border-radius: 8px; font-weight: bold; border: 2px dashed #764ba2;">${verificationCode}</span>
          </div>
          <p style="color: #888; font-size: 14px;">If you did not request this, you can ignore this email.</p>
        </div>
        <div style="text-align: center; margin-top: 16px; color: #aaa; font-size: 12px;">&copy; 2025 HackZen Platform</div>
      </div>
    `;
    
    const emailText = `Hi ${name || email},\n\nThank you for registering! Please use the code below to verify your email address. This code is valid for 10 minutes.\n\nVerification Code: ${verificationCode}\n\nIf you did not request this, you can ignore this email.\n\n© 2025 HackZen Platform`;
    
    // ✅ PREFERRED: Use Resend API if configured (works perfectly on Render, sends to ANY email)
    // IMPORTANT: Resend can send TO any email address without domain verification
    // Domain verification only affects the FROM address
    console.log('[registerUser] Checking email service configuration...', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasMailUser: !!process.env.MAIL_USER,
      hasMailPass: !!process.env.MAIL_PASS
    });
    
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        console.log('[registerUser] ✅ Using Resend API for email sending (recommended for Render)');
        console.log('[registerUser] Sending to:', email, '(can be ANY email address)');
        
        // FROM address: Use verified domain email OR default Resend email
        // You can verify your domain later, but for now use onboarding@resend.dev
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        console.log('[registerUser] Resend FROM email:', fromEmail);
        
        const result = await resend.emails.send({
          from: `HackZen <${fromEmail}>`,
          to: email, // ✅ Can be ANY email address - jaingaurav906@gmail.com, etc.
          subject: 'Your Verification Code for HackZen Registration',
          html: emailTemplate,
          text: emailText
        });
        
        console.log('[registerUser] ✅ Resend API response:', JSON.stringify(result, null, 2));
        
        // Check if email was actually sent successfully
        if (result.error) {
          console.error('[registerUser] ❌ Resend API returned error:', result.error);
          throw new Error(result.error.message || 'Resend API error');
        }
        
        if (!result.data || !result.data.id) {
          console.error('[registerUser] ❌ Resend API response missing email ID:', result);
          throw new Error('Resend API did not return email ID');
        }
        
        console.log('[registerUser] ✅ Resend email sent successfully:', {
          id: result.data.id,
          to: email,
          from: fromEmail
        });
        
        res.status(200).json({ 
          message: 'Verification code sent to your email.',
          success: true,
          emailService: 'resend'
        });
        return; // Success, exit early
      } catch (resendError) {
        console.error('[registerUser] ❌ Resend API error:', resendError);
        console.error('[registerUser] Resend error details:', {
          message: resendError.message,
          name: resendError.name,
          code: resendError.code,
          statusCode: resendError.statusCode,
          response: resendError.response,
          stack: resendError.stack
        });
        // Don't fall through to SMTP - return error instead
        await PendingUser.deleteOne({ email });
        return res.status(500).json({ 
          message: 'Failed to send verification email via Resend. Please try again or contact support.',
          error: process.env.NODE_ENV === 'development' ? resendError.message : undefined,
          emailService: 'resend'
        });
      }
    }
    
    // ✅ FALLBACK: Use SMTP (Gmail) if Resend not configured
    // NOTE: SMTP often fails on Render due to network restrictions
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.error('[registerUser] ❌ No email service configured');
      console.error('[registerUser] Environment variables check:', {
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasMailUser: !!process.env.MAIL_USER,
        hasMailPass: !!process.env.MAIL_PASS
      });
      await PendingUser.deleteOne({ email });
      return res.status(500).json({ 
        message: 'Email service not configured. Please set RESEND_API_KEY in environment variables.',
        error: 'RESEND_API_KEY or MAIL_USER/MAIL_PASS environment variables are not set',
        hint: 'For Render, use RESEND_API_KEY (recommended)'
      });
    }
    
    console.log('[registerUser] ⚠️ Using SMTP (Gmail) for email sending (may fail on Render)');
    console.log('[registerUser] ⚠️ WARNING: SMTP often fails on Render. Consider using Resend API instead.');
    console.log('[registerUser] Email config check:', {
      hasMailUser: !!process.env.MAIL_USER,
      hasMailPass: !!process.env.MAIL_PASS,
      mailUser: process.env.MAIL_USER ? `${process.env.MAIL_USER.substring(0, 3)}...` : 'NOT SET',
      isProduction: process.env.NODE_ENV === 'production' || !!process.env.RENDER
    });
    
    // Use explicit SMTP config for better reliability on Render/production
    // Try port 465 (SSL) first, fallback to 587 (STARTTLS)
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '465');
    const useSecure = smtpPort === 465;
    
    try {
      
      console.log('[registerUser] SMTP Configuration:', {
        host: smtpHost,
        port: smtpPort,
        secure: useSecure,
        user: process.env.MAIL_USER ? `${process.env.MAIL_USER.substring(0, 3)}...` : 'NOT SET'
      });
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: useSecure, // true for 465, false for other ports
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        },
        // Enhanced connection options for production/render
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 30000,
        // Additional options for reliability
        tls: {
          rejectUnauthorized: false, // Accept self-signed certs if needed (needed for some Render setups)
          minVersion: 'TLSv1.2'
        },
        // Pool connections for better performance
        pool: true,
        maxConnections: 1,
        maxMessages: 3
      });
      
      // Skip verification in production - it often fails on Render but sendMail works
      const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
      if (!isProduction) {
        console.log('[registerUser] Verifying email transporter...');
        try {
          await transporter.verify();
          console.log('[registerUser] Email transporter verified successfully');
        } catch (verifyError) {
          console.warn('[registerUser] Transporter verification failed, but continuing:', verifyError.message);
        }
      } else {
        console.log('[registerUser] Skipping transporter verification in production (Render compatibility)');
      }
      
      console.log('[registerUser] Sending verification email via SMTP to:', email);
      
      // Retry logic for email sending (useful for Render network issues)
      let mailResult;
      let lastError;
      const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[registerUser] Email send attempt ${attempt}/${maxRetries}`);
          mailResult = await transporter.sendMail({
            from: `"HackZen" <${process.env.MAIL_USER}>`,
            to: email,
            subject: 'Your Verification Code for HackZen Registration',
            html: emailTemplate,
            text: emailText
          });
          console.log(`[registerUser] Email sent successfully on attempt ${attempt}`);
          break; // Success, exit retry loop
        } catch (retryError) {
          lastError = retryError;
          console.error(`[registerUser] Email send attempt ${attempt} failed:`, retryError.message);
          
          // If it's a connection error and we have retries left, wait and retry
          if ((retryError.code === 'ECONNECTION' || retryError.code === 'ETIMEDOUT' || retryError.code === 'ESOCKET') && attempt < maxRetries) {
            console.log(`[registerUser] Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          // Otherwise, throw the error
          throw retryError;
        }
      }
      
      if (!mailResult) {
        throw lastError || new Error('Failed to send email after retries');
      }
      
      console.log('[registerUser] Verification email sent successfully to', email, 'Message ID:', mailResult.messageId);
      console.log('[registerUser] Email response:', {
        accepted: mailResult.accepted,
        rejected: mailResult.rejected,
        response: mailResult.response
      });
      
      // Check if email was actually accepted
      if (mailResult.rejected && mailResult.rejected.length > 0) {
        console.error('[registerUser] Email was rejected:', mailResult.rejected);
        await PendingUser.deleteOne({ email });
        return res.status(500).json({ 
          message: 'Failed to send verification email. The email address may be invalid.',
          error: 'Email rejected by mail server'
        });
      }
      
      res.status(200).json({ 
        message: 'Verification code sent to your email.',
        success: true,
        emailService: 'smtp'
      });
    } catch (emailError) {
      console.error('[registerUser] Email sending error:', emailError);
      console.error('[registerUser] Email error details:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        responseCode: emailError.responseCode,
        errno: emailError.errno,
        syscall: emailError.syscall,
        hostname: emailError.hostname,
        port: emailError.port,
        stack: emailError.stack
      });
      
      // Clean up pending user if email fails
      await PendingUser.deleteOne({ email });
      
      // Return user-friendly error message based on error type
      let errorMessage = 'Failed to send verification email. Please try again or contact support if the problem persists.';
      let statusCode = 500;
      
      console.error('[registerUser] Email error code:', emailError.code);
      console.error('[registerUser] Email error message:', emailError.message);
      
      if (emailError.code === 'EAUTH' || emailError.code === 'EENVELOPE') {
        errorMessage = 'Email service authentication failed. Please contact support.';
        statusCode = 503; // Service Unavailable
      } else if (emailError.code === 'ECONNECTION' || emailError.code === 'ETIMEDOUT' || emailError.code === 'ESOCKET') {
        // Connection issues - common on Render
        console.log('[registerUser] Connection failed - this might be a Render network issue');
        errorMessage = 'Email service temporarily unavailable. Please try again in a few moments. If the problem persists, contact support.';
        statusCode = 503;
      } else if (emailError.responseCode === 550) {
        errorMessage = 'Invalid email address. Please check your email and try again.';
        statusCode = 400; // Bad Request
      } else if (emailError.message && (emailError.message.includes('Invalid login') || emailError.message.includes('authentication'))) {
        errorMessage = 'Email service configuration error. Please contact support.';
        statusCode = 503;
      } else if (emailError.code === 'ECERTHASEXPIRED' || emailError.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        errorMessage = 'Email service certificate error. Please contact support.';
        statusCode = 503;
      }
      
      return res.status(statusCode).json({ 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production' 
          ? emailError.message 
          : undefined,
        code: emailError.code,
        // Include helpful debug info in development
        debug: process.env.NODE_ENV === 'development' ? {
          host: smtpHost,
          port: smtpPort,
          secure: useSecure
        } : undefined
      });
    }
  } catch (err) {
    console.error('[registerUser] Registration error:', err);
    console.error('[registerUser] Error stack:', err.stack);
    console.error('[registerUser] Error details:', {
      message: err.message,
      name: err.name,
      code: err.code
    });
    // Return consistent error format
    const errorMessage = err.message || 'Registration failed. Please try again.';
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Registration failed. Please try again.'
    });
  }
};

// ✅ Verify registration code and complete registration
const verifyRegistrationCode = async (req, res) => {
  console.log('[verifyRegistrationCode] Verification request received');
  const { email, code } = req.body;
  
  try {
    console.log('[verifyRegistrationCode] Validating input...', { email, hasCode: !!code });
    
    if (!email || !code) {
      console.log('[verifyRegistrationCode] Missing email or code');
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    console.log('[verifyRegistrationCode] Looking up pending user...');
    const pending = await PendingUser.findOne({ email });
    if (!pending) {
      console.log('[verifyRegistrationCode] No pending registration found for:', email);
      return res.status(400).json({ message: 'No pending registration found for this email.' });
    }
    
    console.log('[verifyRegistrationCode] Checking code expiration...');
    if (pending.codeExpiresAt < new Date()) {
      console.log('[verifyRegistrationCode] Code expired for:', email);
      await PendingUser.deleteOne({ email });
      return res.status(400).json({ message: 'Verification code expired. Please register again.' });
    }
    
    console.log('[verifyRegistrationCode] Verifying code...');
    if (pending.verificationCode !== code) {
      console.log('[verifyRegistrationCode] Invalid code provided for:', email);
      return res.status(400).json({ message: 'Invalid verification code.' });
    }
    
    console.log('[verifyRegistrationCode] Code verified. Creating user account...');
    // Create user
    const isAdminEmail = email === 'admin@rr.dev';
    const newUser = await User.create({
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      authProvider: 'email',
      role: isAdminEmail ? 'admin' : pending.role || undefined,
      bannerImage: "/assets/default-banner.png",
      profileCompleted: false
    });
    console.log('[verifyRegistrationCode] User created successfully:', newUser._id);
    
    console.log('[verifyRegistrationCode] Cleaning up pending user...');
    await PendingUser.deleteOne({ email });
    
    console.log('[verifyRegistrationCode] Generating token...');
    const token = generateToken(newUser);
    
    console.log('[verifyRegistrationCode] Registration completed successfully for:', email);
    res.status(201).json({
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profileCompleted: newUser.profileCompleted || false
      },
      token
    });
  } catch (err) {
    console.error('[verifyRegistrationCode] Verification error:', err);
    console.error('[verifyRegistrationCode] Error stack:', err.stack);
    console.error('[verifyRegistrationCode] Error details:', {
      message: err.message,
      name: err.name,
      code: err.code
    });
    // Return consistent error format
    const errorMessage = err.message || 'Verification failed. Please try again.';
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Verification failed. Please try again.'
    });
  }
};

// ✅ Login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 2FA check
    if (user.twoFA && user.twoFA.enabled) {
      return res.json({ require2FA: true, userId: user._id });
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted || false
      },
      token: generateToken(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get single user by ID (now includes registeredHackathonIds)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('hackathonsJoined projects organization registeredHackathonIds')
      .select('-passwordHash');

    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Clean up broken badge references
    if (user.badges && user.badges.length > 0) {
      const Badge = require('../model/BadgeModel');
      const validBadges = [];
      
      for (const badgeEntry of user.badges) {
        try {
          const badgeId = badgeEntry.badge?.toString() || badgeEntry.toString();
          const badge = await Badge.findById(badgeId);
          if (badge) {
            validBadges.push(badgeEntry);
          } else {
            // console.log(`Removing broken badge reference: ${badgeId}`);
          }
        } catch (err) {
          // console.log(`Error checking badge: ${err.message}`);
        }
      }
      
      // Update user with only valid badges
      if (validBadges.length !== user.badges.length) {
        user.badges = validBadges;
        await user.save();
        // console.log(`Cleaned up badges: ${user.badges.length} -> ${validBadges.length}`);
      }
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const saveHackathon = async (req, res) => {
  try {
    const userId = req.user._id;
    const { hackathonId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Toggle Save
    const index = user.savedHackathons.indexOf(hackathonId);
    if (index > -1) {
      user.savedHackathons.splice(index, 1); // Unsave
    } else {
      user.savedHackathons.push(hackathonId); // Save
    }

    await user.save();
    res.status(200).json({ message: "Saved hackathons updated", savedHackathons: user.savedHackathons });
  } catch (err) {
    // console.error("Error saving hackathon:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ✅ Update user
const updateUser = async (req, res) => {
  try {
    const allowedFields = [
      "name", "phone", "location", "bio", "website", "github",
      "githubUsername", "linkedin", "profileImage", "bannerImage",
      // New fields from CompleteProfile
      "gender", "age", "userType", "domain", "course", "courseDuration", 
      "collegeName", "country", "city", "courseSpecialization",
      "companyName", "jobTitle", "yearsOfExperience", "currentYear",
      "skills", "interests", "twitter", "instagram", "portfolio",
      "preferredHackathonTypes", "teamSizePreference",
      "telegram" // <-- Add Telegram here
    ];

    if (req.user.role === "admin") {
      allowedFields.push("applicationStatus", "organization");
    }

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );

    // Clean enum fields before updating to prevent validation errors
    if (updates.courseDuration === '') updates.courseDuration = undefined;
    if (updates.currentYear === '') updates.currentYear = undefined;
    if (updates.yearsOfExperience === '') updates.yearsOfExperience = undefined;
    if (updates.domain === '') updates.domain = undefined;
    if (updates.preferredHackathonTypes && updates.preferredHackathonTypes.includes('')) {
      updates.preferredHackathonTypes = updates.preferredHackathonTypes.filter(type => type !== '');
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete user and all associated data
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('🗑️ Deleting user and all associated data for ID:', userId);
    
    // Get user info before deletion for logging
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('🗑️ Deleting user:', {
      email: user.email,
      name: user.name,
      role: user.role
    });
    
    // Delete user from all related collections
    const deletePromises = [];
    
    // 1. Delete user's projects
    deletePromises.push(Project.deleteMany({ user: userId }));
    
    // 2. Delete user's submissions
    deletePromises.push(SubmissionModel.deleteMany({ user: userId }));
    deletePromises.push(SubmissionHistoryModel.deleteMany({ user: userId }));
    
    // 3. Delete user's hackathon registrations
    deletePromises.push(HackathonRegistrationModel.deleteMany({ user: userId }));
    
    // 4. Delete user's team memberships and invites
    deletePromises.push(TeamModel.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    ));
    deletePromises.push(TeamInviteModel.deleteMany({ 
      $or: [{ invitedUser: userId }, { invitedBy: userId }] 
    }));
    
    // 5. Delete user's role invites
    deletePromises.push(RoleInviteModel.deleteMany({ 
      $or: [{ invitedUser: userId }, { invitedBy: userId }] 
    }));
    
    // 6. Delete user's scores
    deletePromises.push(ScoreModel.deleteMany({ user: userId }));
    
    // 7. Delete user's judge assignments
    deletePromises.push(JudgeAssignmentModel.deleteMany({ 
      $or: [{ judge: userId }, { hackathon: { $in: user.hackathonsJoined || [] } }] 
    }));
    
    // 8. Delete user's chat messages and rooms
    deletePromises.push(ChatMessageModel.deleteMany({ 
      $or: [{ sender: userId }, { receiver: userId }] 
    }));
    deletePromises.push(ChatRoomModel.deleteMany({ 
      $or: [{ participants: userId }, { createdBy: userId }] 
    }));
    
    // 9. Delete user's notifications
    deletePromises.push(NotificationModel.deleteMany({ 
      $or: [{ recipient: userId }, { sender: userId }] 
    }));
    
    // 10. Delete user's messages
    deletePromises.push(MessageModel.deleteMany({ 
      $or: [{ sender: userId }, { receiver: userId }] 
    }));
    
    // 11. Delete user's articles
    deletePromises.push(ArticleModel.deleteMany({ author: userId }));
    
    // 12. Delete user's announcements (if they were an organizer)
    if (user.role === 'organizer') {
      deletePromises.push(AnnouncementModel.deleteMany({ author: userId }));
    }
    
    // 13. Delete user's hackathons (if they were an organizer)
    if (user.role === 'organizer') {
      deletePromises.push(HackathonModel.deleteMany({ organizer: userId }));
    }
    
    // 14. Delete user's organization (if they were an organizer)
    if (user.role === 'organizer') {
      deletePromises.push(OrganizationModel.deleteMany({ owner: userId }));
    }
    
    // 15. Delete user's sponsor proposals
    deletePromises.push(SponsorProposalModel.deleteMany({ 
      $or: [{ proposer: userId }, { sponsor: userId }] 
    }));
    
    // 16. Delete user's certificate pages (if they were an organizer)
    if (user.role === 'organizer') {
      deletePromises.push(CertificatePageModel.deleteMany({ creator: userId }));
    }
    
    // 17. Delete user's password reset tokens
    deletePromises.push(PasswordResetTokenModel.deleteMany({ user: userId }));
    
    // 18. Delete user's pending registrations
    deletePromises.push(PendingUser.deleteMany({ email: user.email }));
    
    // Execute all deletions
    console.log('🗑️ Executing deletion of', deletePromises.length, 'related data collections...');
    const results = await Promise.allSettled(deletePromises);
    
    // Log deletion results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Collection ${index + 1} cleaned successfully`);
      } else {
        console.log(`❌ Collection ${index + 1} cleanup failed:`, result.reason);
      }
    });
    
    // Finally, delete the user document
    await User.findByIdAndDelete(userId);
    console.log('✅ User and all associated data deleted successfully');
    
    res.json({ 
      message: 'User and all associated data deleted successfully',
      deletedUser: {
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (err) {
    console.error('❌ Error deleting user:', err);
    res.status(500).json({ error: err.message });
  }
};



// ✅ Change user role
const changeUserRole = async (req, res) => {
  try {
    console.log("PATCH /users/:id/role called");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);

    const { newRole } = req.body;
    const validRoles = ['participant', 'organizer', 'mentor', 'judge', 'admin'];
    if (!newRole) {
      console.log("Missing newRole in request body");
      return res.status(400).json({ message: "Missing newRole in request body" });
    }
    if (!validRoles.includes(newRole)) {
      console.log("Invalid role:", newRole);
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log("User not found:", req.params.id);
      return res.status(404).json({ message: "User not found" });
    }
    user.role = newRole;

    // Clear fields that are not valid for the new role
    if (newRole === "mentor" || newRole === "organizer" || newRole === "admin" || newRole === "judge") {
      user.currentYear = undefined;
      user.yearsOfExperience = undefined;
      user.preferredHackathonTypes = undefined;
    }
    // You can add more logic for other roles if needed

    // Clean enum fields before saving to prevent validation errors
    if (user.courseDuration === '') user.courseDuration = undefined;
    if (user.currentYear === '') user.currentYear = undefined;
    if (user.yearsOfExperience === '') user.yearsOfExperience = undefined;
    if (user.domain === '') user.domain = undefined;
    if (user.preferredHackathonTypes && user.preferredHackathonTypes.includes('')) {
      user.preferredHackathonTypes = user.preferredHackathonTypes.filter(type => type !== '');
    }

    await user.save();
    console.log("Role updated successfully for user:", user._id);
    res.json({ message: "Role updated", user });
  } catch (err) {
    console.error("Error in changeUserRole:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Change password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.params.id;

  console.log("Password change request:", {
    userId,
    hasCurrentPassword: !!currentPassword,
    hasNewPassword: !!newPassword,
    authenticatedUserId: req.user?._id,
    userEmail: req.user?.email
  });

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Found user:", {
      userId: user._id,
      email: user.email,
      authProvider: user.authProvider,
      hasPasswordHash: !!user.passwordHash
    });

    // Security check: Ensure user can only change their own password
    if (req.user._id.toString() !== user._id.toString()) {
      console.log("Unauthorized password change attempt:", {
        authenticatedUser: req.user._id,
        targetUser: user._id
      });
      return res.status(403).json({ message: "You can only change your own password" });
    }

    // Check if user is email-based (either authProvider is "email" or authProvider is not set/undefined)
    const isEmailUser = !user.authProvider || user.authProvider === "email";
    
    console.log("User authentication type:", {
      isEmailUser,
      authProvider: user.authProvider,
      hasPasswordHash: !!user.passwordHash
    });
    
    if (isEmailUser) {
      if (!currentPassword) {
        console.log("Current password missing for email user");
        return res.status(400).json({ message: "Current password is required" });
      }
      
      if (!user.passwordHash) {
        console.log("No password hash found for email user");
        return res.status(400).json({ message: "No password found for this account" });
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      console.log("Password validation result:", { isValid: isCurrentPasswordValid });
      
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Incorrect current password" });
      }
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      console.log("Invalid new password:", { length: newPassword?.length });
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    console.log("Hashing new password...");
    const newHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newHash;
    console.log("Password hashed successfully");
    
    // Clean enum fields before saving to prevent validation errors
    if (user.courseDuration === '') user.courseDuration = undefined;
    if (user.currentYear === '') user.currentYear = undefined;
    if (user.yearsOfExperience === '') user.yearsOfExperience = undefined;
    if (user.domain === '') user.domain = undefined;
    if (user.userType === '') user.userType = undefined;
    if (user.course === '') user.course = undefined;
    if (user.courseSpecialization === '') user.courseSpecialization = undefined;
    if (user.companyName === '') user.companyName = undefined;
    if (user.jobTitle === '') user.jobTitle = undefined;
    if (user.organization === '') user.organization = undefined;
    if (user.position === '') user.position = undefined;
    if (user.company === '') user.company = undefined;
    if (user.job_title === '') user.job_title = undefined;
    if (user.expertise_areas === '') user.expertise_areas = undefined;
    if (user.judging_experience === '') user.judging_experience = undefined;
    if (user.bio_judge === '') user.bio_judge = undefined;
    if (user.experience_years === '') user.experience_years = undefined;
    if (user.motivation === '') user.motivation = undefined;
    if (user.previous_events === '') user.previous_events = undefined;
    if (user.preferredHackathonTypes && user.preferredHackathonTypes.includes('')) {
      user.preferredHackathonTypes = user.preferredHackathonTypes.filter(type => type !== '');
    }
    
    console.log("Saving user with updated password...");
    await user.save();
    console.log("User saved successfully");

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ My org status (dashboard)
const getMyOrganizationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("organization");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      organization: user.organization,
      status: user.applicationStatus,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch organization info" });
  }
};

const getUserStreakData = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const sortedLog = user.activityLog.sort((a, b) => new Date(a) - new Date(b));
    let maxStreak = 0, currentStreak = 0, prevDate = null;

    sortedLog.forEach(date => {
      const currentDate = new Date(date);
      if (prevDate) {
        const diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
      prevDate = currentDate;
    });

    res.status(200).json({
      streaks: user.activityLog,
      current: currentStreak,
      max: maxStreak,
    });
  } catch (err) {
    // console.error("Get streak error:", err);
    res.status(500).json({ message: "Failed to fetch streaks" });
  }
};

// ✅ Get current user info (for session refresh)
const getMe = async (req, res) => {
  try {
    // console.log('=== getMe function called ===');
    // console.log('req.user:', req.user);
    // console.log('req.user._id:', req.user._id);
    // console.log('req.user._id type:', typeof req.user._id);
    // console.log('req.user._id toString:', req.user._id.toString());
    
    // Populate badges.badge for full badge info
    const user = await User.findById(req.user._id)
      .select('-passwordHash')
      .populate('badges.badge');
    
    // console.log('Database query result:', user);
    if (!user) {
      // console.log('User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Clean up broken badge references
    if (user.badges && user.badges.length > 0) {
      const Badge = require('../model/BadgeModel');
      const validBadges = [];
      
      for (const badgeEntry of user.badges) {
        try {
          const badgeId = badgeEntry.badge?._id?.toString() || badgeEntry.badge?.toString() || badgeEntry.toString();
          const badge = await Badge.findById(badgeId);
          if (badge) {
            validBadges.push(badgeEntry);
          } else {
            // console.log(`Removing broken badge reference: ${badgeId}`);
          }
        } catch (err) {
          // console.log(`Error checking badge: ${err.message}`);
        }
      }
      
      // Update user with only valid badges
      if (validBadges.length !== user.badges.length) {
        user.badges = validBadges;
        await user.save();
        // console.log(`Cleaned up badges: ${user.badges.length} -> ${validBadges.length}`);
      }
    }
    
    // console.log('Sending user response:', { _id: user._id, email: user.email, role: user.role });
    res.json(user);
  } catch (err) {
    // console.error('getMe error:', err);
    // console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Admin Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get active users (users who logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({
      lastLoginAt: { $gte: thirtyDaysAgo }
    });

    // Get new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Calculate percentage change from last month
    const startOfLastMonth = new Date();
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    startOfLastMonth.setDate(1);
    startOfLastMonth.setHours(0, 0, 0, 0);
    const endOfLastMonth = new Date();
    endOfLastMonth.setDate(1);
    endOfLastMonth.setHours(0, 0, 0, 0);
    const newUsersLastMonth = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth }
    });

    const userGrowthPercentage = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1)
      : newUsersThisMonth > 0 ? 100 : 0;

    res.json({
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      userGrowthPercentage: userGrowthPercentage > 0 ? `+${userGrowthPercentage}%` : `${userGrowthPercentage}%`,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id || 'user'] = item.count;
        return acc;
      }, {})
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get monthly user registration data for charts
const getMonthlyUserStats = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthlyStats.map(stat => ({
      month: monthNames[stat._id.month - 1],
      users: stat.count
    }));

    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ User Role Breakdown for Pie Chart
const getUserRoleBreakdown = async (req, res) => {
  try {
    const roleBreakdown = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const roleColors = {
      participant: '#8B5CF6',
      organizer: '#3B82F6',
      mentor: '#10B981',
      judge: '#F59E0B',
    };

    const pieData = ["participant", "organizer", "mentor", "judge"].map(role => {
      const found = roleBreakdown.find(r => r._id === role);
      return {
        name: role.charAt(0).toUpperCase() + role.slice(1) + 's',
        value: found ? found.count : 0,
        color: roleColors[role]
      };
    });

    res.json(pieData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get judge stats for judge dashboard
const getJudgeStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;

    // 1️⃣ Find active judge assignments (instead of role invites)
    const JudgeAssignment = require('../model/JudgeAssignmentModel');
    const Submission = require('../model/SubmissionModel');
    const activeAssignments = await JudgeAssignment.find({
      'judge.email': userEmail,
      status: 'active'
    }).populate('hackathon');

    const totalHackathons = activeAssignments.length;

    // 2️⃣ Count total submitted submissions in those hackathons
    const hackathonIds = activeAssignments
      .filter(assignment => assignment.hackathon && assignment.hackathon._id)
      .map(assignment => assignment.hackathon._id);
    const totalSubmissions = await Submission.countDocuments({
      hackathonId: { $in: hackathonIds },
      status: 'submitted'
    });

    // 3️⃣ Count how many submissions this judge has scored
    const Score = require('../model/ScoreModel');
    const completedJudgments = await Score.countDocuments({
      judge: userId,
      hackathon: { $in: hackathonIds }
    });

    // 4️⃣ Calculate average score across all judged submissions
    const allScores = await Score.find({
      judge: userId,
      hackathon: { $in: hackathonIds }
    });

    let total = 0;
    let count = 0;

    for (const score of allScores) {
      if (score.totalScore !== undefined && score.totalScore !== null) {
        total += score.totalScore;
        count++;
      }
    }

    const averageRating = count > 0 ? total / count : 0;

    res.json({
      totalHackathons,
      totalSubmissions,
      completedJudgments,
      averageRating: averageRating.toFixed(2)
    });

  } catch (err) {
    console.error("❌ Error in getJudgeStats:", err);
    res.status(500).json({ message: "Failed to load judge stats" });
  }
};


// ✅ Test endpoint to check database connection
const testDatabase = async (req, res) => {
  try {
    // console.log('=== Testing database connection ===');
    
    // Test basic user count
    const userCount = await User.countDocuments();
    // console.log('Total users in database:', userCount);
    
    // Test finding a specific user by ID
    const testUserId = req.params.id || '686b6744dce4d0b41b175a04';
    // console.log('Testing user lookup for ID:', testUserId);
    
    const testUser = await User.findById(testUserId);
    // console.log('Test user found:', testUser ? { _id: testUser._id, email: testUser.email } : 'null');
    
    res.json({
      success: true,
      userCount,
      testUser: testUser ? { _id: testUser._id, email: testUser.email, role: testUser.role } : null
    });
  } catch (err) {
    // console.error('Database test error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Utility: Reset user data when role changes
exports.resetUserDataForRole = async function(userId, newRole) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Clear badges
  user.badges = [];

  // Reset participant-specific fields if switching to organizer
  if (newRole === 'organizer') {
    user.projects = [];
    user.hackathonsJoined = [];
    user.registeredHackathonIds = [];
    // Optionally, keep hackathons where user is organizer
  }
  // You can add more logic for other roles here

  user.role = newRole;
  await user.save();
  return user;
};

// Admin: Weekly Engagement Analytics
const getWeeklyEngagementStats = async (req, res) => {
  try {
    // Get all users' activity logs for the last 7 days
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    // Map: day string (YYYY-MM-DD) => { sessions: count, duration: avg (placeholder) }
    const engagementMap = {};
    days.forEach(day => {
      engagementMap[day] = { sessions: 0, duration: 0 };
    });
    // Get all users' activityLog
    const users = await User.find({}, 'activityLog');
    users.forEach(user => {
      if (Array.isArray(user.activityLog)) {
        user.activityLog.forEach(dateStr => {
          if (engagementMap[dateStr]) {
            engagementMap[dateStr].sessions += 1;
          }
        });
      }
    });
    // Prepare result for chart (use weekday names)
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = days.map(dateStr => {
      const d = new Date(dateStr);
      return {
        day: weekDays[d.getDay()],
        sessions: engagementMap[dateStr].sessions,
        duration: 45 // Placeholder, as duration is not tracked
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Complete user profile after registration
const completeProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!req.user || req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const updateFields = { ...req.body, profileCompleted: true };
    
    // Log the incoming data for debugging
    console.log('🔍 completeProfile - Incoming data:', {
      userId,
      currentUserRole: req.user.role,
      updateFields: updateFields
    });
    
    // Log specific enum fields for debugging
    console.log('🔍 completeProfile - Enum field values:', {
      userType: updateFields.userType,
      teamSizePreference: updateFields.teamSizePreference,
      gender: updateFields.gender,
      courseDuration: updateFields.courseDuration,
      currentYear: updateFields.currentYear,
      yearsOfExperience: updateFields.yearsOfExperience,
      domain: updateFields.domain
    });
    
    // Clean enum fields before updating to prevent validation errors
    if (updateFields.courseDuration === '') updateFields.courseDuration = undefined;
    if (updateFields.currentYear === '') updateFields.currentYear = undefined;
    if (updateFields.yearsOfExperience === '') updateFields.yearsOfExperience = undefined;
    if (updateFields.domain === '') updateFields.domain = undefined;
    if (updateFields.userType === '') updateFields.userType = undefined;
    if (updateFields.teamSizePreference === '') updateFields.teamSizePreference = undefined;
    if (updateFields.gender === '') updateFields.gender = undefined;
    if (updateFields.age === '') updateFields.age = undefined;
    if (updateFields.preferredHackathonTypes && updateFields.preferredHackathonTypes.includes('')) {
      updateFields.preferredHackathonTypes = updateFields.preferredHackathonTypes.filter(type => type !== '');
    }
    
    // Remove fields that should not be updated directly
    delete updateFields._id;
    delete updateFields.email; // Email should not be changed here
    delete updateFields.passwordHash;
    delete updateFields.authProvider;
    delete updateFields.createdAt;
    // Allow role updates during profile completion
    // delete updateFields.role;
    delete updateFields.twoFA;
    delete updateFields.badges;
    delete updateFields.hackathonsJoined;
    delete updateFields.registeredHackathonIds;
    delete updateFields.projects;
    delete updateFields.organization;
    delete updateFields.applicationStatus;
    
    // Log the final update fields
    console.log('🔍 completeProfile - Final update fields:', updateFields);
    
    // Log cleaned enum fields for debugging
    console.log('🔍 completeProfile - Cleaned enum fields:', {
      userType: updateFields.userType,
      teamSizePreference: updateFields.teamSizePreference,
      gender: updateFields.gender,
      courseDuration: updateFields.courseDuration,
      currentYear: updateFields.currentYear,
      yearsOfExperience: updateFields.yearsOfExperience,
      domain: updateFields.domain,
      age: updateFields.age
    });
    
    // Validate role if it's being updated
    if (updateFields.role) {
      const validRoles = ['participant', 'organizer', 'mentor', 'judge', 'admin'];
      if (!validRoles.includes(updateFields.role)) {
        return res.status(400).json({ 
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        });
      }
      console.log('🔍 completeProfile - Role validation passed:', updateFields.role);
    } else {
      console.log('🔍 completeProfile - No role update requested');
    }
    
    console.log('🔍 completeProfile - About to update user with fields:', updateFields);
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    
    // Log the updated user for debugging
    console.log('✅ completeProfile - User updated successfully:', {
      userId: updatedUser._id,
      role: updatedUser.role,
      profileCompleted: updatedUser.profileCompleted
    });
    
    res.json(updatedUser);
  } catch (err) {
    console.error('❌ completeProfile - Error:', err);
    
    // Provide better error messages for validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      }));
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors,
        details: 'Please check the form fields and ensure all required fields are filled correctly.'
      });
    }
    
    res.status(500).json({ message: err.message });
  }
};

// ✅ Public Profile (only non-sensitive fields)
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'badges.badge',
        select: 'name description iconUrl criteria type role rarity createdAt'
      })
      .populate('projects')
      .select('name profileImage bannerImage bio website github githubUsername linkedin twitter instagram portfolio skills interests badges projects role registeredHackathonIds activityLog');

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Debug: Log badge data
    console.log('getPublicProfile - user badges:', user.badges);
    console.log('getPublicProfile - user role:', user.role);

    // Calculate streak data using the same logic as getUserStreakData
    let streakData = {
      currentStreak: 0,
      maxStreak: 0,
      activityLog: []
    };

    if (user.activityLog && user.activityLog.length > 0) {
      const sortedLog = user.activityLog.sort((a, b) => new Date(a) - new Date(b));
      let maxStreak = 0, currentStreak = 0, prevDate = null;

      sortedLog.forEach(date => {
        const currentDate = new Date(date);
        if (prevDate) {
          const diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
          currentStreak = diff === 1 ? currentStreak + 1 : 1;
        } else {
          currentStreak = 1;
        }
        maxStreak = Math.max(maxStreak, currentStreak);
        prevDate = currentDate;
      });

      streakData = {
        currentStreak,
        maxStreak,
        activityLog: user.activityLog
      };
    }

    // Optionally, add a socialLinks array for frontend convenience
    const socialLinks = [
      user.website,
      user.githubProfile || user.github,
      user.linkedin,
      user.twitter,
      user.instagram,
      user.portfolio
    ].filter(Boolean);

    const response = {
      _id: user._id,
      name: user.name,
      profileImage: user.profileImage,
      bannerImage: user.bannerImage,
      bio: user.bio,
      website: user.website,
      github: user.github,
      githubUsername: user.githubUsername,
      linkedin: user.linkedin,
      twitter: user.twitter,
      instagram: user.instagram,
      portfolio: user.portfolio,
      skills: user.skills,
      interests: user.interests,
      badges: user.badges,
      projects: user.projects,
      role: user.role,
      registeredHackathonIds: user.registeredHackathonIds || [],
      streakData,
      socialLinks
    };

    console.log('getPublicProfile - response badges:', response.badges);

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    // Always respond with generic message
    if (!user) {
      return res.status(200).json({ message: 'If this email is registered, you will receive a password reset link.' });
    }
    // Remove old tokens
    await PasswordResetToken.deleteMany({ userId: user._id });
    // Generate token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await PasswordResetToken.create({ userId: user._id, token, expiresAt });
    // Send email
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      return res.status(500).json({ message: 'Email service not configured' });
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });
    // Get frontend URL based on environment
    const frontendUrl = process.env.NODE_ENV === 'production' || process.env.RENDER
      ? (process.env.FRONTEND_URL || 'https://hackzen.vercel.app')
      : 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #f4f6fb; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">Reset Your Password</h2>
        </div>
        <div style="background: #fff; padding: 32px 24px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="color: #333; font-size: 16px;">Hi <b>${user.name || user.email}</b>,</p>
          <p style="color: #555;">We received a request to reset your password. Click the button below to set a new password. This link is valid for <b>15 minutes</b>.</p>
          <div style="margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; font-size: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; font-weight: bold; text-decoration: none;">Change your password</a>
          </div>
          <p style="color: #888; font-size: 14px;">If you did not request this, you can ignore this email.</p>
        </div>
        <div style="text-align: center; margin-top: 16px; color: #aaa; font-size: 12px;">&copy; 2024 STPI Hackathon Platform</div>
      </div>
    `;
    await transporter.sendMail({
      from: `"STPI Hackathon" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Reset your password for STPI',
      html: emailTemplate
    });
    return res.status(200).json({ message: 'If this email is registered, you will receive a password reset link.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Reset Password
const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    await PasswordResetToken.deleteOne({ token });
    res.status(200).json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  inviteToOrganization,
  registerUser,
  verifyRegistrationCode,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,

  changeUserRole,
  changePassword,
  getMyOrganizationStatus,
  getUserStreakData,
  saveHackathon,
  getMe,
  getDashboardStats,
  getMonthlyUserStats,
  getUserRoleBreakdown,
  getJudgeStats,
  getWeeklyEngagementStats,
  completeProfile,
  forgotPassword,
  resetPassword,
};

module.exports.getPublicProfile = getPublicProfile;


