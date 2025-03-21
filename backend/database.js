const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URI (default to local if not provided in env)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/location-tracker';

// Connect to MongoDB with better connection options
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Timeout for server selection
  socketTimeoutMS: 45000, // How long a socket stays inactive before closing
  family: 4 // Use IPv4, skip trying IPv6
})
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  // Don't crash the app, but log a clear error message
  console.error('----------------');
  console.error('IMPORTANT: Make sure MongoDB is running on your machine. You can start it with "mongod" command.');
  console.error('Location tracking will continue to work, but locations will not be saved.');
  console.error('----------------');
});

// User schema with password
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function() { return this.password !== undefined; } // Only required for password auth
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: function() { return this.name !== undefined; } // Only required for password auth
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Location schema
const locationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// OTP schema for legacy support
const otpSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  expires_at: {
    type: Date,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Models
const User = mongoose.model('User', userSchema);
const Location = mongoose.model('Location', locationSchema);
const OTP = mongoose.model('OTP', otpSchema);

module.exports = {
  User,
  Location,
  OTP,
  mongoose
};
