const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['apartment', 'house', 'studio', 'commercial', 'other'],
    default: 'apartment'
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'occupied', 'maintenance', 'unavailable'],
    default: 'available'
  },
  notes: {
    type: String,
    trim: true
  },
  monthlyRent: {
    type: Number,
    default: 0,
    min: [0, 'Monthly rent cannot be negative']
  },
  images: [{
    type: String
  }]
}, {
  timestamps: true
});

// Index for better query performance
propertySchema.index({ status: 1 });
propertySchema.index({ type: 1 });

module.exports = mongoose.model('Property', propertySchema); 