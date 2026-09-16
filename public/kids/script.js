const dialog = document.querySelector('#preview-dialog');
const previewImage = document.querySelector('#preview-image');
const previewTitle = document.querySelector('#preview-title');
let trigger;
document.querySelectorAll('[data-preview]').forEach((button) => {
  button.addEventListener('click', () => {
    trigger = button;
    previewImage.src = button.dataset.preview;
    previewImage.alt = button.dataset.title;
    previewTitle.textContent = button.dataset.title;
    dialog.showModal();
    document.body.classList.add('modal-open');
  });
});
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (
    event.target === dialog &&
    (event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom)
  )
    dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  trigger?.focus();
});
document.querySelector('#year').textContent = new Date().getFullYear();
