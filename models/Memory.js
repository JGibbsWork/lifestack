/**
 * Memory Model
 * Mongoose schema for storing LLM conversation memories
 */

const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  // The actual memory content
  content: {
    type: String,
    required: [true, 'Memory content is required'],
    trim: true,
    minlength: [1, 'Memory content cannot be empty']
  },

  // Tags for categorization
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags) {
        // Ensure all tags are non-empty strings
        return tags.every(tag => typeof tag === 'string' && tag.trim().length > 0);
      },
      message: 'All tags must be non-empty strings'
    }
  },

  // Context that prompted this memory
  context: {
    type: String,
    trim: true,
    default: null
  },

  // Source of the memory
  source: {
    type: String,
    enum: ['manual', 'claude', 'automation', 'api', 'other'],
    default: 'manual',
    lowercase: true
  },

  // Flexible metadata field for additional data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Timestamp for when the memory was created
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  // Add automatic createdAt and updatedAt timestamps
  timestamps: true,
  // Enable virtual properties in JSON output
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
memorySchema.index({ timestamp: -1 }); // Sort by most recent
memorySchema.index({ tags: 1 }); // Filter by tags
memorySchema.index({ source: 1 }); // Filter by source
memorySchema.index({ content: 'text' }); // Text search on content

// Virtual property to get memory age
memorySchema.virtual('age').get(function() {
  return Date.now() - this.timestamp.getTime();
});

// Instance method to add tags
memorySchema.methods.addTags = function(newTags) {
  if (!Array.isArray(newTags)) {
    newTags = [newTags];
  }

  // Add only unique tags
  const uniqueTags = [...new Set([...this.tags, ...newTags])];
  this.tags = uniqueTags.filter(tag => tag && tag.trim().length > 0);

  return this.save();
};

// Instance method to remove tags
memorySchema.methods.removeTags = function(tagsToRemove) {
  if (!Array.isArray(tagsToRemove)) {
    tagsToRemove = [tagsToRemove];
  }

  this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  return this.save();
};

// Static method to search memories by text
memorySchema.statics.searchByText = function(query, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip);
};

// Static method to find by tags
memorySchema.statics.findByTags = function(tags, options = {}) {
  const { limit = 50, skip = 0 } = options;

  if (!Array.isArray(tags)) {
    tags = [tags];
  }

  return this.find({ tags: { $in: tags } })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to find by date range
memorySchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
  const { limit = 50, skip = 0 } = options;

  const query = {};

  if (startDate) {
    query.timestamp = { $gte: new Date(startDate) };
  }

  if (endDate) {
    if (query.timestamp) {
      query.timestamp.$lte = new Date(endDate);
    } else {
      query.timestamp = { $lte: new Date(endDate) };
    }
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Pre-save hook to normalize tags
memorySchema.pre('save', function(next) {
  // Remove duplicates and empty tags
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(this.tags.map(tag => tag.trim().toLowerCase()))].filter(Boolean);
  }
  next();
});

// Create and export the model
const Memory = mongoose.model('Memory', memorySchema);

module.exports = Memory;
