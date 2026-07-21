(function() {
  'use strict';
  const A = window.MemberAPI;
  const { orderCardHTML, bindOrderActions } = A;

  const list = document.getElementById('ordersList');
  const empty = document.getElementById('ordersEmpty');
  const count = document.getElementById('ordersCount');
  const statusFilter = document.getElementById('statusFilter');

  function render() {
    let orders = A.myOrders().slice().reverse();
    const filter = statusFilter ? statusFilter.value : 'all';
    if (filter !== 'all') orders = orders.filter(o => o.status === filter);

    count.textContent = orders.length ? orders.length + ' transaksi' : '';
    if (!orders.length) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = orders.map(orderCardHTML).join('');
    bindOrderActions(list);
  }

  if (statusFilter) statusFilter.addEventListener('change', render);
  render();
})();
