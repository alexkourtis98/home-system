const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [config.auth.password.minLength, `Password must be at least ${config.auth.password.minLength} characters`],
      select: false, // Don't include password in queries by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.keys(config.auth.roles),
      default: 'tenant',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    // For landlords - which properties they own
    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    // For tenants - link to tenant record
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    // Profile information
    profile: {
      avatar: String,
      address: String,
      notes: String,
    },
    // Security
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes (email index created by unique: true, so only add role and status)
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Virtual for role level (for permission checks)
userSchema.virtual('roleLevel').get(function () {
  const roleConfig = config.auth.roles[this.role];
  return roleConfig ? roleConfig.level : 0;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(config.auth.password.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000; // Ensure token issued after password change
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Method to check if user has minimum role level
userSchema.methods.hasMinRole = function (requiredRole) {
  const requiredLevel = config.auth.roles[requiredRole]?.level || 0;
  const userLevel = config.auth.roles[this.role]?.level || 0;
  return userLevel >= requiredLevel;
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Static method to find by email with password
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password');
};

// Handle failed login attempts
userSchema.methods.incLoginAttempts = async function () {
  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 15 minutes
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockUntil: 1 },
  });
};

module.exports = mongoose.model('User', userSchema);
