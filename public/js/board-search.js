// Client-side search for the public board
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('boardSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const q = this.value.toLowerCase().trim();
      document.querySelectorAll('.searchable').forEach(card => {
        const text = card.getAttribute('data-text') || '';
        card.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
      // Hide empty section headers
      document.querySelectorAll('.section-block').forEach(block => {
        const visible = block.querySelectorAll('.searchable:not([style*="display: none"])');
        block.style.display = visible.length > 0 ? '' : 'none';
      });
    });
  }
});
