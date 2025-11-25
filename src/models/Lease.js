const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  monthlyRent: {
    type: Number,
    required: true,
    min: [0, 'Monthly rent cannot be negative']
  },
  deposit: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Deposit cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'terminated', 'pending'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true
  },
  utilities: {
    electricity: {
      type: Boolean,
      default: false
    },
    water: {
      type: Boolean,
      default: false
    },
    gas: {
      type: Boolean,
      default: false
    },
    internet: {
      type: Boolean,
      default: false
    }
  },
  documents: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['contract', 'id_copy', 'other'],
      default: 'other'
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
leaseSchema.index({ property: 1 });
leaseSchema.index({ tenant: 1 });
leaseSchema.index({ status: 1 });
leaseSchema.index({ startDate: 1, endDate: 1 });

// Virtual to check if lease is currently active
leaseSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now;
});

module.exports = mongoose.model('Lease', leaseSchema); 