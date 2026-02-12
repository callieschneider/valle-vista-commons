import { initEditor } from '/js/editor.js';

document.addEventListener('DOMContentLoaded', () => {
  // Track all editor instances for form-submit sync
  const editors = [];

  // Initialize board notes composer editor
  const notesEl = document.getElementById('notesEditor');
  if (notesEl) {
    const notesHidden = document.getElementById('notesHidden');
    const ed = initEditor({
      element: notesEl,
      hiddenInput: notesHidden,
      toolbar: document.getElementById('notesToolbar'),
      content: '',
      mode: 'full',
      postId: null,
      enableAiRewrite: true,
    });
    editors.push({ editor: ed, hidden: notesHidden, el: notesEl });
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
        enableAiRewrite: !!postId,
      });
      // Sync initial content
      hidden.value = content;
      editors.push({ editor, hidden, el });
    }
  });

  // Safety net: on ANY form submit, force-sync the editor's current HTML
  // to its hidden input. Catches all edge cases (AI rewrite, paste, etc.)
  document.addEventListener('submit', (e) => {
    const form = e.target;
    editors.forEach(({ editor, hidden, el }) => {
      if (form.contains(hidden)) {
        hidden.value = editor.getHTML();
      }
    });
  });
});
