(function() {
  'use strict';
  const A = window.MemberAPI;
  const { escapeHtml, encodeWhatsApp } = A;

  const list = document.getElementById('recipientsList');
  const empty = document.getElementById('recipientsEmpty');
  const count = document.getElementById('recipientsCount');
  const modal = document.getElementById('recipientModal');
  const form = document.getElementById('recipientForm');
  const title = document.getElementById('recipientModalTitle');

  function render() {
    const recipients = A.myRecipients();
    if (count) count.textContent = recipients.length ? recipients.length + ' penerima' : '';

    if (!recipients.length) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    list.innerHTML = recipients.map(r => '' +
      '<article class="recipient-card" data-id="' + escapeHtml(r.id) + '">' +
        '<div class="recipient-head">' +
          '<div class="recipient-name">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            escapeHtml(r.name) +
          '</div>' +
          '<div class="recipient-actions">' +
            '<button type="button" class="icon-text-btn edit-recipient" data-id="' + escapeHtml(r.id) + '">Ubah</button>' +
            '<button type="button" class="icon-text-btn danger del-recipient" data-id="' + escapeHtml(r.id) + '">Hapus</button>' +
          '</div>' +
        '</div>' +
        '<dl class="recipient-detail">' +
          '<div><dt>WhatsApp</dt><dd><a href="https://wa.me/' + encodeWhatsApp(r.phone) + '" target="_blank" rel="noopener">' + escapeHtml(r.phone) + '</a></dd></div>' +
          '<div><dt>Email</dt><dd><a href="mailto:' + escapeHtml(r.email) + '">' + escapeHtml(r.email) + '</a></dd></div>' +
        '</dl>' +
        '<div class="recipient-address">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10" r="3"/></svg>' +
          '<span>' + escapeHtml(r.address) + '</span>' +
        '</div>' +
      '</article>'
    ).join('');

    list.querySelectorAll('.edit-recipient').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.id)));
    list.querySelectorAll('.del-recipient').forEach(btn => btn.addEventListener('click', () => del(btn.dataset.id)));
  }

  function openModal(id) {
    form.reset();
    document.getElementById('recipientId').value = id || '';
    title.textContent = id ? 'Ubah Penerima' : 'Tambah Penerima';
    if (id) {
      const r = A.myRecipients().find(x => x.id === id);
      if (r) {
        document.getElementById('recipientName').value = r.name || '';
        document.getElementById('recipientPhone').value = r.phone || '';
        document.getElementById('recipientEmail').value = r.email || '';
        document.getElementById('recipientAddress').value = r.address || '';
      }
    }
    modal.style.display = 'flex';
  }
  function closeModal() { modal.style.display = 'none'; }

  document.getElementById('addRecipientBtn').addEventListener('click', () => openModal());
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('recipientId').value || ('r' + Date.now());
    const payload = {
      id,
      userEmail: A.user.email,
      name: document.getElementById('recipientName').value.trim(),
      phone: document.getElementById('recipientPhone').value.trim(),
      email: document.getElementById('recipientEmail').value.trim(),
      address: document.getElementById('recipientAddress').value.trim()
    };
    const all = A.allRecipients();
    const idx = all.findIndex(r => r.id === id);
    if (idx >= 0) all[idx] = payload; else all.push(payload);
    A.write(A.keys.RECIPIENTS_KEY, all);
    closeModal();
    render();
  });

  function del(id) {
    const r = A.myRecipients().find(x => x.id === id);
    if (!r) return;
    if (!confirm('Hapus penerima "' + r.name + '"?')) return;
    const all = A.allRecipients().filter(x => x.id !== id);
    A.write(A.keys.RECIPIENTS_KEY, all);
    render();
  }

  render();
})();
