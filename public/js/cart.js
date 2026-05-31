// ===============================================
// CART PAGE LOGIC - KICKSHAUS
// ===============================================

// Depends on global-state.js and api-client.js

document.addEventListener('DOMContentLoaded', () => {
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const emptyCartState = document.getElementById('emptyCartState');
  const cartSummary = document.getElementById('cartSummary');
  const cartItemCount = document.getElementById('cartItemCount');

  // Initial render
  renderCart();

  // Listen for storage changes (in case cart is updated in another tab)
  window.addEventListener('storage', (e) => {
    if (e.key === 'kickshaus_cart') {
      KickshausState.cart = JSON.parse(e.newValue || '[]');
      renderCart();
    }
  });

  // ===== RENDER CART =====
  function renderCart() {
    const cart = KickshausState.cart;
    const totalItems = KickshausState.getCartItemCount();

    // Update header count
    if (cartItemCount) {
      cartItemCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
    }

    // Handle empty state
    if (cart.length === 0) {
      if (cartItemsContainer) cartItemsContainer.style.display = 'none';
      if (cartSummary) cartSummary.style.display = 'none';
      if (emptyCartState) emptyCartState.style.display = 'block';
      return;
    }

    // Show cart
    if (cartItemsContainer) cartItemsContainer.style.display = 'block';
    if (cartSummary) cartSummary.style.display = 'block';
    if (emptyCartState) emptyCartState.style.display = 'none';

    // Render items
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = cart.map((item, index) => {
        const imageUrl = item.image 
          || (Array.isArray(item.images) && item.images[0]) 
          || (item.images && item.images.main) 
          || 'images/placeholder.svg';

        return `
        <div class="cart-item bg-white rounded-xl p-5 grid grid-cols-1 md:grid-cols-6 items-center gap-4 shadow-sm hover:shadow-md transition">
          <!-- IMAGE + NAME -->
          <div class="flex items-center gap-4 col-span-2 cursor-pointer" onclick="window.location.href='product-detail.html?id=${item.id}'">
            <div class="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              <img src="${imageUrl}" class="w-full h-full object-contain" alt="${item.name}">
            </div>
            <div>
              <p class="font-semibold text-lg">${item.name}</p>
              <p class="text-sm text-gray-500">Size: ${item.size || 'N/A'} • Color: ${item.color || 'N/A'}</p>
            </div>
          </div>

          <!-- PRICE -->
          <div class="font-semibold text-lg">₦${Number(item.price).toLocaleString()}</div>

          <!-- QUANTITY -->
          <div class="flex items-center border rounded-lg w-fit">
            <button class="px-3 py-2 hover:bg-gray-100 transition" onclick="updateCartQuantity(${index}, ${item.quantity - 1})">
              <i class="fas fa-minus"></i>
            </button>
            <span class="px-4 py-2 font-semibold">${item.quantity}</span>
            <button class="px-3 py-2 hover:bg-gray-100 transition" onclick="updateCartQuantity(${index}, ${item.quantity + 1})">
              <i class="fas fa-plus"></i>
            </button>
          </div>

          <!-- SUBTOTAL -->
          <div class="font-bold text-lg text-blue-600">₦${(item.price * item.quantity).toLocaleString()}</div>

          <!-- REMOVE -->
          <button class="text-2xl text-gray-400 hover:text-red-600 transition" onclick="removeCartItem(${index})" aria-label="Remove item">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `}).join('');
    }

    updateCartTotal();
  }

  // ===== UPDATE TOTALS =====
  function updateCartTotal() {
    const subtotal = KickshausState.getCartTotal();
    const tax = Math.round(subtotal * 0.075); // 7.5% tax
    const total = subtotal + tax;

    const subtotalEl = document.getElementById('subtotalAmount');
    const taxEl = document.getElementById('taxAmount');
    const totalEl = document.getElementById('totalAmount');

    if (subtotalEl) subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;
    if (taxEl) taxEl.textContent = `₦${tax.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `₦${total.toLocaleString()}`;

    // Save summary for checkout
    localStorage.setItem('checkoutSummary', JSON.stringify({
      subtotal,
      tax,
      total,
      itemCount: KickshausState.getCartItemCount(),
      isBuyNow: false // Explicitly not buy now
    }));
  }

  // Expose functions globally for onclick handlers
  window.updateCartQuantity = function(index, quantity) {
    KickshausState.updateCartQuantity(index, quantity);
    renderCart();
  };

  window.removeCartItem = function(index) {
    const item = KickshausState.cart[index];
    if (confirm(`Remove "${item.name}" from cart?`)) {
      KickshausState.removeFromCart(index);
      renderCart();
    }
  };
});