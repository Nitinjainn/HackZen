const mongoose = require('mongoose');
const TeamInvite = require('../model/TeamInviteModel');
const Team = require('../model/TeamModel');
const User = require('../model/UserModel');
const Hackathon = require('../model/HackathonModel');
const HackathonRegistration = require('../model/HackathonRegistrationModel');
const nodemailer = require('nodemailer');
const RoleInvite = require('../model/RoleInviteModel');
const JudgeAssignment = require('../model/JudgeAssignmentModel');
const Notification = require('../model/NotificationModel');

// POST /api/team-invites
const createInvite = async (req, res) => {
  try {
    const { invitedEmail, teamId, hackathonId, projectId } = req.body;
    const invitedBy = req.user._id;

    console.log('Creating invite:', { invitedEmail, teamId, hackathonId, projectId, invitedBy });

    // Validate required fields
    if (!invitedEmail || !teamId || (!hackathonId && !projectId)) {
      return res.status(400).json({ error: 'Missing required fields: invitedEmail, teamId, and either hackathonId or projectId' });
    }

    // Check for existing invite
    const existing = await TeamInvite.findOne({
      team: teamId,
      invitedEmail,
      status: 'pending'
    });
    if (existing) {
      return res.status(400).json({ error: 'Invite already sent to this email' });
    }

    // Find user by email (if exists)
    const user = await User.findOne({ email: invitedEmail });
    const invite = await TeamInvite.create({
      team: teamId,
      invitedUser: user ? user._id : undefined,
      invitedEmail,
      invitedBy,
      hackathon: hackathonId,
      project: projectId,
    });

    // Send email
    const hackathon = hackathonId ? await Hackathon.findById(hackathonId) : null;
    const Project = require('../model/ProjectModel');
    const project = projectId ? await Project.findById(projectId) : null;
    const team = await Team.findById(teamId);
    const inviter = await User.findById(invitedBy);
    
    if (!team || !inviter) {
      return res.status(404).json({ error: 'Team or inviter not found' });
    }

    if (!hackathon && !project) {
      return res.status(404).json({ error: 'Hackathon or project not found' });
    }

    // === Create in-app notification for team invite ===
    if (user) {
      const notificationMessage = `${inviter.name} invited you to join ${team.name} in ${hackathon ? hackathon.title : project.title}`;
      await Notification.create({
        type: 'team-invite',
        sender: inviter._id,
        recipient: user._id,
        team: team._id,
        hackathon: hackathon ? hackathon._id : undefined,
        message: notificationMessage,
        status: 'pending',
        link: `/team/invites/${invite._id}`
      });
    }

    // Get frontend URL based on environment
    const frontendUrl = process.env.NODE_ENV === 'production' || process.env.RENDER
      ? (process.env.FRONTEND_URL || 'https://hackzen.vercel.app')
      : 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/invite/${invite._id}`;

    // Check if email credentials are set
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.error('Email credentials not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Setup nodemailer with user's email credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('Email transporter verified successfully');
    } catch (verifyError) {
      console.error('Email transporter verification failed:', verifyError);
      return res.status(500).json({ error: 'Email service configuration error' });
    }

    const contextTitle = hackathon ? hackathon.title : project.title;
    const contextType = hackathon ? 'hackathon' : 'project';
    const contextDetails = hackathon ? 
      `<p style="color: #666; margin: 0 0 5px 0;"><strong>Prize Pool:</strong> $${hackathon.prizePool}</p>
       <p style="color: #666; margin: 0;"><strong>Deadline:</strong> ${new Date(hackathon.endDate).toLocaleDateString()}</p>` :
      `<p style="color: #666; margin: 0 0 5px 0;"><strong>Project:</strong> ${project.title}</p>
       <p style="color: #666; margin: 0;"><strong>Description:</strong> ${project.description?.substring(0, 100)}${project.description?.length > 100 ? '...' : ''}</p>`;

    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Team Invitation</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to join a ${contextType} team!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-block-start: 0;">Hello there! 👋</h2>
          
          <p style="color: #555; line-height: 1.6;">
            <strong>${inviter.name}</strong> has invited you to join their team for the ${contextType}:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-inline-start: 4px solid #667eea;">
            <h3 style="color: #667eea; margin: 0 0 10px 0;">🏆 ${contextTitle}</h3>
            <p style="color: #666; margin: 0 0 5px 0;"><strong>Team:</strong> ${team.name}</p>
            <p style="color: #666; margin: 0 0 5px 0;"><strong>Team Code:</strong> ${team.teamCode}</p>
            ${contextDetails}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
              🚀 Accept Invitation
            </a>
          </div>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #0c5460; margin: 0; font-size: 14px;">
              <strong>Note:</strong> If you don't have an account yet, you'll need to register first before accepting the invitation. 
              <br><strong>Flexible Invitation:</strong> Anyone with this link can accept the invitation, so feel free to share it with your preferred team member!
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-block-start: 30px;">
            This invitation will expire in 7 days. Don't miss out on this amazing opportunity!
          </p>
        </div>
        
        <div style="text-align: center; margin-block-start: 20px; color: #999; font-size: 12px;">
          <p>© 2024 HackZen. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      const mailResult = await transporter.sendMail({
        from: `"HackZen Team" <${process.env.MAIL_USER}>`,
        to: invitedEmail,
        subject: `🎉 You're invited to join ${team.name} for ${contextTitle}!`,
        html: emailTemplate
      });

      console.log('Email sent successfully:', mailResult.messageId);
      res.status(201).json({ message: 'Invite sent successfully', invite });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.status(500).json({ error: 'Failed to send email', details: emailError.message });
    }
  } catch (err) {
    console.error('General error in createInvite:', err);
    res.status(500).json({ error: 'Failed to send invite', details: err.message });
  }
};

// PUT /api/team-invites/:id/respond
const respondToInvite = async (req, res) => {
  try {
    const { status } = req.body; // "accepted" or "declined"
    const inviteId = req.params.id;
    const userId = req.user._id;

    const invite = await TeamInvite.findById(inviteId);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    // Allow any logged-in user to respond to the invite
    // No longer check if user matches invitedUser or invitedEmail

    invite.status = status;
    invite.respondedAt = new Date();
    
    // Set the invitedUser to whoever responds to the invite
    if (!invite.invitedUser) {
      invite.invitedUser = userId;
    }
    
    await invite.save();

    // === Update notification status for this invite if declined ===
    if (status === 'declined') {
      await Notification.findOneAndUpdate(
        {
          type: 'team-invite',
          recipient: userId,
          team: invite.team,
          status: 'pending'
        },
        { $set: { status: 'declined' } }
      );
      return res.json({ message: 'You have declined the invitation.' });
    }

    // Accept logic handled in acceptInviteById
    res.json({ message: `Invite ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to respond to invite', details: err.message });
  }
};

// GET /api/team-invites/my
const getMyInvites = async (req, res) => {
  try {
    // Get all pending invites that the user can accept
    // This includes invites sent to their email and any other pending invites
    const invites = await TeamInvite.find({ 
      status: 'pending',
      $or: [
        { invitedEmail: req.user.email },
        { invitedUser: req.user._id },
        { invitedUser: { $exists: false } } // Invites not yet accepted by anyone
      ]
    })
      .populate('team', 'name')
      .populate('invitedBy', 'name')
      .populate('hackathon', 'title')
      .populate('project', 'title');
    res.json(invites);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
};

// GET /api/team-invites/hackathon/:hackathonId
const getHackathonInvites = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all teams for this hackathon where user is a member
    const userTeams = await Team.find({
      hackathon: new mongoose.Types.ObjectId(hackathonId),
      members: new mongoose.Types.ObjectId(userId)
    });

    const teamIds = userTeams.map(team => team._id);

    // Get all invites for these teams - ONLY pending invites
    const invites = await TeamInvite.find({
      team: { $in: teamIds },
      status: 'pending'  // Explicitly only get pending invites
    })
    .populate('team', 'name leader')
    .populate('invitedBy', 'name email')
    .populate('hackathon', 'title');

    console.log(`Found ${invites.length} pending invites for teams:`, teamIds);
    invites.forEach(invite => {
      console.log(`Invite: ${invite._id}, Email: ${invite.invitedEmail}, Status: ${invite.status}`);
    });

    res.json(invites);
  } catch (err) {
    console.error('Error fetching hackathon invites:', err);
    res.status(500).json({ error: 'Failed to fetch hackathon invites', details: err.message });
  }
};

// GET /api/team-invites/project/:projectId
const getProjectInvites = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all teams for this project where user is a member
    const userTeams = await Team.find({
      project: new mongoose.Types.ObjectId(projectId),
      members: new mongoose.Types.ObjectId(userId)
    });

    const teamIds = userTeams.map(team => team._id);

    // Get all invites for these teams
    const invites = await TeamInvite.find({
      team: { $in: teamIds },
      status: 'pending'
    })
    .populate('team', 'name leader')
    .populate('invitedBy', 'name email')
    .populate('project', 'title');

    res.json(invites);
  } catch (err) {
    console.error('Error fetching project invites:', err);
    res.status(500).json({ error: 'Failed to fetch project invites', details: err.message });
  }
};

// POST /api/team-invites/:id/accept
const acceptInviteById = async (req, res) => {
  try {
    const inviteId = req.params.id;
    const userId = req.user._id;

    const invite = await TeamInvite.findById(inviteId).populate('team');
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    // If already accepted or user is already a member
    if (invite.status === 'accepted' || (invite.team && invite.team.members && invite.team.members.includes(userId))) {
      return res.status(200).json({ message: 'You are already a member of this team!' });
    }

    // If not already accepted/declined
    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invite already responded' });
    }

    // Set invitedUser to whoever accepts
    if (!invite.invitedUser) {
      invite.invitedUser = userId;
    }
    // No check for invitedEmail or invitedUser match

    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await invite.save();

    // Add user to team
    const team = await Team.findById(invite.team._id);
    if (!team.members.includes(userId)) {
      team.members.push(userId);
      await team.save();
    }

    // === Update notification status for this invite ===
    await Notification.findOneAndUpdate(
      {
        type: 'team-invite',
        recipient: userId,
        team: team._id,
        status: 'pending'
      },
      { $set: { status: 'accepted' } }
    );

    res.json({ message: 'Invite accepted and user added to team. Please complete registration.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept invite', details: err.message });
  }
};

// POST /api/team-invites/:id/register
const registerInvitee = async (req, res) => {
  try {
    const inviteId = req.params.id;
    const userId = req.user._id;
    const { formData } = req.body;

    // Validate invite
    const invite = await TeamInvite.findById(inviteId).populate('team').populate('hackathon');
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status === 'declined') return res.status(400).json({ error: 'Invite was declined' });
    if (!invite.hackathon) return res.status(400).json({ error: 'Hackathon not found for this invite' });

    // Accept invite if not already
    if (invite.status !== 'accepted') {
      invite.status = 'accepted';
      invite.respondedAt = new Date();
      if (!invite.invitedUser) invite.invitedUser = userId;
      await invite.save();
    }

    // Add user to team if not already
    const team = await Team.findById(invite.team._id);
    if (!team.members.includes(userId)) {
      team.members.push(userId);
      await team.save();
    }

    // Register user for hackathon if not already
    const hackathonId = invite.hackathon._id;
    const HackathonRegistration = require('../model/HackathonRegistrationModel');
    const existingReg = await HackathonRegistration.findOne({ hackathonId, userId });
    if (existingReg) {
      return res.status(200).json({ message: 'Already registered for hackathon and added to team.' });
    }

    // Only allow non-team fields
    const allowedFields = [
      'fullName','email','phone','age','gender','collegeOrCompany','degreeOrRole','yearOfStudyOrExperience','projectIdea','github','linkedin','resumeURL','heardFrom','acceptedTerms'
    ];
    const filteredFormData = {};
    allowedFields.forEach(f => { if (formData && formData[f] !== undefined) filteredFormData[f] = formData[f]; });
    if (!filteredFormData.fullName || !filteredFormData.email || !filteredFormData.collegeOrCompany || !filteredFormData.acceptedTerms) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    await HackathonRegistration.create({
      hackathonId,
      userId,
      formData: filteredFormData,
      acceptedTerms: !!filteredFormData.acceptedTerms
    });

    // Add user to hackathon participants
    const Hackathon = require('../model/HackathonModel');
    await Hackathon.findByIdAndUpdate(hackathonId, { $addToSet: { participants: userId } });

    // Add hackathon to user's registeredHackathonIds
    const User = require('../model/UserModel');
    await User.findByIdAndUpdate(userId, { $addToSet: { registeredHackathonIds: hackathonId } });

    res.json({ message: 'Registered for hackathon and added to team.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register via invite', details: err.message });
  }
};

// GET /api/team-invites/:id
const getInviteById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invite = await TeamInvite.findById(id)
      .populate('team', 'name description')
      .populate('invitedBy', 'name email')
      .populate('hackathon', 'title prizePool endDate')
      .populate('project', 'title description');
    
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Determine userId for registration check
    let userId = req.user?._id;
    if (!userId && invite.invitedUser) userId = invite.invitedUser;
    // If still no userId, try to find by invitedEmail
    if (!userId && invite.invitedEmail) {
      const User = require('../model/UserModel');
      const user = await User.findOne({ email: invite.invitedEmail });
      if (user) userId = user._id;
    }
    let isRegistered = false;
    if (userId && invite.hackathon) {
      const reg = await HackathonRegistration.findOne({ hackathonId: invite.hackathon._id, userId });
      isRegistered = !!reg;
    }

    res.json({ ...invite.toObject(), isRegistered });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invite', details: err.message });
  }
};

// DELETE /api/team-invites/:id
const deleteInvite = async (req, res) => {
  try {
    const inviteId = req.params.id;
    const userId = req.user._id;
    const invite = await TeamInvite.findById(inviteId).populate('team');
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    // Only the inviter or the team leader can revoke
    if (
      invite.invitedBy.toString() !== userId.toString() &&
      invite.team.leader.toString() !== userId.toString()
    ) {
      return res.status(403).json({ error: 'Not authorized to revoke this invite' });
    }
    await TeamInvite.findByIdAndDelete(inviteId);
    res.json({ success: true, message: 'Invite revoked successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke invite', details: err.message });
  }
};

// GET /api/role-invites/:token
const getRoleInviteByToken = async (req, res) => {
  try {
    const { token } = req.params;
    console.log('Looking for invite with token:', token);
    const invite = await RoleInvite.findOne({ token }).populate('hackathon', 'title description');
    console.log('Found invite:', invite);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    res.json({
      email: invite.email,
      hackathon: invite.hackathon,
      role: invite.role,
      status: invite.status,
      sentAt: invite.sentAt,
      respondedAt: invite.respondedAt
    });
  } catch (err) {
    console.error('Error fetching invite:', err);
    res.status(500).json({ error: 'Failed to fetch invite', details: err.message });
  }
};

// POST /api/role-invites/:token/accept
const acceptRoleInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const user = req.user;
    const invite = await RoleInvite.findOne({ token });
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite already responded' });
    if (user.email !== invite.email) return res.status(403).json({ error: 'This invite is not for your email' });

    invite.status = 'accepted';
    invite.respondedAt = new Date();
    invite.invitedUser = user._id;
    await invite.save();

    // Update JudgeAssignment status to 'active' if this is a judge invite
    if (invite.role === 'judge') {
      const result = await JudgeAssignment.findOneAndUpdate(
        { hackathon: invite.hackathon, 'judge.email': invite.email },
        { status: 'active' }
      );
      if (!result) {
        console.error('No matching JudgeAssignment found for invite:', invite);
        // Optionally, you can return a warning but still proceed
      }
    }

    // Set user role if not already, using findByIdAndUpdate to avoid validating other fields
    if (user.role !== invite.role) {
      await User.findByIdAndUpdate(user._id, { role: invite.role });
    }
    res.json({ message: `You are now a ${invite.role} for this hackathon.` });
  } catch (err) {
    console.error('Error in acceptRoleInvite:', err);
    res.status(500).json({ error: 'Failed to accept invite', details: err.message });
  }
};

// POST /api/role-invites/:token/decline
const declineRoleInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const user = req.user;
    const invite = await RoleInvite.findOne({ token });
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite already responded' });
    if (user.email !== invite.email) return res.status(403).json({ error: 'This invite is not for your email' });
    invite.status = 'declined';
    invite.respondedAt = new Date();
    invite.invitedUser = user._id;
    await invite.save();
    res.json({ message: 'You have declined the invitation.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline invite', details: err.message });
  }
};

module.exports = {
  createInvite,
  respondToInvite,
  getMyInvites,
  getHackathonInvites,
  getProjectInvites,
  getInviteById,
  acceptInviteById,
  deleteInvite,
  getRoleInviteByToken,
  acceptRoleInvite,
  declineRoleInvite,
  registerInvitee
};
