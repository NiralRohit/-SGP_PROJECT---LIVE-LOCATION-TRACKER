const express = require('express');
const cors = require('cors');
const path = require('path');
const { Location, User } = require('./database');
const auth = require('./auth');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Configure CORS with more detailed options
app.use(cors({
  origin: '*', // Allow all origins during development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS for preflight requests
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'X-Requested-With']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this for form data
app.use(express.static(path.join(__dirname, '../frontend')));

// Log all requests to help with debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  
  // Add custom header to identify API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-API-Response', 'true');
  }
  
  // Modify the json method for API routes to ensure proper content type
  if (req.path.startsWith('/api/')) {
    const originalJson = res.json;
    res.json = function(obj) {
      res.setHeader('Content-Type', 'application/json');
      return originalJson.call(this, obj);
    };
  }
  
  next();
});

// Serve static files - ensure all routes work
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index-landing.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Also serve the files directly by name
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/debug.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/debug.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Add simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
// Password-based registration
app.post('/api/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    // Set content type to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    // Validate email (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    console.log('New user created:', user._id);
    
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Ensure JSON response even for errors
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Password-based login
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    
    // Set content type to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.log('User authenticated successfully:', user._id);
    
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    // Ensure JSON response even for errors
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Legacy OTP routes (keep for backward compatibility)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, email } = req.body;
    
    if (!phone || !email) {
      return res.status(400).json({ error: 'Phone number and email are required' });
    }
    
    // Validate phone number and email (basic validation)
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Register or login user
    const { userId, isNewUser } = await auth.registerOrLoginUser(phone, email);
    
    // Generate OTP
    const otp = await auth.generateAndStoreOTP(userId);
    
    // Send OTP (in production, use Twilio or similar service)
    await auth.sendOTP(phone, otp);
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully', 
      userId,
      isNewUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Verify OTP
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required' });
    }
    
    // Verify OTP
    const { token } = await auth.verifyOTP(userId, otp);
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully', 
      token 
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(401).json({ error: error.message || 'Invalid or expired OTP' });
  }
});

// Handle location endpoints
app.post('/api/location', auth.verifyToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    // Create new location record
    const location = new Location({
      user_id: req.userId,
      latitude,
      longitude
    });
    
    await location.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Location saved successfully',
      location: {
        id: location._id,
        latitude,
        longitude,
        timestamp: location.timestamp
      }
    });
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ error: error.message || 'Error saving location' });
  }
});

// Get user's location history
app.get('/api/locations', auth.verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get location history for user
    const locations = await Location.find({ user_id: req.userId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json({ locations });
  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({ error: error.message || 'Error fetching location history' });
  }
});

// Health check endpoint for debugging connection issues
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    },
    database: {
      connected: mongoose.connection.readyState === 1
    }
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Ensure API routes always return JSON
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Server error occurred',
      message: err.message
    });
  }
  
  // For non-API routes, render an error page or redirect
  res.status(500).send('Server error occurred');
});

// Handle 404 - Keep this as the last route
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    // API route not found - ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    // Try to serve index.html for any other routes
    res.sendFile(path.join(__dirname, '../frontend/index-landing.html'));
  }
});

// Start the server with better port conflict handling
const startServer = (port) => {
  app.listen(port)
    .on('listening', () => {
      console.log(`Server running successfully on port ${port}`);
      console.log(`Server URLs:`);
      console.log(`- Local: http://localhost:${port}`);
      console.log(`- Debug: http://localhost:${port}/debug.html`);
      
      // Update frontend URLs if needed
      if (port != process.env.PORT) {
        console.log(`NOTE: Remember to update your frontend to use port ${port} instead of ${process.env.PORT}`);
      }
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy. Trying next port...`);
        // Try the next port
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
};

// Try starting with the configured port
const configuredPort = process.env.PORT || 7890;
console.log(`Attempting to start server on port ${configuredPort}...`);
startServer(parseInt(configuredPort));
