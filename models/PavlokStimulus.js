/**
 * Pavlok Stimulus Model
 * Tracks history of Pavlok stimuli actions
 */

const mongoose = require('mongoose');

const pavlokStimulusSchema = new mongoose.Schema({
  // Type of stimulus
  type: {
    type: String,
    enum: ['beep', 'vibrate', 'shock'],
    required: true,
    index: true
  },

  // Intensity level (1-4)
  intensity: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },

  // Optional reason for the stimulus
  reason: {
    type: String,
    trim: true,
    default: null
  },

  // Whether the action was successful
  success: {
    type: Boolean,
    required: true,
    default: false
  },

  // Error message if failed
  error: {
    type: String,
    default: null
  },

  // Timestamp of the action
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
pavlokStimulusSchema.index({ timestamp: -1 });
pavlokStimulusSchema.index({ type: 1, timestamp: -1 });

// Static method to get recent history
pavlokStimulusSchema.statics.getRecent = function(options = {}) {
  const { limit = 50, skip = 0, type = null } = options;

  const query = {};
  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get statistics
pavlokStimulusSchema.statics.getStats = async function(options = {}) {
  const { startDate = null, endDate = null } = options;

  const matchQuery = {};

  if (startDate || endDate) {
    matchQuery.timestamp = {};
    if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
    if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
  }

  const [byType, bySuccess, total] = await Promise.all([
    // Count by type
    this.aggregate([
      ...(Object.keys(matchQuery).length > 0 ? [{ $match: matchQuery }] : []),
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),

    // Count by success/failure
    this.aggregate([
      ...(Object.keys(matchQuery).length > 0 ? [{ $match: matchQuery }] : []),
      { $group: { _id: '$success', count: { $sum: 1 } } }
    ]),

    // Total count
    this.countDocuments(matchQuery)
  ]);

  return {
    total,
    byType,
    bySuccess,
    period: {
      start: startDate,
      end: endDate
    }
  };
};

// Instance method to mark as successful
pavlokStimulusSchema.methods.markSuccess = function() {
  this.success = true;
  this.error = null;
  return this.save();
};

// Instance method to mark as failed
pavlokStimulusSchema.methods.markFailure = function(errorMessage) {
  this.success = false;
  this.error = errorMessage;
  return this.save();
};

const PavlokStimulus = mongoose.model('PavlokStimulus', pavlokStimulusSchema);

module.exports = PavlokStimulus;
