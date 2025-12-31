const JudgeAssignment = require('../model/JudgeAssignmentModel');
const Hackathon = require('../model/HackathonModel');
const User = require('../model/UserModel');
const Team = require('../model/TeamModel');
const RoleInvite = require('../model/RoleInviteModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Submission = require('../model/SubmissionModel');
const Score = require('../model/ScoreModel');
const mongoose = require('mongoose');

// 🎯 Add Problem Statements to Hackathon
exports.addProblemStatements = async (req, res) => {
 try {
  const { hackathonId } = req.params;
 const { problemStatements } = req.body;

 const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) {
 return res.status(404).json({ message: 'Hackathon not found' });
 }

 // Verify organizer permissions
 if (hackathon.organizer.toString() !== req.user.id) {
 return res.status(403).json({ message: 'Only the organizer can add problem statements' });
 }

 // Validate problem statements
 if (!Array.isArray(problemStatements) || problemStatements.length === 0) {
 return res.status(400).json({ message: 'At least one problem statement is required' });
 }

 // Update hackathon with new problem statements
 const updatedHackathon = await Hackathon.findByIdAndUpdate(
 hackathonId,
 {
 $push: {
 problemStatements: {
 $each: problemStatements.map(ps => ({
 statement: ps.statement,
 type: ps.type,
 sponsorCompany: ps.sponsorCompany || null,
 isSponsored: ps.type === 'sponsored'
 }))
 }
 }
 },
 { new: true }
 );

 res.status(200).json({
 message: 'Problem statements added successfully',
 hackathon: updatedHackathon
 });

 } catch (error) {
 console.error('Error adding problem statements:', error);
 res.status(500).json({ message: 'Failed to add problem statements' });
 }
};

// 🎯 Assign Judges to Problem Statements
exports.assignJudges = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { judgeAssignments } = req.body;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can assign judges' });
    }

    const results = [];

    for (const assignment of judgeAssignments) {
      let { 
        judgeEmail, 
        judgeType, 
        sponsorCompany, 
        canJudgeSponsoredPS, 
        maxSubmissionsPerJudge, 
        problemStatementIds = [],
        sendEmail = true,
        firstName,
        lastName,
        mobile
      } = assignment;

      // Check if assignment already exists for this judge and hackathon
      const existing = await JudgeAssignment.findOne({
        hackathon: hackathonId,
        'judge.email': judgeEmail
      });
      
      if (existing) {
        results.push({
          judgeEmail,
          success: false,
          error: 'Judge already invited to this hackathon'
        });
        continue;
      }

      // Validate problem statement assignments
      const assignedProblemStatements = [];
      if (problemStatementIds && problemStatementIds.length > 0) {
        for (const psId of problemStatementIds) {
          const problemStatement = hackathon.problemStatements.find(
            ps => ps._id.toString() === psId.toString()
          );
          
          if (problemStatement) {
            assignedProblemStatements.push({
              problemStatementId: problemStatement._id.toString(),
              problemStatement: problemStatement.statement,
              type: problemStatement.type,
              sponsorCompany: problemStatement.sponsorCompany,
              isAssigned: true
            });
          }
        }
      }

      // Create assignedRounds for each hackathon round, with assignedSubmissions: []
      const assignedRounds = (hackathon.rounds || []).map((round, idx) => ({
        roundIndex: idx,
        roundId: round._id?.toString() || `round_${idx}`,
        roundName: round.name || `Round #${idx + 1}`,
        roundType: round.type || 'project',
        isAssigned: true,
        assignedSubmissions: [],
        maxSubmissions: 50
      }));

      // Create judge assignment
      const judgeAssignment = await JudgeAssignment.create({
        hackathon: hackathonId,
        judge: {
          email: judgeEmail,
          name: firstName && lastName ? `${firstName} ${lastName}` : firstName || judgeEmail.split('@')[0],
          type: judgeType,
          sponsorCompany: judgeType === 'sponsor' ? sponsorCompany : null,
          canJudgeSponsoredPS: judgeType === 'hybrid' || (judgeType === 'platform' && canJudgeSponsoredPS)
        },
        assignedProblemStatements,
        assignedRounds,
        permissions: {
          canJudgeGeneralPS: judgeType !== 'sponsor',
          canJudgeSponsoredPS: judgeType === 'sponsor' || judgeType === 'hybrid' || canJudgeSponsoredPS,
          canJudgeAllRounds: true,
          maxSubmissionsPerJudge: maxSubmissionsPerJudge || 50
        },
        assignedBy: req.user.id,
        status: 'pending',
        invitation: {
          sentAt: sendEmail ? new Date() : null
        }
      });

      // === Unified RoleInvite System ===
      let invite = await RoleInvite.findOne({
        email: judgeEmail,
        hackathon: hackathonId,
        role: 'judge',
        status: 'pending'
      });
      
      if (!invite) {
        const token = crypto.randomBytes(32).toString('hex');
        invite = await RoleInvite.create({
          email: judgeEmail,
          hackathon: hackathonId,
          role: 'judge',
          token,
          metadata: {
            firstName,
            lastName,
            mobile,
            judgeType,
            sponsorCompany
          }
        });
        
        if (sendEmail) {
          await sendRoleInviteEmail(judgeEmail, 'judge', token, hackathon);
        }
      } else {
        console.log(`Judge invite already exists for: ${judgeEmail}`);
      }

      results.push({
        judgeEmail,
        success: true,
        assignmentId: judgeAssignment._id,
        status: 'pending'
      });
    }

    res.status(200).json({
      message: 'Judge assignments processed',
      results
    });

  } catch (error) {
    console.error('Error assigning judges:', error);
    res.status(500).json({ message: 'Failed to assign judges' });
  }
};

// 🎯 Get Judge Assignments for Hackathon
exports.getJudgeAssignments = async (req, res) => {
  try {
    const { hackathonId } = req.params;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can view judge assignments' });
    }

    const assignments = await JudgeAssignment.find({ hackathon: hackathonId })
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    // Group assignments by judge type
    const groupedAssignments = {
      platform: assignments.filter(a => a.judge.type === 'platform'),
      sponsor: assignments.filter(a => a.judge.type === 'sponsor'),
      hybrid: assignments.filter(a => a.judge.type === 'hybrid')
    };

    res.status(200).json({
      hackathon: {
        id: hackathon._id,
        title: hackathon.title,
        problemStatements: hackathon.problemStatements,
        rounds: hackathon.rounds
      },
      assignments: groupedAssignments,
      summary: {
        total: assignments.length,
        platform: groupedAssignments.platform.length,
        sponsor: groupedAssignments.sponsor.length,
        hybrid: groupedAssignments.hybrid.length,
        active: assignments.filter(a => a.status === 'active').length,
        pending: assignments.filter(a => a.status === 'pending').length
      }
    });

  } catch (error) {
    console.error('Error fetching judge assignments:', error);
    res.status(500).json({ message: 'Failed to fetch judge assignments' });
  }
};

// 🎯 Update Judge Assignment
exports.updateJudgeAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const updates = req.body;

    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    // Verify organizer permissions
    const hackathon = await Hackathon.findById(assignment.hackathon);
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can update judge assignments' });
    }

    // Validate updates
    if (updates.judge && updates.judge.type) {
      const validationResult = validateJudgeTypeChange(
        assignment.judge.type,
        updates.judge.type,
        updates.judge.sponsorCompany
      );
      if (!validationResult.isValid) {
        return res.status(400).json({ message: validationResult.error });
      }
    }

    // Update assignment
    const updatedAssignment = await JudgeAssignment.findByIdAndUpdate(
      assignmentId,
      updates,
      { new: true }
    ).populate('assignedBy', 'name email');

    res.status(200).json({
      message: 'Judge assignment updated successfully',
      assignment: updatedAssignment
    });

  } catch (error) {
    console.error('Error updating judge assignment:', error);
    res.status(500).json({ message: 'Failed to update judge assignment' });
  }
};

// 🎯 Remove Judge Assignment
exports.removeJudgeAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    // Verify organizer permissions
    const hackathon = await Hackathon.findById(assignment.hackathon);
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can remove judge assignments' });
    }

    // Check if judge has already started judging
    if (assignment.metrics.totalSubmissionsJudged > 0) {
      return res.status(400).json({ 
        message: 'Cannot remove judge who has already started judging submissions' 
      });
    }

    // Remove judge email from hackathon's judges array
    await Hackathon.findByIdAndUpdate(
      assignment.hackathon,
      { $pull: { judges: assignment.judge.email } }
    );

    // Remove any RoleInvite for this judge (so they can be re-invited and don't see the hackathon)
    await RoleInvite.deleteMany({
      email: assignment.judge.email,
      hackathon: assignment.hackathon,
      role: 'judge'
    });

    await JudgeAssignment.findByIdAndDelete(assignmentId);

    res.status(200).json({
      message: 'Judge assignment and invite removed successfully'
    });

  } catch (error) {
    console.error('Error removing judge assignment:', error);
    res.status(500).json({ message: 'Failed to remove judge assignment' });
  }
};

// 🎯 Get Available Judges for Problem Statement
exports.getAvailableJudgesForProblemStatement = async (req, res) => {
  try {
    const { hackathonId, problemStatementId } = req.params;
    
    // Verify hackathon exists
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    const problemStatement = hackathon.problemStatements.find(
      ps => ps._id.toString() === problemStatementId
    );
    if (!problemStatement) {
      return res.status(404).json({ message: 'Problem statement not found' });
    }

    // Get all judge assignments for this hackathon
    const assignments = await JudgeAssignment.find({ hackathon: hackathonId });

    // Filter judges who can judge this problem statement
    const availableJudges = assignments.filter(assignment => {
      if (problemStatement.type === 'general') {
        return assignment.permissions.canJudgeGeneralPS;
      } else if (problemStatement.type === 'sponsored') {
        if (assignment.judge.type === 'sponsor') {
          return assignment.judge.sponsorCompany === problemStatement.sponsorCompany;
        } else if (assignment.judge.type === 'hybrid') {
          return assignment.permissions.canJudgeSponsoredPS;
        } else if (assignment.judge.type === 'platform' && assignment.judge.canJudgeSponsoredPS) {
          return assignment.permissions.canJudgeSponsoredPS;
        }
      }
      return false;
    });

    res.status(200).json({
      problemStatement,
      availableJudges: availableJudges.map(judge => ({
        email: judge.judge.email,
        name: judge.judge.name,
        type: judge.judge.type,
        sponsorCompany: judge.judge.sponsorCompany,
        metrics: judge.metrics,
        status: judge.status
      }))
    });
  } catch (error) {
    console.error('Error fetching available judges:', error);
    res.status(500).json({ message: 'Failed to fetch available judges' });
  }
};

// 🎯 Get All Available Judges for Hackathon
exports.getAvailableJudges = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    
    // Verify hackathon exists
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Check if user is organizer or admin
    if (hackathon.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this hackathon' });
    }

    const User = require('../model/UserModel');
    const allJudges = await User.find({ 
      role: 'judge',
      profileCompleted: true 
    }).select('name email profileImage');
    
    const existingAssignments = await JudgeAssignment.find({ 
      hackathon: hackathonId 
    }).select('judge.email');
    
    const existingJudgeEmails = existingAssignments.map(assignment => assignment.judge.email);
    const availableJudges = allJudges.filter(judge => 
      !existingJudgeEmails.includes(judge.email)
    );

    const formattedJudges = availableJudges.map(judge => ({
      id: judge._id,
      name: judge.name || judge.email.split('@')[0],
      email: judge.email,
      profileImage: judge.profileImage,
      type: 'external', // Default type for available judges
      status: 'available',
      assignedSubmissions: 0,
      maxSubmissions: 10 
    }));

    res.status(200).json({
      evaluators: formattedJudges,
      total: formattedJudges.length,
      available: formattedJudges.length,
      assigned: existingJudgeEmails.length
    });
  } catch (error) {
    console.error('Error fetching available judges:', error);
    res.status(500).json({ message: 'Failed to fetch available judges' });
  }
};

// 🎯 Invite Judge to Hackathon
exports.inviteJudge = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { judgeEmail, judgeType = 'external', maxSubmissionsPerJudge = 10 } = req.body;

    // Validate input
    if (!judgeEmail || !judgeEmail.includes('@')) {
      return res.status(400).json({ message: 'Valid judge email is required' });
    }

    // Verify hackathon exists
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Check if user is organizer or admin
    if (hackathon.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this hackathon' });
    }

    // Check if judge exists
    const judge = await User.findOne({ email: judgeEmail });
    if (!judge) {
      return res.status(404).json({ message: 'Judge not found. User must be registered first.' });
    }

    // Check if judge is already assigned to this hackathon
    const existingAssignment = await JudgeAssignment.findOne({
      hackathon: hackathonId,
      'judge.email': judgeEmail
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'Judge is already assigned to this hackathon' });
    }

    // Create assignedRounds for each hackathon round, with assignedSubmissions: []
    const assignedRounds = (hackathon.rounds || []).map((round, idx) => ({
      roundIndex: idx,
      roundId: round._id?.toString() || `round_${idx}`,
      roundName: round.name || `Round #${idx + 1}`,
      roundType: round.type || 'project',
      isAssigned: true,
      assignedSubmissions: [],
      maxSubmissions: 50
    }));

    // Create judge assignment
    const assignment = new JudgeAssignment({
      hackathon: hackathonId,
      judge: {
        _id: judge._id,
        name: judge.name || judge.email.split('@')[0],
        email: judge.email,
        type: judgeType,
        profileImage: judge.profileImage
      },
      status: 'pending',
      maxSubmissionsPerJudge,
      assignedRounds,
      assignedTeams: []
    });

    await assignment.save();

    // TODO: Send invitation email to judge
    // This would typically involve sending an email with a link to accept/decline the invitation

    res.status(201).json({
      message: 'Judge invited successfully',
      assignment: {
        _id: assignment._id,
        judge: assignment.judge,
        status: assignment.status,
        maxSubmissionsPerJudge: assignment.maxSubmissionsPerJudge
      }
    });

  } catch (error) {
    console.error('Error inviting judge:', error);
    res.status(500).json({ message: 'Failed to invite judge' });
  }
};

// 🎯 Accept/Decline Judge Invitation
exports.respondToInvitation = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { response } = req.body; // 'accept' or 'decline'

    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    if (assignment.judge.email !== req.user.email) {
      return res.status(403).json({ message: 'You can only respond to your own invitations' });
    }

    if (response === 'accept') {
      assignment.status = 'active';
      assignment.invitation.acceptedAt = new Date();
      
      // Create role invite for the judge
      await RoleInvite.create({
        hackathon: assignment.hackathon,
        invitedUser: req.user.id,
        role: 'judge',
        status: 'accepted',
        invitedBy: assignment.assignedBy
      });

    } else if (response === 'decline') {
      assignment.status = 'removed';
      assignment.invitation.declinedAt = new Date();
    }

    await assignment.save();

    res.status(200).json({
      message: `Invitation ${response}ed successfully`,
      assignment
    });

  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ message: 'Failed to respond to invitation' });
  }
};

// 🎯 Get Judge Assignment Details
exports.getJudgeAssignmentDetails = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await JudgeAssignment.findById(assignmentId)
      .populate('hackathon', 'title description startDate endDate problemStatements rounds')
      .populate('assignedBy', 'name email');

    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    res.status(200).json({
      assignment,
      hackathon: assignment.hackathon
    });

  } catch (error) {
    console.error('Error fetching judge assignment details:', error);
    res.status(500).json({ message: 'Failed to fetch assignment details' });
  }
};

// 🎯 Get Judge Dashboard Data
exports.getJudgeDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all judge assignments for this user
    const assignments = await JudgeAssignment.find({
      'judge.email': req.user.email,
      status: { $in: ['active', 'pending'] }
    }).populate('hackathon', 'title startDate endDate status');

    // Get performance metrics
    const totalSubmissionsJudged = assignments.reduce(
      (sum, assignment) => sum + assignment.metrics.totalSubmissionsJudged, 0
    );

    const totalTimeSpent = assignments.reduce(
      (sum, assignment) => sum + assignment.metrics.totalTimeSpent, 0
    );

    const averageScore = assignments.length > 0 
      ? assignments.reduce((sum, assignment) => sum + assignment.metrics.averageScoreGiven, 0) / assignments.length
      : 0;

    res.status(200).json({
      assignments,
      metrics: {
        totalHackathons: assignments.length,
        totalSubmissionsJudged,
        totalTimeSpent,
        averageScore: averageScore.toFixed(1)
      }
    });

  } catch (error) {
    console.error('Error fetching judge dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch judge dashboard' });
  }
};

// Assign specific teams to a judge assignment
exports.assignTeamsToJudge = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { teamIds } = req.body;

    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    // Organizer permission check
    const hackathon = await Hackathon.findById(assignment.hackathon);
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can assign teams' });
    }

    // Validate teamIds: Ensure it's an array. An empty array is now allowed for unassignment.
    if (!Array.isArray(teamIds)) {
      return res.status(400).json({ message: 'teamIds must be an array' });
    }
    
    // If teamIds is empty, it means unassign all. No further validation needed for invalidIds.
    if (teamIds.length > 0) {
      const validTeamIds = hackathon.teams.map(id => id.toString());
      const invalidIds = teamIds.filter(id => !validTeamIds.includes(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ message: 'Some teamIds are invalid', invalidIds });
      }
    }

    // Optionally: Prevent duplicate team assignment to multiple judges in assigned mode
    // This check should only apply when adding teams, not when clearing all teams.
    if (teamIds.length > 0) { 
      const allAssignments = await JudgeAssignment.find({ hackathon: hackathon._id });
      const alreadyAssigned = [];
      for (const teamId of teamIds) {
        for (const other of allAssignments) {
          // Only check other assignments, and ensure the team isn't already assigned to *this* judge
          if (other._id.toString() !== assignmentId && Array.isArray(other.assignedTeams) && other.assignedTeams.map(String).includes(teamId)) {
            alreadyAssigned.push(teamId);
          }
        }
      }
      if (alreadyAssigned.length > 0) {
        return res.status(400).json({ message: 'Some teams are already assigned to other judges', alreadyAssigned });
      }
    }

    assignment.assignedTeams = teamIds; // This will now correctly set to [] if teamIds is empty
    await assignment.save();

    res.status(200).json({ message: 'Teams assigned to judge successfully', assignment });
  } catch (error) {
    console.error('Error assigning teams to judge:', error);
    res.status(500).json({ message: 'Failed to assign teams to judge' });
  }
};

// Unassign judge from a specific problem statement or round in a JudgeAssignment
exports.unassignScopeFromJudge = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { problemStatementId, roundId } = req.body;

    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    // Organizer permission check
    const hackathon = await Hackathon.findById(assignment.hackathon);
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can unassign judges' });
    }

    let changed = false;
    if (problemStatementId) {
      const before = assignment.assignedProblemStatements.length;
      assignment.assignedProblemStatements = assignment.assignedProblemStatements.filter(
        ps => String(ps.problemStatementId) !== String(problemStatementId)
      );
      if (assignment.assignedProblemStatements.length !== before) changed = true;
    }
    if (roundId) {
      const before = assignment.assignedRounds.length;
      assignment.assignedRounds = assignment.assignedRounds.filter(
        r => String(r.roundId) !== String(roundId)
      );
      if (assignment.assignedRounds.length !== before) changed = true;
    }
    if (!changed) {
      return res.status(400).json({ message: 'Nothing to unassign' });
    }
    // If both arrays are empty, delete the assignment
    if (assignment.assignedProblemStatements.length === 0 && assignment.assignedRounds.length === 0) {
      await JudgeAssignment.findByIdAndDelete(assignmentId);
      return res.status(200).json({ message: 'Assignment deleted (no more scopes left)' });
    } else {
      await assignment.save();
      return res.status(200).json({ message: 'Scope unassigned from judge', assignment });
    }
  } catch (error) {
    console.error('Error unassigning scope from judge:', error);
    res.status(500).json({ message: 'Failed to unassign scope from judge' });
  }
};

// Set assignment mode for a round or problem statement
exports.setAssignmentMode = async (req, res) => {
  try {
    const { hackathonId, type, index } = req.params; // type: 'round' or 'problemStatement', index: array index
    const { mode } = req.body; // 'open' or 'assigned'

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can set assignment mode' });
    }

    if (type === 'round') {
      if (!hackathon.rounds[index]) return res.status(404).json({ message: 'Round not found' });
      hackathon.rounds[index].assignmentMode = mode;
      // If switching to open, clear assignedTeams for all judge assignments for this round
      if (mode === 'open') {
        const assignments = await JudgeAssignment.find({ hackathon: hackathonId });
        for (const a of assignments) {
          if (a.assignedRounds && a.assignedRounds.some(r => r.roundIndex === Number(index))) {
            a.assignedTeams = [];
            await a.save();
          }
        }
      }
    } else if (type === 'problemStatement') {
      if (!hackathon.problemStatements[index]) return res.status(404).json({ message: 'Problem statement not found' });
      hackathon.problemStatements[index].assignmentMode = mode;
      // If switching to open, clear assignedTeams for all judge assignments for this PS
      if (mode === 'open') {
        const assignments = await JudgeAssignment.find({ hackathon: hackathonId });
        for (const a of assignments) {
          if (a.assignedProblemStatements && a.assignedProblemStatements.some(ps => ps.problemStatementId === hackathon.problemStatements[index]._id.toString())) {
            a.assignedTeams = [];
            await a.save();
          }
        }
      }
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }

    await hackathon.save();
    res.status(200).json({ message: 'Assignment mode updated', hackathon });
  } catch (error) {
    console.error('Error setting assignment mode:', error);
    res.status(500).json({ message: 'Failed to set assignment mode' });
  }
};

// Auto-distribute teams among judges
exports.autoDistributeTeams = async (req, res) => {
  try {
    const { hackathonId, type, index } = req.params; // type: 'round' or 'problemStatement', index: array index
    const { judgeAssignmentIds, teamIds, forceOverwrite } = req.body; // Added forceOverwrite

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can auto-distribute teams' });
    }

    // Validate input
    if (!Array.isArray(judgeAssignmentIds) || judgeAssignmentIds.length === 0) {
      return res.status(400).json({ message: 'judgeAssignmentIds must be a non-empty array' });
    }
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ message: 'teamIds must be a non-empty array' });
    }
    const validTeamIds = hackathon.teams.map(id => id.toString());
    const invalidIds = teamIds.filter(id => !validTeamIds.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: 'Some teamIds are invalid', invalidIds });
    }

    // Validate judge assignments
    const judgeAssignments = await JudgeAssignment.find({ _id: { $in: judgeAssignmentIds }, hackathon: hackathonId });
    if (judgeAssignments.length !== judgeAssignmentIds.length) {
      return res.status(400).json({ message: 'Some judgeAssignmentIds are invalid' });
    }

    // Prevent duplicate team assignment to multiple judges, UNLESS forceOverwrite is true
    if (!forceOverwrite) {
      const allAssignments = await JudgeAssignment.find({ hackathon: hackathon._id });
      const alreadyAssigned = [];
      for (const teamId of teamIds) {
        for (const other of allAssignments) {
          if (Array.isArray(other.assignedTeams) && other.assignedTeams.map(String).includes(teamId)) {
            alreadyAssigned.push(teamId);
          }
        }
      }
      if (alreadyAssigned.length > 0) {
        return res.status(400).json({ message: 'Some teams are already assigned to judges', alreadyAssigned });
      }
    } else {
      // If forceOverwrite is true, clear all existing assignments for the selected judges
      for (const judgeId of judgeAssignmentIds) {
        await JudgeAssignment.findByIdAndUpdate(judgeId, { assignedTeams: [] });
      }
    }

    // Evenly distribute teams
    const assignments = {};
    judgeAssignmentIds.forEach(id => assignments[id] = []);
    let i = 0;
    for (const teamId of teamIds) {
      const judgeId = judgeAssignmentIds[i % judgeAssignmentIds.length];
      assignments[judgeId].push(teamId);
      i++;
    }

    // Update each JudgeAssignment
    for (const judgeId of judgeAssignmentIds) {
      await JudgeAssignment.findByIdAndUpdate(judgeId, { assignedTeams: assignments[judgeId] });
    }

    res.status(200).json({ message: 'Teams auto-distributed among judges', assignments });
  } catch (error) {
    console.error('Error auto-distributing teams:', error);
    res.status(500).json({ message: 'Failed to auto-distribute teams' });
  }
};

// Assign rounds to a judge assignment (additive)
exports.assignRoundsToJudge = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { roundIds } = req.body; // Array of round _id strings

    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    // Organizer permission check
    const hackathon = await Hackathon.findById(assignment.hackathon);
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can assign rounds' });
    }

    // Validate roundIds
    if (!Array.isArray(roundIds)) {
      return res.status(400).json({ message: 'roundIds must be an array' });
    }
    const validRounds = hackathon.rounds.filter(r => roundIds.includes(r._id.toString()));
    // Merge: keep only selected rounds, remove unselected, add new
    assignment.assignedRounds = validRounds.map((r, idx) => ({
      roundIndex: hackathon.rounds.findIndex(rr => rr._id.toString() === r._id.toString()),
      roundId: r._id.toString(),
      roundName: r.name || `Round #${idx + 1}`,
      roundType: r.type || 'project',
      isAssigned: true
    }));
    // Do NOT touch assignedProblemStatements
    await assignment.save();
    res.status(200).json({ message: 'Rounds assigned to judge', assignment });
  } catch (error) {
    console.error('Error assigning rounds to judge:', error);
    res.status(500).json({ message: 'Failed to assign rounds to judge' });
  }
};

// Assign problem statements to a judge assignment (additive)
exports.assignProblemStatementsToJudge = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { problemStatementIds } = req.body; // Array of PS _id strings

    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    // Organizer permission check
    const hackathon = await Hackathon.findById(assignment.hackathon);
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can assign problem statements' });
    }

    // Validate problemStatementIds
    if (!Array.isArray(problemStatementIds)) {
      return res.status(400).json({ message: 'problemStatementIds must be an array' });
    }
    const validPS = hackathon.problemStatements.filter(ps => problemStatementIds.includes(ps._id.toString()));
    // Merge: keep only selected PS, remove unselected, add new
    assignment.assignedProblemStatements = validPS.map(ps => ({
      problemStatementId: ps._id.toString(),
      problemStatement: ps.statement,
      type: ps.type,
      sponsorCompany: ps.sponsorCompany,
      isAssigned: true
    }));
    // Do NOT touch assignedRounds
    await assignment.save();
    res.status(200).json({ message: 'Problem statements assigned to judge', assignment });
  } catch (error) {
    console.error('Error assigning problem statements to judge:', error);
    res.status(500).json({ message: 'Failed to assign problem statements to judge' });
  }
};

// 🔧 Helper Functions

function validateJudgeAssignment(judgeType, sponsorCompany, problemStatementIds, hackathonProblemStatements) {
  // Validate judge type
  if (!['platform', 'sponsor', 'hybrid'].includes(judgeType)) {
    return { isValid: false, error: 'Invalid judge type' };
  }

  // Validate sponsor company for sponsor judges
  if (judgeType === 'sponsor' && !sponsorCompany) {
    return { isValid: false, error: 'Sponsor company is required for sponsor judges' };
  }

  // Validate problem statement assignments
  for (const psId of problemStatementIds) {
    const ps = hackathonProblemStatements.find(p => p._id.toString() === psId);
    if (!ps) {
      return { isValid: false, error: `Problem statement ${psId} not found` };
    }

    // Check if judge can judge this problem statement type
    if (ps.type === 'sponsored' && judgeType === 'platform') {
      return { isValid: false, error: 'Platform judges cannot judge sponsored problem statements by default' };
    }

    if (ps.type === 'sponsored' && judgeType === 'sponsor' && ps.sponsorCompany !== sponsorCompany) {
      return { isValid: false, error: 'Sponsor judges can only judge their own company\'s problem statements' };
    }
  }

  return { isValid: true };
}

function validateJudgeTypeChange(oldType, newType, sponsorCompany) {
  if (newType === 'sponsor' && !sponsorCompany) {
    return { isValid: false, error: 'Sponsor company is required for sponsor judges' };
  }

  return { isValid: true };
}

// Helper function to send judge/mentor invite email (copied from hackathonController.js)
async function sendRoleInviteEmail(email, role, token, hackathonData) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return;
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
          <h4 style="color: #0c5460; margin: 0 0 10px 0;'>${roleDisplay} Responsibilities:</h4>
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
    await transporter.sendMail({
      from: `"HackZen Team" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `${roleIcon} You're invited to be a ${roleDisplay} for ${hackathonData.title}!`,
      html: emailTemplate
    });
    console.log(`Role invite email sent successfully to ${email} for ${role} role`);
  } catch (emailError) {
    console.error('Role invite email sending failed:', emailError);
  }
}

// 🎯 Bulk Assign Submissions to Evaluators
exports.bulkAssignSubmissionsToEvaluators = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { 
      submissionIds, 
      evaluatorAssignments, 
      assignmentMode = 'manual', // 'manual' or 'equal'
      roundIndex,
      multipleJudgesMode = false,
      judgesPerProject = 1,
      judgesPerProjectMode = 'manual', // 'manual' or 'equal'
      problemStatementId = null
    } = req.body;

    console.log('🔍 Bulk Assignment Request:', {
      hackathonId,
      submissionIds,
      evaluatorAssignments,
      assignmentMode,
      roundIndex,
      multipleJudgesMode,
      judgesPerProject,
      judgesPerProjectMode,
      problemStatementId
    });

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Defensive check for rounds and roundIndex
    if (!Array.isArray(hackathon.rounds) || typeof roundIndex !== 'number' || roundIndex < 0 || roundIndex >= hackathon.rounds.length) {
      console.error('Invalid roundIndex or hackathon.rounds:', { roundIndex, rounds: hackathon.rounds });
      return res.status(400).json({ message: 'Invalid round index for this hackathon.' });
    }

    // Defensive check for submissionIds
    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({ message: 'At least one submission is required' });
    }
    const invalidSubmissionIds = submissionIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidSubmissionIds.length > 0) {
      console.error('Invalid submissionIds:', invalidSubmissionIds);
      return res.status(400).json({ message: 'One or more submission IDs are invalid.' });
    }

    // Get all evaluator assignments for this hackathon (NOT lean - we need to save them)
    const allEvaluators = await JudgeAssignment.find({ 
      hackathon: hackathonId,
      status: { $in: ['active', 'pending'] }
    }).populate('judge');

    console.log('🔍 Found evaluators:', allEvaluators.map(e => ({
      id: e._id,
      email: e.judge.email,
      status: e.status,
      assignedRounds: e.assignedRounds?.length || 0
    })));

    // Get already assigned submissions for this round to prevent duplicates
    const alreadyAssignedSubmissions = new Set();
    allEvaluators.forEach(evaluator => {
      const roundAssignment = evaluator.assignedRounds?.find(r => r.roundIndex === roundIndex);
      if (roundAssignment?.assignedSubmissions) {
        roundAssignment.assignedSubmissions.forEach(subId => {
          alreadyAssignedSubmissions.add(subId.toString());
        });
      }
    });

    // Filter out already assigned submissions
    const availableSubmissionIds = submissionIds.filter(id => !alreadyAssignedSubmissions.has(id.toString()));
    const duplicateSubmissionIds = submissionIds.filter(id => alreadyAssignedSubmissions.has(id.toString()));

    // Filter by problem statement if specified
    let filteredSubmissionIds = availableSubmissionIds;
    if (problemStatementId) {
      // Get the selected problem statement text
      const selectedPS = hackathon.problemStatements.find(ps => ps._id.toString() === problemStatementId);
      
      if (selectedPS) {
        // Get submissions that were originally submitted for this specific problem statement
        const submissions = await Submission.find({
          _id: { $in: availableSubmissionIds },
          problemStatement: selectedPS.statement // Exact match with the problem statement text
        });
        
        filteredSubmissionIds = submissions.map(sub => sub._id.toString());
        
        console.log('🔍 Problem Statement Filter:', {
          selectedProblemStatementId: problemStatementId,
          selectedProblemStatementText: selectedPS.statement.slice(0, 50) + '...',
          availableSubmissions: availableSubmissionIds.length,
          filteredSubmissions: filteredSubmissionIds.length,
          matchingSubmissions: submissions.map(s => ({
            id: s._id,
            problemStatement: s.problemStatement?.slice(0, 30) + '...'
          }))
        });
      } else {
        console.warn('Selected problem statement not found:', problemStatementId);
        filteredSubmissionIds = [];
      }
    }

    console.log('🔍 Assignment Analysis:', {
      totalSubmissions: submissionIds.length,
      alreadyAssigned: alreadyAssignedSubmissions.size,
      availableSubmissions: availableSubmissionIds.length,
      filteredSubmissions: filteredSubmissionIds.length,
      duplicateSubmissions: duplicateSubmissionIds.length,
      problemStatementFilter: problemStatementId ? 'active' : 'none'
    });

    if (filteredSubmissionIds.length === 0) {
      const message = problemStatementId 
        ? 'No submissions found for the selected problem statement that are available for assignment.'
        : 'All selected submissions are already assigned to judges for this round.';
      return res.status(400).json({ 
        message,
        duplicateSubmissions: duplicateSubmissionIds
      });
    }

    if (duplicateSubmissionIds.length > 0) {
      console.warn(`Filtering out ${duplicateSubmissionIds.length} already assigned submissions:`, duplicateSubmissionIds);
    }

    // Defensive check for evaluatorAssignments
    if (!Array.isArray(evaluatorAssignments) || evaluatorAssignments.length === 0) {
      return res.status(400).json({ message: 'At least one evaluator is required' });
    }

    // Validate that all evaluator assignments reference a valid, active judge
    const activeEvaluators = allEvaluators.filter(e => e.status === 'active');
    const invalidEvaluators = evaluatorAssignments.filter(assignment => {
      const found = allEvaluators.find(e => 
        e._id.toString() === assignment.evaluatorId || e.judge.email === assignment.evaluatorEmail
      );
      return !found || found.status !== 'active';
    });
    if (invalidEvaluators.length > 0) {
      console.error('Invalid or inactive evaluator assignments:', invalidEvaluators);
      return res.status(400).json({ message: 'One or more evaluator assignments are invalid or inactive.' });
    }

    if (activeEvaluators.length === 0) {
      return res.status(400).json({ 
        message: 'No active evaluators found. Please ensure evaluators have accepted their invitations.' 
      });
    }

    // Validate judge type compatibility with problem statement type
    if (problemStatementId) {
      const selectedPS = hackathon.problemStatements.find(ps => ps._id.toString() === problemStatementId);
      if (selectedPS) {
        const psType = selectedPS.type || 'general';
        const incompatibleEvaluators = evaluatorAssignments.filter(assignment => {
          const evaluator = allEvaluators.find(e => 
            e._id.toString() === assignment.evaluatorId || e.judge.email === assignment.evaluatorEmail
          );
          if (!evaluator) return false;
          
          const judgeType = evaluator.judge.type || 'platform';
          
          // Check compatibility based on judge type and problem statement type
          if (psType === 'sponsored') {
            // For sponsored PS, only sponsor and hybrid judges are allowed (and platform judges with permission)
            return !(judgeType === 'sponsor' || 
                    judgeType === 'hybrid' || 
                    (judgeType === 'platform' && evaluator.judge.canJudgeSponsoredPS));
          } else if (psType === 'general') {
            // For general PS, only platform and hybrid judges are allowed
            return !(judgeType === 'platform' || judgeType === 'hybrid');
          }
          
          return false; // Default to compatible
        });
        
        if (incompatibleEvaluators.length > 0) {
          console.error('Incompatible judge assignments:', incompatibleEvaluators);
          return res.status(400).json({ 
            message: `Some judges are not compatible with ${psType} problem statements. Platform judges can only evaluate general problem statements, and sponsor judges can only evaluate sponsored problem statements.`,
            incompatibleEvaluators: incompatibleEvaluators.map(e => ({
              evaluatorId: e.evaluatorId,
              evaluatorEmail: e.evaluatorEmail,
              reason: `Judge type incompatible with ${psType} problem statement`
            }))
          });
        }
      }
    }

    const results = [];
    const totalSubmissions = filteredSubmissionIds.length;
    let remainingSubmissions = [...filteredSubmissionIds];

    // Get round details
    const roundDetails = hackathon.rounds[roundIndex] || {};
    const roundName = roundDetails.name || `Round ${roundIndex + 1}`;
    const roundType = roundDetails.type || 'project';
    const roundId = roundDetails._id?.toString() || `round_${roundIndex}`;

    console.log('🔍 Round Details:', {
      roundIndex,
      roundName,
      roundType,
      roundId
    });

    // Process assignments
    if (multipleJudgesMode) {
      // Multiple judges per project logic
      console.log('🔍 Processing multiple judges mode');
      
      // Create a map to track which submissions are assigned to which judges
      const submissionJudgeMap = new Map();
      
      // Initialize the map for all submissions
      filteredSubmissionIds.forEach(submissionId => {
        submissionJudgeMap.set(submissionId.toString(), []);
      });

      console.log('🔍 Multiple Judges Mode - Available submissions:', filteredSubmissionIds.length);
      console.log('🔍 Multiple Judges Mode - Selected evaluators:', evaluatorAssignments.length);

      // For multiple judges mode, we want to assign multiple judges to each submission
      if (judgesPerProjectMode === 'equal') {
        // Equal distribution: distribute judges evenly across submissions
        const judgesPerSubmission = Math.min(judgesPerProject, evaluatorAssignments.length);
        console.log('🔍 Equal distribution mode - Judges per submission:', judgesPerSubmission);
        
        // Assign each submission to multiple judges
        for (let i = 0; i < filteredSubmissionIds.length; i++) {
          const submissionId = filteredSubmissionIds[i];
          const currentJudges = submissionJudgeMap.get(submissionId.toString()) || [];
          
          // Find judges that haven't been assigned to this submission yet
          const availableJudges = evaluatorAssignments.filter(assignment => {
            const evaluatorAssignment = allEvaluators.find(e => 
              e._id.toString() === assignment.evaluatorId || e.judge.email === assignment.evaluatorEmail
            );
            return evaluatorAssignment && 
                   evaluatorAssignment.status === 'active' && 
                   !currentJudges.includes(evaluatorAssignment._id.toString());
          });
          
          // Assign judges to this submission
          const judgesToAssign = availableJudges.slice(0, judgesPerSubmission - currentJudges.length);
          
          for (const judgeAssignment of judgesToAssign) {
            const evaluatorAssignment = allEvaluators.find(e => 
              e._id.toString() === judgeAssignment.evaluatorId || e.judge.email === judgeAssignment.evaluatorEmail
            );
            
            if (evaluatorAssignment) {
              // Add this judge to the submission's judge list
              currentJudges.push(evaluatorAssignment._id.toString());
              submissionJudgeMap.set(submissionId.toString(), currentJudges);
              
              // Use the updateJudgeAssignment helper function to properly save the assignment
              const submissionsToAdd = [submissionId];
              
              try {
                await updateJudgeAssignment(evaluatorAssignment, roundIndex, roundId, roundName, roundType, submissionsToAdd, 1);
                
                // Send email notification
                await sendSubmissionAssignmentEmail(
                  evaluatorAssignment.judge.email,
                  evaluatorAssignment.judge.name,
                  hackathon,
                  submissionsToAdd,
                  roundName
                );
                
                console.log(`✅ Assigned submission ${submissionId} to judge ${evaluatorAssignment.judge.email}`);
              } catch (saveError) {
                console.error(`❌ Error saving assignment for judge ${evaluatorAssignment.judge.email}:`, saveError);
                throw saveError;
              }
            }
          }
        }
        
        // Create results summary
        evaluatorAssignments.forEach(assignment => {
          const evaluatorAssignment = allEvaluators.find(e => 
            e._id.toString() === assignment.evaluatorId || e.judge.email === assignment.evaluatorEmail
          );
          
          if (evaluatorAssignment) {
            const roundAssignment = evaluatorAssignment.assignedRounds.find(r => r.roundIndex === roundIndex);
            const assignedSubmissions = roundAssignment?.assignedSubmissions || [];
            
            results.push({
              evaluatorId: evaluatorAssignment._id,
              evaluatorEmail: evaluatorAssignment.judge.email,
              evaluatorName: evaluatorAssignment.judge.name,
              success: true,
              assignedSubmissions: assignedSubmissions,
              maxSubmissions: assignedSubmissions.length,
              status: evaluatorAssignment.status
            });
          }
        });
        
      } else {
        // Manual mode - assign based on maxSubmissions per judge
        console.log('🔍 Manual distribution mode');
        
        for (const assignment of evaluatorAssignments) {
          const { evaluatorId, maxSubmissions, evaluatorEmail } = assignment;
          
          // Find the evaluator assignment
          const evaluatorAssignment = allEvaluators.find(e => 
            e._id.toString() === evaluatorId || e.judge.email === evaluatorEmail
          );
          
          if (!evaluatorAssignment) {
            results.push({
              evaluatorId,
              success: false,
              error: 'Evaluator not found'
            });
            continue;
          }

          // Check if evaluator is active
          if (evaluatorAssignment.status !== 'active') {
            results.push({
              evaluatorId,
              success: false,
              error: `Evaluator ${evaluatorAssignment.judge.email} has not accepted the invitation yet`
            });
            continue;
          }

          // Calculate submissions to assign
          let submissionsToAssign = [];
          let actualMaxSubmissions = maxSubmissions || Math.ceil(availableSubmissionIds.length / evaluatorAssignments.length);
          
          // Find submissions that need more judges
          submissionsToAssign = availableSubmissionIds.filter(submissionId => {
            const currentJudges = submissionJudgeMap.get(submissionId.toString()) || [];
            return currentJudges.length < judgesPerProject;
          }).slice(0, actualMaxSubmissions);

          // Update submission-judge map
          submissionsToAssign.forEach(submissionId => {
            const currentJudges = submissionJudgeMap.get(submissionId.toString()) || [];
            currentJudges.push(evaluatorAssignment._id.toString());
            submissionJudgeMap.set(submissionId.toString(), currentJudges);
          });

          // Update the judge assignment
          try {
            await updateJudgeAssignment(evaluatorAssignment, roundIndex, roundId, roundName, roundType, submissionsToAssign, actualMaxSubmissions);
            
            // Send email notification
            if (submissionsToAssign.length > 0) {
              await sendSubmissionAssignmentEmail(
                evaluatorAssignment.judge.email,
                evaluatorAssignment.judge.name,
                hackathon,
                submissionsToAssign,
                roundName
              );
            }
          } catch (saveError) {
            console.error(`❌ Error saving assignment for judge ${evaluatorAssignment.judge.email}:`, saveError);
            results.push({
              evaluatorId: evaluatorAssignment._id,
              evaluatorEmail: evaluatorAssignment.judge.email,
              evaluatorName: evaluatorAssignment.judge.name,
              success: false,
              error: `Failed to save assignment: ${saveError.message}`,
              status: evaluatorAssignment.status
            });
            continue;
          }

          results.push({
            evaluatorId: evaluatorAssignment._id,
            evaluatorEmail: evaluatorAssignment.judge.email,
            evaluatorName: evaluatorAssignment.judge.name,
            success: true,
            assignedSubmissions: submissionsToAssign,
            maxSubmissions: actualMaxSubmissions,
            status: evaluatorAssignment.status
          });
        }
      }
    } else {
      // Single judge per project logic
      console.log('🔍 Processing single judge per project mode');
      
      // Process each evaluator assignment
      for (const assignment of evaluatorAssignments) {
        const { evaluatorId, maxSubmissions, evaluatorEmail } = assignment;
        
        // Find the evaluator assignment
        const evaluatorAssignment = allEvaluators.find(e => 
          e._id.toString() === evaluatorId || e.judge.email === assignment.evaluatorEmail
        );
        
        if (!evaluatorAssignment) {
          results.push({
            evaluatorId,
            success: false,
            error: 'Evaluator not found'
          });
          continue;
        }

        // Check if evaluator is active
        if (evaluatorAssignment.status !== 'active') {
          results.push({
            evaluatorId,
            success: false,
            error: `Evaluator ${evaluatorAssignment.judge.email} has not accepted the invitation yet`
          });
          continue;
        }

        // Calculate submissions to assign based on mode
        let submissionsToAssign = [];
        let actualMaxSubmissions = maxSubmissions || Math.ceil(totalSubmissions / evaluatorAssignments.length);
        
        // Check if any of the remaining submissions are already assigned to this judge
        const existingRoundAssignment = evaluatorAssignment.assignedRounds?.find(r => r.roundIndex === roundIndex);
        const alreadyAssignedToThisJudge = existingRoundAssignment?.assignedSubmissions || [];
        
        // Filter out submissions already assigned to this judge
        const availableForThisJudge = remainingSubmissions.filter(subId => 
          !alreadyAssignedToThisJudge.includes(subId) && 
          !alreadyAssignedToThisJudge.some(assigned => assigned.toString() === subId.toString())
        );
        
        console.log('🔍 Judge assignment check:', {
          judge: evaluatorAssignment.judge.email,
          alreadyAssigned: alreadyAssignedToThisJudge.length,
          remainingSubmissions: remainingSubmissions.length,
          availableForThisJudge: availableForThisJudge.length
        });
        
        if (assignmentMode === 'equal') {
          const equalCount = Math.ceil(totalSubmissions / evaluatorAssignments.length);
          submissionsToAssign = availableForThisJudge.slice(0, equalCount);
          actualMaxSubmissions = equalCount;
        } else {
          // Manual mode - assign based on maxSubmissions
          submissionsToAssign = availableForThisJudge.slice(0, actualMaxSubmissions);
        }

        // Remove assigned submissions from remaining pool
        remainingSubmissions = remainingSubmissions.filter(id => !submissionsToAssign.includes(id));

        // Update the judge assignment
        try {
          await updateJudgeAssignment(evaluatorAssignment, roundIndex, roundId, roundName, roundType, submissionsToAssign, actualMaxSubmissions);
          
          // Send email notification
          if (submissionsToAssign.length > 0) {
            await sendSubmissionAssignmentEmail(
              evaluatorAssignment.judge.email,
              evaluatorAssignment.judge.name,
              hackathon,
              submissionsToAssign,
              roundName
            );
          }
        } catch (saveError) {
          console.error(`❌ Error saving assignment for judge ${evaluatorAssignment.judge.email}:`, saveError);
          results.push({
            evaluatorId: evaluatorAssignment._id,
            evaluatorEmail: evaluatorAssignment.judge.email,
            evaluatorName: evaluatorAssignment.judge.name,
            success: false,
            error: `Failed to save assignment: ${saveError.message}`,
            status: evaluatorAssignment.status
          });
          continue;
        }

        results.push({
          evaluatorId: evaluatorAssignment._id,
          evaluatorEmail: evaluatorAssignment.judge.email,
          evaluatorName: evaluatorAssignment.judge.name,
          success: true,
          assignedSubmissions: submissionsToAssign,
          maxSubmissions: actualMaxSubmissions,
          status: evaluatorAssignment.status
        });
      }
    }

    // Check if all submissions were assigned
    const unassignedCount = remainingSubmissions.length;
    if (unassignedCount > 0) {
      console.warn(`${unassignedCount} submissions could not be assigned due to evaluator limits`);
    }

    console.log('🔍 Assignment Results:', {
      totalSubmissions,
      assignedSubmissions: totalSubmissions - unassignedCount,
      unassignedSubmissions: unassignedCount,
      results: results.map(r => ({
        evaluator: r.evaluatorEmail,
        assigned: r.assignedSubmissions?.length || 0,
        success: r.success
      })),
      successfulAssignments: results.filter(r => r.success).length,
      failedAssignments: results.filter(r => !r.success).length
    });

    res.status(200).json({
      message: 'Bulk assignment completed successfully',
      results,
      totalSubmissions,
      assignedSubmissions: totalSubmissions - unassignedCount,
      unassignedSubmissions: unassignedCount,
      filteredSubmissions: duplicateSubmissionIds.length > 0 ? {
        count: duplicateSubmissionIds.length,
        submissions: duplicateSubmissionIds,
        message: `${duplicateSubmissionIds.length} submissions were already assigned and were filtered out`
      } : null,
      totalEvaluators: evaluatorAssignments.length,
      activeEvaluators: activeEvaluators.length,
      multipleJudgesMode,
      judgesPerProject: multipleJudgesMode ? judgesPerProject : 1,
      judgesPerProjectMode: multipleJudgesMode ? judgesPerProjectMode : 'manual'
    });

  } catch (error) {
    console.error('Error bulk assigning submissions:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
    res.status(500).json({ message: 'Failed to bulk assign submissions' });
  }
};

// Helper function to update judge assignment
async function updateJudgeAssignment(evaluatorAssignment, roundIndex, roundId, roundName, roundType, submissionsToAssign, maxSubmissions) {
  try {
    console.log('🔍 Updating judge assignment:', {
      judge: evaluatorAssignment.judge.email,
      roundIndex,
      submissionsToAssign: submissionsToAssign.length,
      maxSubmissions,
      existingRounds: evaluatorAssignment.assignedRounds?.length || 0
    });

    const existingRoundIndex = evaluatorAssignment.assignedRounds.findIndex(r => r.roundIndex === roundIndex);
    
    if (existingRoundIndex >= 0) {
      // Update existing round assignment - ADD to existing submissions, don't replace
      const existingSubmissions = evaluatorAssignment.assignedRounds[existingRoundIndex].assignedSubmissions || [];
      const newSubmissions = [...existingSubmissions, ...submissionsToAssign];
      
      // Remove duplicates
      const uniqueSubmissions = [...new Set(newSubmissions.map(id => id.toString()))];
      
      evaluatorAssignment.assignedRounds[existingRoundIndex] = {
        ...evaluatorAssignment.assignedRounds[existingRoundIndex],
        roundIndex,
        roundId,
        roundName,
        roundType,
        isAssigned: true,
        assignedSubmissions: uniqueSubmissions,
        maxSubmissions: Math.max(maxSubmissions, evaluatorAssignment.assignedRounds[existingRoundIndex].maxSubmissions || 0)
      };
    } else {
      // Add new round assignment
      evaluatorAssignment.assignedRounds.push({
        roundIndex,
        roundId,
        roundName,
        roundType,
        isAssigned: true,
        assignedSubmissions: submissionsToAssign,
        maxSubmissions
      });
    }

    await evaluatorAssignment.save();
    console.log('✅ Successfully updated judge assignment for:', evaluatorAssignment.judge.email);
    console.log('🔍 Updated assignment details:', {
      judge: evaluatorAssignment.judge.email,
      totalRounds: evaluatorAssignment.assignedRounds?.length || 0,
      roundAssignments: evaluatorAssignment.assignedRounds?.map(r => ({
        roundIndex: r.roundIndex,
        assignedSubmissions: r.assignedSubmissions?.length || 0
      })) || []
    });
  } catch (error) {
    console.error('❌ Error updating judge assignment:', error);
    throw error;
  }
}

// 🎯 Get All Evaluators with Status
exports.getAllEvaluators = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { problemStatementId, problemStatementType } = req.query; // Add query parameters for filtering

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can view evaluators' });
    }

    const assignments = await JudgeAssignment.find({ hackathon: hackathonId })
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    // Filter evaluators based on problem statement type
    let filteredAssignments = assignments;
    
    if (problemStatementId || problemStatementType) {
      let targetPSType = problemStatementType;
      
      // If problemStatementId is provided, get the type from the hackathon
      if (problemStatementId && !problemStatementType) {
        const selectedPS = hackathon.problemStatements.find(ps => 
          ps._id.toString() === problemStatementId
        );
        targetPSType = selectedPS?.type || 'general';
      }
      
      // Filter evaluators based on judge type and problem statement type
      if (targetPSType === 'sponsored') {
        // For sponsored PS, only show sponsor and hybrid judges (and platform judges with permission)
        filteredAssignments = assignments.filter(assignment => {
          const judgeType = assignment.judge.type || 'platform';
          return judgeType === 'sponsor' || 
                 judgeType === 'hybrid' || 
                 (judgeType === 'platform' && assignment.judge.canJudgeSponsoredPS);
        });
      } else if (targetPSType === 'general') {
        // For general PS, only show platform and hybrid judges
        filteredAssignments = assignments.filter(assignment => {
          const judgeType = assignment.judge.type || 'platform';
          return judgeType === 'platform' || judgeType === 'hybrid';
        });
      }
      // If no specific type, show all evaluators
    }

    const evaluators = filteredAssignments.map(assignment => ({
      id: assignment._id,
      name: assignment.judge.name || assignment.judge.email.split('@')[0],
      email: assignment.judge.email,
      type: assignment.judge.type || 'platform',
      status: assignment.status,
      sponsorCompany: assignment.judge.sponsorCompany,
      canJudgeSponsoredPS: assignment.judge.canJudgeSponsoredPS || false,
      assignedSubmissions: assignment.assignedRounds.reduce((total, round) => 
        total + (round.assignedSubmissions?.length || 0), 0),
      maxSubmissions: assignment.permissions.maxSubmissionsPerJudge,
      invitationSent: !!assignment.invitation.sentAt,
      acceptedAt: assignment.invitation.acceptedAt,
      declinedAt: assignment.invitation.declinedAt
    }));

    // Calculate judge type statistics
    const judgeStats = {
      platform: evaluators.filter(e => e.type === 'platform').length,
      sponsor: evaluators.filter(e => e.type === 'sponsor').length,
      hybrid: evaluators.filter(e => e.type === 'hybrid').length,
      total: evaluators.length
    };

    res.status(200).json({
      evaluators,
      judgeStats,
      total: evaluators.length,
      pending: evaluators.filter(e => e.status === 'pending').length,
      active: evaluators.filter(e => e.status === 'active').length,
      declined: evaluators.filter(e => e.status === 'declined').length,
      filteredBy: problemStatementId || problemStatementType ? {
        problemStatementId,
        problemStatementType: targetPSType
      } : null
    });

  } catch (error) {
    console.error('Error fetching evaluators:', error);
    res.status(500).json({ message: 'Failed to fetch evaluators' });
  }
};

// 🎯 Update Judge Status (Accept/Decline)
exports.updateJudgeStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status } = req.body; // 'accept' or 'decline'

    const assignment = await JudgeAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    if (status === 'accept') {
      assignment.status = 'active';
      assignment.invitation.acceptedAt = new Date();
      assignment.lastActive = new Date();
    } else if (status === 'decline') {
      assignment.status = 'declined';
      assignment.invitation.declinedAt = new Date();
    }

    await assignment.save();

    res.status(200).json({
      message: `Judge ${status === 'accept' ? 'accepted' : 'declined'} the invitation`,
      assignment
    });

  } catch (error) {
    console.error('Error updating judge status:', error);
    res.status(500).json({ message: 'Failed to update judge status' });
  }
};

// 🎯 Get My Assigned Submissions (for judges)
exports.getMyAssignedSubmissions = async (req, res) => {
  try {
    const judgeEmail = req.user.email;
    console.log('🔍 Backend - getMyAssignedSubmissions called for judge:', judgeEmail);
    console.log('🔍 Backend - Request user:', req.user);
    
    if (!judgeEmail) {
      console.error('🔍 Backend - No judge email found in request');
      return res.status(400).json({ 
        message: 'Judge email not found',
        error: 'User email is required'
      });
    }
    
    console.log('🔍 Backend - About to query JudgeAssignment model');
    
    // Find all judge assignments for this user
    let assignments = [];
    try {
      console.log('🔍 Backend - About to query JudgeAssignment model for email:', judgeEmail);
      
      assignments = await JudgeAssignment.find({ 
        'judge.email': judgeEmail,
        status: 'active'
      }).populate('hackathon', 'name rounds').populate('judge', 'name email');
      
      console.log('🔍 Backend - Raw assignments data:', assignments.map(a => ({
        id: a._id,
        hackathon: a.hackathon?._id || a.hackathon,
        hackathonName: a.hackathon?.name,
        judge: a.judge?.email,
        status: a.status,
        assignedRounds: a.assignedRounds?.length || 0
      })));
      
      console.log('🔍 Backend - Found assignments:', assignments.length);
      
      // If no assignments found, return empty response instead of error
      if (assignments.length === 0) {
        console.log('🔍 Backend - No assignments found for judge, returning empty response');
        return res.status(200).json({
          submissions: [],
          rounds: [],
          hackathons: [],
          totalSubmissions: 0,
          totalRounds: 0,
          totalHackathons: 0,
          hasSpecificAssignments: false
        });
      }
    } catch (dbError) {
      console.error('🔍 Backend - Database query error:', dbError);
      console.error('🔍 Backend - Error stack:', dbError.stack);
      console.error('🔍 Backend - Error name:', dbError.name);
      console.error('🔍 Backend - Error message:', dbError.message);
      return res.status(500).json({
        message: 'Database query failed',
        error: dbError.message,
        stack: dbError.stack
      });
    }
    
    // Log detailed assignment information
    for (const assignment of assignments) {
      console.log('🔍 Backend - Assignment details:', {
        hackathon: assignment.hackathon?.name,
        judge: assignment.judge?.email,
        status: assignment.status,
        assignedRounds: assignment.assignedRounds?.map(r => ({
          roundIndex: r.roundIndex,
          roundName: r.roundName,
          assignedSubmissions: r.assignedSubmissions?.length || 0,
          submissionIds: r.assignedSubmissions || []
        }))
      });
    }
    
    // Defensive: Collect all assigned submission IDs from all rounds
    const assignedSubmissionIds = new Set();
    const hackathons = [];
    const rounds = [];
    for (const assignment of assignments) {
      const hackathon = assignment.hackathon;
      console.log('🔍 Backend - Processing assignment:', {
        assignmentId: assignment._id,
        hackathon: hackathon?._id || assignment.hackathon,
        hackathonName: hackathon?.name,
        assignedRounds: assignment.assignedRounds?.length || 0
      });
      
      if (assignment.assignedRounds && Array.isArray(assignment.assignedRounds)) {
        for (const round of assignment.assignedRounds) {
          if (round.isAssigned && Array.isArray(round.assignedSubmissions)) {
            round.assignedSubmissions.forEach(id => assignedSubmissionIds.add(id.toString()));
            // Add round info for UI
            const roundInfo = {
              index: round.roundIndex || 0,
              name: round.roundName || 'Round',
              type: round.roundType || 'project',
              submissionCount: round.assignedSubmissions?.length || 0,
              hackathonId: hackathon?._id || assignment.hackathon,
              hackathonName: hackathon?.name || 'Unknown Hackathon',
              hasSpecificAssignments: true
            };
            if (!rounds.find(r => r.index === roundInfo.index && r.hackathonId?.toString() === roundInfo.hackathonId?.toString())) {
              rounds.push(roundInfo);
            }
          }
        }
      }
      // Add hackathon to list
      if (hackathon && hackathon._id) {
        hackathons.push({
          _id: hackathon._id,
          name: hackathon.name || 'Unknown Hackathon',
          hasSpecificAssignments: true
        });
      } else if (assignment.hackathon) {
        // Fallback to assignment.hackathon if populated hackathon is null
        hackathons.push({
          _id: assignment.hackathon,
          name: 'Unknown Hackathon',
          hasSpecificAssignments: true
        });
      }
    }
    
    // If no assigned submissions found, return empty response
    if (assignedSubmissionIds.size === 0) {
      console.log('🔍 Backend - No assigned submissions found for judge, returning empty response');
      return res.status(200).json({
        submissions: [],
        rounds: [],
        hackathons: [],
        totalSubmissions: 0,
        totalRounds: 0,
        totalHackathons: 0,
        hasSpecificAssignments: false
      });
    }

    // Fetch all assigned submissions
    let allSubmissions = [];
    if (assignedSubmissionIds.size > 0) {
      try {
        console.log('🔍 Backend - About to require Submission and Score models');
        let Submission, Score;
        try {
          Submission = require('../model/SubmissionModel');
          Score = require('../model/ScoreModel');
          console.log('🔍 Backend - Successfully required models');
        } catch (modelError) {
          console.error('🔍 Backend - Error requiring models:', modelError);
          throw modelError;
        }
        
        console.log('🔍 Backend - Fetching submissions for IDs:', Array.from(assignedSubmissionIds));
        
        // Validate submission IDs
        const validSubmissionIds = Array.from(assignedSubmissionIds).filter(id => {
          try {
            return require('mongoose').Types.ObjectId.isValid(id);
          } catch (error) {
            console.error('🔍 Backend - Invalid submission ID:', id);
            return false;
          }
        });
        
        if (validSubmissionIds.length === 0) {
          console.log('🔍 Backend - No valid submission IDs found');
          return res.status(200).json({
            submissions: [],
            rounds: [],
            hackathons: [],
            totalSubmissions: 0,
            totalRounds: 0,
            totalHackathons: 0,
            hasSpecificAssignments: false
          });
        }
        
        const submissionsToFetch = await Submission.find({
          _id: { $in: validSubmissionIds }
        }).populate('teamId', 'name members')
          .populate('hackathonId', 'name')
          .populate('submittedBy', 'name email profileImage role')
          .populate('projectId', 'title description logo images links attachments category status');
          
        console.log('🔍 Backend - Found submissions:', submissionsToFetch.length);
        // Add evaluation status for each submission
        for (const submission of submissionsToFetch) {
          try {
            console.log('🔍 Backend - Processing submission:', submission._id);
            
            // First try to find the judge by email
            const judge = await User.findOne({ email: judgeEmail });
            console.log('🔍 Backend - Looking for judge:', { judgeEmail, judgeId: judge?._id });
            
            const existingScore = await Score.findOne({
              submission: submission._id,
              judge: judge?._id
            });
            
            console.log('🔍 Backend - Score check result:', {
              submissionId: submission._id,
              judgeId: judge?._id,
              existingScore: existingScore ? 'found' : 'not found',
              evaluationStatus: existingScore ? 'evaluated' : 'pending'
            });
            
            // Find which round this submission is assigned to for this judge
            let submissionRoundIndex = null;
            try {
              for (const assignment of assignments) {
                if (assignment.assignedRounds && Array.isArray(assignment.assignedRounds)) {
                  for (const round of assignment.assignedRounds) {
                    if (round.isAssigned && Array.isArray(round.assignedSubmissions)) {
                      if (round.assignedSubmissions.some(id => id.toString() === submission._id.toString())) {
                        submissionRoundIndex = round.roundIndex;
                        break;
                      }
                    }
                  }
                }
                if (submissionRoundIndex !== null) break;
              }
            } catch (roundError) {
              console.error('🔍 Backend - Error finding submission round:', roundError);
              submissionRoundIndex = 0; // Default to round 0
            }
            
            const submissionObject = {
              ...submission.toObject(),
              evaluationStatus: existingScore ? 'evaluated' : 'pending',
              score: existingScore?.score || null,
              feedback: existingScore?.feedback || null,
              isAssigned: true,
              roundIndex: submissionRoundIndex
            };
            
            allSubmissions.push(submissionObject);
            console.log('🔍 Backend - Added submission to results:', {
              id: submission._id,
              title: submission.projectTitle || submission.title,
              roundIndex: submissionRoundIndex,
              evaluationStatus: submissionObject.evaluationStatus
            });
          } catch (submissionError) {
            console.error('🔍 Backend - Error processing submission:', submission._id, submissionError);
            // Continue with other submissions
          }
        }
      } catch (submissionError) {
        console.error('🔍 Backend - Error fetching assigned submissions:', submissionError);
        allSubmissions = [];
      }
    }

    // Remove duplicate hackathons
    const uniqueHackathons = hackathons.filter((hackathon, index, self) => 
      index === self.findIndex(h => h._id.toString() === hackathon._id.toString())
    );

    console.log('🔍 Backend - Final response:', {
      totalSubmissions: allSubmissions.length,
      totalRounds: rounds.length,
      totalHackathons: uniqueHackathons.length,
      hasSpecificAssignments: allSubmissions.length > 0,
      submissionsWithRoundIndex: allSubmissions.filter(s => s.roundIndex !== null).length,
      submissionsWithoutRoundIndex: allSubmissions.filter(s => s.roundIndex === null).length
    });

    res.status(200).json({
      submissions: allSubmissions,
      rounds,
      hackathons: uniqueHackathons,
      totalSubmissions: allSubmissions.length,
      totalRounds: rounds.length,
      totalHackathons: uniqueHackathons.length,
      hasSpecificAssignments: allSubmissions.length > 0
    });
  } catch (error) {
    console.error('🔍 Backend - Error in getMyAssignedSubmissions:', error);
    console.error('🔍 Backend - Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch assigned submissions',
      error: error.message,
      stack: error.stack
    });
  }
};

// 🎯 Update Submission Status (Shortlist/Reject)
exports.updateSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status } = req.body; // 'shortlisted' or 'rejected'
    const judgeEmail = req.user.email;

    // Validate status
    if (!['shortlisted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either "shortlisted" or "rejected"' });
    }

    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify organizer permissions (only organizers can shortlist/reject)
    const hackathon = await Hackathon.findById(submission.hackathonId);
    if (!hackathon || hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can update submission status' });
    }

    // Update the submission status
    submission.status = status;
    await submission.save();

    res.status(200).json({
      message: `Submission ${status} successfully`,
      submission: {
        _id: submission._id,
        status: submission.status,
        teamName: submission.teamName
      }
    });

  } catch (error) {
    console.error('Error updating submission status:', error);
    res.status(500).json({ message: 'Failed to update submission status' });
  }
};

// 🎯 Score a Submission (for judges)
exports.scoreSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { scores, feedback, roundIndex, submissionType } = req.body;
    const judgeEmail = req.user.email;

    // Validate inputs
    if (!scores || typeof scores !== 'object') {
      return res.status(400).json({ message: 'Scores object is required' });
    }

    if (!submissionType || !['project', 'presentation'].includes(submissionType)) {
      return res.status(400).json({ message: 'Submission type must be either "project" or "presentation"' });
    }

    // Find judge assignment
    const assignment = await JudgeAssignment.findOne({
      'judge.email': judgeEmail,
      status: 'active'
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    // Verify the submission is assigned to this judge
    const isAssigned = assignment.assignedRounds.some(round => 
      round.roundIndex === roundIndex && 
      round.assignedSubmissions.includes(submissionId)
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'This submission is not assigned to you' });
    }

    // Get judging criteria for validation
    const hackathon = await Hackathon.findById(assignment.hackathon);
    const round = hackathon.rounds[roundIndex];
    const criteria = round.judgingCriteria?.[submissionType] || [];

    // Validate scores against criteria
    const validatedScores = new Map();
    let totalScore = 0;
    let totalWeight = 0;

    for (const criterion of criteria) {
      const score = scores[criterion.name];
      if (score === undefined || score === null) {
        return res.status(400).json({ message: `Score for ${criterion.name} is required` });
      }
      
      if (typeof score !== 'number' || score < 0 || score > criterion.maxScore) {
        return res.status(400).json({ 
          message: `Score for ${criterion.name} must be between 0 and ${criterion.maxScore}` 
        });
      }

      validatedScores.set(criterion.name, {
        score: score,
        maxScore: criterion.maxScore,
        weight: criterion.weight || 1
      });

      totalScore += score * (criterion.weight || 1);
      totalWeight += criterion.weight || 1;
    }

    // Calculate weighted average
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Check if already scored
    const existingScore = await Score.findOne({
      submission: submissionId,
      judge: assignment._id,
      roundIndex: roundIndex,
      submissionType: submissionType
    });

    if (existingScore) {
      // Update existing score
      existingScore.scores = validatedScores;
      existingScore.totalScore = finalScore;
      existingScore.feedback = feedback;
      existingScore.updatedAt = new Date();
      await existingScore.save();
    } else {
      // Create new score
      await Score.create({
        submission: submissionId,
        judge: assignment._id,
        roundIndex: roundIndex,
        submissionType: submissionType,
        scores: validatedScores,
        totalScore: finalScore,
        feedback: feedback
      });
    }

    res.status(200).json({
      message: 'Score submitted successfully',
      totalScore: finalScore,
      scores: Object.fromEntries(validatedScores),
      feedback: feedback
    });

  } catch (error) {
    console.error('Error scoring submission:', error);
    res.status(500).json({ message: 'Failed to score submission' });
  }
};

// 🎯 Get Judging Criteria for Hackathon Round
exports.getJudgingCriteria = async (req, res) => {
  try {
    const { hackathonId, roundIndex } = req.params;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    if (!hackathon.rounds || !hackathon.rounds[roundIndex]) {
      return res.status(404).json({ message: 'Round not found' });
    }

    const round = hackathon.rounds[roundIndex];
    const criteria = round.judgingCriteria || {
      project: [
        { name: 'Innovation', description: 'Originality and creativity of the solution', maxScore: 10, weight: 1 },
        { name: 'Impact', description: 'Potential impact and value of the solution', maxScore: 10, weight: 1 },
        { name: 'Technicality', description: 'Technical complexity and implementation', maxScore: 10, weight: 1 },
        { name: 'Presentation', description: 'Quality of presentation and communication', maxScore: 10, weight: 1 }
      ],
      presentation: [
        { name: 'Clarity', description: 'Clear and understandable presentation', maxScore: 10, weight: 1 },
        { name: 'Engagement', description: 'How engaging and compelling the presentation is', maxScore: 10, weight: 1 },
        { name: 'Content', description: 'Quality and relevance of content', maxScore: 10, weight: 1 },
        { name: 'Delivery', description: 'Quality of delivery and communication skills', maxScore: 10, weight: 1 }
      ]
    };

    res.status(200).json({
      message: 'Judging criteria retrieved successfully',
      criteria,
      roundName: round.name,
      roundType: round.type
    });

  } catch (error) {
    console.error('Error getting judging criteria:', error);
    res.status(500).json({ message: 'Failed to get judging criteria' });
  }
};

// 🎯 Update Judging Criteria for Hackathon Round
exports.updateJudgingCriteria = async (req, res) => {
  try {
    const { hackathonId, roundIndex } = req.params;
    const { criteria } = req.body;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can update judging criteria' });
    }

    if (!hackathon.rounds || !hackathon.rounds[roundIndex]) {
      return res.status(404).json({ message: 'Round not found' });
    }

    // Validate criteria structure
    if (!criteria || (!criteria.project && !criteria.presentation)) {
      return res.status(400).json({ message: 'At least one criteria type (project or presentation) is required' });
    }

    // Validate individual criteria
    const validateCriteria = (criteriaList, type) => {
      if (!Array.isArray(criteriaList)) {
        throw new Error(`${type} criteria must be an array`);
      }
      
      for (const criterion of criteriaList) {
        if (!criterion.name || typeof criterion.name !== 'string') {
          throw new Error(`${type} criteria must have valid names`);
        }
        if (criterion.maxScore && (typeof criterion.maxScore !== 'number' || criterion.maxScore <= 0)) {
          throw new Error(`${type} criteria must have valid max scores`);
        }
        if (criterion.weight && (typeof criterion.weight !== 'number' || criterion.weight <= 0)) {
          throw new Error(`${type} criteria must have valid weights`);
        }
      }
    };

    if (criteria.project) {
      validateCriteria(criteria.project, 'Project');
    }
    if (criteria.presentation) {
      validateCriteria(criteria.presentation, 'Presentation');
    }

    // Update the round with new criteria
    const updateQuery = {};
    if (criteria.project) {
      updateQuery[`rounds.${roundIndex}.judgingCriteria.project`] = criteria.project;
    }
    if (criteria.presentation) {
      updateQuery[`rounds.${roundIndex}.judgingCriteria.presentation`] = criteria.presentation;
    }

    const updatedHackathon = await Hackathon.findByIdAndUpdate(
      hackathonId,
      { $set: updateQuery },
      { new: true }
    );

    res.status(200).json({
      message: 'Judging criteria updated successfully',
      criteria: updatedHackathon.rounds[roundIndex].judgingCriteria
    });

  } catch (error) {
    console.error('Error updating judging criteria:', error);
    res.status(500).json({ message: error.message || 'Failed to update judging criteria' });
  }
};

// 🗑️ Delete Judge and All Their Assignments
exports.deleteJudge = async (req, res) => {
  try {
    const { hackathonId, judgeId } = req.params;

    // Find the hackathon
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can delete judges' });
    }

    // Find the judge assignment
    const judgeAssignment = await JudgeAssignment.findById(judgeId);
    if (!judgeAssignment) {
      return res.status(404).json({ message: 'Judge assignment not found' });
    }

    // Verify this assignment belongs to the specified hackathon
    if (judgeAssignment.hackathon.toString() !== hackathonId) {
      return res.status(400).json({ message: 'Judge assignment does not belong to this hackathon' });
    }

    const judgeEmail = judgeAssignment.judge.email;
    const judgeIdFromAssignment = judgeAssignment.judge._id;

    // Start a transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Remove all scores given by this judge
      const scoresToDelete = await Score.find({
        judge: judgeIdFromAssignment,
        hackathon: hackathonId
      });
      
      if (scoresToDelete.length > 0) {
        await Score.deleteMany({
          judge: judgeIdFromAssignment,
          hackathon: hackathonId
        });
        console.log(`Deleted ${scoresToDelete.length} scores from judge ${judgeEmail}`);
      }

      // 2. Remove judge from all submissions they were assigned to
      const assignedSubmissionIds = [];
      judgeAssignment.assignedRounds?.forEach(round => {
        if (round.assignedSubmissions) {
          assignedSubmissionIds.push(...round.assignedSubmissions);
        }
      });

      if (assignedSubmissionIds.length > 0) {
        // Update submissions to remove this judge from assignedJudges
        await Submission.updateMany(
          { _id: { $in: assignedSubmissionIds } },
          { $pull: { assignedJudges: judgeIdFromAssignment } }
        );
        console.log(`Removed judge ${judgeEmail} from ${assignedSubmissionIds.length} submissions`);
      }

      // 3. Delete the judge assignment
      await JudgeAssignment.findByIdAndDelete(judgeId);

      // 4. Remove judge from hackathon's judgeAssignments if it exists
      if (hackathon.judgeAssignments) {
        const updatedJudgeAssignments = {};
        Object.keys(hackathon.judgeAssignments).forEach(type => {
          if (Array.isArray(hackathon.judgeAssignments[type])) {
            updatedJudgeAssignments[type] = hackathon.judgeAssignments[type].filter(
              assignment => assignment.judge.toString() !== judgeIdFromAssignment.toString()
            );
          }
        });
        
        await Hackathon.findByIdAndUpdate(hackathonId, {
          judgeAssignments: updatedJudgeAssignments
        });
      }

      // 5. Optionally remove judge role from user (if they should lose judge access)
      const user = await User.findById(judgeIdFromAssignment);
      if (user) {
        // Remove judge role for this specific hackathon
        const updatedRoles = user.roles.filter(role => 
          !(role.role === 'judge' && role.hackathon?.toString() === hackathonId)
        );
        
        await User.findByIdAndUpdate(judgeIdFromAssignment, {
          roles: updatedRoles
        });
        console.log(`Removed judge role from user ${judgeEmail} for hackathon ${hackathonId}`);
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        message: 'Judge deleted successfully',
        deletedJudge: {
          email: judgeEmail,
          assignmentsRemoved: assignedSubmissionIds.length,
          scoresRemoved: scoresToDelete.length
        }
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error('Error deleting judge:', error);
    res.status(500).json({ 
      message: 'Failed to delete judge',
      error: error.message 
    });
  }
};

// 🎯 Assignment Overview for Organizer
exports.getAssignmentOverview = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { problemStatementId, roundIndex } = req.query; // Add query parameters for filtering
    
    console.log('🔍 Backend - getAssignmentOverview called with:', {
      hackathonId,
      problemStatementId,
      roundIndex,
      query: req.query
    });
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Get all judge assignments for this hackathon
    const judgeAssignments = await JudgeAssignment.find({ hackathon: hackathonId })
      .populate('judge')
      .lean();
      
    // Get problem statement type information
    const getProblemStatementType = (problemStatementText) => {
      if (!hackathon.problemStatements) return 'general';
      
      const matchingPS = hackathon.problemStatements.find(ps => 
        ps.statement === problemStatementText
      );
      
      return matchingPS?.type || 'general';
    };

    // Get submissions for this hackathon with round filtering
    let submissionsQuery = { hackathonId: hackathonId, status: { $in: ['submitted', 'shortlisted'] } };
    
    // Filter by problem statement if specified
    let selectedPS = null;
    if (problemStatementId) {
      selectedPS = hackathon.problemStatements.find(ps => ps._id.toString() === problemStatementId);
      if (selectedPS) {
        submissionsQuery.problemStatement = selectedPS.statement;
        console.log('🔍 Assignment Overview - Filtering by problem statement:', {
          problemStatementId,
          problemStatementText: selectedPS.statement.slice(0, 50) + '...',
          problemStatementType: selectedPS.type
        });
      }
    }
    
    // Get all submissions first, then filter by round logic
    const allSubmissions = await Submission.find(submissionsQuery)
      .select('_id projectTitle title teamId teamName pptFile submittedAt roundIndex problemStatement')
      .lean();
    
    // Add problem statement type to each submission
    allSubmissions.forEach(submission => {
      submission.problemStatementType = getProblemStatementType(submission.problemStatement);
    });
    
    // Dynamic round filtering based on hackathon configuration
    let submissions = allSubmissions;
    if (roundIndex !== undefined && roundIndex !== null && roundIndex !== '') {
      const roundIndexNum = parseInt(roundIndex);
      
      // Get round configuration from hackathon
      const roundConfig = hackathon.rounds && hackathon.rounds[roundIndexNum];
      const roundType = roundConfig?.type || 'project'; // Default to project if no type specified
      
      console.log('🔍 Assignment Overview - Dynamic Round filtering:', {
        roundIndex,
        roundIndexNum,
        roundType,
        totalSubmissions: allSubmissions.length,
        submissionsWithPPT: allSubmissions.filter(sub => sub.pptFile).length,
        submissionsWithProject: allSubmissions.filter(sub => sub.projectId).length,
        submissionsByRoundIndex: allSubmissions.reduce((acc, sub) => {
          acc[sub.roundIndex || 0] = (acc[sub.roundIndex || 0] || 0) + 1;
          return acc;
        }, {}),
        roundConfig: roundConfig ? {
          name: roundConfig.name,
          type: roundConfig.type,
          startDate: roundConfig.startDate,
          endDate: roundConfig.endDate
        } : null,
        sampleSubmissions: allSubmissions.slice(0, 3).map(sub => ({
          _id: sub._id,
          pptFile: sub.pptFile,
          projectId: sub.projectId,
          roundIndex: sub.roundIndex,
          projectTitle: sub.projectTitle
        }))
      });
      
      // Dynamic filtering based on round type
      if (roundType === 'ppt') {
        // PPT round: Show submissions with PPT files
        submissions = allSubmissions.filter(sub => sub.pptFile);
        console.log(`🔍 Round ${roundIndexNum} (PPT) filtering: ${submissions.length} PPT submissions found`);
      } else if (roundType === 'project') {
        // Project round: Show submissions without PPT files (actual project submissions)
        submissions = allSubmissions.filter(sub => !sub.pptFile && sub.roundIndex === roundIndexNum);
        console.log(`🔍 Round ${roundIndexNum} (Project) filtering: ${submissions.length} Project submissions found`);
      } else if (roundType === 'both') {
        // Both round: Show all submissions for this round (PPT and Project)
        submissions = allSubmissions.filter(sub => sub.roundIndex === roundIndexNum);
        console.log(`🔍 Round ${roundIndexNum} (Both) filtering: ${submissions.length} submissions found`);
      } else {
        // Default: Use roundIndex from DB
        submissions = allSubmissions.filter(sub => sub.roundIndex === roundIndexNum);
        console.log(`🔍 Round ${roundIndexNum} (Default) filtering: ${submissions.length} submissions found`);
      }
      
      // Fallback logic if no submissions found
      if (submissions.length === 0) {
        console.log(`🔍 No submissions found with round type filtering, trying fallback for round ${roundIndexNum}`);
        
        // Try different fallback strategies
        if (roundType === 'ppt') {
          // For PPT rounds, try to find any submissions with PPT files
          submissions = allSubmissions.filter(sub => sub.pptFile);
          console.log(`🔍 PPT fallback: ${submissions.length} submissions found`);
        } else if (roundType === 'project') {
          // For Project rounds, try to find any submissions without PPT files for this round
          submissions = allSubmissions.filter(sub => !sub.pptFile && sub.roundIndex === roundIndexNum);
          console.log(`🔍 Project fallback: ${submissions.length} submissions found`);
        } else {
          // For other types, try roundIndex matching
          submissions = allSubmissions.filter(sub => sub.roundIndex === roundIndexNum);
          console.log(`🔍 RoundIndex fallback: ${submissions.length} submissions found`);
        }
        
        // If still no submissions, show all submissions for this round
        if (submissions.length === 0) {
          console.log(`🔍 Final fallback: showing all submissions for round ${roundIndexNum}`);
          submissions = allSubmissions.filter(sub => sub.roundIndex === roundIndexNum || !sub.roundIndex);
          console.log(`🔍 Final fallback: ${submissions.length} submissions found`);
        }
      }
    } else {
      console.log('🔍 No round filtering applied, showing all submissions:', submissions.length);
    }

    // Get all scores for these submissions
    const scores = await Score.find({ 
      submissionId: { $in: submissions.map(s => s._id) } 
    }).lean();

    // Create a map of submission scores
    const submissionScores = {};
    scores.forEach(score => {
      if (!submissionScores[score.submissionId.toString()]) {
        submissionScores[score.submissionId.toString()] = [];
      }
      submissionScores[score.submissionId.toString()].push(score);
    });

    // Map: submissionId -> assigned judge emails with round info
    const submissionAssignments = {};
    submissions.forEach(sub => {
      submissionAssignments[sub._id.toString()] = [];
    });

    // Map: judge email -> assigned submission IDs with round info
    const judgeToSubmissions = {};
    judgeAssignments.forEach(judgeAssignment => {
      const judgeEmail = judgeAssignment.judge?.email || judgeAssignment.judge.email;
      judgeToSubmissions[judgeEmail] = [];
      
      console.log(`🔍 Processing judge ${judgeEmail}:`, {
        judgeType: judgeAssignment.judge?.type || 'platform',
        assignedRounds: judgeAssignment.assignedRounds?.length || 0,
        rounds: judgeAssignment.assignedRounds?.map(r => ({
          roundIndex: r.roundIndex,
          assignedSubmissions: r.assignedSubmissions?.length || 0,
          submissionIds: r.assignedSubmissions || []
        }))
      });
      
      if (judgeAssignment.assignedRounds && Array.isArray(judgeAssignment.assignedRounds)) {
        judgeAssignment.assignedRounds.forEach(round => {
          console.log(`🔍 Processing round ${round.roundIndex}:`, {
            assignedSubmissions: round.assignedSubmissions?.length || 0,
            submissionIds: round.assignedSubmissions || []
          });
          
          // Filter assignments based on current round if specified
          let shouldProcessRound = true;
          if (roundIndex !== undefined && roundIndex !== null && roundIndex !== '') {
            const roundIndexNum = parseInt(roundIndex);
            // Check if any of the assigned submissions match the requested round
            const submissionsInRound = round.assignedSubmissions?.filter(subId => {
              const submission = allSubmissions.find(s => s._id.toString() === subId.toString());
              if (!submission) return false;
              
              // Get round configuration for dynamic filtering
              const roundConfig = hackathon.rounds && hackathon.rounds[roundIndexNum];
              const roundType = roundConfig?.type || 'project';
              
              // Dynamic filtering based on round type
              if (roundType === 'ppt') {
                return submission.pptFile;
              } else if (roundType === 'project') {
                return !submission.pptFile && submission.roundIndex === roundIndexNum;
              } else if (roundType === 'both') {
                return submission.roundIndex === roundIndexNum;
              } else {
                // Default: Use roundIndex from DB
                return submission.roundIndex === roundIndexNum;
              }
            }) || [];
            
            shouldProcessRound = submissionsInRound.length > 0;
            console.log(`🔍 Round filtering: round.roundIndex=${round.roundIndex}, requested=${roundIndexNum}, shouldProcess=${shouldProcessRound}, matchingSubmissions=${submissionsInRound.length}`);
          }
          
          if (shouldProcessRound && round.assignedSubmissions && Array.isArray(round.assignedSubmissions)) {
            // Filter submissions to only include those that match the current round
            const roundIndexNum = roundIndex !== undefined && roundIndex !== null && roundIndex !== '' ? parseInt(roundIndex) : null;
            
            round.assignedSubmissions.forEach(subId => {
              const subIdStr = subId.toString();
              const submission = allSubmissions.find(s => s._id.toString() === subIdStr);
              
              if (!submission) {
                console.log(`🔍 Skipping submission ${subIdStr} - not found in allSubmissions`);
                return;
              }
              
              // Check if this submission should be included in the current round
              let shouldIncludeSubmission = true;
              if (roundIndexNum !== null) {
                // Get round configuration for dynamic filtering
                const roundConfig = hackathon.rounds && hackathon.rounds[roundIndexNum];
                const roundType = roundConfig?.type || 'project';
                
                // Dynamic filtering based on round type
                if (roundType === 'ppt') {
                  shouldIncludeSubmission = submission.pptFile;
                } else if (roundType === 'project') {
                  shouldIncludeSubmission = !submission.pptFile && submission.roundIndex === roundIndexNum;
                } else if (roundType === 'both') {
                  shouldIncludeSubmission = submission.roundIndex === roundIndexNum;
                } else {
                  // Default: Use roundIndex from DB
                  shouldIncludeSubmission = submission.roundIndex === roundIndexNum;
                }
              }
              
              if (shouldIncludeSubmission) {
                console.log(`🔍 Assigning submission ${subIdStr} to judge ${judgeEmail} (type: ${submission.pptFile ? 'PPT' : 'Project'}, PS type: ${submission.problemStatementType})`);
                
                judgeToSubmissions[judgeEmail].push({
                  submissionId: subIdStr,
                  roundIndex: round.roundIndex,
                  roundName: round.roundName,
                  roundType: round.roundType,
                  problemStatementType: submission.problemStatementType
                });
                
                if (submissionAssignments[subIdStr]) {
                  submissionAssignments[subIdStr].push({
                    judgeEmail,
                    judgeName: judgeAssignment.judge?.name || judgeEmail,
                    judgeType: judgeAssignment.judge?.type || 'platform',
                    roundIndex: round.roundIndex,
                    roundName: round.roundName,
                    roundType: round.roundType,
                    problemStatementType: submission.problemStatementType
                  });
                }
              } else {
                console.log(`🔍 Skipping submission ${subIdStr} - doesn't match current round filter`);
              }
            });
          }
        });
      }
    });

    console.log('🔍 Assignment Overview - Final Submission Assignments:', submissionAssignments);

    // Build judge assignment summary with evaluation status
    const judges = judgeAssignments.map(judgeAssignment => {
      const judgeEmail = judgeAssignment.judge?.email || judgeAssignment.judge.email;
      return {
        judgeEmail,
        judgeName: judgeAssignment.judge?.name || judgeEmail,
        judgeType: judgeAssignment.judge?.type || 'platform',
        canJudgeSponsoredPS: judgeAssignment.judge?.canJudgeSponsoredPS || false,
        assignedSubmissions: (judgeToSubmissions[judgeEmail] || []).map(assignment => {
          const sub = submissions.find(s => s._id.toString() === assignment.submissionId);
          if (!sub) return null;
          
          const submissionScoresList = submissionScores[assignment.submissionId] || [];
          const averageScore = submissionScoresList.length > 0 
            ? submissionScoresList.reduce((sum, score) => sum + (score.totalScore || 0), 0) / submissionScoresList.length
            : null;
          
          return {
            _id: sub._id,
            projectTitle: sub.projectTitle || sub.title,
            teamId: sub.teamId,
            teamName: sub.teamName,
            pptFile: sub.pptFile,
            submittedAt: sub.submittedAt,
            roundIndex: assignment.roundIndex,
            roundName: assignment.roundName,
            roundType: assignment.roundType,
            problemStatement: sub.problemStatement,
            problemStatementType: sub.problemStatementType,
            evaluationStatus: submissionScoresList.length > 0 ? 'evaluated' : 'pending',
            scoreCount: submissionScoresList.length,
            averageScore: averageScore ? Math.round(averageScore * 10) / 10 : null,
            scores: submissionScoresList.map(score => ({
              judgeEmail: score.judgeEmail,
              totalScore: score.totalScore,
              criteria: score.criteria || []
            }))
          };
        }).filter(Boolean)
      };
    });

    // Find unassigned submissions
    console.log('🔍 Assignment Overview - Checking unassigned submissions:', {
      totalSubmissions: submissions.length,
      submissionAssignments: Object.keys(submissionAssignments).length,
      assignedSubmissions: Object.values(submissionAssignments).filter(assignments => assignments.length > 0).length,
      submissionAssignmentsDetails: Object.entries(submissionAssignments).map(([subId, assignments]) => ({
        submissionId: subId,
        assignmentCount: assignments.length,
        judges: assignments.map(a => a.judgeEmail)
      }))
    });
    
    const unassignedSubmissions = submissions.filter(sub =>
      (submissionAssignments[sub._id.toString()] || []).length === 0
    ).map(sub => {
      // Determine correct roundIndex based on submission type
      let correctRoundIndex;
      if (roundIndex !== undefined && roundIndex !== null && roundIndex !== '') {
        const roundIndexNum = parseInt(roundIndex);
        correctRoundIndex = roundIndexNum; // Use the filtered round index
      } else {
        // If no round filtering, use the submission's actual roundIndex
        correctRoundIndex = sub.roundIndex || 0;
      }
      
      return {
        _id: sub._id,
        projectTitle: sub.projectTitle || sub.title,
        teamId: sub.teamId,
        teamName: sub.teamName,
        pptFile: sub.pptFile,
        submittedAt: sub.submittedAt,
        roundIndex: correctRoundIndex,
        problemStatement: sub.problemStatement,
        problemStatementType: sub.problemStatementType
      };
    });

    console.log('🔍 Assignment Overview - Final counts:', {
      unassignedSubmissions: unassignedSubmissions.length,
      assignedSubmissions: submissions.filter(sub => (submissionAssignments[sub._id.toString()] || []).length > 0).length,
      unassignedSubmissionsDetails: unassignedSubmissions.map(sub => ({
        _id: sub._id,
        teamName: sub.teamName,
        roundIndex: sub.roundIndex,
        pptFile: sub.pptFile,
        projectTitle: sub.projectTitle
      }))
    });
    
    // Build assigned submissions with judge information
    const assignedSubmissions = submissions.filter(sub =>
      (submissionAssignments[sub._id.toString()] || []).length > 0
    ).map(sub => {
      const submissionScoresList = submissionScores[sub._id.toString()] || [];
      const averageScore = submissionScoresList.length > 0 
        ? submissionScoresList.reduce((sum, score) => sum + (score.totalScore || 0), 0) / submissionScoresList.length
        : null;
      
      // Determine correct roundIndex based on submission type
      let correctRoundIndex;
      if (roundIndex !== undefined && roundIndex !== null && roundIndex !== '') {
        const roundIndexNum = parseInt(roundIndex);
        correctRoundIndex = roundIndexNum; // Use the filtered round index
      } else {
        // If no round filtering, use the submission's actual roundIndex
        correctRoundIndex = sub.roundIndex || 0;
      }
      
      return {
        _id: sub._id,
        projectTitle: sub.projectTitle || sub.title,
        teamId: sub.teamId,
        teamName: sub.teamName,
        pptFile: sub.pptFile,
        submittedAt: sub.submittedAt,
        roundIndex: correctRoundIndex,
        problemStatement: sub.problemStatement,
        problemStatementType: sub.problemStatementType,
        assignedJudges: submissionAssignments[sub._id.toString()] || [],
        evaluationStatus: submissionScoresList.length > 0 ? 'evaluated' : 'pending',
        scoreCount: submissionScoresList.length,
        averageScore: averageScore ? Math.round(averageScore * 10) / 10 : null,
        scores: submissionScoresList.map(score => ({
          judgeEmail: score.judgeEmail,
          totalScore: score.totalScore,
          criteria: score.criteria || []
        }))
      };
    });

    // Calculate judge type statistics
    const judgeStats = {
      platform: judges.filter(j => j.judgeType === 'platform').length,
      sponsor: judges.filter(j => j.judgeType === 'sponsor').length,
      hybrid: judges.filter(j => j.judgeType === 'hybrid').length,
      total: judges.length
    };

    // Calculate problem statement type statistics
    const psStats = {
      general: submissions.filter(s => s.problemStatementType === 'general').length,
      sponsored: submissions.filter(s => s.problemStatementType === 'sponsored').length,
      total: submissions.length
    };

    res.status(200).json({
      judges,
      unassignedSubmissions,
      assignedSubmissions,
      judgeStats,
      psStats,
      selectedProblemStatement: selectedPS ? {
        _id: selectedPS._id,
        statement: selectedPS.statement,
        type: selectedPS.type,
        sponsorCompany: selectedPS.sponsorCompany
      } : null,
      summary: {
        totalSubmissions: submissions.length,
        assignedSubmissions: assignedSubmissions.length,
        unassignedSubmissions: unassignedSubmissions.length,
        evaluatedSubmissions: assignedSubmissions.filter(s => s.evaluationStatus === 'evaluated').length,
        pendingEvaluations: assignedSubmissions.filter(s => s.evaluationStatus === 'pending').length
      }
    });
  } catch (error) {
    console.error('Error in getAssignmentOverview:', error);
    res.status(500).json({ message: 'Failed to get assignment overview' });
  }
};

// 🎯 Get Submissions with Assignment Status for Round
exports.getSubmissionsWithAssignmentStatus = async (req, res) => {
  try {
    const { hackathonId, roundIndex } = req.params;
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Get all submissions for this hackathon
    const submissions = await Submission.find({ hackathonId: hackathonId, status: 'submitted' })
      .select('_id projectTitle title teamId teamName pptFile submittedAt')
      .lean();

    // Get all judge assignments for this hackathon
    const judgeAssignments = await JudgeAssignment.find({ hackathon: hackathonId })
      .populate('judge')
      .lean();

    // Get all scores for these submissions
    const scores = await Score.find({ 
      submissionId: { $in: submissions.map(s => s._id) } 
    }).lean();

    // Create a map of submission scores
    const submissionScores = {};
    scores.forEach(score => {
      if (!submissionScores[score.submissionId.toString()]) {
        submissionScores[score.submissionId.toString()] = [];
      }
      submissionScores[score.submissionId.toString()].push(score);
    });

    // Map: submissionId -> assigned judge emails for this round
    const submissionAssignments = {};
    submissions.forEach(sub => {
      submissionAssignments[sub._id.toString()] = [];
    });

    // Build assignment map for this round
    judgeAssignments.forEach(judgeAssignment => {
      const judgeEmail = judgeAssignment.judge?.email || judgeAssignment.judge.email;
      const roundAssignment = judgeAssignment.assignedRounds?.find(r => r.roundIndex === parseInt(roundIndex));
      
      if (roundAssignment?.assignedSubmissions) {
        roundAssignment.assignedSubmissions.forEach(subId => {
          const subIdStr = subId.toString();
          if (submissionAssignments[subIdStr]) {
            submissionAssignments[subIdStr].push({
              judgeEmail,
              judgeName: judgeAssignment.judge?.name || judgeEmail,
              judgeType: judgeAssignment.judge?.type || 'platform',
              roundIndex: roundAssignment.roundIndex,
              roundName: roundAssignment.roundName,
              roundType: roundAssignment.roundType
            });
          }
        });
      }
    });
    
    // Also check for any assignments in ANY round for this hackathon (fallback)
    judgeAssignments.forEach(judgeAssignment => {
      const judgeEmail = judgeAssignment.judge?.email || judgeAssignment.judge.email;
      
      if (judgeAssignment.assignedRounds && Array.isArray(judgeAssignment.assignedRounds)) {
        judgeAssignment.assignedRounds.forEach(round => {
          if (round.assignedSubmissions && Array.isArray(round.assignedSubmissions)) {
            round.assignedSubmissions.forEach(subId => {
              const subIdStr = subId.toString();
              if (submissionAssignments[subIdStr] && submissionAssignments[subIdStr].length === 0) {
                submissionAssignments[subIdStr].push({
                  judgeEmail,
                  judgeName: judgeAssignment.judge?.name || judgeEmail,
                  judgeType: judgeAssignment.judge?.type || 'platform',
                  roundIndex: round.roundIndex,
                  roundName: round.roundName,
                  roundType: round.roundType
                });
              }
            });
          }
        });
      }
    });

    // Build submissions with assignment status
    const submissionsWithStatus = submissions.map(sub => {
      const submissionScoresList = submissionScores[sub._id.toString()] || [];
      const averageScore = submissionScoresList.length > 0 
        ? submissionScoresList.reduce((sum, score) => sum + (score.totalScore || 0), 0) / submissionScoresList.length
        : null;
      
      const subIdStr = sub._id.toString();
      const assignedJudges = submissionAssignments[subIdStr] || [];
      const isAssigned = assignedJudges.length > 0;
      
      return {
        _id: sub._id,
        projectTitle: sub.projectTitle || sub.title,
        teamId: sub.teamId,
        teamName: sub.teamName,
        pptFile: sub.pptFile,
        submittedAt: sub.submittedAt,
        isAssigned: isAssigned,
        assignedJudges: assignedJudges,
        evaluationStatus: submissionScoresList.length > 0 ? 'evaluated' : 'pending',
        scoreCount: submissionScoresList.length,
        averageScore: averageScore ? Math.round(averageScore * 10) / 10 : null
      };
    });

    // Separate assigned and unassigned submissions
    const assignedSubmissions = submissionsWithStatus.filter(sub => sub.isAssigned);
    const unassignedSubmissions = submissionsWithStatus.filter(sub => !sub.isAssigned);

    res.status(200).json({
      assignedSubmissions,
      unassignedSubmissions,
      summary: {
        totalSubmissions: submissionsWithStatus.length,
        assignedSubmissions: assignedSubmissions.length,
        unassignedSubmissions: unassignedSubmissions.length,
        evaluatedSubmissions: submissionsWithStatus.filter(s => s.evaluationStatus === 'evaluated').length,
        pendingEvaluations: submissionsWithStatus.filter(s => s.evaluationStatus === 'pending').length
      }
    });
  } catch (error) {
    console.error('Error in getSubmissionsWithAssignmentStatus:', error);
    res.status(500).json({ message: 'Failed to get submissions with assignment status' });
  }
};

// 🎯 Get Leaderboard for Round 2 Shortlisting
exports.getLeaderboard = async (req, res) => {
  try {
    const { hackathonId, roundIndex } = req.params; // No default - must be specified
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can view leaderboard' });
    }

    // Validate roundIndex against actual hackathon rounds
    const roundIndexNum = parseInt(roundIndex);
    const totalRounds = hackathon.rounds ? hackathon.rounds.length : 0;
    
    if (roundIndexNum >= totalRounds) {
      return res.status(400).json({ 
        message: `Invalid round index. Hackathon has ${totalRounds} rounds (0-${totalRounds - 1})` 
      });
    }

    // Get submissions for the specified round
    let submissions = await Submission.find({ 
      hackathonId: hackathonId, 
      roundIndex: roundIndexNum
    }).populate('teamId', 'name leader')
      .populate('submittedBy', 'name email')
      .lean();
        
    console.log(`🔍 Backend - Round ${roundIndexNum}: Found submissions:`, submissions.length);

    console.log('🔍 Backend - Found submissions:', submissions.length);
    console.log('🔍 Backend - Submissions:', submissions.map(s => ({ 
      id: s._id, 
      title: s.projectTitle || s.title, 
      status: s.status, 
      roundIndex: s.roundIndex,
      teamName: s.teamName || s.teamId?.name,
      submittedBy: s.submittedBy?.name || s.submittedBy?.email
    })));

    // Get all scores for these submissions
    const Score = require('../model/ScoreModel');
    let scores = [];
    let previousRoundScores = {};
    
    // For final round (winner assignment round), we need to get previous round data for combined scoring
    const isFinalRound = roundIndexNum === totalRounds - 1;
    const hasPreviousRounds = roundIndexNum > 0;
    
    if (isFinalRound && hasPreviousRounds) {
      // Final round: Get scores for current round submissions AND previous round submissions for combined scoring
      const currentRoundSubmissionIds = submissions.map(s => s._id);
      
      // Get previous round submissions for the same teams
      const previousRoundSubmissions = await Submission.find({
        hackathonId: hackathonId,
        roundIndex: roundIndexNum - 1
      }).populate('teamId', 'name leader').lean();
      
      const previousRoundSubmissionIds = previousRoundSubmissions.map(s => s._id);
      
      // Get all scores for both rounds
      scores = await Score.find({ 
        submission: { $in: [...currentRoundSubmissionIds, ...previousRoundSubmissionIds] } 
      }).populate('judge', 'name email').lean();
      
      // Create map of previous round scores by team
      previousRoundSubmissions.forEach(submission => {
        const teamId = submission.teamId?._id?.toString() || submission.submittedBy?._id?.toString();
        if (teamId) {
          const submissionScores = scores.filter(s => s.submission.toString() === submission._id.toString());
          if (submissionScores.length > 0) {
            previousRoundScores[teamId] = submissionScores;
          }
        }
      });
      
      console.log(`🔍 Backend - Final Round ${roundIndexNum}: Found current round scores:`, scores.filter(s => currentRoundSubmissionIds.includes(s.submission)).length);
      console.log(`🔍 Backend - Final Round ${roundIndexNum}: Found previous round scores for combined scoring:`, Object.keys(previousRoundScores).length);
    } else {
      // Non-final round or first round: Get scores for current round submissions only
      scores = await Score.find({ 
        submission: { $in: submissions.map(s => s._id) } 
      }).populate('judge', 'name email').lean();
      
      console.log(`🔍 Backend - Round ${roundIndexNum}: Found scores:`, scores.length);
    }

    console.log('🔍 Backend - Found scores:', scores.length);

    // Create a map of submission scores
    const submissionScores = {};
    scores.forEach(score => {
      if (!submissionScores[score.submission.toString()]) {
        submissionScores[score.submission.toString()] = [];
      }
      submissionScores[score.submission.toString()].push(score);
    });

    console.log('🔍 Backend - Submission scores map:', submissionScores);

    // Check if there's round progress for shortlisting
    // For multi-round hackathons, shortlisting from previous round affects current round
    let roundProgress = hackathon.roundProgress?.find(rp => rp.roundIndex === roundIndexNum);
    let shortlistedSubmissionIds = roundProgress?.shortlistedSubmissions || [];
    let shortlistedTeamIds = roundProgress?.shortlistedTeams || [];
    
    // If this is not the first round, also check previous round's shortlisting
    if (roundIndexNum > 0) {
      const previousRoundProgress = hackathon.roundProgress?.find(rp => rp.roundIndex === roundIndexNum - 1);
      if (previousRoundProgress) {
        // Combine shortlisting data from both current and previous rounds
        shortlistedSubmissionIds = [...shortlistedSubmissionIds, ...(previousRoundProgress.shortlistedSubmissions || [])];
        shortlistedTeamIds = [...shortlistedTeamIds, ...(previousRoundProgress.shortlistedTeams || [])];
        
        console.log('🔍 Backend - Combined shortlisting data:', {
          currentRound: roundIndexNum,
          previousRound: roundIndexNum - 1,
          currentShortlistedSubmissions: roundProgress?.shortlistedSubmissions?.length || 0,
          previousShortlistedSubmissions: previousRoundProgress.shortlistedSubmissions?.length || 0,
          currentShortlistedTeams: roundProgress?.shortlistedTeams?.length || 0,
          previousShortlistedTeams: previousRoundProgress.shortlistedTeams?.length || 0,
          totalShortlistedSubmissions: shortlistedSubmissionIds.length,
          totalShortlistedTeams: shortlistedTeamIds.length
        });
      }
    }
    
    console.log('🔍 Backend - Round progress for shortlisting:', {
      roundIndex: roundIndexNum,
      shortlistedSubmissionIds: shortlistedSubmissionIds.length,
      shortlistedTeamIds: shortlistedTeamIds.length,
      roundProgress: roundProgress ? 'Found' : 'Not found'
    });

    // Calculate leaderboard entries
    const leaderboard = submissions.map(submission => {
      const submissionScoresList = submissionScores[submission._id.toString()] || [];
      console.log('🔍 Backend - Processing submission:', submission._id, 'with scores:', submissionScoresList.length);
      
      // Calculate scores for current round
      let roundScore = 0;
      let roundScoreCount = 0;
      let roundTotalScore = 0;
      
      submissionScoresList.forEach(score => {
        console.log('🔍 Backend - Processing score:', score);
        
        // Handle the complex score structure
        let totalCriteriaScore = 0;
        let criteriaCount = 0;
        
        if (score.scores && score.scores instanceof Map) {
          // Handle Map structure
          score.scores.forEach((value, key) => {
            if (value && typeof value.score === 'number') {
              totalCriteriaScore += value.score;
              criteriaCount++;
            }
          });
        } else if (score.scores && typeof score.scores === 'object') {
          // Handle object structure
          Object.values(score.scores).forEach(value => {
            if (value && typeof value.score === 'number') {
              totalCriteriaScore += value.score;
              criteriaCount++;
            } else if (typeof value === 'number') {
              // Fallback for simple number values
              totalCriteriaScore += value;
              criteriaCount++;
            }
          });
        }
        
        console.log('🔍 Backend - Total criteria score:', totalCriteriaScore, 'Criteria count:', criteriaCount);
        
        if (criteriaCount > 0) {
          const submissionScore = totalCriteriaScore / criteriaCount;
          roundTotalScore += submissionScore;
          roundScoreCount++;
          console.log('🔍 Backend - Submission score calculated:', submissionScore);
        } else if (score.totalScore && typeof score.totalScore === 'number') {
          // Fallback to totalScore if criteria calculation fails
          roundTotalScore += score.totalScore;
          roundScoreCount++;
          console.log('🔍 Backend - Using totalScore fallback:', score.totalScore);
        }
      });
      
      roundScore = roundScoreCount > 0 ? roundTotalScore / roundScoreCount : 0;
      
      // For final round, calculate combined score with previous round
      let combinedScore = roundScore;
      let previousRoundScore = 0;
      let currentRoundScore = roundScore;
      let totalScore = roundTotalScore;
      let scoreCount = roundScoreCount;
      
      if (isFinalRound && hasPreviousRounds) {
        // Final round: Calculate combined score with previous round score
        const teamId = submission.teamId?._id?.toString() || submission.submittedBy?._id?.toString();
        const previousRoundTeamScores = previousRoundScores[teamId] || [];
        
        if (previousRoundTeamScores.length > 0) {
          let previousRoundTotalScore = 0;
          let previousRoundScoreCount = 0;
          
          previousRoundTeamScores.forEach(score => {
            let totalCriteriaScore = 0;
            let criteriaCount = 0;
            
            if (score.scores && score.scores instanceof Map) {
              score.scores.forEach((value, key) => {
                if (value && typeof value.score === 'number') {
                  totalCriteriaScore += value.score;
                  criteriaCount++;
                }
              });
            } else if (score.scores && typeof score.scores === 'object') {
              Object.values(score.scores).forEach(value => {
                if (value && typeof value.score === 'number') {
                  totalCriteriaScore += value.score;
                  criteriaCount++;
                } else if (typeof value === 'number') {
                  totalCriteriaScore += value;
                  criteriaCount++;
                }
              });
            }
            
            if (criteriaCount > 0) {
              const submissionScore = totalCriteriaScore / criteriaCount;
              previousRoundTotalScore += submissionScore;
              previousRoundScoreCount++;
            } else if (score.totalScore && typeof score.totalScore === 'number') {
              previousRoundTotalScore += score.totalScore;
              previousRoundScoreCount++;
            }
          });
          
          previousRoundScore = previousRoundScoreCount > 0 ? previousRoundTotalScore / previousRoundScoreCount : 0;
          
          // Calculate combined score: (Previous Round Score + Current Round Score) / 2
          combinedScore = (previousRoundScore + currentRoundScore) / 2;
          totalScore = previousRoundTotalScore + roundTotalScore;
          scoreCount = previousRoundScoreCount + roundScoreCount;
          
          console.log(`🔍 Backend - Final Round ${roundIndexNum} combined scoring:`, {
            teamId,
            previousRoundScore,
            currentRoundScore,
            combinedScore,
            previousRoundScoreCount,
            roundScoreCount
          });
        }
      }

      // Determine the correct status for this submission
      let finalStatus = submission.status;
      
      // Check if this submission is shortlisted based on round progress
      if (shortlistedSubmissionIds.includes(submission._id.toString())) {
        finalStatus = 'shortlisted';
        console.log(`🔍 Backend - Submission ${submission._id} marked as shortlisted via round progress`);
      } else if (submission.teamId && shortlistedTeamIds.includes(submission.teamId._id.toString())) {
        finalStatus = 'shortlisted';
        console.log(`🔍 Backend - Submission ${submission._id} marked as shortlisted via team shortlisting`);
      } else if (submission.submittedBy && shortlistedTeamIds.includes(submission.submittedBy._id.toString())) {
        finalStatus = 'shortlisted';
        console.log(`🔍 Backend - Submission ${submission._id} marked as shortlisted via individual shortlisting`);
      } else if (submission.status === 'shortlisted') {
        // Keep existing shortlisted status
        console.log(`🔍 Backend - Submission ${submission._id} already has shortlisted status`);
      } else {
        // Ensure it's not marked as shortlisted if not in shortlist
        finalStatus = submission.status === 'shortlisted' ? 'submitted' : submission.status;
        console.log(`🔍 Backend - Submission ${submission._id} status: ${finalStatus}`);
      }

      return {
        _id: submission._id,
        projectTitle: submission.projectId?.title || submission.projectTitle || submission.title || 'Untitled Project',
        teamName: submission.teamName || submission.teamId?.name || 'No Team',
        leaderName: submission.submittedBy?.name || submission.submittedBy?.email || 'Unknown',
        pptFile: submission.pptFile,
        submittedAt: submission.submittedAt,
        averageScore: Math.round(combinedScore * 10) / 10,
        scoreCount,
        totalScore: Math.round(totalScore * 10) / 10,
        status: finalStatus, // Use the corrected status
        roundIndex: submission.roundIndex,
        problemStatement: submission.problemStatement, // Add problem statement field
        pptScore: typeof submission.pptScore === 'number' ? submission.pptScore : null, // Add pptScore
        projectScore: typeof submission.projectScore === 'number' ? submission.projectScore : null, // Add projectScore
        // Final round specific fields
        previousRoundScore: isFinalRound && hasPreviousRounds ? Math.round(previousRoundScore * 10) / 10 : null,
        currentRoundScore: isFinalRound && hasPreviousRounds ? Math.round(currentRoundScore * 10) / 10 : null,
        isFinalRound: isFinalRound
      };
    });

    console.log('🔍 Backend - Final leaderboard:', leaderboard.map(entry => ({
      id: entry._id,
      title: entry.projectTitle,
      status: entry.status,
      averageScore: entry.averageScore,
      scoreCount: entry.scoreCount
    })));
    
    // Log shortlisted entries specifically
    const shortlistedEntries = leaderboard.filter(entry => entry.status === 'shortlisted');
    console.log('🔍 Backend - Shortlisted entries count:', shortlistedEntries.length);
    shortlistedEntries.forEach(entry => {
      console.log(`🔍 Backend - Shortlisted entry: ${entry.projectTitle} (${entry._id})`);
    });

    // Sort by average score (descending) and then by submission date (ascending for ties)
    leaderboard.sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });

    // Add rank to each entry
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.status(200).json({
      hackathon: {
        id: hackathon._id,
        title: hackathon.title,
        roundIndex: parseInt(roundIndex),
        rounds: hackathon.rounds || [],
        problemStatements: hackathon.problemStatements || []
      },
      leaderboard,
      summary: {
        totalSubmissions: leaderboard.length,
        evaluatedSubmissions: leaderboard.filter(s => s.scoreCount > 0).length,
        pendingEvaluations: leaderboard.filter(s => s.scoreCount === 0).length,
        shortlistedCount: leaderboard.filter(s => s.status === 'shortlisted').length,
        averageScore: leaderboard.length > 0 
          ? Math.round(leaderboard.reduce((sum, s) => sum + s.averageScore, 0) / leaderboard.length * 10) / 10
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
};

// 🎯 Perform Shortlisting for Round 2
exports.performShortlisting = async (req, res) => {
  try {
    const { hackathonId, roundIndex = 0 } = req.params;
    const { shortlistCount, shortlistThreshold, mode, submissionIds, problemStatement } = req.body;
    
    console.log('🔍 Backend - performShortlisting called with:', { 
      hackathonId, roundIndex, shortlistCount, shortlistThreshold, mode, submissionIds, problemStatement 
    });
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can perform shortlisting' });
    }

    let submissionsToShortlist = [];

    if (submissionIds && Array.isArray(submissionIds)) {
      // Use provided submission IDs
      submissionsToShortlist = submissionIds;
    } else {
      // Get leaderboard data for the specified round
      // Include both submitted and shortlisted submissions to handle cases where submissions are already shortlisted
      let submissions = await Submission.find({ 
        hackathonId: hackathonId, 
        status: { $in: ['submitted', 'shortlisted'] },
        roundIndex: parseInt(roundIndex)
      }).populate('teamId', 'name leader')
        .populate('submittedBy', 'name email')
        .lean();

      // Filter by problem statement if specified
      if (problemStatement && problemStatement !== 'All') {
        submissions = submissions.filter(submission => {
          return submission.problemStatement === problemStatement;
        });
        console.log('🔍 Backend - Filtered submissions by problem statement:', {
          problemStatement,
          totalSubmissions: submissions.length,
          filteredSubmissions: submissions.length
        });
      }

      // Get all scores for these submissions
      const Score = require('../model/ScoreModel');
      const scores = await Score.find({ 
        submission: { $in: submissions.map(s => s._id) } 
      }).populate('judge', 'name email').lean();

      // Create a map of submission scores
      const submissionScores = {};
      scores.forEach(score => {
        if (!submissionScores[score.submission.toString()]) {
          submissionScores[score.submission.toString()] = [];
        }
        submissionScores[score.submission.toString()].push(score);
      });

      // Calculate leaderboard entries
      const leaderboard = submissions.map(submission => {
        const submissionScoresList = submissionScores[submission._id.toString()] || [];
        
        // Calculate average score
        let averageScore = 0;
        let totalScore = 0;
        let scoreCount = 0;
        
        submissionScoresList.forEach(score => {
          // Convert Map to object if needed
          let scoresObject = {};
          if (score.scores && score.scores instanceof Map) {
            score.scores.forEach((value, key) => {
              scoresObject[key] = value.score;
            });
          } else if (score.scores && typeof score.scores === 'object') {
            scoresObject = score.scores;
          }
          
          // Handle nested score structure { criteria: { score: 5, maxScore: 10, weight: 1 } }
          const criteriaScores = [];
          Object.values(scoresObject).forEach(value => {
            if (typeof value === 'number') {
              criteriaScores.push(value);
            } else if (value && typeof value === 'object' && value.score !== undefined) {
              criteriaScores.push(value.score);
            }
          });
          
          if (criteriaScores.length > 0) {
            const submissionScore = criteriaScores.reduce((sum, s) => sum + s, 0) / criteriaScores.length;
            totalScore += submissionScore;
            scoreCount++;
          }
        });
        
        averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

        return {
          _id: submission._id,
          projectTitle: submission.projectTitle || submission.title || 'Untitled Project',
          teamName: submission.teamName || submission.teamId?.name || 'No Team',
          leaderName: submission.submittedBy?.name || submission.submittedBy?.email || 'Unknown',
          pptFile: submission.pptFile,
          submittedAt: submission.submittedAt,
          averageScore: Math.round(averageScore * 10) / 10,
          scoreCount,
          totalScore: Math.round(totalScore * 10) / 10,
          status: submission.status,
          roundIndex: submission.roundIndex
        };
      });

      // Sort by average score (descending)
      leaderboard.sort((a, b) => b.averageScore - a.averageScore);

      // Apply shortlisting based on mode
      if (mode === 'topN') {
        // Validate input for topN mode
        if (!shortlistCount || shortlistCount < 1) {
          return res.status(400).json({ message: 'Valid shortlist count is required for topN mode' });
        }
        
        submissionsToShortlist = leaderboard
          .slice(0, shortlistCount)
          .map(entry => entry._id);
      } else if (mode === 'threshold') {
        // Validate input for threshold mode
        if (shortlistThreshold === undefined || shortlistThreshold < 0 || shortlistThreshold > 10) {
          return res.status(400).json({ message: 'Valid score threshold (0-10) is required for threshold mode' });
        }
        
        submissionsToShortlist = leaderboard
          .filter(entry => entry.averageScore >= shortlistThreshold)
          .map(entry => entry._id);
      } else if (mode === 'date') {
        // Shortlist all submissions (date-based)
        submissionsToShortlist = leaderboard.map(entry => entry._id);
      } else {
        return res.status(400).json({ message: 'Invalid shortlisting mode. Use "topN", "threshold", or "date"' });
      }
    }

    console.log('🔍 Backend - Submissions to shortlist:', submissionsToShortlist);

    // Update submission statuses and track shortlisted teams
    const shortlistedTeams = new Set();
    const updatePromises = [];
    
    console.log('🔍 Backend - Starting to update submissions...');
    
    for (const submissionId of submissionsToShortlist) {
      try {
        const submission = await Submission.findById(submissionId);
        if (submission) {
          console.log(`🔍 Backend - Updating submission ${submissionId} to shortlisted`);
          
          // Track the team that submitted this
          if (submission.teamId) {
            shortlistedTeams.add(submission.teamId.toString());
            console.log(`🔍 Backend - Added team ${submission.teamId} to shortlisted teams`);
          } else if (submission.submittedBy) {
            // For individual submissions, track the user
            shortlistedTeams.add(submission.submittedBy.toString());
            console.log(`🔍 Backend - Added user ${submission.submittedBy} to shortlisted teams`);
          }
          
          const updateResult = await Submission.findByIdAndUpdate(submissionId, { 
            status: 'shortlisted',
            shortlistedAt: new Date(),
            shortlistedForRound: parseInt(roundIndex) + 1 // Shortlist for the next round
          });
          
          console.log(`🔍 Backend - Successfully updated submission ${submissionId}:`, updateResult ? 'Updated' : 'Not found');
          
          // Verify the update by fetching the submission again
          const updatedSubmission = await Submission.findById(submissionId);
          console.log(`🔍 Backend - Verification - Submission ${submissionId} status:`, updatedSubmission ? updatedSubmission.status : 'Not found');
          updatePromises.push(Promise.resolve());
        } else {
          console.log(`🔍 Backend - Submission ${submissionId} not found`);
        }
      } catch (error) {
        console.error(`🔍 Backend - Error updating submission ${submissionId}:`, error);
      }
    }

    console.log('🔍 Backend - All submission updates completed');
    console.log('🔍 Backend - Shortlisted teams:', Array.from(shortlistedTeams));

    // Update hackathon round progress with enhanced eligibility tracking
    const roundProgressIndex = hackathon.roundProgress.findIndex(rp => rp.roundIndex === parseInt(roundIndex));
    
    if (roundProgressIndex >= 0) {
      // Update existing round progress
      hackathon.roundProgress[roundProgressIndex].shortlistedSubmissions = submissionsToShortlist;
      hackathon.roundProgress[roundProgressIndex].shortlistedTeams = Array.from(shortlistedTeams);
      hackathon.roundProgress[roundProgressIndex].shortlistedAt = new Date();
      
      // Enhanced eligibility tracking
      hackathon.roundProgress[roundProgressIndex].eligibleTeams = Array.from(shortlistedTeams);
      hackathon.roundProgress[roundProgressIndex].eligibleSubmissions = submissionsToShortlist;
      hackathon.roundProgress[roundProgressIndex].roundCompleted = true;
      hackathon.roundProgress[roundProgressIndex].nextRoundEligibility = true;
      
      // Add eligible participants (both team members and individual participants)
      const eligibleParticipants = new Set();
      for (const teamId of shortlistedTeams) {
        const team = await Team.findById(teamId);
        if (team && team.members) {
          team.members.forEach(memberId => eligibleParticipants.add(memberId.toString()));
        }
      }
      hackathon.roundProgress[roundProgressIndex].eligibleParticipants = Array.from(eligibleParticipants);
      
    } else {
      // Add new round progress
      const eligibleParticipants = new Set();
      for (const teamId of shortlistedTeams) {
        const team = await Team.findById(teamId);
        if (team && team.members) {
          team.members.forEach(memberId => eligibleParticipants.add(memberId.toString()));
        }
      }
      
      hackathon.roundProgress.push({
        roundIndex: parseInt(roundIndex),
        shortlistedSubmissions: submissionsToShortlist,
        shortlistedTeams: Array.from(shortlistedTeams),
        shortlistedAt: new Date(),
        eligibleTeams: Array.from(shortlistedTeams),
        eligibleParticipants: Array.from(eligibleParticipants),
        eligibleSubmissions: submissionsToShortlist,
        roundCompleted: true,
        nextRoundEligibility: true
      });
    }

    await hackathon.save();

    // Send email notifications to participants
    try {
      console.log('🔍 Backend - Attempting to send shortlisting emails...');
      console.log('🔍 Backend - Shortlisted teams:', Array.from(shortlistedTeams));
      console.log('🔍 Backend - Shortlisted submissions:', submissionsToShortlist);
      console.log('🔍 Backend - Mode:', mode);
      
      // Ensure email configuration is available
      if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        console.warn('🔍 Backend - Email configuration missing, skipping email notifications');
        console.warn('🔍 Backend - Please configure MAIL_USER and MAIL_PASS environment variables');
      } else {
        await exports.sendShortlistingNotifications(hackathon, Array.from(shortlistedTeams), submissionsToShortlist, mode);
        console.log('🔍 Backend - Email notifications sent successfully');
      }
    } catch (emailError) {
      console.error('🔍 Backend - Error sending shortlisting emails:', emailError);
      console.error('🔍 Backend - Email error details:', {
        error: emailError.message,
        stack: emailError.stack,
        shortlistedTeams: Array.from(shortlistedTeams),
        submissionsToShortlist,
        mode
      });
      // Don't fail the request if emails fail
    }

    // Create timeline notifications for participants
    try {
      console.log('🔍 Backend - Creating timeline notifications...');
      await exports.createShortlistingNotifications(hackathon, Array.from(shortlistedTeams), submissionsToShortlist, mode, parseInt(roundIndex));
      console.log('🔍 Backend - Timeline notifications created successfully');
    } catch (notificationError) {
      console.error('🔍 Backend - Error creating timeline notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    console.log('🔍 Backend - Shortlisting completed successfully');

    res.status(200).json({
      message: `Successfully shortlisted ${submissionsToShortlist.length} submissions`,
      shortlistedSubmissions: submissionsToShortlist,
      shortlistedTeams: Array.from(shortlistedTeams),
      roundIndex: parseInt(roundIndex),
      shortlistedAt: new Date(),
      mode: mode
    });

  } catch (error) {
    console.error('🔍 Backend - Error performing shortlisting:', error);
    res.status(500).json({ message: 'Failed to perform shortlisting', error: error.message });
  }
};

// 🎯 Toggle individual submission shortlist status
exports.toggleSubmissionShortlist = async (req, res) => {
  try {
    const { hackathonId, roundIndex = 0 } = req.params;
    const { submissionId, shortlist } = req.body;
    
    console.log('🔍 Backend - toggleSubmissionShortlist called with:', { 
      hackathonId, roundIndex, submissionId, shortlist 
    });
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can modify shortlist status' });
    }

    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify the submission belongs to this hackathon and round
    if (submission.hackathonId.toString() !== hackathonId || submission.roundIndex !== parseInt(roundIndex)) {
      return res.status(400).json({ message: 'Submission does not belong to this hackathon/round' });
    }

    // Update submission status
    const updateData = {
      status: shortlist ? 'shortlisted' : 'submitted',
      shortlistedAt: shortlist ? new Date() : null,
      shortlistedForRound: shortlist ? parseInt(roundIndex) + 1 : null
    };

    await Submission.findByIdAndUpdate(submissionId, updateData);

    // Update hackathon round progress
    const roundProgressIndex = hackathon.roundProgress.findIndex(rp => rp.roundIndex === parseInt(roundIndex));
    
    if (roundProgressIndex >= 0) {
      if (shortlist) {
        // Add to shortlisted submissions if not already there
        if (!hackathon.roundProgress[roundProgressIndex].shortlistedSubmissions) {
          hackathon.roundProgress[roundProgressIndex].shortlistedSubmissions = [];
        }
        if (!hackathon.roundProgress[roundProgressIndex].shortlistedSubmissions.includes(submissionId)) {
          hackathon.roundProgress[roundProgressIndex].shortlistedSubmissions.push(submissionId);
        }
        
        // Add team/user to shortlisted teams
        if (!hackathon.roundProgress[roundProgressIndex].shortlistedTeams) {
          hackathon.roundProgress[roundProgressIndex].shortlistedTeams = [];
        }
        const teamOrUserId = submission.teamId || submission.submittedBy;
        if (teamOrUserId && !hackathon.roundProgress[roundProgressIndex].shortlistedTeams.includes(teamOrUserId.toString())) {
          hackathon.roundProgress[roundProgressIndex].shortlistedTeams.push(teamOrUserId.toString());
        }
      } else {
        // Remove from shortlisted submissions
        if (hackathon.roundProgress[roundProgressIndex].shortlistedSubmissions) {
          hackathon.roundProgress[roundProgressIndex].shortlistedSubmissions = 
            hackathon.roundProgress[roundProgressIndex].shortlistedSubmissions.filter(id => id.toString() !== submissionId.toString());
        }
        
        // Remove team/user from shortlisted teams
        if (hackathon.roundProgress[roundProgressIndex].shortlistedTeams) {
          const teamOrUserId = submission.teamId || submission.submittedBy;
          if (teamOrUserId) {
            hackathon.roundProgress[roundProgressIndex].shortlistedTeams = 
              hackathon.roundProgress[roundProgressIndex].shortlistedTeams.filter(id => id.toString() !== teamOrUserId.toString());
          }
        }
      }
    } else {
      // Create new round progress if it doesn't exist
      if (shortlist) {
        hackathon.roundProgress.push({
          roundIndex: parseInt(roundIndex),
          shortlistedSubmissions: [submissionId],
          shortlistedTeams: [submission.teamId || submission.submittedBy].filter(Boolean).map(id => id.toString()),
          shortlistedAt: new Date()
        });
      }
    }

    await hackathon.save();

    // Create notification for the participant
    try {
      const Notification = require('../model/NotificationModel');
      const submission = await Submission.findById(submissionId).populate('submittedBy', 'name').populate('teamId', 'name members');
      
      if (submission) {
        let recipientId;
        let participantName;
        
        if (submission.teamId) {
          // For team submissions, notify all team members
          const teamMembers = submission.teamId.members || [];
          for (const memberId of teamMembers) {
            await Notification.create({
              recipient: memberId,
              message: shortlist 
                ? `🎉 Congratulations! Your team "${submission.teamId.name}" has been selected for Round ${parseInt(roundIndex) + 2} of ${hackathon.title}. You can now submit a new project for Round ${parseInt(roundIndex) + 2}.`
                : `📋 Round ${parseInt(roundIndex) + 2} Selection Update: Your team "${submission.teamId.name}" is no longer shortlisted for Round ${parseInt(roundIndex) + 2} of ${hackathon.title}.`,
              type: shortlist ? 'success' : 'info',
              hackathon: hackathon._id,
              createdAt: new Date()
            });
          }
        } else if (submission.submittedBy) {
          // For individual submissions
          await Notification.create({
            recipient: submission.submittedBy._id,
            message: shortlist 
              ? `🎉 Congratulations! You have been selected for Round ${parseInt(roundIndex) + 2} of ${hackathon.title}. You can now submit a new project for Round ${parseInt(roundIndex) + 2}.`
              : `📋 Round ${parseInt(roundIndex) + 2} Selection Update: You are no longer shortlisted for Round ${parseInt(roundIndex) + 2} of ${hackathon.title}.`,
            type: shortlist ? 'success' : 'info',
            hackathon: hackathon._id,
            createdAt: new Date()
          });
        }
      }
    } catch (notificationError) {
      console.error('🔍 Backend - Error creating toggle notification:', notificationError);
      // Don't fail the request if notification fails
    }

    console.log('🔍 Backend - Shortlist status updated successfully');

    res.status(200).json({
      message: `Submission ${shortlist ? 'added to' : 'removed from'} shortlist successfully`,
      submissionId,
      shortlisted: shortlist,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('🔍 Backend - Error toggling shortlist status:', error);
    res.status(500).json({ message: 'Failed to update shortlist status', error: error.message });
  }
};

// 🎯 Get comprehensive shortlisting status for all rounds
exports.getShortlistingStatus = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.user._id;
    
    console.log('🔍 Backend - getShortlistingStatus called for:', { hackathonId, userId });
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Check if user is registered for this hackathon
    const Registration = require("../model/HackathonRegistrationModel");
    const isRegistered = await Registration.findOne({ hackathonId, userId });
    if (!isRegistered) {
      return res.status(403).json({ 
        eligible: false, 
        message: `You must be registered for this hackathon to participate` 
      });
    }

    const Team = require("../model/TeamModel");
    const Submission = require("../model/SubmissionModel");
    
    const userTeam = await Team.findOne({ 
      hackathon: hackathonId, 
      members: userId, 
      status: 'active' 
    });

    // Get shortlisting status for each round
    const shortlistingStatus = {};
    
    for (let roundIndex = 0; roundIndex < hackathon.rounds.length - 1; roundIndex++) {
      const nextRoundIndex = roundIndex + 1;
      let isShortlisted = false;
      let shortlistingSource = null;
      let shortlistingDetails = null;
      let roundProgress = null;

      // Find the round progress for this round
      if (hackathon.roundProgress) {
        roundProgress = hackathon.roundProgress.find(rp => rp.roundIndex === roundIndex);
      }

      // Method 1: Check enhanced round progress for team-based eligibility
      if (userTeam && roundProgress) {
        if (roundProgress.eligibleTeams && roundProgress.eligibleTeams.includes(userTeam._id.toString())) {
          isShortlisted = true;
          shortlistingSource = 'enhanced_round_progress_team';
          shortlistingDetails = {
            teamId: userTeam._id,
            teamName: userTeam.name,
            roundIndex: roundIndex,
            nextRoundIndex: nextRoundIndex
          };
        }
      }

      // Method 2: Check enhanced round progress for individual eligibility
      if (!isShortlisted && roundProgress) {
        if (roundProgress.eligibleParticipants && roundProgress.eligibleParticipants.includes(userId.toString())) {
          isShortlisted = true;
          shortlistingSource = 'enhanced_round_progress_user';
          shortlistingDetails = {
            userId: userId,
            roundIndex: roundIndex,
            nextRoundIndex: nextRoundIndex
          };
        }
      }

      // Method 3: Check legacy shortlisted teams
      if (!isShortlisted && roundProgress) {
        if (roundProgress.shortlistedTeams && roundProgress.shortlistedTeams.includes(userTeam?._id?.toString() || userId.toString())) {
          isShortlisted = true;
          shortlistingSource = 'legacy_shortlisted_teams';
        }
      }

      // Method 4: Check submission status (individual submissions)
      if (!isShortlisted) {
        const shortlistedSubmission = await Submission.findOne({
          hackathonId: hackathonId,
          $or: [
            { teamId: userTeam?._id },
            { submittedBy: userId }
          ],
          shortlistedForRound: nextRoundIndex + 1,
          status: 'shortlisted'
        });
        
        if (shortlistedSubmission) {
          isShortlisted = true;
          shortlistingSource = 'submission_status';
          shortlistingDetails = {
            submissionId: shortlistedSubmission._id,
            projectTitle: shortlistedSubmission.projectTitle || shortlistedSubmission.title,
            shortlistedAt: shortlistedSubmission.shortlistedAt
          };
        }
      }

      // Method 5: Check advanced participants (legacy support)
      if (!isShortlisted && roundProgress) {
        if (roundProgress.advancedParticipantIds && roundProgress.advancedParticipantIds.includes(userId.toString())) {
          isShortlisted = true;
          shortlistingSource = 'advanced_participants';
        }
      }

      shortlistingStatus[`round${roundIndex + 1}ToRound${nextRoundIndex + 1}`] = {
        isShortlisted,
        shortlistingSource,
        shortlistingDetails,
        roundIndex,
        nextRoundIndex,
        roundProgress: roundProgress ? {
          roundCompleted: roundProgress.roundCompleted,
          nextRoundEligibility: roundProgress.nextRoundEligibility,
          shortlistedAt: roundProgress.shortlistedAt
        } : null
      };
    }

    console.log('🔍 Backend - Enhanced shortlisting status for user:', shortlistingStatus);

    return res.status(200).json({
      shortlistingStatus,
      totalRounds: hackathon.rounds.length,
      userTeam: userTeam ? userTeam._id : null,
      currentRound: hackathon.rounds?.length || 0
    });

  } catch (error) {
    console.error('🔍 Backend - Error in getShortlistingStatus:', error);
    return res.status(500).json({ 
      message: 'Failed to get shortlisting status', 
      error: error.message
    });
  }
};

// 🎯 Check if user/team is eligible for a specific round
exports.checkRoundEligibility = async (req, res) => {
  try {
    const { hackathonId, roundIndex = 1 } = req.params;
    const userId = req.user._id;
    
    console.log('🔍 Backend - checkRoundEligibility called for:', { hackathonId, roundIndex, userId });
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Check if user is registered for this hackathon
    const Registration = require("../model/HackathonRegistrationModel");
    const isRegistered = await Registration.findOne({ hackathonId, userId });
    if (!isRegistered) {
      return res.status(403).json({ 
        eligible: false, 
        message: `You must be registered for this hackathon to participate in Round ${roundIndex + 1}` 
      });
    }

    // Check if the specified round exists
    if (!hackathon.rounds || hackathon.rounds.length <= roundIndex) {
      return res.status(400).json({ 
        eligible: false, 
        message: `This hackathon does not have a Round ${roundIndex + 1}` 
      });
    }

    // Check if the specified round has started
    const roundStartDate = hackathon.rounds[roundIndex]?.startDate;
    const now = new Date();
    const roundStarted = roundStartDate && now >= new Date(roundStartDate);

    console.log('🔍 Backend - Round status:', { roundStartDate, now, roundStarted, roundIndex });

    // Check if user's team was shortlisted
    const Team = require("../model/TeamModel");
    const userTeam = await Team.findOne({ 
      hackathon: hackathonId, 
      members: userId, 
      status: 'active' 
    });

    let isEligible = false;
    let eligibilitySource = null;
    let eligibilityDetails = null;

    // For Round 1 (index 0), everyone is eligible
    if (roundIndex === 0) {
      isEligible = true;
      eligibilitySource = 'first_round';
    } else {
      // For subsequent rounds, check eligibility from previous round
      const previousRoundIndex = roundIndex - 1;
      const previousRoundProgress = hackathon.roundProgress?.find(rp => rp.roundIndex === previousRoundIndex);
      
      if (previousRoundProgress) {
        // Check enhanced eligibility tracking
        if (userTeam && previousRoundProgress.eligibleTeams && previousRoundProgress.eligibleTeams.includes(userTeam._id.toString())) {
          isEligible = true;
          eligibilitySource = 'enhanced_eligible_teams';
          eligibilityDetails = {
            teamId: userTeam._id,
            teamName: userTeam.name,
            previousRound: previousRoundIndex,
            currentRound: roundIndex
          };
        } else if (previousRoundProgress.eligibleParticipants && previousRoundProgress.eligibleParticipants.includes(userId.toString())) {
          isEligible = true;
          eligibilitySource = 'enhanced_eligible_participants';
          eligibilityDetails = {
            userId: userId,
            previousRound: previousRoundIndex,
            currentRound: roundIndex
          };
        } else if (previousRoundProgress.shortlistedTeams && previousRoundProgress.shortlistedTeams.includes(userTeam?._id?.toString() || userId.toString())) {
          isEligible = true;
          eligibilitySource = 'legacy_shortlisted_teams';
        }
      }
    }

    console.log('🔍 Backend - Final eligibility result:', { 
      isEligible, 
      eligibilitySource, 
      roundStarted,
      eligible: isEligible && roundStarted 
    });

    return res.status(200).json({
      eligible: isEligible && roundStarted,
      shortlisted: isEligible,
      message: isEligible 
        ? (roundStarted ? `You are eligible to submit to Round ${roundIndex + 1}` : `You are eligible for Round ${roundIndex + 1}, but Round ${roundIndex + 1} has not started yet`)
        : `You are not eligible for Round ${roundIndex + 1}. You must qualify from the previous round.`,
      roundStarted: roundStarted,
      roundStartDate: roundStartDate,
      roundIndex: roundIndex,
      eligibilityDetails,
      eligibilitySource,
      isFirstRound: roundIndex === 0
    });

  } catch (error) {
    console.error('🔍 Backend - Error in checkRoundEligibility:', error);
    return res.status(500).json({ 
      message: 'Failed to check eligibility', 
      error: error.message
    });
  }
};

// 🎯 Check if user/team is shortlisted for the next round (backward compatibility)
exports.checkNextRoundEligibility = async (req, res) => {
  try {
    const { hackathonId, roundIndex = 1 } = req.params; // Default to Round 2 (index 1) for backward compatibility
    const userId = req.user._id;
    
    console.log('🔍 Backend - checkNextRoundEligibility called for:', { hackathonId, roundIndex, userId });
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Check if user is registered for this hackathon
    const Registration = require("../model/HackathonRegistrationModel");
    const isRegistered = await Registration.findOne({ hackathonId, userId });
    if (!isRegistered) {
      return res.status(403).json({ 
        eligible: false, 
        message: `You must be registered for this hackathon to participate in Round ${roundIndex + 1}` 
      });
    }

    // Check if the specified round exists
    if (!hackathon.rounds || hackathon.rounds.length <= roundIndex) {
      return res.status(400).json({ 
        eligible: false, 
        message: `This hackathon does not have a Round ${roundIndex + 1}` 
      });
    }

    // Check if the specified round has started
    const roundStartDate = hackathon.rounds[roundIndex]?.startDate;
    const now = new Date();
    const roundStarted = roundStartDate && now >= new Date(roundStartDate);

    console.log('🔍 Backend - Round status:', { roundStartDate, now, roundStarted, roundIndex });

    // Check if user's team was shortlisted
    const Team = require("../model/TeamModel");
    const userTeam = await Team.findOne({ 
      hackathon: hackathonId, 
      members: userId, 
      status: 'active' 
    });

    // Also check if there are any teams for this hackathon
    const allTeams = await Team.find({ hackathon: hackathonId, status: 'active' });
    console.log('🔍 Backend - Team check:', { 
      userTeam: userTeam ? userTeam._id : null, 
      allTeamsCount: allTeams.length 
    });

    let isShortlisted = false;
    let shortlistingSource = null;
    let shortlistingDetails = null;

    // Method 1: Check hackathon round progress for team-based shortlisting
    if (userTeam && hackathon.roundProgress) {
      console.log('🔍 Backend - Checking team-based shortlisting for user:', userId);
      console.log('🔍 Backend - User team ID:', userTeam._id.toString());
      
      for (const progress of hackathon.roundProgress) {
        console.log('🔍 Backend - Checking round progress:', {
          roundIndex: progress.roundIndex,
          shortlistedTeams: progress.shortlistedTeams?.length || 0,
          shortlistedTeamsArray: progress.shortlistedTeams
        });
        
        if (progress.shortlistedTeams && progress.shortlistedTeams.includes(userTeam._id.toString())) {
          isShortlisted = true;
          shortlistingSource = 'hackathon_round_progress_team';
          console.log('🔍 Backend - User shortlisted via team in round progress');
          break;
        }
      }
      
      // Also check for team submissions from previous round that were shortlisted
      if (!isShortlisted && roundIndex > 0) {
        const previousRoundSubmissions = await Submission.find({
          hackathonId: hackathonId,
          teamId: userTeam._id,
          roundIndex: roundIndex - 1
        });
        
        if (previousRoundSubmissions.length > 0) {
          // Check if any of the team's previous round submissions are in the shortlisted submissions
          const previousRoundProgress = hackathon.roundProgress?.find(rp => rp.roundIndex === roundIndex - 1);
          if (previousRoundProgress && previousRoundProgress.shortlistedSubmissions) {
            const teamSubmissionIds = previousRoundSubmissions.map(s => s._id.toString());
            const hasShortlistedSubmission = teamSubmissionIds.some(id => 
              previousRoundProgress.shortlistedSubmissions.includes(id)
            );
            
            if (hasShortlistedSubmission) {
              isShortlisted = true;
              shortlistingSource = 'previous_round_team_submission';
              console.log('🔍 Backend - User shortlisted via team previous round submission');
            }
          }
        }
      }
    }

    // Method 2: Check hackathon round progress for individual user shortlisting
    if (!isShortlisted && hackathon.roundProgress) {
      console.log('🔍 Backend - Checking individual user shortlisting for user:', userId);
      
      for (const progress of hackathon.roundProgress) {
        console.log('🔍 Backend - Checking individual round progress:', {
          roundIndex: progress.roundIndex,
          shortlistedTeams: progress.shortlistedTeams?.length || 0,
          shortlistedTeamsArray: progress.shortlistedTeams,
          userId: userId.toString()
        });
        
        if (progress.shortlistedTeams && progress.shortlistedTeams.includes(userId.toString())) {
          isShortlisted = true;
          shortlistingSource = 'hackathon_round_progress_user';
          console.log('🔍 Backend - User directly shortlisted in round progress');
          break;
        }
      }
    }

    // Method 3: Check submission status (individual submissions)
    if (!isShortlisted) {
      const Submission = require("../model/SubmissionModel");
      
      // Check for submissions shortlisted for this specific round
      const shortlistedSubmission = await Submission.findOne({
        hackathonId: hackathonId,
        submittedBy: userId,
        status: 'shortlisted',
        shortlistedForRound: roundIndex + 1 // Check for the specific round
      });
      
      if (shortlistedSubmission) {
        isShortlisted = true;
        shortlistingSource = 'submission_status';
        shortlistingDetails = {
          submissionId: shortlistedSubmission._id,
          projectTitle: shortlistedSubmission.projectTitle || shortlistedSubmission.title,
          shortlistedAt: shortlistedSubmission.shortlistedAt
        };
        console.log('🔍 Backend - User has shortlisted submission:', shortlistedSubmission._id);
      }
      
      // Also check for submissions from previous round that were shortlisted
      if (!isShortlisted && roundIndex > 0) {
        const previousRoundSubmissions = await Submission.find({
          hackathonId: hackathonId,
          submittedBy: userId,
          roundIndex: roundIndex - 1
        });
        
        if (previousRoundSubmissions.length > 0) {
          // Check if any of the user's previous round submissions are in the shortlisted submissions
          const previousRoundProgress = hackathon.roundProgress?.find(rp => rp.roundIndex === roundIndex - 1);
          if (previousRoundProgress && previousRoundProgress.shortlistedSubmissions) {
            const userSubmissionIds = previousRoundSubmissions.map(s => s._id.toString());
            const hasShortlistedSubmission = userSubmissionIds.some(id => 
              previousRoundProgress.shortlistedSubmissions.includes(id)
            );
            
            if (hasShortlistedSubmission) {
              isShortlisted = true;
              shortlistingSource = 'previous_round_submission';
              console.log('🔍 Backend - User shortlisted via previous round submission');
            }
          }
        }
      }
    }

    // Method 4: Check advanced participants (legacy support)
    if (!isShortlisted && hackathon.roundProgress) {
      for (const progress of hackathon.roundProgress) {
        if (progress.advancedParticipantIds && progress.advancedParticipantIds.includes(userId.toString())) {
          isShortlisted = true;
          shortlistingSource = 'advanced_participants';
          console.log('🔍 Backend - User in advanced participants');
          break;
        }
      }
    }

    // Check if this is the first round (everyone is eligible)
    const isFirstRound = roundIndex === 0;
    if (isFirstRound) {
      isShortlisted = true;
      shortlistingSource = 'first_round';
    }

    console.log('🔍 Backend - Final eligibility result:', { 
      isShortlisted, 
      shortlistingSource, 
      roundStarted,
      eligible: isShortlisted && roundStarted 
    });

    return res.status(200).json({
      eligible: isShortlisted && roundStarted, // Only eligible if shortlisted AND the round has started
      shortlisted: isShortlisted, // Always return shortlisting status regardless of round start
      message: isShortlisted 
        ? (roundStarted ? `You are eligible to submit to Round ${roundIndex + 1}` : `You are shortlisted for Round ${roundIndex + 1}, but Round ${roundIndex + 1} has not started yet`)
        : `Your team was not shortlisted for Round ${roundIndex + 1}`,
      roundStarted: roundStarted,
      roundStartDate: roundStartDate,
      roundIndex: roundIndex,
      shortlistingDetails,
      shortlistingSource,
      isFirstRound: isFirstRound
    });

  } catch (error) {
    console.error('🔍 Backend - Error in checkNextRoundEligibility:', error);
    return res.status(500).json({ 
      message: 'Failed to check eligibility', 
      error: error.message
    });
  }
};

// 🎯 Check and Auto-Progress to Next Round
exports.checkAndAutoProgressToNextRound = async (req, res) => {
  try {
    const { hackathonId, roundIndex = 1 } = req.params; // Default to Round 2 (index 1) for backward compatibility
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    const now = new Date();
    const roundStartDate = hackathon.rounds?.[roundIndex]?.startDate; // Round start date

    if (roundStartDate && now >= new Date(roundStartDate)) {
      // Round has started, move shortlisted submissions to this round
      const shortlistedSubmissions = await Submission.find({
        hackathonId: hackathonId,
        status: 'shortlisted',
        shortlistedForRound: roundIndex + 1
      });

      if (shortlistedSubmissions.length > 0) {
        // Update submissions to the specified round
        await Submission.updateMany(
          { _id: { $in: shortlistedSubmissions.map(s => s._id) } },
          { 
            roundIndex: roundIndex, // Move to the specified round
            status: 'submitted',
            shortlistedForRound: null // Clear shortlisting flag
          }
        );

        console.log(`🔍 Auto-progressed ${shortlistedSubmissions.length} submissions to Round ${roundIndex + 1}`);
        
        return res.status(200).json({
          progressed: true,
          count: shortlistedSubmissions.length,
          message: `Successfully progressed ${shortlistedSubmissions.length} submissions to Round ${roundIndex + 1}`
        });
      }
    }
    
    return res.status(200).json({
      progressed: false,
      count: 0,
      message: `No submissions to progress or Round ${roundIndex + 1} has not started yet`
    });
  } catch (error) {
    console.error('🔍 Error in auto-progress to next round:', error);
    return res.status(500).json({ 
      message: 'Failed to check auto-progress', 
      error: error.message 
    });
  }
};

// 🎯 Get Shortlisted Submissions
exports.getShortlistedSubmissions = async (req, res) => {
  try {
    const { hackathonId, roundIndex = 0 } = req.params;
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Get shortlisted submissions based on round progress
    let shortlistedSubmissionIds = [];
    
    console.log('🔍 getShortlistedSubmissions: Checking for round', roundIndex);
    console.log('🔍 getShortlistedSubmissions: Hackathon round progress:', hackathon.roundProgress?.length || 0);
    
    // Check round progress for shortlisted submissions
    if (hackathon.roundProgress) {
      const roundProgress = hackathon.roundProgress.find(rp => rp.roundIndex === parseInt(roundIndex));
      console.log('🔍 getShortlistedSubmissions: Found round progress:', roundProgress ? 'Yes' : 'No');
      
      if (roundProgress && roundProgress.shortlistedSubmissions) {
        shortlistedSubmissionIds = roundProgress.shortlistedSubmissions;
        console.log('🔍 getShortlistedSubmissions: Shortlisted submissions from round progress:', shortlistedSubmissionIds.length);
      }
    }
    
    // If no shortlisted submissions found in round progress, check submission status as fallback
    if (shortlistedSubmissionIds.length === 0) {
      const statusShortlisted = await Submission.find({
        hackathonId: hackathonId,
        status: 'shortlisted',
        roundIndex: parseInt(roundIndex)
      }).select('_id');
      shortlistedSubmissionIds = statusShortlisted.map(s => s._id);
    }
    
    // Get the actual submission details
    const shortlistedSubmissions = await Submission.find({
      hackathonId: hackathonId,
      _id: { $in: shortlistedSubmissionIds },
      roundIndex: parseInt(roundIndex)
    }).populate('teamId', 'name leader')
      .populate('submittedBy', 'name email')
      .lean();

    // Get scores for shortlisted submissions
    const Score = require('../model/ScoreModel');
    const scores = await Score.find({ 
      submission: { $in: shortlistedSubmissions.map(s => s._id) } 
    }).populate('judge', 'name email').lean();

    // Create a map of submission scores
    const submissionScores = {};
    scores.forEach(score => {
      if (!submissionScores[score.submission.toString()]) {
        submissionScores[score.submission.toString()] = [];
      }
      submissionScores[score.submission.toString()].push(score);
    });

    // Format shortlisted submissions with scores
    const formattedSubmissions = shortlistedSubmissions.map(submission => {
      const submissionScoresList = submissionScores[submission._id.toString()] || [];
      
      let averageScore = 0;
      let totalScore = 0;
      let scoreCount = 0;
      
      submissionScoresList.forEach(score => {
        // Convert Map to object if needed
        let scoresObject = {};
        if (score.scores && score.scores instanceof Map) {
          score.scores.forEach((value, key) => {
            scoresObject[key] = value.score;
          });
        } else if (score.scores && typeof score.scores === 'object') {
          scoresObject = score.scores;
        }
        
        const criteriaScores = Object.values(scoresObject).filter(s => typeof s === 'number');
        if (criteriaScores.length > 0) {
          const submissionScore = criteriaScores.reduce((sum, s) => sum + s, 0) / criteriaScores.length;
          totalScore += submissionScore;
          scoreCount++;
        }
      });
      
      averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

      return {
        _id: submission._id,
        projectTitle: submission.projectTitle || submission.title || 'Untitled Project',
        teamName: submission.teamName || submission.teamId?.name || 'No Team',
        leaderName: submission.submittedBy?.name || submission.submittedBy?.email || 'Unknown',
        pptFile: submission.pptFile,
        submittedAt: submission.submittedAt,
        averageScore: Math.round(averageScore * 10) / 10,
        scoreCount,
        totalScore: Math.round(totalScore * 10) / 10,
        status: submission.status,
        roundIndex: submission.roundIndex
      };
    });

    // Sort by average score (descending)
    formattedSubmissions.sort((a, b) => b.averageScore - a.averageScore);

    res.status(200).json({
      hackathon: {
        id: hackathon._id,
        title: hackathon.title,
        roundIndex: parseInt(roundIndex)
      },
      shortlistedSubmissions: formattedSubmissions,
      summary: {
        totalShortlisted: formattedSubmissions.length,
        averageScore: formattedSubmissions.length > 0 
          ? Math.round(formattedSubmissions.reduce((sum, s) => sum + s.averageScore, 0) / formattedSubmissions.length * 10) / 10
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching shortlisted submissions:', error);
    res.status(500).json({ message: 'Failed to fetch shortlisted submissions' });
  }
};

// 🎯 Get Shortlisted Submissions (Public - for participants)
exports.getShortlistedSubmissionsPublic = async (req, res) => {
  try {
    const { hackathonId, roundIndex = 0 } = req.params;
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Get shortlisted submissions - look for any shortlisted submissions regardless of roundIndex
    const shortlistedSubmissions = await Submission.find({
      hackathonId: hackathonId,
      status: 'shortlisted'
    }).populate('teamId', 'name leader')
      .populate('submittedBy', 'name email')
      .populate('projectId', 'title')
      .lean();
    
    // Get scores for shortlisted submissions
    const Score = require('../model/ScoreModel');
    const scores = await Score.find({ 
      submission: { $in: shortlistedSubmissions.map(s => s._id) } 
    }).populate('judge', 'name email').lean();

    // Create a map of submission scores
    const submissionScores = {};
    scores.forEach(score => {
      if (!submissionScores[score.submission.toString()]) {
        submissionScores[score.submission.toString()] = [];
      }
      submissionScores[score.submission.toString()].push(score);
    });



    // Format shortlisted submissions with scores
    const formattedSubmissions = shortlistedSubmissions.map(submission => {
      const submissionScoresList = submissionScores[submission._id.toString()] || [];
      
      let averageScore = 0;
      let totalScore = 0;
      let scoreCount = 0;
      

      
      submissionScoresList.forEach((score, index) => {

        
        // Convert Map to object if needed
        let scoresObject = {};
        if (score.scores && score.scores instanceof Map) {
          score.scores.forEach((value, key) => {
            if (value && typeof value === 'object' && value.score !== undefined) {
              scoresObject[key] = value.score;
            }
          });
        } else if (score.scores && typeof score.scores === 'object') {
          console.log('🔍 Scores is an object:', score.scores);
          // Handle both direct score values and nested score objects
          Object.entries(score.scores).forEach(([key, value]) => {
            if (value && typeof value === 'object' && value.score !== undefined) {
              scoresObject[key] = value.score;

            } else if (typeof value === 'number') {
              scoresObject[key] = value;

            }
          });
        }
        
        const criteriaScores = Object.values(scoresObject).filter(s => typeof s === 'number');
        if (criteriaScores.length > 0) {
          const submissionScore = criteriaScores.reduce((sum, s) => sum + s, 0) / criteriaScores.length;
          totalScore += submissionScore;
          scoreCount++;
        }
      });
      
      averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

      return {
        _id: submission._id,
        projectTitle: submission.projectId?.title || submission.projectTitle || submission.title || 'Untitled Project',
        teamName: submission.teamName || submission.teamId?.name || 'No Team',
        leaderName: submission.submittedBy?.name || submission.submittedBy?.email || 'Unknown',
        pptFile: submission.pptFile,
        submittedAt: submission.submittedAt,
        averageScore: Math.round(averageScore * 10) / 10,
        scoreCount,
        totalScore: Math.round(totalScore * 10) / 10,
        status: submission.status,
        roundIndex: submission.roundIndex
      };
    });

    // Sort by average score (descending)
    formattedSubmissions.sort((a, b) => b.averageScore - a.averageScore);

    res.status(200).json({
      hackathon: {
        id: hackathon._id,
        title: hackathon.title,
        roundIndex: parseInt(roundIndex)
      },
      shortlistedSubmissions: formattedSubmissions,
      summary: {
        totalShortlisted: formattedSubmissions.length,
        averageScore: formattedSubmissions.length > 0 
          ? Math.round(formattedSubmissions.reduce((sum, s) => sum + s.averageScore, 0) / formattedSubmissions.length * 10) / 10
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching shortlisted submissions:', error);
    res.status(500).json({ message: 'Failed to fetch shortlisted submissions' });
}
};


// Helper function to send submission assignment notification email
async function sendSubmissionAssignmentEmail(judgeEmail, judgeName, hackathon, submissions, roundName) {
  console.log('🔍 DEBUG: Starting sendSubmissionAssignmentEmail', {
    judgeEmail,
    judgeName,
    hackathonTitle: hackathon.title,
    submissionsCount: submissions.length,
    roundName,
    hasEmailCredentials: !!(process.env.MAIL_USER && process.env.MAIL_PASS)
  });

  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log('🔍 DEBUG: Email credentials not configured, skipping submission assignment notification');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    console.log('🔍 DEBUG: Email transporter created successfully');

    // Get submission details
    const Submission = require('../model/SubmissionModel');
    const submissionDetails = await Submission.find({ 
      _id: { $in: submissions } 
    }).populate('team', 'name');

    console.log('🔍 DEBUG: Fetched submission details', {
      requestedSubmissions: submissions.length,
      foundSubmissions: submissionDetails.length,
      submissionIds: submissions
    });

    const submissionList = submissionDetails.map(sub => ({
      title: sub.projectTitle || sub.title || 'Untitled Project',
      team: sub.team?.name || 'Unknown Team',
      hasPPT: !!sub.pptFile,
      submittedAt: new Date(sub.submittedAt).toLocaleDateString()
    }));

    const pptSubmissions = submissionList.filter(sub => sub.hasPPT);
    const projectSubmissions = submissionList.filter(sub => !sub.hasPPT);

    console.log('🔍 DEBUG: Processed submission list', {
      totalSubmissions: submissionList.length,
      pptSubmissions: pptSubmissions.length,
      projectSubmissions: projectSubmissions.length,
      pptSubmissionsList: pptSubmissions.map(s => ({ title: s.title, team: s.team })),
      projectSubmissionsList: projectSubmissions.map(s => ({ title: s.title, team: s.team }))
    });

    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #667eea 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">⚖️ New Submissions Assigned</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">You have new submissions to evaluate for ${hackathon.title}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${judgeName || 'Judge'}! 👋</h2>
          
          <p style="color: #555; line-height: 1.6;">
            You have been assigned <strong>${submissions.length} new submission(s)</strong> to evaluate for the <strong>${roundName}</strong> round of <strong>${hackathon.title}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #f59e0b; margin: 0 0 15px 0;">📝 Assignment Summary</h3>
            <p style="color: #666; margin: 0 0 5px 0;"><strong>Hackathon:</strong> ${hackathon.title}</p>
            <p style="color: #666; margin: 0 0 5px 0;"><strong>Round:</strong> ${roundName}</p>
            <p style="color: #666; margin: 0 0 5px 0;"><strong>Total Submissions:</strong> ${submissions.length}</p>
            <p style="color: #666; margin: 0 0 5px 0;"><strong>PPT Submissions:</strong> ${pptSubmissions.length}</p>
            <p style="color: #666; margin: 0;"><strong>Project Submissions:</strong> ${projectSubmissions.length}</p>
          </div>

          ${pptSubmissions.length > 0 ? `
            <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #0c5460; margin: 0 0 10px 0;">📊 PPT Submissions (${pptSubmissions.length})</h4>
              <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                ${pptSubmissions.map(sub => `
                  <li><strong>${sub.title}</strong> - Team: ${sub.team} (Submitted: ${sub.submittedAt})</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          ${projectSubmissions.length > 0 ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0;">💻 Project Submissions (${projectSubmissions.length})</h4>
              <ul style="color: #856404; margin: 0; padding-left: 20px;">
                ${projectSubmissions.map(sub => `
                  <li><strong>${sub.title}</strong> - Team: ${sub.team} (Submitted: ${sub.submittedAt})</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NODE_ENV === 'production' || process.env.RENDER ? (process.env.FRONTEND_URL || 'https://hackzen.vercel.app') : 'http://localhost:5173'}/judge-dashboard" style="background: linear-gradient(135deg, #f59e0b 0%, #667eea 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              🚀 Access Judge Dashboard
            </a>
          </div>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">📝 Evaluation Guidelines:</h4>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>Review each submission thoroughly before scoring</li>
              <li>Consider innovation, technical implementation, and presentation quality</li>
              <li>Provide constructive feedback to help teams improve</li>
              <li>Ensure fair and consistent evaluation across all submissions</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            Thank you for your contribution to making this hackathon a success!
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 HackZen. All rights reserved.</p>
        </div>
      </div>
    `;

    console.log('🔍 DEBUG: Email template generated, sending email to:', judgeEmail);

    await transporter.sendMail({
      from: `"HackZen Team" <${process.env.MAIL_USER}>`,
      to: judgeEmail,
      subject: `⚖️ New Submissions Assigned - ${hackathon.title} (${roundName})`,
      html: emailTemplate
    });

    console.log(`✅ Submission assignment notification sent successfully to ${judgeEmail}`);
  } catch (emailError) {
    console.error('❌ Submission assignment email sending failed:', emailError);
    console.error('❌ Email error details:', {
      judgeEmail,
      judgeName,
      hackathonTitle: hackathon.title,
      submissionsCount: submissions.length,
      error: emailError.message,
      stack: emailError.stack
    });
  }
}

// 🎯 Send shortlisting notifications to participants
exports.sendShortlistingNotifications = async function(hackathon, shortlistedTeams, shortlistedSubmissions, mode) {
  try {
    // Check email configuration
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.error('🔍 Backend - Email configuration missing:', {
        MAIL_USER: process.env.MAIL_USER ? 'Set' : 'Missing',
        MAIL_PASS: process.env.MAIL_PASS ? 'Set' : 'Missing'
      });
      throw new Error('Email configuration not set. Please configure MAIL_USER and MAIL_PASS environment variables.');
    }
    
    const User = require('../model/UserModel');
    const Team = require('../model/TeamModel');
    const Submission = require('../model/SubmissionModel');
    
    // Get shortlisted submissions to identify shortlisted participants
    const shortlistedSubs = await Submission.find({
      hackathonId: hackathon._id,
      status: 'shortlisted',
      $or: [
        { roundIndex: 1 }, // Round 1 submissions
        { roundIndex: 0 }, // Many submissions are in round 0
        { roundIndex: { $exists: false } } // Some submissions have no roundIndex
      ]
    }).populate('submittedBy', 'name email')
      .populate('teamId', 'name members')
      .lean();

    // Get non-shortlisted submissions to identify non-shortlisted participants
    const nonShortlistedSubs = await Submission.find({
      hackathonId: hackathon._id,
      status: { $ne: 'shortlisted' },
      $or: [
        { roundIndex: 1 }, // Round 1 submissions
        { roundIndex: 0 }, // Many submissions are in round 0
        { roundIndex: { $exists: false } } // Some submissions have no roundIndex
      ]
    }).populate('submittedBy', 'name email')
      .populate('teamId', 'name members')
      .lean();

    // Get shortlisted participants
    const shortlistedParticipants = new Set();
    const shortlistedParticipantDetails = new Map();

    shortlistedSubs.forEach(submission => {
      if (submission.teamId) {
        // Team submission - add all team members
        submission.teamId.members.forEach(memberId => {
          shortlistedParticipants.add(memberId.toString());
        });
        shortlistedParticipantDetails.set(submission.teamId._id.toString(), {
          type: 'team',
          name: submission.teamId.name,
          submissionTitle: submission.projectTitle || submission.title,
          submissionType: submission.pptFile ? 'PPT' : 'Project'
        });
      } else if (submission.submittedBy) {
        // Individual submission
        shortlistedParticipants.add(submission.submittedBy._id.toString());
        shortlistedParticipantDetails.set(submission.submittedBy._id.toString(), {
          type: 'individual',
          name: submission.submittedBy.name || submission.submittedBy.email,
          submissionTitle: submission.projectTitle || submission.title,
          submissionType: submission.pptFile ? 'PPT' : 'Project'
        });
      }
    });

    // Get non-shortlisted participants
    const nonShortlistedParticipants = new Set();
    const nonShortlistedParticipantDetails = new Map();

    nonShortlistedSubs.forEach(submission => {
      if (submission.teamId) {
        // Team submission - add all team members
        submission.teamId.members.forEach(memberId => {
          nonShortlistedParticipants.add(memberId.toString());
        });
        nonShortlistedParticipantDetails.set(submission.teamId._id.toString(), {
          type: 'team',
          name: submission.teamId.name,
          submissionTitle: submission.projectTitle || submission.title,
          submissionType: submission.pptFile ? 'PPT' : 'Project'
        });
      } else if (submission.submittedBy) {
        // Individual submission
        nonShortlistedParticipants.add(submission.submittedBy._id.toString());
        nonShortlistedParticipantDetails.set(submission.submittedBy._id.toString(), {
          type: 'individual',
          name: submission.submittedBy.name || submission.submittedBy.email,
          submissionTitle: submission.projectTitle || submission.title,
          submissionType: submission.pptFile ? 'PPT' : 'Project'
        });
      }
    });

    // Get user details for shortlisted participants
    const shortlistedUsers = await User.find({ 
      _id: { $in: Array.from(shortlistedParticipants) } 
    }).select('name email').lean();

    // Get user details for non-shortlisted participants
    const nonShortlistedUsers = await User.find({ 
      _id: { $in: Array.from(nonShortlistedParticipants) } 
    }).select('name email').lean();

    const shortlistedUserMap = new Map(shortlistedUsers.map(user => [user._id.toString(), user]));
    const nonShortlistedUserMap = new Map(nonShortlistedUsers.map(user => [user._id.toString(), user]));

    console.log('🔍 Backend - Email sending results:');
    console.log(`  - Shortlisted participants: ${shortlistedParticipants.size}`);
    console.log(`  - Non-shortlisted participants: ${nonShortlistedParticipants.size}`);
    
    // Send emails to shortlisted participants
    for (const participantId of shortlistedParticipants) {
      const user = shortlistedUserMap.get(participantId);
      if (user && user.email) {
        console.log(`🔍 Backend - Sending shortlisted email to: ${user.email}`);
        await exports.sendShortlistedEmail(user.email, user.name, hackathon, shortlistedParticipantDetails.get(participantId), mode);
      }
    }

    // Send emails to non-shortlisted participants
    for (const participantId of nonShortlistedParticipants) {
      const user = nonShortlistedUserMap.get(participantId);
      if (user && user.email) {
        console.log(`🔍 Backend - Sending not shortlisted email to: ${user.email}`);
        await exports.sendNotShortlistedEmail(user.email, user.name, hackathon, nonShortlistedParticipantDetails.get(participantId));
      }
    }

    console.log(`✅ Shortlisting notifications sent: ${shortlistedParticipants.size} selected, ${nonShortlistedParticipants.size} not selected`);
  } catch (error) {
    console.error('❌ Error sending shortlisting notifications:', error);
    throw error;
  }
}

// 🎯 Send email to shortlisted participants
exports.sendShortlistedEmail = async function(userEmail, userName, hackathon, participantDetail, mode) {
  try {
    const transporter = require('../config/mailer');
    
    const round2StartDate = hackathon.rounds && hackathon.rounds.length > 1 ? hackathon.rounds[1].startDate : null;
    const round2EndDate = hackathon.rounds && hackathon.rounds.length > 1 ? hackathon.rounds[1].endDate : null;

    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been selected for Round 2 of ${hackathon.title}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${userName || 'Participant'}! 🚀</h2>
          
          <p style="color: #555; line-height: 1.6;">
            <strong>🎉 Congratulations!</strong> You have been <strong>SELECTED FOR ROUND 2</strong> of <strong>${hackathon.title}</strong>!
          </p>
          
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 15px 0;">🏆 Selection Details</h3>
            <p style="color: #065f46; margin: 0 0 5px 0;"><strong>Hackathon:</strong> ${hackathon.title}</p>
            <p style="color: #065f46; margin: 0 0 5px 0;"><strong>Team/Individual:</strong> ${participantDetail.name}</p>
            <p style="color: #065f46; margin: 0 0 5px 0;"><strong>Submission:</strong> ${participantDetail.submissionTitle}</p>
            <p style="color: #065f46; margin: 0 0 5px 0;"><strong>Type:</strong> ${participantDetail.submissionType}</p>
            <p style="color: #065f46; margin: 0;"><strong>Selection Method:</strong> ${getSelectionMethodText(mode)}</p>
          </div>

          ${round2StartDate && round2EndDate ? `
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0;">📅 Round 2 Schedule</h3>
              <p style="color: #1e40af; margin: 0 0 5px 0;"><strong>Start Date:</strong> ${new Date(round2StartDate).toLocaleDateString()}</p>
              <p style="color: #1e40af; margin: 0;"><strong>End Date:</strong> ${new Date(round2EndDate).toLocaleDateString()}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NODE_ENV === 'production' || process.env.RENDER ? (process.env.FRONTEND_URL || 'https://hackzen.vercel.app') : 'http://localhost:5173'}/dashboard/hackathons/${hackathon._id}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              🎯 Go to Hackathon
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">📝 Next Steps:</h4>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>Prepare your Round 2 submission</li>
              <li>Review the problem statements for Round 2</li>
              <li>Submit your project before the deadline</li>
              <li>Stay updated with announcements</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            Good luck with Round 2! We're excited to see what you'll create next.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 HackZen. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"HackZen Team" <${process.env.MAIL_USER}>`,
      to: userEmail,
      subject: `🎉 Congratulations! You're Selected for Round 2 - ${hackathon.title}`,
      html: emailTemplate
    });

    console.log(`✅ Shortlisted notification sent to ${userEmail}`);
  } catch (emailError) {
    console.error('❌ Shortlisted email sending failed:', emailError);
  }
}

// 🎯 Send email to non-shortlisted participants
exports.sendNotShortlistedEmail = async function(userEmail, userName, hackathon, participantDetail) {
  try {
    const transporter = require('../config/mailer');
    
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">📋 Round 2 Selection Update</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for participating in ${hackathon.title}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${userName || 'Participant'}! 👋</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Thank you for your participation in <strong>Round 1</strong> of <strong>${hackathon.title}</strong>. After careful evaluation, we regret to inform you that <strong>you are NOT SHORTLISTED FOR ROUND 2</strong>.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">📊 Round 1 Summary</h3>
            <p style="color: #374151; margin: 0 0 5px 0;"><strong>Hackathon:</strong> ${hackathon.title}</p>
            <p style="color: #374151; margin: 0 0 5px 0;"><strong>Team/Individual:</strong> ${participantDetail.name}</p>
            <p style="color: #374151; margin: 0 0 5px 0;"><strong>Submission:</strong> ${participantDetail.submissionTitle}</p>
            <p style="color: #374151; margin: 0;"><strong>Type:</strong> ${participantDetail.submissionType}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">💡 What's Next:</h4>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>Keep an eye on future hackathons</li>
              <li>Continue building and improving your skills</li>
              <li>Join our community for updates and opportunities</li>
              <li>Consider participating in other events</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            Thank you for being part of our hackathon community. We hope to see you in future events!
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 HackZen. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"HackZen Team" <${process.env.MAIL_USER}>`,
      to: userEmail,
      subject: `📋 Round 2 Selection Update - ${hackathon.title}`,
      html: emailTemplate
    });

    console.log(`✅ Not shortlisted notification sent to ${userEmail}`);
  } catch (emailError) {
    console.error('❌ Not shortlisted email sending failed:', emailError);
  }
}

// 🎯 Helper function to get selection method text
function getSelectionMethodText(mode) {
  switch (mode) {
    case 'topN':
      return 'Top N Projects Selection';
    case 'threshold':
      return 'Score Threshold Selection';
    case 'date':
      return 'Round 1 End Date Selection';
    default:
      return 'Manual Selection';
  }
}

// 🎯 Create timeline notifications for shortlisting
exports.createShortlistingNotifications = async function(hackathon, shortlistedTeams, shortlistedSubmissions, mode, roundIndex = 0) {
  try {
    const User = require('../model/UserModel');
    const Team = require('../model/TeamModel');
    const Submission = require('../model/SubmissionModel');
    const Notification = require('../model/NotificationModel');
    
    // Get shortlisted submissions to identify shortlisted participants
    const shortlistedSubs = await Submission.find({
      hackathonId: hackathon._id,
      status: 'shortlisted',
      $or: [
        { roundIndex: 1 }, // Round 1 submissions
        { roundIndex: 0 }, // Many submissions are in round 0
        { roundIndex: { $exists: false } } // Some submissions have no roundIndex
      ]
    }).populate('submittedBy', 'name email')
      .populate('teamId', 'name members')
      .lean();

    // Get non-shortlisted submissions to identify non-shortlisted participants
    const nonShortlistedSubs = await Submission.find({
      hackathonId: hackathon._id,
      status: { $ne: 'shortlisted' },
      $or: [
        { roundIndex: 1 }, // Round 1 submissions
        { roundIndex: 0 }, // Many submissions are in round 0
        { roundIndex: { $exists: false } } // Some submissions have no roundIndex
      ]
    }).populate('submittedBy', 'name email')
      .populate('teamId', 'name members')
      .lean();

    // Get shortlisted participants
    const shortlistedParticipants = new Set();
    const shortlistedParticipantDetails = new Map();

    // Process shortlisted submissions
    for (const submission of shortlistedSubs) {
      if (submission.teamId) {
        // Team submission
        const teamMembers = submission.teamId.members || [];
        teamMembers.forEach(memberId => {
          shortlistedParticipants.add(memberId.toString());
          shortlistedParticipantDetails.set(memberId.toString(), {
            name: submission.teamId.name || 'Team',
            submissionTitle: submission.projectTitle || submission.title || 'Project',
            submissionType: 'Team Project',
            shortlistedAt: submission.shortlistedAt
          });
        });
      } else if (submission.submittedBy) {
        // Individual submission
        shortlistedParticipants.add(submission.submittedBy._id.toString());
        shortlistedParticipantDetails.set(submission.submittedBy._id.toString(), {
          name: submission.submittedBy.name || 'Participant',
          submissionTitle: submission.projectTitle || submission.title || 'Project',
          submissionType: 'Individual Project',
          shortlistedAt: submission.shortlistedAt
        });
      }
    }

    // Get non-shortlisted participants
    const nonShortlistedParticipants = new Set();
    const nonShortlistedParticipantDetails = new Map();

    // Process non-shortlisted submissions
    for (const submission of nonShortlistedSubs) {
      if (submission.teamId) {
        // Team submission
        const teamMembers = submission.teamId.members || [];
        teamMembers.forEach(memberId => {
          // Only add if not already shortlisted
          if (!shortlistedParticipants.has(memberId.toString())) {
            nonShortlistedParticipants.add(memberId.toString());
            nonShortlistedParticipantDetails.set(memberId.toString(), {
              name: submission.teamId.name || 'Team',
              submissionTitle: submission.projectTitle || submission.title || 'Project',
              submissionType: 'Team Project'
            });
          }
        });
      } else if (submission.submittedBy) {
        // Individual submission
        if (!shortlistedParticipants.has(submission.submittedBy._id.toString())) {
          nonShortlistedParticipants.add(submission.submittedBy._id.toString());
          nonShortlistedParticipantDetails.set(submission.submittedBy._id.toString(), {
            name: submission.submittedBy.name || 'Participant',
            submissionTitle: submission.projectTitle || submission.title || 'Project',
            submissionType: 'Individual Project'
          });
        }
      }
    }

    // Create notifications for shortlisted participants
    const shortlistedNotifications = [];
    for (const participantId of shortlistedParticipants) {
      const participantDetail = shortlistedParticipantDetails.get(participantId);
      if (participantDetail) {
        shortlistedNotifications.push({
          recipient: participantId,
          message: `🎉 Congratulations! You have been selected for Round ${roundIndex + 2} of ${hackathon.title}. Your project "${participantDetail.submissionTitle}" has been shortlisted. You can now submit a new project for Round ${roundIndex + 2}.`,
          type: 'success',
          hackathon: hackathon._id,
          createdAt: new Date()
        });
      }
    }

    // Create notifications for non-shortlisted participants
    const nonShortlistedNotifications = [];
    for (const participantId of nonShortlistedParticipants) {
      const participantDetail = nonShortlistedParticipantDetails.get(participantId);
      if (participantDetail) {
        nonShortlistedNotifications.push({
          recipient: participantId,
          message: `📋 Round ${roundIndex + 2} Selection Update: Thank you for participating in Round ${roundIndex + 1} of ${hackathon.title}. After careful evaluation, you are not shortlisted for Round ${roundIndex + 2}. Keep an eye on future hackathons!`,
          type: 'info',
          hackathon: hackathon._id,
          createdAt: new Date()
        });
      }
    }

    // Insert all notifications
    if (shortlistedNotifications.length > 0) {
      await Notification.insertMany(shortlistedNotifications);
      console.log(`✅ Created ${shortlistedNotifications.length} shortlisted notifications`);
    }

    if (nonShortlistedNotifications.length > 0) {
      await Notification.insertMany(nonShortlistedNotifications);
      console.log(`✅ Created ${nonShortlistedNotifications.length} non-shortlisted notifications`);
    }

    console.log(`✅ Timeline notifications created: ${shortlistedParticipants.size} selected, ${nonShortlistedParticipants.size} not selected`);
  } catch (error) {
    console.error('❌ Error creating shortlisting notifications:', error);
    throw error;
  }
}

// 🎯 Get shortlisting notifications for a participant
exports.getShortlistingNotifications = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.user._id;
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Get notifications related to this hackathon and user
    const Notification = require('../model/NotificationModel');
    const notifications = await Notification.find({
      recipient: userId,
      hackathon: hackathonId,
      $or: [
        { message: { $regex: /selected for Round/i } },
        { message: { $regex: /not shortlisted for Round/i } },
        { message: { $regex: /Round.*Selection Update/i } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    res.status(200).json({
      notifications,
      hackathon: {
        id: hackathon._id,
        title: hackathon.title
      }
    });

  } catch (error) {
    console.error('Error fetching shortlisting notifications:', error);
    res.status(500).json({ message: 'Failed to fetch shortlisting notifications' });
  }
};

// 🎯 Debug endpoint to check shortlisting data
exports.debugShortlistingData = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Get all submissions for this hackathon
    const Submission = require("../model/SubmissionModel");
    const allSubmissions = await Submission.find({ hackathonId }).populate('submittedBy', 'name email').populate('teamId', 'name members');

    // Get all teams for this hackathon
    const Team = require("../model/TeamModel");
    const allTeams = await Team.find({ hackathon: hackathonId, status: 'active' });

    // Check shortlisted submissions
    const shortlistedSubmissions = allSubmissions.filter(sub => sub.status === 'shortlisted');
    const nonShortlistedSubmissions = allSubmissions.filter(sub => sub.status !== 'shortlisted');

    // Check round progress data
    const roundProgress = hackathon.roundProgress || [];

    res.status(200).json({
      hackathon: {
        id: hackathon._id,
        title: hackathon.title,
        rounds: hackathon.rounds,
        roundProgress: roundProgress
      },
      submissions: {
        total: allSubmissions.length,
        shortlisted: shortlistedSubmissions.length,
        nonShortlisted: nonShortlistedSubmissions.length,
        shortlistedDetails: shortlistedSubmissions.map(sub => ({
          id: sub._id,
          status: sub.status,
          shortlistedForRound: sub.shortlistedForRound,
          submittedBy: sub.submittedBy?.name || sub.submittedBy?.email,
          teamName: sub.teamId?.name,
          projectTitle: sub.projectTitle || sub.title
        })),
        nonShortlistedDetails: nonShortlistedSubmissions.map(sub => ({
          id: sub._id,
          status: sub.status,
          submittedBy: sub.submittedBy?.name || sub.submittedBy?.email,
          teamName: sub.teamId?.name,
          projectTitle: sub.projectTitle || sub.title
        }))
      },
      teams: {
        total: allTeams.length,
        details: allTeams.map(team => ({
          id: team._id,
          name: team.name,
          members: team.members,
          status: team.status
        }))
      }
    });

  } catch (error) {
    console.error('Error in debugShortlistingData:', error);
    res.status(500).json({ message: 'Failed to fetch debug data', error: error.message });
  }
};

// 🏆 Assign Winners for Round 2
exports.assignWinners = async (req, res) => {
  try {
    console.log('🔍 Backend - assignWinners called with:', { 
      params: req.params, 
      body: req.body,
      userId: req.user.id 
    });
    
    const { hackathonId, roundIndex } = req.params; // No default - must be specified
    const { winnerCount = 3, mode = 'topN', threshold, winnerIds, problemStatement } = req.body; // topN, threshold, or manual
    
    console.log('🔍 Backend - Parsed parameters:', { hackathonId, roundIndex, winnerCount, mode, threshold, winnerIds });
    
    // Validate required parameters
    if (mode === 'threshold' && !threshold) {
      return res.status(400).json({ message: 'Threshold value is required for threshold mode' });
    }
    
    if (mode === 'manual' && (!winnerIds || winnerIds.length === 0)) {
      return res.status(400).json({ message: 'Winner IDs are required for manual mode' });
    }
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can assign winners' });
    }

    // Verify this is the final round (winner assignment round)
    const roundIndexNum = parseInt(roundIndex);
    const totalRounds = hackathon.rounds ? hackathon.rounds.length : 0;
    const isFinalRound = roundIndexNum === totalRounds - 1;
    
    if (!isFinalRound) {
      return res.status(400).json({ 
        message: `Winner assignment is only available for the final round (Round ${totalRounds}). Current round: ${roundIndexNum + 1}` 
      });
    }

    // Check if winners have already been assigned
    const existingWinners = await Submission.find({ 
      hackathonId: hackathonId, 
      roundIndex: roundIndexNum,
      status: 'winner' 
    });
    
    const isReassignment = existingWinners.length > 0;
    console.log('🔍 Backend - Winner assignment type:', isReassignment ? 'Reassignment' : 'Initial assignment');
    console.log('🔍 Backend - Existing winners found:', existingWinners.length);

    // Get final round submissions with combined scores
    let submissions = await Submission.find({ 
      hackathonId: hackathonId, 
      roundIndex: roundIndexNum // Only final round submissions
    }).populate('teamId', 'name leader')
      .populate('submittedBy', 'name email')
      .populate('projectId', 'title')
      .lean();

    // Filter by problem statement if specified
    if (problemStatement && problemStatement !== 'All') {
      submissions = submissions.filter(submission => 
        submission.problemStatement === problemStatement
      );
      console.log('🔍 Backend - Filtered submissions by problem statement:', {
        problemStatement,
        totalSubmissions: submissions.length
      });
    }

    if (submissions.length === 0) {
          console.log(`🔍 Backend - No final round (${roundIndexNum}) submissions found`);
    return res.status(400).json({ message: `No final round submissions found for winner assignment` });
  }

  console.log(`🔍 Backend - Found final round (${roundIndexNum}) submissions:`, submissions.length);
  console.log('🔍 Backend - Submission IDs:', submissions.map(s => s._id));
  console.log('🔍 Backend - Sample submission:', submissions[0] ? {
    id: submissions[0]._id,
    projectId: submissions[0].projectId,
    teamId: submissions[0].teamId,
    submittedBy: submissions[0].submittedBy,
    status: submissions[0].status
  } : 'No submissions');

  // Get all scores for final round submissions
  const Score = require('../model/ScoreModel');
  const finalRoundScores = await Score.find({ 
    submission: { $in: submissions.map(s => s._id) } 
  }).populate('judge', 'name email').lean();

  // Get previous round submissions for combined scoring (if not first round)
  let previousRoundSubmissions = [];
  let previousRoundScores = [];
  
  if (roundIndexNum > 0) {
    previousRoundSubmissions = await Submission.find({
      hackathonId: hackathonId,
      roundIndex: roundIndexNum - 1
    }).populate('teamId', 'name leader').lean();

    previousRoundScores = await Score.find({ 
      submission: { $in: previousRoundSubmissions.map(s => s._id) } 
    }).populate('judge', 'name email').lean();
  }

    // Create maps for scoring
    const finalRoundSubmissionScores = {};
    finalRoundScores.forEach(score => {
      if (!finalRoundSubmissionScores[score.submission.toString()]) {
        finalRoundSubmissionScores[score.submission.toString()] = [];
      }
      finalRoundSubmissionScores[score.submission.toString()].push(score);
    });

    const previousRoundTeamScores = {};
    if (roundIndexNum > 0) {
      previousRoundSubmissions.forEach(submission => {
        const teamId = submission.teamId?._id?.toString() || submission.submittedBy?._id?.toString();
        if (teamId) {
          const submissionScores = previousRoundScores.filter(s => s.submission.toString() === submission._id.toString());
          if (submissionScores.length > 0) {
            previousRoundTeamScores[teamId] = submissionScores;
          }
        }
      });
    }

    // Calculate combined scores for final round
    const leaderboard = submissions.map(submission => {
      const submissionScoresList = finalRoundSubmissionScores[submission._id.toString()] || [];
      
      // Calculate final round score
      let finalRoundScore = 0;
      let finalRoundScoreCount = 0;
      
      submissionScoresList.forEach(score => {
        let totalCriteriaScore = 0;
        let criteriaCount = 0;
        
        if (score.scores && score.scores instanceof Map) {
          score.scores.forEach((value, key) => {
            if (value && typeof value.score === 'number') {
              totalCriteriaScore += value.score;
              criteriaCount++;
            }
          });
        } else if (score.scores && typeof score.scores === 'object') {
          Object.values(score.scores).forEach(value => {
            if (value && typeof value.score === 'number') {
              totalCriteriaScore += value.score;
              criteriaCount++;
            } else if (typeof value === 'number') {
              totalCriteriaScore += value;
              criteriaCount++;
            }
          });
        }
        
        if (criteriaCount > 0) {
          const submissionScore = totalCriteriaScore / criteriaCount;
          finalRoundScore += submissionScore;
          finalRoundScoreCount++;
        } else if (score.totalScore && typeof score.totalScore === 'number') {
          finalRoundScore += score.totalScore;
          finalRoundScoreCount++;
        }
      });
      
      finalRoundScore = finalRoundScoreCount > 0 ? finalRoundScore / finalRoundScoreCount : 0;
      
      // Calculate previous round score (if exists)
      let previousRoundScore = 0;
      const teamId = submission.teamId?._id?.toString() || submission.submittedBy?._id?.toString();
      const previousRoundTeamScoresList = previousRoundTeamScores[teamId] || [];
      
      if (previousRoundTeamScoresList.length > 0) {
        let previousRoundTotalScore = 0;
        let previousRoundScoreCount = 0;
        
        previousRoundTeamScoresList.forEach(score => {
          let totalCriteriaScore = 0;
          let criteriaCount = 0;
          
          if (score.scores && score.scores instanceof Map) {
            score.scores.forEach((value, key) => {
              if (value && typeof value.score === 'number') {
                totalCriteriaScore += value.score;
                criteriaCount++;
              }
            });
          } else if (score.scores && typeof score.scores === 'object') {
            Object.values(score.scores).forEach(value => {
              if (value && typeof value.score === 'number') {
                totalCriteriaScore += value.score;
                criteriaCount++;
              } else if (typeof value === 'number') {
                totalCriteriaScore += value;
                criteriaCount++;
              }
            });
          }
          
          if (criteriaCount > 0) {
            const submissionScore = totalCriteriaScore / criteriaCount;
            previousRoundTotalScore += submissionScore;
            previousRoundScoreCount++;
          } else if (score.totalScore && typeof score.totalScore === 'number') {
            previousRoundTotalScore += score.totalScore;
            previousRoundScoreCount++;
          }
        });
        
        previousRoundScore = previousRoundScoreCount > 0 ? previousRoundTotalScore / previousRoundScoreCount : 0;
      }
      
      // Calculate combined score: (Previous Round Score + Final Round Score) / 2
      const combinedScore = roundIndexNum > 0 ? (previousRoundScore + finalRoundScore) / 2 : finalRoundScore;
      
              return {
          _id: submission._id,
          projectTitle: submission.projectId?.title || submission.teamName || 'Untitled Project',
          teamName: submission.teamName || submission.teamId?.name || 'No Team',
          leaderName: submission.submittedBy?.name || submission.submittedBy?.email || 'Unknown',
          previousRoundScore: roundIndexNum > 0 ? Math.round(previousRoundScore * 10) / 10 : null,
          finalRoundScore: Math.round(finalRoundScore * 10) / 10,
          combinedScore: Math.round(combinedScore * 10) / 10,
          status: submission.status,
          roundIndex: submission.roundIndex
        };
    });

    // Sort by combined score (descending)
    leaderboard.sort((a, b) => b.combinedScore - a.combinedScore);

    console.log('🔍 Backend - Calculated leaderboard with', leaderboard.length, 'entries');
    console.log('🔍 Backend - Top 5 leaderboard entries:', leaderboard.slice(0, 5).map(entry => ({
      id: entry._id,
      title: entry.projectTitle,
      combinedScore: entry.combinedScore
    })));

    // Determine winners based on mode
    let winners = [];
    
    if (mode === 'topN') {
      winners = leaderboard.slice(0, winnerCount);
    } else if (mode === 'threshold') {
      const thresholdValue = threshold || 7.0;
      winners = leaderboard.filter(entry => entry.combinedScore >= thresholdValue);
    } else if (mode === 'manual') {
      const manualWinnerIds = winnerIds || [];
      winners = leaderboard.filter(entry => manualWinnerIds.includes(entry._id.toString()));
    } else {
      return res.status(400).json({ message: 'Invalid winner assignment mode. Use "topN", "threshold", or "manual"' });
    }

    if (winners.length === 0) {
      console.log('🔍 Backend - No winners found with criteria');
      return res.status(400).json({ message: 'No winners found with the specified criteria' });
    }

    console.log('🔍 Backend - Selected winners:', winners.length);
    console.log('🔍 Backend - Winner details:', winners.map(w => ({
      id: w._id,
      title: w.projectTitle,
      combinedScore: w.combinedScore
    })));

    // First, reset all previous winners to 'submitted' status
    console.log('🔍 Backend - Resetting previous winners...');
    const resetPreviousWinners = await Submission.updateMany(
      { 
        hackathonId: hackathonId, 
        roundIndex: 1,
        status: 'winner' 
      },
      { status: 'submitted' }
    );
    console.log('🔍 Backend - Reset previous winners:', resetPreviousWinners.modifiedCount);

    // Clear previous winner notifications if this is a reassignment
    if (isReassignment) {
      try {
        const Notification = require('../model/NotificationModel');
        const deletedNotifications = await Notification.deleteMany({
          hackathon: hackathonId,
          message: { $regex: /Congratulations.*won/ },
          type: 'success'
        });
        console.log('🔍 Backend - Cleared previous winner notifications:', deletedNotifications.deletedCount);
      } catch (notificationError) {
        console.error('🔍 Backend - Error clearing previous notifications:', notificationError);
      }
    }

    // Save scores for all participants in the leaderboard
    console.log('🔍 Backend - Saving scores for all participants...');
    const scoreUpdatePromises = leaderboard.map(async (entry) => {
      const submission = await Submission.findById(entry._id);
      if (submission) {
        submission.pptScore = entry.pptScore;
        submission.projectScore = entry.projectScore;
        submission.combinedScore = entry.combinedScore;
        return submission.save();
      }
    });

    await Promise.all(scoreUpdatePromises);
    console.log('🔍 Backend - Saved scores for', leaderboard.length, 'participants');

    // Update submission statuses to 'winner' for new winners
    const updatePromises = winners.map(async (winner) => {
      const submission = await Submission.findById(winner._id);
      if (submission) {
        submission.status = 'winner';
        // Find the problemStatement for this winner (if provided)
        if (req.body.winners && Array.isArray(req.body.winners)) {
          const found = req.body.winners.find(w => w.id === String(submission._id));
          if (found && found.problemStatement) {
            submission.problemStatement = found.problemStatement;
          }
        }
        return submission.save();
      }
    });

    await Promise.all(updatePromises);

    console.log('🔍 Backend - Updated submission statuses');

    // Create notifications for winners (without emails - emails will be sent manually)
    try {
      const Notification = require('../model/NotificationModel');
      
      // Create notifications for winners
      for (const winner of winners) {
        const submission = await Submission.findById(winner._id)
          .populate('submittedBy', 'name')
          .populate('teamId', 'name members');
        
        if (submission) {
          if (submission.teamId) {
            // For team submissions, notify all team members
            const teamMembers = submission.teamId.members || [];
            for (const memberId of teamMembers) {
              await Notification.create({
                recipient: memberId,
                message: `🏆 Congratulations! Your team "${submission.teamId.name}" has won ${hackathon.title}! Your combined score: ${winner.combinedScore}/10 (PPT: ${winner.pptScore}/10, Project: ${winner.projectScore}/10)`,
                type: 'success',
                hackathon: hackathon._id,
                createdAt: new Date()
              });
            }
          } else if (submission.submittedBy) {
            // For individual submissions
            await Notification.create({
              recipient: submission.submittedBy._id,
              message: `🏆 Congratulations! You have won ${hackathon.title}! Your combined score: ${winner.combinedScore}/10 (PPT: ${winner.pptScore}/10, Project: ${winner.projectScore}/10)`,
              type: 'success',
              hackathon: hackathon._id,
              createdAt: new Date()
            });
          }
        }
      }
    } catch (notificationError) {
      console.error('🔍 Backend - Error creating winner notifications:', notificationError);
      // Don't fail the request if notification fails
    }

    console.log('🔍 Backend - Winners assigned successfully:', winners.length);
    console.log('🔍 Backend - Emails will be sent manually via the email sending feature');

    res.status(200).json({
      message: isReassignment 
        ? `Successfully reassigned ${winners.length} winners (replaced ${existingWinners.length} previous winners). Emails can be sent manually.`
        : `Successfully assigned ${winners.length} winners. Emails can be sent manually.`,
      winners: winners.map(winner => {
        // Find the problemStatement for this winner (if provided)
        let problemStatement = undefined;
        if (req.body.winners && Array.isArray(req.body.winners)) {
          const found = req.body.winners.find(w => w.id === String(winner._id));
          if (found && found.problemStatement) {
            problemStatement = found.problemStatement;
          }
        }
        return {
          _id: winner._id,
          projectTitle: winner.projectTitle,
          teamName: winner.teamName,
          leaderName: winner.leaderName,
          pptScore: winner.pptScore,
          projectScore: winner.projectScore,
          combinedScore: winner.combinedScore,
          problemStatement, // <-- add this
        };
      }),
      mode,
      winnerCount: winners.length,
      isReassignment,
      previousWinnerCount: existingWinners.length,
      assignedAt: new Date()
    });

  } catch (error) {
    console.error('🔍 Backend - Error assigning winners:', error);
    console.error('🔍 Backend - Error stack:', error.stack);
    console.error('🔍 Backend - Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ message: 'Failed to assign winners', error: error.message });
  }
};

// 📧 Send Winner Emails Manually
exports.sendWinnerEmails = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { includeShortlisted = false } = req.body;
    
    console.log('🔍 Backend - Manual email sending requested for hackathon:', hackathonId);
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can send winner emails' });
    }

    // Get current winners
    const winners = await Submission.find({ 
      hackathonId: hackathonId, 
      roundIndex: 1,
      status: 'winner' 
    }).populate('teamId', 'name members')
      .populate('submittedBy', 'name email')
      .populate('projectId', 'title')
      .lean();

    if (winners.length === 0) {
      return res.status(400).json({ message: 'No winners found to send emails to' });
    }

    // Prepare winners data for email with scores from database
    const winnersForEmail = winners.map((winner, index) => ({
      _id: winner._id,
      projectTitle: winner.projectId?.title || winner.teamName || 'Untitled Project',
      teamName: winner.teamName || winner.teamId?.name || 'No Team',
      leaderName: winner.submittedBy?.name || winner.submittedBy?.email || 'Unknown',
      pptScore: winner.pptScore || 0,
      projectScore: winner.projectScore || 0,
      combinedScore: winner.combinedScore || 0,
      position: index + 1
    }));

    // Prepare complete hackathon data for email templates
    const hackathonDataForEmail = {
      ...hackathon.toObject(),
      winners: winnersForEmail
    };

    console.log('🔍 Backend - Sending emails to', winnersForEmail.length, 'winners');

    // Send bulk winner emails
    const emailService = require('../services/emailService');
    const emailResult = await emailService.sendBulkWinnerEmails(winnersForEmail, hackathonDataForEmail);
    
    console.log('🔍 Backend - Winner emails sent:', emailResult);

    // Send emails to shortlisted participants if requested
    let shortlistedEmailResult = null;
    if (includeShortlisted) {
      try {
        // Get all shortlisted participants who didn't win
        const shortlistedParticipants = await Submission.find({
          hackathonId: hackathonId,
          roundIndex: 1,
          status: 'shortlisted'
        }).populate('teamId', 'name members')
          .populate('submittedBy', 'name email')
          .populate('projectId', 'title')
          .lean();

        const shortlistedForEmail = shortlistedParticipants.map(participant => ({
          _id: participant._id,
          projectTitle: participant.projectId?.title || participant.teamName || 'Untitled Project',
          teamName: participant.teamName || participant.teamId?.name || 'No Team',
          leaderName: participant.submittedBy?.name || participant.submittedBy?.email || 'Unknown',
          pptScore: participant.pptScore || 0,
          projectScore: participant.projectScore || 0,
          combinedScore: participant.combinedScore || 0
        }));

        if (shortlistedForEmail.length > 0) {
          console.log('🔍 Backend - Sending emails to shortlisted participants:', shortlistedForEmail.length);
          
          const hackathonDataForShortlisted = {
            ...hackathon.toObject(),
            winners: winnersForEmail
          };
          
          shortlistedEmailResult = await emailService.sendBulkShortlistedEmails(
            shortlistedForEmail, 
            hackathonDataForShortlisted, 
            winnersForEmail
          );
          console.log('🔍 Backend - Shortlisted emails sent:', shortlistedEmailResult);
        }
      } catch (shortlistedEmailError) {
        console.error('🔍 Backend - Error sending shortlisted emails:', shortlistedEmailError);
      }
    }

    res.status(200).json({
      message: `Successfully sent emails to ${emailResult.successful} winners${includeShortlisted && shortlistedEmailResult ? ` and ${shortlistedEmailResult.successful} shortlisted participants` : ''}`,
      winnerEmails: emailResult,
      shortlistedEmails: shortlistedEmailResult,
      totalWinners: winnersForEmail.length,
      totalShortlisted: includeShortlisted ? (shortlistedEmailResult?.total || 0) : 0,
      sentAt: new Date()
    });

  } catch (error) {
    console.error('🔍 Backend - Error sending winner emails:', error);
    res.status(500).json({ message: 'Failed to send winner emails', error: error.message });
  }
};

// 🏆 Get Winners for Round 2
exports.getWinners = async (req, res) => {
  try {
    const { hackathonId, roundIndex } = req.params; // No default - must be specified
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can view winners' });
    }

    // Verify this is the final round (winner assignment round)
    const roundIndexNum = parseInt(roundIndex);
    const totalRounds = hackathon.rounds ? hackathon.rounds.length : 0;
    const isFinalRound = roundIndexNum === totalRounds - 1;
    
    if (!isFinalRound) {
      return res.status(400).json({ 
        message: `Winner details are only available for the final round (Round ${totalRounds}). Current round: ${roundIndexNum + 1}` 
      });
    }

    // Get final round submissions with winner status
    const submissions = await Submission.find({ 
      hackathonId: hackathonId, 
      roundIndex: roundIndexNum, // Only final round submissions
      status: 'winner' // Only winners
    }).populate('teamId', 'name leader')
      .populate('submittedBy', 'name email')
      .populate('projectId', 'title')
      .lean();

    if (submissions.length === 0) {
      return res.status(200).json({ 
        message: 'No winners found for this round',
        winners: []
      });
    }

    // Get all scores for final round submissions
    const Score = require('../model/ScoreModel');
    const finalRoundScores = await Score.find({ 
      submission: { $in: submissions.map(s => s._id) } 
    }).populate('judge', 'name email').lean();

    // Get previous round submissions for combined scoring (if not first round)
    let previousRoundSubmissions = [];
    let previousRoundScores = [];
    
    if (roundIndexNum > 0) {
      previousRoundSubmissions = await Submission.find({
        hackathonId: hackathonId,
        roundIndex: roundIndexNum - 1
      }).populate('teamId', 'name leader').lean();

      previousRoundScores = await Score.find({ 
        submission: { $in: previousRoundSubmissions.map(s => s._id) } 
      }).populate('judge', 'name email').lean();
    }

    // Create maps for scoring
    const finalRoundSubmissionScores = {};
    finalRoundScores.forEach(score => {
      if (!finalRoundSubmissionScores[score.submission.toString()]) {
        finalRoundSubmissionScores[score.submission.toString()] = [];
      }
      finalRoundSubmissionScores[score.submission.toString()].push(score);
    });

    const previousRoundTeamScores = {};
    if (roundIndexNum > 0) {
      previousRoundSubmissions.forEach(submission => {
        const teamId = submission.teamId?._id?.toString() || submission.submittedBy?._id?.toString();
        if (teamId) {
          const submissionScores = previousRoundScores.filter(s => s.submission.toString() === submission._id.toString());
          if (submissionScores.length > 0) {
            previousRoundTeamScores[teamId] = submissionScores;
          }
        }
      });
    }

    // Calculate combined scores for winners
    const winners = submissions.map(submission => {
      const submissionScoresList = finalRoundSubmissionScores[submission._id.toString()] || [];
      
      // Calculate final round score
      let finalRoundScore = 0;
      let finalRoundScoreCount = 0;
      
      submissionScoresList.forEach(score => {
        let totalCriteriaScore = 0;
        let criteriaCount = 0;
        
        if (score.scores && score.scores instanceof Map) {
          score.scores.forEach((value, key) => {
            if (value && typeof value.score === 'number') {
              totalCriteriaScore += value.score;
              criteriaCount++;
            }
          });
        } else if (score.scores && typeof score.scores === 'object') {
          Object.values(score.scores).forEach(value => {
            if (value && typeof value.score === 'number') {
              totalCriteriaScore += value.score;
              criteriaCount++;
            } else if (typeof value === 'number') {
              totalCriteriaScore += value;
              criteriaCount++;
            }
          });
        }
        
        if (criteriaCount > 0) {
          const submissionScore = totalCriteriaScore / criteriaCount;
          finalRoundScore += submissionScore;
          finalRoundScoreCount++;
        } else if (score.totalScore && typeof score.totalScore === 'number') {
          finalRoundScore += score.totalScore;
          finalRoundScoreCount++;
        }
      });
      
      finalRoundScore = finalRoundScoreCount > 0 ? finalRoundScore / finalRoundScoreCount : 0;
      
      // Calculate previous round score (if applicable)
      let previousRoundScore = 0;
      const teamId = submission.teamId?._id?.toString() || submission.submittedBy?._id?.toString();
      const previousRoundTeamScoresList = previousRoundTeamScores[teamId] || [];
      
      if (previousRoundTeamScoresList.length > 0) {
        let totalPreviousRoundScore = 0;
        let previousRoundScoreCount = 0;
        
        previousRoundTeamScoresList.forEach(score => {
          if (score.totalScore && typeof score.totalScore === 'number') {
            totalPreviousRoundScore += score.totalScore;
            previousRoundScoreCount++;
          }
        });
        
        previousRoundScore = previousRoundScoreCount > 0 ? totalPreviousRoundScore / previousRoundScoreCount : 0;
      }
      
      // Calculate combined score
      const combinedScore = roundIndexNum > 0 ? (previousRoundScore + finalRoundScore) / 2 : finalRoundScore;
      
      return {
        _id: submission._id,
        projectTitle: submission.projectId?.title || submission.projectTitle || submission.title || 'Untitled Project',
        teamName: submission.teamName || submission.teamId?.name || 'No Team',
        leaderName: submission.submittedBy?.name || submission.submittedBy?.email || 'Unknown',
        previousRoundScore: Math.round(previousRoundScore * 10) / 10,
        finalRoundScore: Math.round(finalRoundScore * 10) / 10,
        combinedScore: Math.round(combinedScore * 10) / 10,
        status: submission.status,
        roundIndex: submission.roundIndex,
        submittedAt: submission.submittedAt,
        evaluations: submissionScoresList.length,
        problemStatement: submission.problemStatement // <-- add this line
      };
    });

    // Sort by combined score (descending)
    winners.sort((a, b) => b.combinedScore - a.combinedScore);

    console.log('🔍 Backend - Winners retrieved successfully:', winners.length);

    res.status(200).json({
      message: `Successfully retrieved ${winners.length} winners`,
      winners: winners,
      hackathonTitle: hackathon.title,
      retrievedAt: new Date()
    });

  } catch (error) {
    console.error('🔍 Backend - Error retrieving winners:', error);
    res.status(500).json({ message: 'Failed to retrieve winners', error: error.message });
  }
};

// Get winners for a hackathon (public endpoint)
exports.getWinners = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    
    // Get hackathon details
    const hackathon = await Hackathon.findById(hackathonId).lean();
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Get winning submissions
    const Submission = require('../model/SubmissionModel');
    const winningSubmissions = await Submission.find({
      hackathonId: hackathonId,
      status: 'winner'
    }).populate('teamId', 'name leader')
      .populate('submittedBy', 'name email')
      .populate('projectId', 'title')
      .lean();

    // Get scores for winning submissions
    const Score = require('../model/ScoreModel');
    const scores = await Score.find({ 
      submission: { $in: winningSubmissions.map(s => s._id) } 
    }).populate('judge', 'name email').lean();

    // Create a map of submission scores
    const submissionScores = {};
    scores.forEach(score => {
      if (!submissionScores[score.submission.toString()]) {
        submissionScores[score.submission.toString()] = [];
      }
      submissionScores[score.submission.toString()].push(score);
    });



    // Format winning submissions with scores and positions
    const formattedWinners = winningSubmissions.map((submission, index) => {
      const submissionScoresList = submissionScores[submission._id.toString()] || [];
      
      let averageScore = 0;
      let totalScore = 0;
      let scoreCount = 0;
      
      submissionScoresList.forEach((score, index) => {
        // Convert Map to object if needed
        let scoresObject = {};
        if (score.scores && score.scores instanceof Map) {
          score.scores.forEach((value, key) => {
            if (value && typeof value === 'object' && value.score !== undefined) {
              scoresObject[key] = value.score;
            }
          });
        } else if (score.scores && typeof score.scores === 'object') {
          // Handle both direct score values and nested score objects
          Object.entries(score.scores).forEach(([key, value]) => {
            if (value && typeof value === 'object' && value.score !== undefined) {
              scoresObject[key] = value.score;
            } else if (typeof value === 'number') {
              scoresObject[key] = value;
            }
          });
        }
        
        const criteriaScores = Object.values(scoresObject).filter(s => typeof s === 'number');
        if (criteriaScores.length > 0) {
          const submissionScore = criteriaScores.reduce((sum, s) => sum + s, 0) / criteriaScores.length;
          totalScore += submissionScore;
          scoreCount++;
        }
      });
      
      averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

      // Determine position based on average score
      const position = index + 1;
      let positionText = '';
      let positionColor = '';
      
      if (position === 1) {
        positionText = '🥇 1st Place';
        positionColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
      } else if (position === 2) {
        positionText = '🥈 2nd Place';
        positionColor = 'bg-gray-100 text-gray-800 border-gray-300';
      } else if (position === 3) {
        positionText = '🥉 3rd Place';
        positionColor = 'bg-orange-100 text-orange-800 border-orange-300';
      } else {
        positionText = `${position}th Place`;
        positionColor = 'bg-blue-100 text-blue-800 border-blue-300';
      }

      return {
        _id: submission._id,
        position,
        positionText,
        positionColor,
       projectTitle: submission.projectId?.title || submission.projectTitle || submission.title || 'Untitled Project',
        teamName: submission.teamName || submission.teamId?.name || 'No Team',
        leaderName: submission.submittedBy?.name || submission.submittedBy?.email || 'Unknown',
        pptFile: submission.pptFile,
        submittedAt: submission.submittedAt,
        averageScore: Math.round(averageScore * 10) / 10,
        scoreCount,
        totalScore: Math.round(totalScore * 10) / 10,
        status: submission.status,
        roundIndex: submission.roundIndex,
        problemStatement: submission.problemStatement // <-- add this line
      };
    });

    // Sort by average score (descending)
    formattedWinners.sort((a, b) => b.averageScore - a.averageScore);

    res.status(200).json({
      hackathon: {
        id: hackathon._id,
        title: hackathon.title
      },
      winners: formattedWinners,
      summary: {
        totalWinners: formattedWinners.length,
        averageScore: formattedWinners.length > 0 
          ? Math.round(formattedWinners.reduce((sum, s) => sum + s.averageScore, 0) / formattedWinners.length * 10) / 10
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching winners:', error);
    res.status(500).json({ message: 'Failed to fetch winners' });
  }
};

// 🎯 Edit Problem Statement
exports.editProblemStatement = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { problemStatementId, statement, type, sponsorCompany } = req.body;



    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can edit problem statements' });
    }

    // Validate required fields
    if (!statement || !type) {
      return res.status(400).json({ message: 'Statement and type are required' });
    }

    // Validate type
    if (!['general', 'sponsored'].includes(type)) {
      return res.status(400).json({ message: 'Type must be either "general" or "sponsored"' });
    }

    // Validate sponsor company for sponsored type
    if (type === 'sponsored' && !sponsorCompany) {
      return res.status(400).json({ message: 'Sponsor company is required for sponsored problem statements' });
    }

    // Find and update the specific problem statement by _id
    const updatedHackathon = await Hackathon.findByIdAndUpdate(
      hackathonId,
      {
        $set: {
          'problemStatements.$[elem].statement': statement,
          'problemStatements.$[elem].type': type,
          'problemStatements.$[elem].sponsorCompany': type === 'sponsored' ? sponsorCompany : null,
          'problemStatements.$[elem].isSponsored': type === 'sponsored'
        }
      },
      {
        arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(problemStatementId) }],
        new: true
      }
    );

    if (!updatedHackathon) {
      return res.status(404).json({ message: 'Problem statement not found' });
    }

    // Find the updated problem statement
    const updatedPS = updatedHackathon.problemStatements.find(ps => ps._id.toString() === problemStatementId);

    res.status(200).json({
      message: 'Problem statement updated successfully',
      problemStatement: updatedPS,
      hackathon: updatedHackathon
    });

  } catch (error) {
    console.error('Error editing problem statement:', error);
    res.status(500).json({ message: 'Failed to edit problem statement' });
  }
};

// 🎯 Delete Problem Statement
exports.deleteProblemStatement = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { problemStatementId } = req.body;



    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Verify organizer permissions
    if (hackathon.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the organizer can delete problem statements' });
    }

    // Check if problem statement exists
    const problemStatement = hackathon.problemStatements.find(ps => ps._id.toString() === problemStatementId);
    if (!problemStatement) {
      return res.status(404).json({ message: 'Problem statement not found' });
    }

    // Check if there are any submissions for this problem statement
    const submissionsWithPS = await Submission.find({
      hackathonId: hackathonId,
      problemStatement: problemStatement.statement
    });

    if (submissionsWithPS.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete problem statement. There are submissions associated with this problem statement.',
        submissionCount: submissionsWithPS.length
      });
    }

    // Remove the problem statement
    const updatedHackathon = await Hackathon.findByIdAndUpdate(
      hackathonId,
      {
        $pull: {
          problemStatements: { _id: new mongoose.Types.ObjectId(problemStatementId) }
        }
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Problem statement deleted successfully',
      hackathon: updatedHackathon
    });

  } catch (error) {
    console.error('Error deleting problem statement:', error);
    res.status(500).json({ message: 'Failed to delete problem statement' });
  }
};

// 🎯 Get current user's shortlisting status for any round
exports.getUserShortlistingStatus = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.user._id;
    
    console.log('🔍 Backend - getUserShortlistingStatus called for:', { hackathonId, userId });
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    // Check if user is registered for this hackathon
    const Registration = require("../model/HackathonRegistrationModel");
    const isRegistered = await Registration.findOne({ hackathonId, userId });
    if (!isRegistered) {
      return res.status(403).json({ 
        eligible: false, 
        message: `You must be registered for this hackathon to participate` 
      });
    }

    // Get user's team
    const Team = require("../model/TeamModel");
    const userTeam = await Team.findOne({ 
      hackathon: hackathonId, 
      members: userId, 
      status: 'active' 
    });

    // Get all user's submissions for this hackathon
    const Submission = require("../model/SubmissionModel");
    const userSubmissions = await Submission.find({
      hackathonId: hackathonId,
      $or: [
        { submittedBy: userId },
        { teamId: userTeam?._id }
      ]
    }).populate('teamId', 'name members').populate('submittedBy', 'name email');

    // Check shortlisting status for each round
    const shortlistingStatus = {};
    
    for (let roundIndex = 0; roundIndex < hackathon.rounds.length - 1; roundIndex++) {
      const nextRoundIndex = roundIndex + 1;
      let isShortlisted = false;
      let shortlistingSource = null;
      let shortlistingDetails = null;

      // Method 1: Check hackathon round progress for team-based shortlisting
      if (userTeam && hackathon.roundProgress) {
        for (const progress of hackathon.roundProgress) {
          if (progress.roundIndex === roundIndex && progress.shortlistedTeams && progress.shortlistedTeams.includes(userTeam._id.toString())) {
            isShortlisted = true;
            shortlistingSource = 'hackathon_round_progress_team';
            console.log(`🔍 Backend - User shortlisted via team in round ${roundIndex} progress`);
            break;
          }
        }
      }

      // Method 2: Check hackathon round progress for individual user shortlisting
      if (!isShortlisted && hackathon.roundProgress) {
        for (const progress of hackathon.roundProgress) {
          if (progress.roundIndex === roundIndex && progress.shortlistedTeams && progress.shortlistedTeams.includes(userId.toString())) {
            isShortlisted = true;
            shortlistingSource = 'hackathon_round_progress_user';
            console.log(`🔍 Backend - User directly shortlisted in round ${roundIndex} progress`);
            break;
          }
        }
      }

      // Method 3: Check submission status (individual submissions)
      if (!isShortlisted) {
        const shortlistedSubmission = await Submission.findOne({
          hackathonId: hackathonId,
          $or: [
            { teamId: userTeam?._id },
            { submittedBy: userId }
          ],
          shortlistedForRound: nextRoundIndex + 1, // Check for the specific next round
          status: 'shortlisted'
        });
        
        if (shortlistedSubmission) {
          isShortlisted = true;
          shortlistingSource = 'submission_status';
          shortlistingDetails = {
            submissionId: shortlistedSubmission._id,
            projectTitle: shortlistedSubmission.projectTitle || shortlistedSubmission.title,
            shortlistedAt: shortlistedSubmission.shortlistedAt
          };
          console.log(`🔍 Backend - User has shortlisted submission for round ${nextRoundIndex}:`, shortlistedSubmission._id);
        }
      }

      // Method 4: Check advanced participants
      if (!isShortlisted && hackathon.roundProgress) {
        for (const progress of hackathon.roundProgress) {
          if (progress.roundIndex === roundIndex && progress.advancedParticipantIds && progress.advancedParticipantIds.includes(userId.toString())) {
            isShortlisted = true;
            shortlistingSource = 'advanced_participants';
            console.log(`🔍 Backend - User advanced via advanced participants in round ${roundIndex}`);
            break;
          }
        }
      }

      shortlistingStatus[`round${roundIndex + 1}ToRound${nextRoundIndex + 1}`] = {
        isShortlisted,
        shortlistingSource,
        shortlistingDetails,
        roundIndex,
        nextRoundIndex
      };
    }

    console.log('🔍 Backend - Shortlisting status for user:', shortlistingStatus);

    return res.status(200).json({
      userId: userId.toString(),
      userTeam: userTeam ? {
        _id: userTeam._id.toString(),
        name: userTeam.name,
        members: userTeam.members.map(m => m.toString())
      } : null,
      submissions: userSubmissions.map(s => ({
        _id: s._id.toString(),
        status: s.status,
        shortlistedForRound: s.shortlistedForRound,
        teamId: s.teamId?._id?.toString(),
        submittedBy: s.submittedBy?._id?.toString(),
        title: s.projectTitle || s.title,
        roundIndex: s.roundIndex
      })),
      hackathonRoundProgress: hackathon.roundProgress?.map(rp => ({
        roundIndex: rp.roundIndex,
        shortlistedTeams: rp.shortlistedTeams || [],
        shortlistedSubmissions: rp.shortlistedSubmissions || [],
        advancedParticipantIds: rp.advancedParticipantIds || []
      })) || [],
      shortlistingStatus,
      hackathon: {
        id: hackathon._id,
        title: hackathon.title,
        rounds: hackathon.rounds
      }
    });

  } catch (error) {
    console.error('🔍 Backend - Error in getUserShortlistingStatus:', error);
    return res.status(500).json({ 
      message: 'Failed to get shortlisting status', 
      error: error.message 
    });
  }
};





