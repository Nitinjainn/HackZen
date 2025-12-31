
console.log = function () {};
console.info = function () {};


require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");

const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const MongoStore = require("connect-mongo");
const socketHandler = require("./config/socket");
const util = require('util');

// Passport strategies
require("./config/passport");

// Routes
const cloudinaryUploadRoutes = require("./routes/cloudinaryUploadRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const sponsorProposalRoutes = require('./routes/sponsorProposalRoutes');

const app = express();

// ✅ CORS setup - Support both localhost and production
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://hackzen.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now (can be restricted later)
    }
  },
  credentials: true,
}));

// ✅ JSON + URL encoded parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Session middleware (MongoDB session store)
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URL }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: isProduction ? "none" : "lax", // none for cross-site in production
    secure: isProduction,   // true in production (HTTPS required)
    httpOnly: true,
  },
}));

// ✅ Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// ✅ API Routes
app.use("/api/hackathons", require("./routes/hackathonRoutes"));
app.use("/api/teams", require("./routes/teamRoutes"));
app.use("/api/team-invites", require("./routes/teamInviteRoutes"));
app.use("/api/role-invites", require("./routes/roleInviteRoutes"));
app.use("/api/submissions", require("./routes/submissionHistoryRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/scores", require("./routes/scoreRoutes"));
app.use("/api/badges", require("./routes/badgeRoutes"));
app.use("/api/chatrooms", require("./routes/chatRoomRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/announcements", require("./routes/announcementRoutes"));
app.use("/api/uploads", cloudinaryUploadRoutes);
app.use("/api/registration", require("./routes/hackathonRegistrationRoutes"));
app.use("/api/organizations", require("./routes/organizationRoutes"));
app.use("/api/articles", require("./routes/articleRoutes")); // ✅ includes like route
app.use("/api/newsletter", newsletterRoutes);
app.use('/api/submission-form',require("./routes/submissionFormRoutes"));
app.use('/api/sponsor-proposals', sponsorProposalRoutes);

// ✅ Judge Management Routes
app.use("/api/judge-management", require("./routes/judgeManagementRoutes"));

// ✅ User routes (including 2FA) - mount 2FA first to avoid conflicts
app.use('/api/users/2fa', require('./routes/2fa'));
app.use("/api/users", require("./routes/userRoutes"));

//certificatePage
app.use("/api/certificate-pages", require("./routes/certificatePageRoutes"));

// Add this at the end, after all routes:
app.use((err, req, res, next) => {
  const errorString = typeof err === 'object' ? util.inspect(err, { depth: 5 }) : String(err);
  console.error('GLOBAL ERROR:', errorString);
  res.status(500).json({ message: 'Internal server error', error: errorString });
});

// ✅ Server + Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins for now
      }
    },
    credentials: true,
  },
});

socketHandler(io); // WebSocket logic

// Socket.IO chat logic
io.on('connection', (socket) => {
  socket.on('joinProposalRoom', (proposalId) => {
    socket.join(proposalId);
  });
  socket.on('chat message', ({ proposalId, message }) => {
    io.to(proposalId).emit('chat message', message);
  });
});

// Make io accessible in controllers
app.set('io', io);

// ✅ MongoDB + Start server
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("✅ MongoDB connected");
    
    // Remove unique index on {name, hackathon} in teams collection if it exists
    try {
      const indexes = await mongoose.connection.db.collection('teams').indexes();
      const hasUniqueTeamNameIndex = indexes.some(
        idx => idx.name === 'name_1_hackathon_1' && idx.unique
      );
      if (hasUniqueTeamNameIndex) {
        console.log('🔄 Dropping unique index on {name, hackathon} in teams collection...');
        await mongoose.connection.db.collection('teams').dropIndex('name_1_hackathon_1');
        console.log('✅ Unique index dropped successfully.');
      } else {
        console.log('ℹ️  No unique index on {name, hackathon} found in teams collection.');
      }
    } catch (err) {
      console.error('⚠️  Error checking/dropping index:', err.message);
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server + Socket.IO running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
  });
