const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  idPassport: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
tenantSchema.index({ email: 1 });
// idPassport index created automatically by unique: true constraint
tenantSchema.index({ status: 1 });

module.exports = mongoose.model('Tenant', tenantSchema); 