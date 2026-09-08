const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const riderRoutes = require('./routes/riderRoutes');
const complaintRoutes = require('./routes/complaintRoutes'); // <-- Imported Complaint Routes
const targetRoutes = require('./routes/targetRoutes');       // <-- Imported Target Routes
const rideRoutes = require('./routes/rideRoutes'); // <-- Imported Ride Routes
const notificationRoutes = require('./routes/notificationRoutes');
const app = express();

// Middleware
app.use(cors());
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