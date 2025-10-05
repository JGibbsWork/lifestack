/**
 * Memory Service - Validation
 * Validation utilities for memory data
 */

/**
 * Validate memory creation data
 * @param {Object} data - Memory data to validate
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
function validateMemoryCreate(data) {
  const errors = [];

  // Content is required
  if (!data.content) {
    errors.push('Memory content is required');
  } else if (typeof data.content !== 'string') {
    errors.push('Memory content must be a string');
  } else if (data.content.trim().length === 0) {
    errors.push('Memory content cannot be empty');
  }

  // Tags validation (optional)
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else {
      const invalidTags = data.tags.filter(tag => typeof tag !== 'string' || tag.trim().length === 0);
      if (invalidTags.length > 0) {
        errors.push('All tags must be non-empty strings');
      }
    }
  }

  // Context validation (optional)
  if (data.context !== undefined && data.context !== null) {
    if (typeof data.context !== 'string') {
      errors.push('Context must be a string');
    }
  }

  // Source validation (optional)
  if (data.source !== undefined) {
    const validSources = ['manual', 'claude', 'automation', 'api', 'other'];
    if (!validSources.includes(data.source.toLowerCase())) {
      errors.push(`Source must be one of: ${validSources.join(', ')}`);
    }
  }

  // Metadata validation (optional)
  if (data.metadata !== undefined) {
    if (typeof data.metadata !== 'object' || Array.isArray(data.metadata)) {
      errors.push('Metadata must be an object');
    }
  }

  // Timestamp validation (optional)
  if (data.timestamp !== undefined) {
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push('Invalid timestamp format');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate memory update data
 * @param {Object} data - Memory data to validate
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
function validateMemoryUpdate(data) {
  const errors = [];

  // At least one field should be provided
  const updateFields = ['content', 'tags', 'context', 'source', 'metadata'];
  const hasUpdateField = updateFields.some(field => data.hasOwnProperty(field));

  if (!hasUpdateField) {
    errors.push('At least one field must be provided for update');
  }

  // Content validation (if provided)
  if (data.content !== undefined) {
    if (typeof data.content !== 'string') {
      errors.push('Memory content must be a string');
    } else if (data.content.trim().length === 0) {
      errors.push('Memory content cannot be empty');
    }
  }

  // Tags validation (if provided)
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else {
      const invalidTags = data.tags.filter(tag => typeof tag !== 'string' || tag.trim().length === 0);
      if (invalidTags.length > 0) {
        errors.push('All tags must be non-empty strings');
      }
    }
  }

  // Context validation (if provided)
  if (data.context !== undefined && data.context !== null) {
    if (typeof data.context !== 'string') {
      errors.push('Context must be a string');
    }
  }

  // Source validation (if provided)
  if (data.source !== undefined) {
    const validSources = ['manual', 'claude', 'automation', 'api', 'other'];
    if (!validSources.includes(data.source.toLowerCase())) {
      errors.push(`Source must be one of: ${validSources.join(', ')}`);
    }
  }

  // Metadata validation (if provided)
  if (data.metadata !== undefined) {
    if (typeof data.metadata !== 'object' || Array.isArray(data.metadata)) {
      errors.push('Metadata must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate pagination parameters
 * @param {Object} params - Query parameters
 * @returns {Object} Validated pagination { limit: number, skip: number }
 */
function validatePagination(params) {
  let limit = parseInt(params.limit) || 50;
  let skip = parseInt(params.skip) || 0;

  // Enforce maximum limit
  if (limit > 100) {
    limit = 100;
  }

  // Ensure non-negative values
  if (limit < 1) {
    limit = 50;
  }

  if (skip < 0) {
    skip = 0;
  }

  return { limit, skip };
}

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // MongoDB ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validate date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
function isValidDate(dateString) {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate and parse tags from query string
 * @param {string} tagsString - Comma-separated tags
 * @returns {Array|null} Array of tags or null
 */
function parseTags(tagsString) {
  if (!tagsString || typeof tagsString !== 'string') {
    return null;
  }

  const tags = tagsString
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0);

  return tags.length > 0 ? tags : null;
}

module.exports = {
  validateMemoryCreate,
  validateMemoryUpdate,
  validatePagination,
  isValidObjectId,
  isValidDate,
  parseTags
};
