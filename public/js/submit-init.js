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

  // Ensure hidden input is synced before form submit
  document.getElementById('submitForm').addEventListener('submit', (e) => {
    const html = document.getElementById('descHidden').value;
    if (!html || html === '<p></p>') {
      e.preventDefault();
      alert('Please add a description.');
    }
  });
});
