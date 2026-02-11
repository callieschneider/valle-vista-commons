// Tiptap editor initialization — loaded as ES module
// Usage: initEditor({ element, hiddenInput, toolbar, content, mode })

import { Editor } from 'https://esm.sh/@tiptap/core@2';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2';
import ImageResize from 'https://esm.sh/tiptap-extension-resize-image@1';
import Link from 'https://esm.sh/@tiptap/extension-link@2';

// Custom Video node (Tiptap doesn't have a built-in one)
import { Node, mergeAttributes } from 'https://esm.sh/@tiptap/core@2';

const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'video[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, {
      controls: '',
      preload: 'metadata',
      style: 'max-width: 100%; border-radius: 8px;',
    })];
  },
});

// Upload a file to our server
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

// Initialize a Tiptap editor instance
export function initEditor({ element, hiddenInput, toolbar, content = '', mode = 'full' }) {
  const extensions = [
    StarterKit.configure({
      heading: mode === 'full' ? { levels: [2, 3] } : false,
      blockquote: mode === 'full',
    }),
    ImageResize.configure({
      inline: true,
      allowBase64: false,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
    }),
    Video,
  ];

  const editor = new Editor({
    element,
    extensions,
    content: content || '<p></p>',
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        style: 'min-height: 120px; outline: none; padding: 10px;',
      },
    },
    onUpdate: ({ editor }) => {
      // Sync HTML to hidden input for form submission
      if (hiddenInput) {
        hiddenInput.value = editor.getHTML();
      }
    },
  });

  // Set up toolbar buttons
  if (toolbar) {
    setupToolbar(toolbar, editor);
  }

  // Handle paste/drop of files
  element.addEventListener('drop', async (e) => {
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    e.preventDefault();
    for (const file of files) {
      await handleFileInsert(editor, file);
    }
  });

  element.addEventListener('paste', async (e) => {
    const files = e.clipboardData?.files;
    if (!files?.length) return;
    for (const file of files) {
      await handleFileInsert(editor, file);
    }
  });

  return editor;
}

async function handleFileInsert(editor, file) {
  if (file.type.startsWith('image/')) {
    try {
      const result = await uploadFile(file);
      editor.chain().focus().setImage({ src: result.url }).run();
    } catch (err) {
      alert('Image upload failed: ' + err.message);
    }
  } else if (file.type.startsWith('video/')) {
    try {
      const result = await uploadFile(file);
      editor.chain().focus().insertContent({
        type: 'video',
        attrs: { src: result.url },
      }).run();
    } catch (err) {
      alert('Video upload failed: ' + err.message);
    }
  }
}

function setupToolbar(toolbar, editor) {
  toolbar.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = btn.dataset.action;

      switch (action) {
        case 'bold':
          editor.chain().focus().toggleBold().run();
          break;
        case 'italic':
          editor.chain().focus().toggleItalic().run();
          break;
        case 'heading2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'heading3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bulletList':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'orderedList':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'blockquote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'link': {
          const url = prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          } else {
            editor.chain().focus().unsetLink().run();
          }
          break;
        }
        case 'image': {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/jpeg,image/png,image/gif,image/webp';
          input.onchange = async () => {
            if (input.files[0]) {
              try {
                const result = await uploadFile(input.files[0]);
                editor.chain().focus().setImage({ src: result.url }).run();
              } catch (err) {
                alert('Upload failed: ' + err.message);
              }
            }
          };
          input.click();
          break;
        }
        case 'video': {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'video/mp4,video/webm';
          input.onchange = async () => {
            if (input.files[0]) {
              try {
                const result = await uploadFile(input.files[0]);
                editor.chain().focus().insertContent({
                  type: 'video',
                  attrs: { src: result.url },
                }).run();
              } catch (err) {
                alert('Upload failed: ' + err.message);
              }
            }
          };
          input.click();
          break;
        }
      }

      // Update active states
      updateToolbarState(toolbar, editor);
    });
  });

  // Update active states on selection change
  editor.on('selectionUpdate', () => updateToolbarState(toolbar, editor));
  editor.on('update', () => updateToolbarState(toolbar, editor));
}

function updateToolbarState(toolbar, editor) {
  toolbar.querySelectorAll('[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    let isActive = false;
    switch (action) {
      case 'bold': isActive = editor.isActive('bold'); break;
      case 'italic': isActive = editor.isActive('italic'); break;
      case 'heading2': isActive = editor.isActive('heading', { level: 2 }); break;
      case 'heading3': isActive = editor.isActive('heading', { level: 3 }); break;
      case 'bulletList': isActive = editor.isActive('bulletList'); break;
      case 'orderedList': isActive = editor.isActive('orderedList'); break;
      case 'blockquote': isActive = editor.isActive('blockquote'); break;
      case 'link': isActive = editor.isActive('link'); break;
    }
    btn.classList.toggle('active', isActive);
  });
}
