const sanitizeHtml = require('sanitize-html');

// Sanitize Tiptap HTML for safe storage and rendering
function sanitizeRichText(html) {
  if (!html) return '';
  const sanitized = sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'ul', 'ol', 'li',
      'blockquote',
      'a', 'img', 'video',
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height', 'style'],
      'video': ['src', 'controls', 'width', 'height', 'preload'],
    },
    allowedStyles: {
      'img': {
        'width': [/^\d+(%|px|em|rem)$/],
        'height': [/^\d+(%|px|em|rem)$/],
        'float': [/^(left|right|none)$/],
        'display': [/^(block|inline-block|inline)$/],
        'margin': [/^[\d\s]+(%|px|em|rem|auto)$/],
        'margin-left': [/^(auto|\d+(%|px|em|rem))$/],
        'margin-right': [/^(auto|\d+(%|px|em|rem))$/],
      },
    },
    allowedSchemes: ['http', 'https'],
    // Ensure links open in new tab safely
    transformTags: {
      // Normalize legacy heading tags to paragraphs (single text scale)
      'h1': 'p',
      'h2': 'p',
      'h3': 'p',
      'h4': 'p',
      'h5': 'p',
      'h6': 'p',
      'a': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      'video': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          controls: '',
          preload: 'metadata',
        },
      }),
    },
    // Only allow images/videos from our own uploads
    exclusiveFilter: (frame) => {
      if (frame.tag === 'img' && frame.attribs.src && !frame.attribs.src.startsWith('/uploads/')) {
        return true; // remove external images
      }
      if (frame.tag === 'video' && frame.attribs.src && !frame.attribs.src.startsWith('/uploads/')) {
        return true; // remove external videos
      }
      return false;
    },
  });

  // Preserve intentional blank lines from editor.
  // Tiptap often emits empty paragraphs for spacing; render as visible blank lines.
  return sanitized
    .replace(/<p>\s*<\/p>/g, '<p><br></p>')
    .replace(/<p>\s*(<br\s*\/?>\s*)+<\/p>/g, '<p><br></p>');
}

// Strip all HTML to plain text (for AI analysis, search, etc.)
function stripHtml(html) {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  }).replace(/\s+/g, ' ').trim();
}

module.exports = { sanitizeRichText, stripHtml };
