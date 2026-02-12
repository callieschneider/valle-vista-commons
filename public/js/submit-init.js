import { initEditor } from '/js/editor.js';

document.addEventListener('DOMContentLoaded', () => {
  const editorEl = document.getElementById('editor');
  if (!editorEl) return;

  const editor = initEditor({
    element: editorEl,
    hiddenInput: document.getElementById('descHidden'),
    toolbar: document.getElementById('toolbar'),
    content: '',
    mode: 'simple', // no headings, blockquotes for public
  });

  const form = document.getElementById('submitForm');
  const banner = document.getElementById('validationBanner');

  // Clear field error on interaction
  form.querySelectorAll('.field-group').forEach(fg => {
    fg.addEventListener('input', () => fg.classList.remove('field-error'));
    fg.addEventListener('change', () => fg.classList.remove('field-error'));
  });

  // Client-side validation before submit
  form.addEventListener('submit', (e) => {
    const errors = [];
    const errorFields = [];

    // Title
    const titleInput = document.getElementById('title');
    const titleGroup = titleInput.closest('.field-group');
    if (!titleInput.value.trim()) {
      errors.push('Title is required');
      errorFields.push(titleGroup);
    }

    // Description (Tiptap editor → hidden input)
    const descVal = document.getElementById('descHidden').value;
    const descGroup = document.getElementById('editor').closest('.field-group');
    if (!descVal || descVal === '<p></p>') {
      errors.push('Description is required');
      errorFields.push(descGroup);
    }

    // Category (radio buttons)
    const sectionChecked = form.querySelector('input[name="section"]:checked');
    const catGroup = document.querySelector('.category-grid').closest('.field-group');
    if (!sectionChecked) {
      errors.push('Please select a category');
      errorFields.push(catGroup);
    }

    // Clear previous state
    form.querySelectorAll('.field-group.field-error').forEach(fg => fg.classList.remove('field-error'));

    if (errors.length > 0) {
      e.preventDefault();

      // Mark fields
      errorFields.forEach(fg => fg.classList.add('field-error'));

      // Show banner below button
      banner.innerHTML = errors.length === 1
        ? errors[0]
        : '<ul>' + errors.map(err => `<li>${err}</li>`).join('') + '</ul>';
      banner.style.display = 'block';

      // Re-trigger shake animation
      banner.style.animation = 'none';
      banner.offsetHeight; // reflow
      banner.style.animation = '';

      // Scroll banner into view
      banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      banner.style.display = 'none';
    }
  });
});
