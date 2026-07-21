(function() {
  const CART_KEY = 'gensaberilmu_cart';
  const USER_KEY = 'gensaberilmu_user';
  const ORDER_TOTAL_KEY = 'gensaberilmu_order_total';
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
      setTimeout(function() {
        localStorage.removeItem(CART_KEY);
        window.location.href = 'payment-success.html';
      }, 1500);
    });
  }

  window.addEventListener('click', function(e) {
    if (e.target === snapModal) {
      snapModal.style.display = 'none';
    }
  });

  updateTotal();
})();
