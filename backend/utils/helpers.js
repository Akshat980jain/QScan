const crypto = require('crypto');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate QR code filename
const generateQRFilename = (name, type) => {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFilename(name);
  return `qr_${type}_${sanitizedName}_${timestamp}.png`;
};

// Validate QR code content based on type
const validateQRContent = (type, content) => {
  switch (type) {
    case 'url':
      try {
        new URL(content);
        return true;
      } catch {
        return false;
      }
    
    case 'email':
      return isValidEmail(content);
    
    case 'phone':
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(content.replace(/[\s\-\(\)]/g, ''));
    
    case 'wifi':
      return content.startsWith('WIFI:');
    
    case 'text':
    case 'contact':
    case 'sms':
    default:
      return content && content.trim().length > 0;
  }
};

// Extract domain from URL
const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

// Generate pagination info
const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    currentPage: parseInt(page),
    totalPages,
    totalItems: total,
    itemsPerPage: parseInt(limit),
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

// Rate limiting helper
const createRateLimitKey = (ip, endpoint) => {
  return `rate_limit:${ip}:${endpoint}`;
};

module.exports = {
  generateRandomString,
  isValidEmail,
  sanitizeFilename,
  formatFileSize,
  generateQRFilename,
  validateQRContent,
  extractDomain,
  getPaginationInfo,
  createRateLimitKey
};