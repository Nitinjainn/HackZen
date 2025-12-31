const Hackathon = require('../model/HackathonModel');
const Notification = require('../model/NotificationModel');
const ChatRoom = require('../model/ChatRoomModel');
const User = require('../model/UserModel');
const RoleInvite = require('../model/RoleInviteModel');
const crypto = require('crypto');
const transporter = require('../config/mailer');
const nodemailer = require('nodemailer');
const { awardOrganizerBadges } = require('../utils/badgeUtils');
const HackathonRegistration = require('../model/HackathonRegistrationModel');
const CertificatePage = require('../model/CertificatePageModel');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs'); // Add at the top

// ... (all existing helper functions like sendCertificateEmail and generateCertificateImage remain the same)

// Helper: Send certificate email with personalized image
async function sendCertificateEmail(transporter, to, buffer, hackathonTitle) {
 return transporter.sendMail({
 to,
 subject: `Your Certificate for ${hackathonTitle}`,
  text: `Congratulations! Please find your certificate attached.`,
  attachments: [
   {
    filename: 'certificate.png',
    content: buffer
  }
  ]
 });
}

// Helper: Generate certificate image with personalized fields
async function generateCertificateImage(template, personalizedFields) {
 // template.preview can be a base64 data URL or a public URL
 const img = await loadImage(template.preview);
 const canvas = createCanvas(img.width, img.height);
 const ctx = canvas.getContext('2d');
 ctx.drawImage(img, 0, 0, img.width, img.height);
 console.log('Drawing fields:', personalizedFields); // Debug log
 personalizedFields.forEach(field => {
  ctx.save();
  ctx.font = `${field.fontWeight} ${field.fontSize}px ${field.fontFamily}`;
  ctx.fillStyle = field.color;
  ctx.textAlign = field.textAlign;
  ctx.textBaseline = 'top';
  // Calculate x based on alignment
  let drawX = field.x;
  if (field.textAlign === 'center') {
   drawX = field.x + field.width / 2;
  } else if (field.textAlign === 'right') {
   drawX = field.x + field.width;
  }
  // Add vertical offset for better alignment
  const yOffset = field.y + (field.fontSize * 0.2);
  ctx.fillText(field.content, drawX, yOffset);
  ctx.restore();
 });
 const buffer = canvas.toBuffer('image/png');
 // Save to disk for debugging (will overwrite each time)
 fs.writeFileSync('debug-certificate.png', buffer);
 return buffer;
}


// ... (all existing functions like createHackathon, getMyHackathons, etc. remain the same)
// ✅ Create a new hackathon
exports.createHackathon = async (req, res) => {
 try {
  const {
   title,
   description,
   startDate,
   endDate,
   registrationDeadline,
   submissionDeadline,
   maxParticipants,
   status,
   difficultyLevel,
   location,
   prizePool,
   problemStatements,
   problemStatementTypes,
   requirements,
   perks,
   tags,
   images,
   mode,
   rounds, // Each round can now include a 'type' field (e.g., quiz, ppt, idea, pitch, project)
   sponsorProblems,
   judges,
   mentors,
   participants,
   teamSize,
   organizerTelegram
  } = req.body;
  const maxSubmissionsPerParticipant = req.body.maxSubmissionsPerParticipant || 1;
  const submissionType = req.body.submissionType || 'single-project';
  const roundType = req.body.roundType || 'single-round';

  const newHackathon = await Hackathon.create({
   title,
   description,
   startDate: startDate ? new Date(startDate) : undefined,
   endDate: endDate ? new Date(endDate) : undefined,
   registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
   submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : undefined,
   maxParticipants,
   status,
   difficultyLevel: difficultyLevel || 'Beginner',
   location,
   organizer: req.user.id,
   organizerTelegram: organizerTelegram,
   prizePool: {
    amount: prizePool?.amount || 0,
    currency: prizePool?.currency || 'USD',
    breakdown: prizePool?.breakdown || ''
   },
   images,
   mode,
   problemStatements,
   problemStatementTypes,
   requirements,
   perks,
   tags,
   rounds,
   sponsorProblems,
   judges,
   mentors,
   participants,
   teamSize: teamSize || { min: 1, max: 4, allowSolo: true },
   maxSubmissionsPerParticipant,
   submissionType,
   roundType,
   approvalStatus: 'pending' // Always set to pending for now, admin can approve later
  });



  await ChatRoom.create({
   hackathon: newHackathon._id,
   type: 'general'
  });

  // Send notification to organizer about pending approval
  await Notification.create({
   recipient: req.user.id,
   message: `📋 Your hackathon "${newHackathon.title}" has been submitted for admin approval. You'll be notified once it's reviewed.`,
   type: 'info',
   hackathon: newHackathon._id
  });

  // Award organizer badges in real time
  const organizer = await User.findById(req.user.id);
  if (organizer) {
   await awardOrganizerBadges(organizer);
  }

  res.status(201).json(newHackathon);
 } catch (err) {
  console.error("❌ Error in createHackathon:", err);
  res.status(500).json({ message: 'Server error creating hackathon' });
 }
};


//get my hackathon (organizer ke liye)
exports.getMyHackathons = async (req, res) => {
 try {
  const hackathons = await Hackathon.find({ organizer: req.user._id })
   .populate('organizer', 'name email')
   .populate('participants', '_id');

  res.json(hackathons);
 } catch (err) {
  res.status(500).json({ message: 'Error fetching your hackathons' });
 }
};


// ✅ Get all hackathons (only approved ones)
exports.getAllHackathons = async (req, res) => {
 try {
  const hackathons = await Hackathon.find({ approvalStatus: 'approved' })
   .populate('organizer', 'name email')
   .populate('participants', '_id');

  const formatted = hackathons.map(h => ({
   ...h.toObject(),
   participantCount: h.participants?.length || 0
  }));

  res.json(formatted);
 } catch (err) {
  console.error("getAllHackathons error:", err);
  res.status(500).json({ message: 'Error fetching hackathons' });
 }
};

// ✅ Admin or Organizer: Get all hackathons (including pending)
exports.getAllHackathonsRaw = async (req, res) => {
 try {
  const hackathons = await Hackathon.find()
   .populate('organizer', 'name email')
   .populate('participants', '_id');

  res.json(hackathons);
 } catch (err) {
  res.status(500).json({ message: 'Error fetching all hackathons' });
 }
};

// ✅ Get single hackathon by ID
exports.getHackathonById = async (req, res) => {
 try {
  console.log('getHackathonById called:', {
    hackathonId: req.params.id,
    userId: req.user?._id,
    userRole: req.user?.role,
    userEmail: req.user?.email
  });

  const hackathon = await Hackathon.findById(req.params.id)
   .populate('organizer', 'name');

  if (!hackathon) {
    console.log('Hackathon not found for ID:', req.params.id);
    return res.status(404).json({ message: 'Hackathon not found' });
  }

  console.log('Found hackathon:', {
    id: hackathon._id,
    title: hackathon.title,
    organizerId: hackathon.organizer?._id,
    approvalStatus: hackathon.approvalStatus
  });
 
  // Check if user is admin or the organizer
  const isAdmin = req.user?.role === 'admin';
  const isOrganizer = req.user?._id?.toString() === hackathon.organizer?._id?.toString();
 
  console.log('Access check:', {
    isAdmin,
    isOrganizer,
    userRole: req.user?.role,
    userId: req.user?._id?.toString(),
    organizerId: hackathon.organizer?._id?.toString(),
    approvalStatus: hackathon.approvalStatus
  });
 
  // Only allow access if hackathon is approved, or user is admin/organizer
  if (!isAdmin && !isOrganizer && hackathon.approvalStatus !== 'approved') {
   console.log('Access denied - not admin, not organizer, and not approved');
   return res.status(404).json({ message: 'Hackathon not found' });
  }
 
  console.log('Access granted - returning hackathon');
  res.json(hackathon);
 } catch (err) {
  console.error('❌ Error in getHackathonById:', err);
  res.status(500).json({ message: 'Error retrieving hackathon', error: err.message, stack: err.stack });
 }
};

// ✅ Update hackathon (only creator)
exports.updateHackathon = async (req, res) => {
 try {
  console.log("Update hackathon request received for ID:", req.params.id);
  console.log("Request body:", req.body);
  console.log("User ID:", req.user.id);

  const hackathon = await Hackathon.findById(req.params.id);
  if (!hackathon) {
   console.log("Hackathon not found");
   return res.status(404).json({ message: 'Hackathon not found' });
  }

  console.log("Found hackathon:", hackathon.title);
  console.log("Hackathon organizer:", hackathon.organizer.toString());
  console.log("Request user ID:", req.user.id);

  if (hackathon.organizer.toString() !== req.user.id) {
   console.log("Authorization failed - user not organizer");
   return res.status(403).json({ message: 'Not authorized to update this hackathon' });
  }

  const {
   title,
   description,
   startDate,
   endDate,
   registrationDeadline,
   submissionDeadline,
   maxParticipants,
   status,
   difficultyLevel,
   location,
   prizePool,
   images,
   mode,
   problemStatements,
   problemStatementTypes,
   requirements,
   perks,
   tags,
   rounds,
   sponsorProblems,
   judges,
   mentors,
   participants,
   teamSize,
   organizerTelegram
  } = req.body;

  const maxSubmissionsPerParticipant = req.body.maxSubmissionsPerParticipant;
  if (maxSubmissionsPerParticipant !== undefined) {
   hackathon.maxSubmissionsPerParticipant = maxSubmissionsPerParticipant;
  }

  const submissionType = req.body.submissionType;
  const roundType = req.body.roundType;


  console.log("Judges from request:", judges);
  console.log("Mentors from request:", mentors);

  // Helper function to send invite emails
  const sendInviteEmail = async (email, role, token, hackathonData) => {
   console.log(`Attempting to send ${role} invite to: ${email}`);
   console.log('Email credentials check:', {
    MAIL_USER: !!process.env.MAIL_USER,
    MAIL_PASS: !!process.env.MAIL_PASS,
    MAIL_USER_VALUE: process.env.MAIL_USER ? 'SET' : 'NOT SET',
    MAIL_PASS_VALUE: process.env.MAIL_PASS ? 'SET' : 'NOT SET'
   });
  
   if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log('Email credentials not configured - skipping email send');
    console.log('Please check your environment variables: MAIL_USER and MAIL_PASS');
    return;
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
   const inviteLink = `${frontendUrl}/invite/role?token=${token}`;
   const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
   const roleIcon = role === 'judge' ? '⚖️' : '🎓';
   const roleColor = role === 'judge' ? '#f59e0b' : '#10b981';
  
   const emailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <div style="background: linear-gradient(135deg, ${roleColor} 0%, #667eea 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="margin: 0; font-size: 28px;">${roleIcon} ${roleDisplay} Invitation</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to be a ${roleDisplay} for an amazing hackathon!</p>
     </div>
    
     <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
      <h2 style="color: #333; margin-top: 0;">Hello there! 👋</h2>
     
      <p style="color: #555; line-height: 1.6;">
       You've been selected to be a <strong>${roleDisplay}</strong> for an exciting hackathon.
       This is a great opportunity to contribute your expertise and help shape the future of innovation!
      </p>
     
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${roleColor};">
       <h3 style="color: ${roleColor}; margin: 0 0 10px 0;">🏆 ${hackathonData.title}</h3>
       <p style="color: #666; margin: 0 0 5px 0;"><strong>Role:</strong> ${roleDisplay}</p>
       <p style="color: #666; margin: 0 0 5px 0;"><strong>Prize Pool:</strong> $${hackathonData.prizePool?.amount || 0}</p>
       <p style="color: #666; margin: 0 0 5px 0;"><strong>Start Date:</strong> ${new Date(hackathonData.startDate).toLocaleDateString()}</p>
       <p style="color: #666; margin: 0;"><strong>End Date:</strong> ${new Date(hackathonData.endDate).toLocaleDateString()}</p>
      </div>
     
      <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
       <h4 style="color: #0c5460; margin: 0 0 10px 0;">${roleDisplay} Responsibilities:</h4>
       ${role === 'judge' ? `
        <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
         <li>Evaluate project submissions based on innovation, technical implementation, and presentation</li>
         <li>Provide constructive feedback to help teams improve their projects</li>
         <li>Participate in the final judging panel to select winners</li>
         <li>Contribute to a fair and transparent evaluation process</li>
        </ul>
       ` : `
        <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
         <li>Provide technical guidance and mentorship to participating teams</li>
         <li>Share your expertise and industry knowledge</li>
         <li>Help teams overcome technical challenges and improve their projects</li>
         <li>Support the learning and growth of hackathon participants</li>
        </ul>
       `}
      </div>
     
      <div style="text-align: center; margin: 30px 0;">
       <a href="${inviteLink}" style="background: linear-gradient(135deg, ${roleColor} 0%, #667eea 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
        ${roleIcon} Accept ${roleDisplay} Role
       </a>
      </div>
     
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
       <p style="color: #856404; margin: 0; font-size: 14px;">
        <strong>Important:</strong> You'll need to be logged in to accept this invitation.
        If you don't have an account yet, you'll be prompted to register first.
       </p>
      </div>
     
      <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
       This invitation will expire in 7 days. We look forward to having you on board!
      </p>
     </div>
    
     <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
      <p>© 2024 HackZen. All rights reserved.</p>
     </div>
    </div>
   `;
  
   try {
    console.log(`Sending email to ${email} for ${role} role in hackathon: ${hackathonData.title}`);
   
    await transporter.sendMail({
     from: `"HackZen Team" <${process.env.MAIL_USER}>`,
     to: email,
     subject: `${roleIcon} You're invited to be a ${roleDisplay} for ${hackathonData.title}!`,
     html: emailTemplate
    });
   
    console.log(`Role invite email sent successfully to ${email} for ${role} role`);
   } catch (emailError) {
    console.error('Role invite email sending failed:', emailError);
    console.error('Email error details:', {
     message: emailError.message,
     code: emailError.code,
     command: emailError.command
    });
    // Don't throw the error, just log it so it doesn't break the update
    console.log(`Continuing with update despite email failure for ${email}`);
   }
  };

  // Saari fields ko bina condition ke ek object mein daalo
  const updateFields = {
   title,
   description,
   startDate: startDate ? new Date(startDate) : undefined,
   endDate: endDate ? new Date(endDate) : undefined,
   registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
   submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : undefined,
   maxParticipants,
   status,
   difficultyLevel,
   location,
   mode,
   problemStatements,
   problemStatementTypes,
   requirements,
   perks,
   tags,
   rounds,
   sponsorProblems,
   images,
   judges,
   mentors,
   participants,
   teamSize,
   prizePool: {
    amount: prizePool?.amount || 0,
    currency: prizePool?.currency || 'USD',
    breakdown: prizePool?.breakdown || ''
   },
   submissionType,
   roundType,
   maxSubmissionsPerParticipant, // <-- ensure this is always included
   wantsSponsoredProblems: req.body.wantsSponsoredProblems, // <-- add this
   sponsoredPSConfig: req.body.sponsoredPSConfig, // <-- add this
   organizerTelegram: organizerTelegram // <-- add this
  };
 

  // Jo fields undefined hai unko hata do taaki wo update na kare
  Object.keys(updateFields).forEach(key => {
   if (updateFields[key] === undefined) {
    delete updateFields[key];
   }
  });

  const updated = await Hackathon.findByIdAndUpdate(
   req.params.id,
   updateFields,
   { new: true }
  );

// Check for new judges and mentors to send invites with proper duplicate prevention using RoleInvite model
  console.log("=== JUDGES DEBUG ===");
  console.log("Judges from request:", judges);
  console.log("Judges type:", typeof judges);
  console.log("Is judges array:", Array.isArray(judges));
  console.log("Original hackathon judges:", hackathon.judges);
  console.log("Original judges type:", typeof hackathon.judges);
  console.log("Is original judges array:", Array.isArray(hackathon.judges));
 
  // Ensure we have arrays to work with
  const currentJudges = Array.isArray(judges) ? judges : [];
  const originalJudges = Array.isArray(hackathon.judges) ? hackathon.judges : [];
 
  console.log("Processed current judges:", currentJudges);
  console.log("Processed original judges:", originalJudges);
 
  if (currentJudges.length > 0) {
   const newJudges = currentJudges.filter(judge => !originalJudges.includes(judge));
   console.log("New judges to invite:", newJudges);
  
   for (const judgeEmail of newJudges) {
    if (!judgeEmail) continue;
    try {
     // Check if invite already exists in database
     let invite = await RoleInvite.findOne({
      email: judgeEmail,
      hackathon: updated._id,
      role: 'judge'
     });
    
     if (!invite) {
      // Generate invite token
      const token = crypto.randomBytes(32).toString('hex');
     
      // Create RoleInvite record
      invite = await RoleInvite.create({
       email: judgeEmail,
       hackathon: updated._id,
       role: 'judge',
       token
      });
     
      console.log(`[RoleInvite] Created judge invite:`, { email: judgeEmail, role: 'judge', token });
     
      // Send invite email using the local sendInviteEmail function
      await sendInviteEmail(judgeEmail, 'judge', token, updated);
      console.log(`Judge invite sent to: ${judgeEmail}`);
     } else {
      console.log(`Judge invite already exists for: ${judgeEmail}`);
     }
    } catch (emailError) {
     console.error(`Failed to send judge invite to ${judgeEmail}:`, emailError);
    }
   }
  }

  // Check for new mentors to send invites
  console.log("=== MENTORS DEBUG ===");
  console.log("Mentors from request:", mentors);
  console.log("Mentors type:", typeof mentors);
  console.log("Is mentors array:", Array.isArray(mentors));
  console.log("Original hackathon mentors:", hackathon.mentors);
  console.log("Original mentors type:", typeof hackathon.mentors);
  console.log("Is original mentors array:", Array.isArray(hackathon.mentors));
 
  // Ensure we have arrays to work with
  const currentMentors = Array.isArray(mentors) ? mentors : [];
  const originalMentors = Array.isArray(hackathon.mentors) ? hackathon.mentors : [];
 
  console.log("Processed current mentors:", currentMentors);
  console.log("Processed original mentors:", originalMentors);
 
  if (currentMentors.length > 0) {
   const newMentors = currentMentors.filter(mentor => !originalMentors.includes(mentor));
   console.log("New mentors to invite:", newMentors);
  
   for (const mentorEmail of newMentors) {
     if (!mentorEmail) continue;
    try {
     // Generate invite token
    // Check if invite already exists in database
     let invite = await RoleInvite.findOne({
      email: mentorEmail,
      hackathon: updated._id,
      role: 'mentor'
     });
    
     if (!invite) {
      // Generate invite token
      const token = crypto.randomBytes(32).toString('hex');
     
      // Create RoleInvite record
      invite = await RoleInvite.create({
       email: mentorEmail,
       hackathon: updated._id,
       role: 'mentor',
       token
      });
     
      console.log(`[RoleInvite] Created mentor invite:`, { email: mentorEmail, role: 'mentor', token });
     
      // Send invite email using the local sendInviteEmail function
      await sendInviteEmail(mentorEmail, 'mentor', token, updated);
      console.log(`Mentor invite sent to: ${mentorEmail}`);
     } else {
      console.log(`Mentor invite already exists for: ${mentorEmail}`);
     }
    } catch (emailError) {
     console.error(`Failed to send mentor invite to ${mentorEmail}:`, emailError);
    }
   }
  }

  console.log("Hackathon updated successfully:", updated.title);
 
  // Removed test email sending block to prevent sending to test@example.com or test@gmail.com
 
  // Send a proper JSON response with success message and updated hackathon
  res.json({
   success: true,
   message: "Hackathon updated successfully",
   hackathon: updated
  });
 } catch (err) {
  console.error("Error updating hackathon:", err);
  res.status(500).json({ message: 'Error updating hackathon', details: err.message });
 }
};


// ✅ Delete hackathon (only creator)
exports.deleteHackathon = async (req, res) => {
 try {
  const hackathon = await Hackathon.findById(req.params.id);
  if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });

  if (hackathon.organizer.toString() !== req.user.id) {
   return res.status(403).json({ message: 'Not authorized to delete this hackathon' });
  }

  await Hackathon.findByIdAndDelete(req.params.id);
  res.json({ message: 'Hackathon deleted successfully' });
 } catch (err) {
  res.status(500).json({ message: 'Error deleting hackathon' });
 }
};

// ✅ Admin: Approve or Reject hackathon
exports.updateApprovalStatus = async (req, res) => {
 try {
  console.log('[updateApprovalStatus] Starting approval status update', { id: req.params.id, status: req.body.status });
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
   console.log('[updateApprovalStatus] Invalid status provided:', status);
   return res.status(400).json({ message: 'Invalid status' });
  }

  console.log('[updateApprovalStatus] Updating hackathon in database...');
  const updated = await Hackathon.findByIdAndUpdate(
   id,
   { approvalStatus: status },
   { new: true }
  ).populate('organizer', 'name email');

  if (!updated) {
   console.log('[updateApprovalStatus] Hackathon not found:', id);
   return res.status(404).json({ message: 'Hackathon not found' });
  }

  console.log('[updateApprovalStatus] Hackathon updated successfully:', updated.title);

  // On approval, send judge/mentor invites
  if (status === 'approved') {
   console.log('[updateApprovalStatus] Processing approval - sending invites...');
   // Helper to send invite email
   const sendInviteEmail = async (email, role, token) => {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
     console.log('[updateApprovalStatus] Email service not configured, skipping email to:', email);
     return;
    }
   
    let emailTransporter;
    try {
     emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
       user: process.env.MAIL_USER,
       pass: process.env.MAIL_PASS
      }
     });
    } catch (transporterError) {
     console.error('[updateApprovalStatus] Failed to create email transporter:', transporterError);
     return;
    }
   
    // Get frontend URL based on environment
   const frontendUrl = process.env.NODE_ENV === 'production' || process.env.RENDER
     ? (process.env.FRONTEND_URL || 'https://hackzen.vercel.app')
     : 'http://localhost:5173';
   const inviteLink = `${frontendUrl}/invite/role?token=${token}`;
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
    const roleIcon = role === 'judge' ? '⚖️' : '🎓';
    const roleColor = role === 'judge' ? '#f59e0b' : '#10b981';
   
    const emailTemplate = `
     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${roleColor} 0%, #667eea 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
       <h1 style="margin: 0; font-size: 28px;">${roleIcon} ${roleDisplay} Invitation</h1>
       <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to be a ${roleDisplay} for an amazing hackathon!</p>
      </div>
     
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
       <h2 style="color: #333; margin-top: 0;">Hello there! 👋</h2>
      
       <p style="color: #555; line-height: 1.6;">
        You've been selected to be a <strong>${roleDisplay}</strong> for an exciting hackathon.
        This is a great opportunity to contribute your expertise and help shape the future of innovation!
       </p>
      
       <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${roleColor};">
        <h3 style="color: ${roleColor}; margin: 0 0 10px 0;">🏆 ${updated.title}</h3>
        <p style="color: #666; margin: 0 0 5px 0;"><strong>Role:</strong> ${roleDisplay}</p>
        <p style="color: #666; margin: 0 0 5px 0;"><strong>Prize Pool:</strong> $${updated.prizePool?.amount || 0}</p>
        <p style="color: #666; margin: 0 0 5px 0;"><strong>Start Date:</strong> ${new Date(updated.startDate).toLocaleDateString()}</p>
        <p style="color: #666; margin: 0;"><strong>End Date:</strong> ${new Date(updated.endDate).toLocaleDateString()}</p>
       </div>
      
       <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #0c5460; margin: 0 0 10px 0;">${roleDisplay} Responsibilities:</h4>
        ${role === 'judge' ? `
         <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
          <li>Evaluate project submissions based on innovation, technical implementation, and presentation</li>
          <li>Provide constructive feedback to help teams improve their projects</li>
          <li>Participate in the final judging panel to select winners</li>
          <li>Contribute to a fair and transparent evaluation process</li>
         </ul>
        ` : `
         <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
          <li>Provide technical guidance and mentorship to participating teams</li>
          <li>Share your expertise and industry knowledge</li>
          <li>Help teams overcome technical challenges and improve their projects</li>
          <li>Support the learning and growth of hackathon participants</li>
         </ul>
        `}
       </div>
      
       <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="background: linear-gradient(135deg, ${roleColor} 0%, #667eea 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
         ${roleIcon} Accept ${roleDisplay} Role
        </a>
       </div>
      
       <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="color: #856404; margin: 0; font-size: 14px;">
         <strong>Important:</strong> You'll need to be logged in to accept this invitation.
         If you don't have an account yet, you'll be prompted to register first.
        </p>
       </div>
      
       <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
        This invitation will expire in 7 days. We look forward to having you on board!
       </p>
      </div>
     
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
       <p>© 2024 HackZen. All rights reserved.</p>
      </div>
     </div>
    `;
   
    try {
     await emailTransporter.sendMail({
      from: `"HackZen Team" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `${roleIcon} You're invited to be a ${roleDisplay} for ${updated.title}!`,
      html: emailTemplate
     });
    
     console.log(`[updateApprovalStatus] Role invite email sent successfully to ${email} for ${role} role`);
    } catch (emailError) {
     console.error('[updateApprovalStatus] Role invite email sending failed:', emailError);
     // Don't throw - email failures shouldn't block approval
    }
   };
   
   // Judges
   if (Array.isArray(updated.judges)) {
    console.log('[updateApprovalStatus] Processing judges:', updated.judges.length);
    for (const email of updated.judges) {
     if (!email) continue;
     try {
      // Check if invite already exists
      let invite = await RoleInvite.findOne({ email, hackathon: updated._id, role: 'judge' });
      if (!invite) {
       const token = crypto.randomBytes(32).toString('hex');
       invite = await RoleInvite.create({
        email,
        hackathon: updated._id,
        role: 'judge',
        token
       });
       console.log(`[updateApprovalStatus] Created judge invite:`, { email, role: 'judge', token });
       await sendInviteEmail(email, 'judge', token);
      } else {
       console.log(`[updateApprovalStatus] Judge invite already exists for ${email}`);
      }
     } catch (judgeError) {
      console.error(`[updateApprovalStatus] Error processing judge invite for ${email}:`, judgeError);
      // Continue with other judges even if one fails
     }
    }
   }
   
   // Mentors
   if (Array.isArray(updated.mentors)) {
    console.log('[updateApprovalStatus] Processing mentors:', updated.mentors.length);
    for (const email of updated.mentors) {
     if (!email) continue;
     try {
      let invite = await RoleInvite.findOne({ email, hackathon: updated._id, role: 'mentor' });
      if (!invite) {
       const token = crypto.randomBytes(32).toString('hex');
       invite = await RoleInvite.create({
        email,
        hackathon: updated._id,
        role: 'mentor',
        token
       });
       console.log(`[updateApprovalStatus] Created mentor invite:`, { email, role: 'mentor', token });
       await sendInviteEmail(email, 'mentor', token);
      } else {
       console.log(`[updateApprovalStatus] Mentor invite already exists for ${email}`);
      }
     } catch (mentorError) {
      console.error(`[updateApprovalStatus] Error processing mentor invite for ${email}:`, mentorError);
      // Continue with other mentors even if one fails
     }
    }
   }
   console.log('[updateApprovalStatus] Finished processing invites');
  }

  // Send notification to organizer
  console.log('[updateApprovalStatus] Creating notification for organizer...');
  try {
   const notificationMessage = status === 'approved'
    ? `🎉 Your hackathon "${updated.title}" has been approved! It's now visible in the explore section.`
    : `❌ Your hackathon "${updated.title}" has been rejected. Please review and resubmit.`;

   await Notification.create({
    recipient: updated.organizer._id,
    message: notificationMessage,
    type: status === 'approved' ? 'success' : 'warning',
    hackathon: updated._id
   });
   console.log('[updateApprovalStatus] Notification created successfully');
  } catch (notificationError) {
   console.error('[updateApprovalStatus] Failed to create notification:', notificationError);
   // Don't fail the request if notification creation fails
  }

  console.log('[updateApprovalStatus] Approval status update completed successfully');
  res.json(updated);
 } catch (err) {
  console.error("[updateApprovalStatus] Error updating approval status:", err);
  console.error("[updateApprovalStatus] Error stack:", err.stack);
  console.error("[updateApprovalStatus] Error details:", {
   message: err.message,
   name: err.name,
   code: err.code
  });
  res.status(500).json({ 
   message: 'Error updating approval status',
   error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
 }
};

exports.getAllHackathons = async (req, res) => {
 try {
  // Only show approved hackathons to participants
  const hackathons = await Hackathon.find({
   approvalStatus: 'approved'
  })
  .populate('organizer', 'name email')
  .populate('participants', '_id')
  .lean();

  const enriched = hackathons.map((hackathon) => ({
   ...hackathon,
   participantsCount: hackathon.participants?.length || 0,
  }));

  res.status(200).json(enriched);
 } catch (err) {
  res.status(500).json({ message: err.message });
 }
};

// ✅ Admin Dashboard Hackathon Statistics
exports.getHackathonStats = async (req, res) => {
 try {
  // Get total hackathons count
  const totalHackathons = await Hackathon.countDocuments();
 
  // Get active hackathons (registration open)
  const now = new Date();
  const activeHackathons = await Hackathon.countDocuments({
   registrationDeadline: { $gte: now },
   approvalStatus: 'approved'
  });

  // Get approved hackathons
  const approvedHackathons = await Hackathon.countDocuments({
   approvalStatus: 'approved'
  });

  // Get pending hackathons
  const pendingHackathons = await Hackathon.countDocuments({
   approvalStatus: 'pending'
  });

  // Get total participants across all hackathons
  const totalParticipants = await Hackathon.aggregate([
   {
    $group: {
     _id: null,
     totalParticipants: { $sum: { $size: '$participants' } }
    }
   }
  ]);

  // Get hackathons created this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const hackathonsThisMonth = await Hackathon.countDocuments({
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
  const hackathonsLastMonth = await Hackathon.countDocuments({
   createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth }
  });

  const hackathonGrowthPercentage = hackathonsLastMonth > 0
   ? ((hackathonsThisMonth - hackathonsLastMonth) / hackathonsLastMonth * 100).toFixed(1)
   : hackathonsThisMonth > 0 ? 100 : 0;

  res.json({
   totalHackathons,
   activeHackathons,
   approvedHackathons,
   pendingHackathons,
   totalParticipants: totalParticipants[0]?.totalParticipants || 0,
   hackathonsThisMonth,
   hackathonGrowthPercentage: hackathonGrowthPercentage > 0 ? `+${hackathonGrowthPercentage}%` : `${hackathonGrowthPercentage}%`
  });
 } catch (err) {
  res.status(500).json({ error: err.message });
 }
};

// ✅ Get monthly hackathon creation data for charts
exports.getMonthlyHackathonStats = async (req, res) => {
 try {
 // Get the last 12 months
 const now = new Date();
  const months = [];
 for (let i = 11; i >= 0; i--) {
   const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
   months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  // Get all hackathons created in the last 12 months
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthlyStats = await Hackathon.aggregate([
   {
    $match: {
     createdAt: { $gte: startDate }
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

  // Map stats to a lookup for easy access
  const statsMap = {};
  monthlyStats.forEach(stat => {
   statsMap[`${stat._id.year}-${stat._id.month}`] = stat.count;
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = months.map(({ year, month }) => ({
   month: monthNames[month - 1],
   hackathons: statsMap[`${year}-${month}`] || 0
  }));

  res.json(chartData);
 } catch (err) {
  res.status(500).json({ error: err.message });
 }
};

// ✅ Get hackathon status breakdown for pie chart
exports.getHackathonStatusBreakdown = async (req, res) => {
 try {
  const statusBreakdown = await Hackathon.aggregate([
   {
    $group: {
     _id: '$approvalStatus',
     count: { $sum: 1 }
    }
   }
  ]);

  const statusColors = {
   approved: '#10B981',
   pending: '#F59E0B',
   rejected: '#EF4444'
  };

  const pieData = statusBreakdown.map(item => ({
   name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
   value: item.count,
   color: statusColors[item._id] || '#6B7280'
  }));

  res.json(pieData);
 } catch (err) {
  res.status(500).json({ error: err.message });
 }
};

// Admin: Hackathon Category Breakdown for Analytics
exports.getCategoryBreakdown = async (req, res) => {
 try {
  // Improved, visually distinct, accessible color palette
  const palette = [
   '#6366F1', // Indigo
   '#F59E42', // Orange
   '#10B981', // Green
   '#F43F5E', // Rose
   '#3B82F6', // Blue
   '#FBBF24', // Yellow
   '#A21CAF', // Purple
   '#F472B6', // Pink
   '#0EA5E9', // Sky
   '#F87171', // Red
   '#22D3EE', // Cyan
   '#84CC16', // Lime
   '#EAB308', // Gold
   '#D946EF', // Fuchsia
   '#14B8A6', // Teal
   '#FACC15', // Amber
   '#64748B', // Slate
   '#E11D48', // Crimson
   '#7C3AED', // Violet
   '#FDE68A', // Light Yellow
  ];
  const breakdown = await Hackathon.aggregate([
   { $group: { _id: '$category', count: { $sum: 1 } } },
   { $sort: { count: -1 } }
  ]);
  const pieData = breakdown.map((item, idx) => ({
   name: item._id || 'Other',
   value: item.count,
   color: palette[idx % palette.length]
  }));
  res.json(pieData);
 } catch (err) {
  res.status(500).json({ error: err.message });
 }
};

// Organizer/Admin: Mark which participants advance to a round
exports.markRoundAdvancement = async (req, res) => {
 try {
  const { id } = req.params; // hackathon id
  const { roundIndex, advancedParticipantIds } = req.body;
  const hackathon = await Hackathon.findById(id);
  if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });

  // Only organizer or admin can update
  if (
   req.user.role !== 'admin' &&
   (!hackathon.organizer || hackathon.organizer.toString() !== req.user.id)
  ) {
   return res.status(403).json({ message: 'Not authorized' });
  }

  // Find or create roundProgress entry
  let progress = hackathon.roundProgress.find(rp => rp.roundIndex === roundIndex);
  if (progress) {
   progress.advancedParticipantIds = advancedParticipantIds;
  } else {
   hackathon.roundProgress.push({ roundIndex, advancedParticipantIds });
  }
  await hackathon.save();
  res.json({ success: true, roundProgress: hackathon.roundProgress });
 } catch (err) {
  console.error('Error in markRoundAdvancement:', err);
  res.status(500).json({ message: 'Server error updating round advancement' });
 }
};

// POST /api/hackathons/:hackathonId/send-certificates
exports.sendCertificates = async (req, res) => {
 try {
  const { hackathonId } = req.params;
  const { templateId } = req.body;
  const userId = req.user._id;
  const userRole = req.user.role;
  // Use your existing transporter config
  // const transporter = nodemailer.createTransport(/* your SMTP config here, or use existing */);

  // Fetch hackathon
  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) return res.status(404).json({ error: 'Hackathon not found' });

  // Only organizer or admin can send certificates
  if (
   userRole !== 'admin' &&
   (!hackathon.organizer || hackathon.organizer.toString() !== userId.toString())
  ) {
   return res.status(403).json({ error: 'Not authorized' });
  }

  // Fetch all registrations for this hackathon with user details
  const registrations = await HackathonRegistration.find({ hackathonId })
   .populate('userId', 'name email');

  if (!registrations.length) {
   return res.status(400).json({ error: 'No registered participants found.' });
  }

  // Fetch certificate template
  const template = await CertificatePage.findById(templateId);
  if (!template) return res.status(404).json({ error: 'Certificate template not found' });

  // Prepare sending certificates
  let sentCount = 0;
  let failed = [];
  for (const reg of registrations) {
   const participant = reg.userId;
   // Replace placeholders in fields
   const personalizedFields = template.fields.map(field => {
    let content = field.content;
    content = content.replace(/\{\{HACKATHON_NAME\}\}/g, hackathon.title || '');
    content = content.replace(/\{\{PARTICIPANT_NAME\}\}/g, participant.name || '');
    content = content.replace(/\{\{DATE\}\}/g, hackathon.endDate ? new Date(hackathon.endDate).toLocaleDateString() : new Date().toLocaleDateString());
    return { ...field._doc, content };
   });
   try {
    // 1. Generate certificate image
    const buffer = await generateCertificateImage(template, personalizedFields);
    // 2. Send email with image attachment
    await sendCertificateEmail(transporter, participant.email, buffer, hackathon.title);
    sentCount++;
   } catch (err) {
    failed.push({ email: participant.email, error: err.message });
   }
  }
  return res.status(200).json({
   message: `Certificates sent to ${sentCount} participants.`,
   failed
  });
 } catch (err) {
  console.error('Error sending certificates:', err);
  res.status(500).json({ error: 'Failed to send certificates.' });
 }
};

// NEW FUNCTION: Promote a hackathon
exports.promoteHackathon = async (req, res) => {
  try {
    // 1. Get additional promotion details from the request body
    const { promotionType, days, impressions } = req.body;
    const hackathonId = req.params.id;
    const userId = req.user.id;

    // Validate promotionType
    if (!['card', 'banner', 'both'].includes(promotionType)) {
      return res.status(400).json({ message: 'Invalid promotion type.' });
    }

    // 2. Find the hackathon by ID
    const hackathon = await Hackathon.findById(hackathonId);

    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // 3. Check if the user is the organizer of the hackathon
    if (hackathon.organizer.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to promote this hackathon' });
    }

    // 4. Calculate promotion start and end dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (parseInt(days, 10) || 0)); // Add the number of promotion days

    // 5. Update all the featured fields in the hackathon document
    hackathon.isFeatured = true;
    hackathon.featuredType = promotionType;
    hackathon.featuredStartDate = startDate;
    hackathon.featuredEndDate = endDate;
    hackathon.featuredImpressions = impressions || 0;
    hackathon.featuredDuration = days || 0;
    
    // 6. Save the updated hackathon
    const updatedHackathon = await hackathon.save();
    
    // 7. Send a success response
    res.status(200).json({
      success: true,
      message: 'Hackathon promoted successfully!',
      hackathon: updatedHackathon,
    });

  } catch (error) {
    console.error('Error in promoteHackathon:', error);
    res.status(500).json({ message: 'Server error while promoting hackathon.' });
  }
};