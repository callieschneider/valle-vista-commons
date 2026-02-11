import { initEditor } from '/js/editor.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize board notes composer editor
  const notesEl = document.getElementById('notesEditor');
  if (notesEl) {
    initEditor({
      element: notesEl,
      hiddenInput: document.getElementById('notesHidden'),
      toolbar: document.getElementById('notesToolbar'),
      content: '',
      mode: 'full',
    });
  }

  // Initialize all admin edit editors
  document.querySelectorAll('.admin-editor').forEach(el => {
    const id = el.id;
    const prefix = id.replace('editEditor-', '');
    const content = decodeURIComponent(el.dataset.content || '');
    const toolbar = document.getElementById(`editToolbar-${prefix}`);
    const hidden = document.getElementById(`editHidden-${prefix}`);

    if (toolbar && hidden) {
      const editor = initEditor({
        element: el,
        hiddenInput: hidden,
        toolbar: toolbar,
        content: content,
        mode: 'full',
      });
      // Sync initial content
      hidden.value = content;
    }
  });
});
