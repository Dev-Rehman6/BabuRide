const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const riderRoutes = require('./routes/riderRoutes');
const complaintRoutes = require('./routes/complaintRoutes'); // <-- Imported Complaint Routes
const targetRoutes = require('./routes/targetRoutes');       // <-- Imported Target Routes
const rideRoutes = require('./routes/rideRoutes'); // <-- Imported Ride Routes
const notificationRoutes = require('./routes/notificationRoutes');
const app = express();

// Security Middleware Configuration
app.use(helmet());

// CORS configuration - allowing localhost, 127.0.0.1, Vercel frontend if any, and any local network devices for development safely
const allowedOrigins = [
  'https://babu-ride.vercel.app',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Rate Limiting to prevent Brute Force / DoS Attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', limiter);

// Body payload limits expanded for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route Mounting
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Babu Ride API is running successfully' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/complaints', complaintRoutes); // <-- Mounted Complaint Routes
app.use('/api/targets', targetRoutes);       // <-- Mounted Target Routes
app.use('/api/rides', rideRoutes); // <-- Mounted Ride Routes
app.use('/api/notifications', notificationRoutes);

// JSON 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected successfully');
    
    // Listening on '0.0.0.0' allows requests from physical devices on your local network
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });