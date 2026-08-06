(function() {
  'use strict';
  const A = window.MemberAPI;

  const profile = A.myProfile();
  const form = document.getElementById('profileForm');
  const nameInput = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  const phoneInput = document.getElementById('profilePhone');
  const whatsappInput = document.getElementById('profileWhatsapp');
  const whatsappCheck = document.getElementById('whatsappSame');
  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const photoRemove = document.getElementById('photoRemove');
  const saveMsg = document.getElementById('saveMsg');

  nameInput.value = profile.name || '';
  emailInput.value = profile.email || '';
  phoneInput.value = profile.phone || '';
  whatsappCheck.checked = profile.whatsappSame !== false;

  if (profile.photo) {
    photoPreview.innerHTML = '<img src="' + A.escapeHtml(profile.photo) + '" alt="" class="profile-photo-img">';
    photoRemove.style.display = '';
  }

  function syncWhatsapp() {
    if (whatsappCheck.checked) {
      whatsappInput.value = phoneInput.value;
      whatsappInput.disabled = true;
      whatsappInput.classList.add('input-disabled');
    } else {
      whatsappInput.disabled = false;
      whatsappInput.classList.remove('input-disabled');
      if (!whatsappInput.value) whatsappInput.value = phoneInput.value;
    }
  }

  syncWhatsapp();

  phoneInput.addEventListener('input', function() {
    if (whatsappCheck.checked) whatsappInput.value = this.value;
  });

  whatsappCheck.addEventListener('change', syncWhatsapp);

  photoInput.addEventListener('change', function() {
    const file = this.files && this.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto maksimal 2MB.');
      this.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      photoPreview.innerHTML = '<img src="' + e.target.result + '" alt="" class="profile-photo-img">';
      photoRemove.style.display = '';
      profile.photo = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  photoRemove.addEventListener('click', function() {
    photoPreview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="profile-photo-placeholder"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    photoRemove.style.display = 'none';
    photoInput.value = '';
    profile.photo = '';
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      name: nameInput.value.trim(),
      email: profile.email,
      phone: phoneInput.value.trim(),
      whatsapp: whatsappInput.value.trim(),
      whatsappSame: whatsappCheck.checked,
      photo: profile.photo || ''
    };
    A.saveProfile(data);
    saveMsg.textContent = 'Profil berhasil disimpan.';
    saveMsg.classList.add('profile-save-msg--show');
    setTimeout(function() {
      saveMsg.classList.remove('profile-save-msg--show');
    }, 2500);
  });
})();
