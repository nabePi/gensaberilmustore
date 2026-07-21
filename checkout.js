(function() {
  const CART_KEY = 'gensaberilmu_cart';
  const USER_KEY = 'gensaberilmu_user';
  const ORDER_TOTAL_KEY = 'gensaberilmu_order_total';
  const ORDERS_KEY = 'gensaberilmu_orders';
  const RECIPIENTS_KEY = 'gensaberilmu_recipients';
  const SUBTOTAL = 80750;

  const checkoutForm = document.getElementById('checkoutForm');
  const citySelect = document.getElementById('city');
  const shippingFeeEl = document.getElementById('shippingFee');
  const totalPaymentEl = document.getElementById('totalPayment');
  const payBtn = document.getElementById('payBtn');
  const snapModal = document.getElementById('snapModal');
  const snapClose = document.getElementById('snapClose');
  const snapConfirmBtn = document.getElementById('snapConfirmBtn');
  const snapAmount = document.getElementById('snapAmount');
  const loginNotice = document.getElementById('loginNotice');
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');

  const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  if (user) {
    if (fullNameInput) fullNameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
  } else {
    if (loginNotice) loginNotice.style.display = 'block';
    if (payBtn) payBtn.disabled = true;
  }

  function formatCurrency(num) {
    return 'Rp ' + num.toLocaleString('id-ID');
  }

  function updateTotal() {
    const selected = citySelect.options[citySelect.selectedIndex];
    const fee = selected && selected.dataset.fee ? parseInt(selected.dataset.fee, 10) : 0;
    shippingFeeEl.textContent = fee > 0 ? formatCurrency(fee) : 'Rp 0';
    totalPaymentEl.textContent = formatCurrency(SUBTOTAL + fee);
    if (snapAmount) snapAmount.textContent = formatCurrency(SUBTOTAL + fee);
  }

  if (citySelect) {
    citySelect.addEventListener('change', updateTotal);
  }

  if (payBtn) {
    payBtn.addEventListener('click', function() {
      if (!user) {
        alert('Silakan login terlebih dahulu untuk melanjutkan pembayaran.');
        window.location.href = 'login.html?redirect=checkout.html';
        return;
      }

      if (!checkoutForm.checkValidity()) {
        checkoutForm.reportValidity();
        return;
      }

      const totalText = totalPaymentEl.textContent;
      localStorage.setItem(ORDER_TOTAL_KEY, totalText);
      snapModal.style.display = 'block';
    });
  }

  if (snapClose) {
    snapClose.addEventListener('click', function() {
      snapModal.style.display = 'none';
    });
  }

  if (snapConfirmBtn) {
    snapConfirmBtn.addEventListener('click', function() {
      snapConfirmBtn.disabled = true;
      snapConfirmBtn.textContent = 'Memproses...';
      saveOrder();
      setTimeout(function() {
        localStorage.removeItem(CART_KEY);
        window.location.href = 'payment-success.html';
      }, 1500);
    });
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function orderIdStamp() {
    const d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  function saveOrder() {
    const selected = citySelect.options[citySelect.selectedIndex];
    const fee = selected && selected.dataset.fee ? parseInt(selected.dataset.fee, 10) : 0;
    const total = SUBTOTAL + fee;
    const totalText = totalPaymentEl ? totalPaymentEl.textContent : formatCurrency(total);
    const methodEl = document.querySelector('input[name="snapMethod"]:checked');
    const recipient = {
      name: fullNameInput ? fullNameInput.value.trim() : '',
      email: emailInput ? emailInput.value.trim() : '',
      phone: phoneInput ? phoneInput.value.trim() : '',
      city: citySelect ? citySelect.value : '',
      address: document.getElementById('address') ? document.getElementById('address').value.trim() : ''
    };

    const order = {
      id: 'GSB' + orderIdStamp(),
      userEmail: user ? user.email : '',
      date: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'paid',
      items: [{
        title: 'Versi Ringkas 48 Laws of Power SC',
        image: 'https://kontan.reneturos.com/storage/products/versi-ringkas-48-laws-of-power.webp',
        qty: 1,
        finalPrice: SUBTOTAL
      }],
      shippingFee: fee,
      total: totalText,
      method: methodEl ? methodEl.value : 'gopay',
      recipient: recipient
    };

    try {
      const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      all.push(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    } catch (e) {}

    if (user && recipient.name) {
      try {
        const rAll = JSON.parse(localStorage.getItem(RECIPIENTS_KEY) || '[]');
        const rId = 'r' + Date.now();
        rAll.push({
          id: rId,
          userEmail: user.email,
          name: recipient.name,
          phone: recipient.phone,
          email: recipient.email,
          address: (recipient.address + (recipient.city ? ', ' + recipient.city : '')).trim()
        });
        localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(rAll));
      } catch (e) {}
    }
  }

  window.addEventListener('click', function(e) {
    if (e.target === snapModal) {
      snapModal.style.display = 'none';
    }
  });

  updateTotal();
})();
