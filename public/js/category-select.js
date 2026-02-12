// Category selector for submit form
function selectCat(el) {
  document.querySelectorAll('.category-option').forEach(function(o) { 
    o.classList.remove('selected'); 
  });
  el.classList.add('selected');
}

// Make globally available
window.selectCat = selectCat;
