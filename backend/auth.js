const { User, OTP } = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Verify JWT token
const verifyToken = (req, res, next) => {
  try {
    // Get auth header
    const authHeader = req.headers.authorization;
    
    // Check if auth header exists
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    // Get token from header
    const token = authHeader.split(' ')[1];
    
    // Verify token
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (err, decoded) => {
      if (err) {
        console.error('Token verification error:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Add user ID to request
      req.userId = decoded.userId;
      console.log(`Authenticated request from user: ${req.userId}`);
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Legacy OTP functions - keeping for backward compatibility
// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP for a user
const generateAndStoreOTP = async (userId) => {
  const otp = generateOTP();
  
  // In a real application, store this in the database
  // For now, just return the OTP
  return otp;
};

// Send OTP
const sendOTP = async (phone, otp) => {
  // In a real application, use Twilio or similar service
  console.log(`Sending OTP ${otp} to ${phone}`);
  
  // For development, just return true
  return true;
};

// Verify OTP
const verifyOTP = async (userId, otp) => {
  // In a real application, verify OTP from database
  // For now, just return success
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'your_jwt_secret_key', { expiresIn: '24h' });
  
  return { token };
};

// Register or login user - legacy function
const registerOrLoginUser = async (phone, email) => {
  // Check if user exists
  let user = await User.findOne({ email });
  let isNewUser = false;
  
  // If user doesn't exist, create a new one
  if (!user) {
    user = new User({
      phone,
      email
    });
    
    await user.save();
    isNewUser = true;
  }
  
  return { userId: user._id, isNewUser };
};

// Register with password
const registerWithPassword = async (name, email, password) => {
  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email is already registered');
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    
    return { token, userId: user._id };
  } catch (error) {
    throw error;
  }
};

// Login with password
const loginWithPassword = async (email, password) => {
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Check if user has a password (migrated from OTP)
    if (!user.password) {
      throw new Error('Please reset your password to continue');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }
    
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    
    return { token, userId: user._id };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  verifyToken,
  generateAndStoreOTP,
  sendOTP,
  verifyOTP,
  registerOrLoginUser,
  registerWithPassword,
  loginWithPassword
};
