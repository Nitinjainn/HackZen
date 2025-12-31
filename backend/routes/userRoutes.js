const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const userController = require('../controllers/userController');
const { protect, isAdmin, isOrganizerOrAdmin } = require('../middleware/authMiddleware');
const trackStreak = require("../middleware/trackStreak");
const User = require('../model/UserModel');
const RoleInvite = require('../model/RoleInviteModel');

// Helper function to get frontend URL based on environment
const getFrontendUrl = () => {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    return process.env.FRONTEND_URL || 'https://hackzen.vercel.app';
  }
  return 'http://localhost:5173';
};
// 🔐 OAuth Routes
router.get('/github', (req, res, next) => {
  const redirectTo = req.query.redirectTo;
  const state = redirectTo ? Buffer.from(JSON.stringify({ redirectTo })).toString('base64') : undefined;
  passport.authenticate('github', { 
    scope: ['user:email'],
    state: state
  })(req, res, next);
});

router.get('/google', (req, res, next) => {
  const redirectTo = req.query.redirectTo;
  const state = redirectTo ? Buffer.from(JSON.stringify({ redirectTo })).toString('base64') : undefined;
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: state
  })(req, res, next);
});

// Updated GitHub callback
router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { failureRedirect: '/login', session: false }, (err, user) => {
    if (err) return next(err);
    const frontendUrl = getFrontendUrl();
    if (user && user.needsRegistration) {
      const baseRedirectUrl = `${frontendUrl}/oauth-success?needsRegistration=true&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&authProvider=github&profileImage=${encodeURIComponent(user.profileImage || '')}&githubUsername=${encodeURIComponent(user.githubUsername || '')}`;
      return res.redirect(baseRedirectUrl);
    }
    // Only create session for registered users
    req.logIn(user, (err) => {
      if (err) return next(err);
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      let redirectTo = null;
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
          redirectTo = stateData.redirectTo;
        } catch (err) {
          console.warn('Failed to parse OAuth state:', err);
        }
      }
      const baseRedirectUrl = `${frontendUrl}/oauth-success?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&_id=${user._id}&role=${user.role}&profileCompleted=${user.profileCompleted || false}&authProvider=github`;
      const redirectUrl = redirectTo ? `${baseRedirectUrl}&redirectTo=${encodeURIComponent(redirectTo)}` : baseRedirectUrl;
      res.redirect(redirectUrl);
    });
  })(req, res, next);
});

// Updated Google callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { failureRedirect: '/login', session: false }, (err, user) => {
    if (err) return next(err);
    const frontendUrl = getFrontendUrl();
    if (user && user.needsRegistration) {
      const baseRedirectUrl = `${frontendUrl}/oauth-success?needsRegistration=true&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&authProvider=google&profileImage=${encodeURIComponent(user.profileImage || '')}`;
      return res.redirect(baseRedirectUrl);
    }
    // Only create session for registered users
    req.logIn(user, (err) => {
      if (err) return next(err);
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      let redirectTo = null;
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
          redirectTo = stateData.redirectTo;
        } catch (err) {
          console.warn('Failed to parse OAuth state:', err);
        }
      }
      const baseRedirectUrl = `${frontendUrl}/oauth-success?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&_id=${user._id}&role=${user.role}&profileCompleted=${user.profileCompleted || false}&authProvider=google`;
      const redirectUrl = redirectTo ? `${baseRedirectUrl}&redirectTo=${encodeURIComponent(redirectTo)}` : baseRedirectUrl;
      res.redirect(redirectUrl);
    });
  })(req, res, next);
});

// New endpoint: Complete OAuth registration
router.post('/oauth-register', async (req, res) => {
  try {
    const { name, email, profileImage, authProvider, githubUsername, role } = req.body;
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    // Create user with required info
    user = await User.create({
      name,
      email,
      profileImage: profileImage || '',
      authProvider,
      githubUsername: githubUsername || undefined,
      role: role || undefined,
      profileCompleted: false // Will be set true after full profile completion
    });
    // Generate JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted || false
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✉️ Auth
router.post('/register', userController.registerUser);
router.post('/verify-registration', userController.verifyRegistrationCode);
router.post('/login', userController.loginUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// 🚪 Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      // Instead of redirect, send a JSON response for CORS compliance
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
});
router.get('/me/judge-hackathons', protect, async (req, res) => {
  try {
    // Get active judge assignments
    const JudgeAssignment = require('../model/JudgeAssignmentModel');
    const activeAssignments = await JudgeAssignment.find({
      'judge.email': req.user.email,
      status: 'active'
    }).populate('hackathon', 'title name description startDate endDate registrationDeadline location tags images isFeatured prizePool mode');

    // Get hackathons from active assignments
    const hackathons = activeAssignments.map(assignment => assignment.hackathon).filter(Boolean);

    res.status(200).json(hackathons);
  } catch (err) {
    console.error('Error fetching judge hackathons:', err);
    res.status(500).json({ message: 'Failed to fetch judge hackathons' });
  }
});
router.get('/judge-stats', protect, userController.getJudgeStats);
// 👤 User Routes
// ✅ Get current user info (for session refresh) - THIS MUST COME FIRST!
router.get('/me', protect, userController.getMe);

router.get('/', userController.getAllUsers);
router.get('/public/:id', userController.getPublicProfile);



router.get('/:id', userController.getUserById);
router.put('/:id', protect, userController.updateUser);
router.delete('/:id', protect, isAdmin, userController.deleteUser);
router.patch('/:id/role', protect, isOrganizerOrAdmin, userController.changeUserRole);
router.put('/:id/password', protect, userController.changePassword);

// Complete profile after registration
router.put('/:id/complete-profile', protect, userController.completeProfile);

// Test route removed for now to fix the server startup

// 🏢 Organization
router.post('/invite', protect, isOrganizerOrAdmin, userController.inviteToOrganization);
router.get('/me/organization', protect, userController.getMyOrganizationStatus);

// 🔥 Streak
router.get('/:id/streaks', protect, userController.getUserStreakData);
router.post("/streak", protect, trackStreak, (req, res) => {
  res.status(200).json({ message: "Streak tracked" });
});

// ✅ My Registered Hackathons (IDs only)
router.get('/me/registered-hackathons', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('registeredHackathonIds');
    res.json(user.registeredHackathonIds || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch registered hackathons" });
  }
});

// ✅ Save / Unsave Hackathon
router.post('/save-hackathon', protect, userController.saveHackathon);

// ✅ Get Saved Hackathons List (full populated data)
router.get('/me/saved-hackathons', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedHackathons');
    res.status(200).json(user.savedHackathons || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch saved hackathons" });
  }
});

// ✅ Admin Dashboard Routes
router.get('/admin/stats', protect, isAdmin, userController.getDashboardStats);
router.get('/admin/monthly-stats', protect, isAdmin, userController.getMonthlyUserStats);
router.get('/admin/role-breakdown', protect, isAdmin, userController.getUserRoleBreakdown);
router.get('/admin/weekly-engagement', protect, isAdmin, userController.getWeeklyEngagementStats);

// ✅ Judge Dashboard Routes

module.exports = router;
