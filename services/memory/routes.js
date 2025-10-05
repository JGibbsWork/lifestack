/**
 * Memory Service - API Routes
 * CRUD operations for LLM conversation memories
 */

const express = require('express');
const Memory = require('../../models/Memory');
const { authenticateApiKey } = require('../../shared/middleware/auth');
const {
  validateMemoryCreate,
  validateMemoryUpdate,
  validatePagination,
  isValidObjectId,
  isValidDate,
  parseTags
} = require('./validation');

const router = express.Router();

// Apply authentication to all memory routes
router.use(authenticateApiKey);

/**
 * POST /
 * Create a new memory
 */
router.post('/', async (req, res) => {
  try {
    // Validate request data
    const validation = validateMemoryCreate(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    // Create new memory
    const memoryData = {
      content: req.body.content,
      tags: req.body.tags || [],
      context: req.body.context || null,
      source: req.body.source || 'manual',
      metadata: req.body.metadata || {}
    };

    // Allow custom timestamp if provided
    if (req.body.timestamp) {
      memoryData.timestamp = new Date(req.body.timestamp);
    }

    const memory = new Memory(memoryData);
    await memory.save();

    console.log(`✅ Created memory: ${memory._id}`);

    res.status(201).json({
      success: true,
      message: 'Memory created successfully',
      memory
    });

  } catch (error) {
    console.error('❌ Error creating memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create memory',
      message: error.message
    });
  }
});

/**
 * GET /
 * Get all memories with pagination and filtering
 */
router.get('/', async (req, res) => {
  try {
    const { limit, skip } = validatePagination(req.query);

    // Build query based on filters
    const query = {};

    // Filter by tags
    if (req.query.tags) {
      const tags = parseTags(req.query.tags);
      if (tags) {
        query.tags = { $in: tags };
      }
    }

    // Filter by source
    if (req.query.source) {
      query.source = req.query.source.toLowerCase();
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};

      if (req.query.startDate) {
        if (!isValidDate(req.query.startDate)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid startDate format'
          });
        }
        query.timestamp.$gte = new Date(req.query.startDate);
      }

      if (req.query.endDate) {
        if (!isValidDate(req.query.endDate)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
        }
        query.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    // Get total count for pagination
    const total = await Memory.countDocuments(query);

    // Fetch memories
    const memories = await Memory.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      count: memories.length,
      total,
      limit,
      skip,
      hasMore: skip + memories.length < total,
      memories
    });

  } catch (error) {
    console.error('❌ Error fetching memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memories',
      message: error.message
    });
  }
});

/**
 * GET /recent
 * Get the most recent N memories
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Enforce reasonable limits
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const memories = await Memory.find()
      .sort({ timestamp: -1 })
      .limit(safeLimit);

    res.json({
      success: true,
      count: memories.length,
      limit: safeLimit,
      memories
    });

  } catch (error) {
    console.error('❌ Error fetching recent memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent memories',
      message: error.message
    });
  }
});

/**
 * GET /search
 * Search memories by text content
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
    }

    const { limit, skip } = validatePagination(req.query);

    // Perform text search
    const memories = await Memory.searchByText(q, { limit, skip });

    // Get total count for the search
    const total = await Memory.countDocuments({ $text: { $search: q } });

    res.json({
      success: true,
      query: q,
      count: memories.length,
      total,
      limit,
      skip,
      hasMore: skip + memories.length < total,
      memories
    });

  } catch (error) {
    console.error('❌ Error searching memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search memories',
      message: error.message
    });
  }
});

/**
 * GET /:id
 * Get a specific memory by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid memory ID format'
      });
    }

    const memory = await Memory.findById(id);

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
        message: `No memory found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      memory
    });

  } catch (error) {
    console.error(`❌ Error fetching memory ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memory',
      message: error.message
    });
  }
});

/**
 * PUT /:id
 * Update a specific memory
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid memory ID format'
      });
    }

    // Validate update data
    const validation = validateMemoryUpdate(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    // Find and update memory
    const updateData = {};

    if (req.body.content !== undefined) updateData.content = req.body.content;
    if (req.body.tags !== undefined) updateData.tags = req.body.tags;
    if (req.body.context !== undefined) updateData.context = req.body.context;
    if (req.body.source !== undefined) updateData.source = req.body.source;
    if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;

    const memory = await Memory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
        message: `No memory found with ID: ${id}`
      });
    }

    console.log(`✅ Updated memory: ${id}`);

    res.json({
      success: true,
      message: 'Memory updated successfully',
      memory
    });

  } catch (error) {
    console.error(`❌ Error updating memory ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update memory',
      message: error.message
    });
  }
});

/**
 * DELETE /:id
 * Delete a specific memory
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid memory ID format'
      });
    }

    const memory = await Memory.findByIdAndDelete(id);

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
        message: `No memory found with ID: ${id}`
      });
    }

    console.log(`✅ Deleted memory: ${id}`);

    res.json({
      success: true,
      message: 'Memory deleted successfully',
      deletedMemory: memory
    });

  } catch (error) {
    console.error(`❌ Error deleting memory ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete memory',
      message: error.message
    });
  }
});

/**
 * GET /stats
 * Get memory statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const total = await Memory.countDocuments();

    const bySource = await Memory.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    const byTags = await Memory.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const oldest = await Memory.findOne().sort({ timestamp: 1 });
    const newest = await Memory.findOne().sort({ timestamp: -1 });

    res.json({
      success: true,
      stats: {
        total,
        bySource,
        topTags: byTags,
        oldestMemory: oldest ? oldest.timestamp : null,
        newestMemory: newest ? newest.timestamp : null
      }
    });

  } catch (error) {
    console.error('❌ Error fetching memory stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memory stats',
      message: error.message
    });
  }
});

module.exports = router;
