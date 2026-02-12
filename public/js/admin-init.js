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
      postId: null,
      enableAiRewrite: true, // Enable for board notes (no rate limits)
    });
  }

  // Initialize all admin edit editors
  document.querySelectorAll('.admin-editor').forEach(el => {
    const id = el.id;
    const prefix = id.replace('editEditor-', '');
    const content = decodeURIComponent(el.dataset.content || '');
    const postId = el.dataset.postId || null;
    const toolbar = document.getElementById(`editToolbar-${prefix}`);
    const hidden = document.getElementById(`editHidden-${prefix}`);

    if (toolbar && hidden) {
      const editor = initEditor({
        element: el,
        hiddenInput: hidden,
        toolbar: toolbar,
        content: content,
        mode: 'full',
        postId: postId,
        enableAiRewrite: !!postId, // Enable if editing a post
      });
      // Sync initial content
      hidden.value = content;
    }
  });
});
