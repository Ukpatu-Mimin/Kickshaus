// ===============================================
// GLOBAL STATE MANAGEMENT - KICKSHAUS E-COMMERCE
// ===============================================

// ===== GLOBAL STATE =====
const KickshausState = {
  favorites: JSON.parse(localStorage.getItem('kickshaus_favorites')) || [],
  cart: JSON.parse(localStorage.getItem('kickshaus_cart')) || [],
  
  // Save state to localStorage
  saveFavorites() {
    localStorage.setItem('kickshaus_favorites', JSON.stringify(this.favorites));
  },
  
  saveCart() {
    localStorage.setItem('kickshaus_cart', JSON.stringify(this.cart));
  },
  
  // Add to favorites
  addFavorite(product) {
    const exists = this.favorites.find(item => item.id === product.id);
    if (!exists) {
      this.favorites.push(product);
      this.saveFavorites();
      this.updateBadges();
      return true;
    }
    return false;
  },
  
  // Remove from favorites
  removeFavorite(productId) {
    this.favorites = this.favorites.filter(item => item.id !== productId);
    this.saveFavorites();
    this.updateBadges();
  },
  
  // Toggle favorite
  toggleFavorite(product) {
    const exists = this.favorites.find(item => item.id === product.id);
    if (exists) {
      this.removeFavorite(product.id);
      return false;
    } else {
      this.addFavorite(product);
      return true;
    }
  },
  
  // Check if product is favorited
  isFavorited(productId) {
    return this.favorites.some(item => item.id === productId);
  },
  
  // Helper to extract image URL from various formats
  getProductImage(product) {
    // Direct image property
    if (product.image && typeof product.image === 'string') {
      return product.image;
    }
    // Images as array
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    // Images as object
    if (product.images && typeof product.images === 'object') {
      return product.images.main || product.images.primary || '';
    }
    return '';
  },
  
  // Add to cart
  addToCart(product) {
    const existingItem = this.cart.find(item => 
      item.id === product.id && 
      item.size === product.size && 
      item.color === product.color
    );
    
    if (existingItem) {
      existingItem.quantity++;
    } else {
      // Ensure price is a valid number
      const price = Number(product.price) || Number(product.base_price) || 0;
      
      this.cart.push({
        id: product.id,
        name: product.name,
        price: price,
        image: this.getProductImage(product),
        size: product.size || 'N/A',
        color: product.color || 'N/A',
        quantity: 1
      });
    }
    
    this.saveCart();
    this.updateBadges();
  },
  
  // Remove from cart
  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.saveCart();
    this.updateBadges();
  },
  
  // Update cart item quantity
  updateCartQuantity(index, quantity) {
    if (quantity <= 0) {
      this.removeFromCart(index);
    } else {
      this.cart[index].quantity = quantity;
      this.saveCart();
    }
  },
  
  // Clear cart
  clearCart() {
    this.cart = [];
    this.saveCart();
    this.updateBadges();
  },
  
  // Get cart total
  getCartTotal() {
    return this.cart.reduce((total, item) => total + ((Number(item.price) || 0) * (item.quantity || 1)), 0);
  },
  
  // Get cart item count
  getCartItemCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  },
  
  // Update all badges on the page
  updateBadges() {
    // Update favorite badges
    const favBadges = document.querySelectorAll('.badge-favorites, #favoriteBadge, .heart-btn .badge');
    favBadges.forEach(badge => {
      badge.textContent = this.favorites.length;
      badge.style.display = this.favorites.length > 0 ? 'flex' : 'none';
    });
    
    // Update cart badges
    const cartBadges = document.querySelectorAll('.badge-cart, #cartBadge, .cart-btn .badge');
    cartBadges.forEach(badge => {
      badge.textContent = this.getCartItemCount();
      badge.style.display = this.getCartItemCount() > 0 ? 'flex' : 'none';
    });
  }
};

// ===== PRODUCT DATABASE (CACHE) =====
// Products are now fetched from the API. This serves as a cache/fallback.
let PRODUCTS_DATABASE = [];

/**
 * Load products from the API
 * @returns {Promise<Array>} Array of products
 */
async function loadProductsFromAPI() {
  try {
    // Use the api object from js/api.js or KickshausAPI from api-client.js
    const apiClient = window.api || window.KickshausAPI;
    if (!apiClient) {
      console.warn('API client not available, using cached products');
      return PRODUCTS_DATABASE;
    }

    const response = await apiClient.getProducts();
    if (response.success && response.data) {
      // Handle both response formats: { data: { products: [...] } } or { data: [...] }
      const products = response.data.products || response.data;
      if (Array.isArray(products)) {
        PRODUCTS_DATABASE = products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand || 'Kickshaus',
          category: p.category,
          price: p.final_price || p.base_price || p.price,
          description: p.description,
          images: p.images ? (Array.isArray(p.images) ? p.images : [p.images.main, p.images.primary, p.images.top, p.images.left, p.images.right].filter(Boolean)) : [],
          badge: p.badge || null,
          stock: p.stock || 0,
          rating: p.rating || 4.5,
          sizes: p.sizes || ['40', '41', '42', '43', '44'],
          colors: p.colors || ['black', 'white']
        }));
        console.log(`✨ Loaded ${PRODUCTS_DATABASE.length} products from API`);
      }
    }
    return PRODUCTS_DATABASE;
  } catch (error) {
    console.error('Failed to load products from API:', error);
    showToast('Could not load products from server', 'error');
    return PRODUCTS_DATABASE;
  }
}

// Get product by ID (checks cache first, then fetches from API if needed)
function getProductById(id) {
  // Convert id to string for comparison since some IDs might be numbers or strings
  return PRODUCTS_DATABASE.find(p => String(p.id) === String(id));
}

/**
 * Get product by ID from API
 * @param {string} id - Product ID
 * @returns {Promise<Object|null>} Product or null
 */
async function getProductByIdAsync(id) {
  // First check cache
  const cached = getProductById(id);
  if (cached) return cached;

  // Fetch from API
  try {
    const apiClient = window.api || window.KickshausAPI;
    if (!apiClient) return null;

    const response = await apiClient.getProduct(id);
    if (response.success && response.data) {
      const p = response.data;
      return {
        id: p.id,
        name: p.name,
        brand: p.brand || 'Kickshaus',
        category: p.category,
        price: p.final_price || p.base_price || p.price,
        description: p.description,
        images: p.images ? (Array.isArray(p.images) ? p.images : [p.images.main, p.images.primary, p.images.top, p.images.left, p.images.right].filter(Boolean)) : [],
        badge: p.badge || null,
        stock: p.stock || 0,
        rating: p.rating || 4.5,
        sizes: p.sizes || ['40', '41', '42', '43', '44'],
        colors: p.colors || ['black', 'white']
      };
    }
  } catch (error) {
    console.error('Failed to fetch product:', error);
  }
  return null;
}

// ===== UTILITY FUNCTIONS =====

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `kickshaus-toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: ${type === 'error' ? '#FF4444' : '#00A8E8'};
    color: white;
    padding: 16px 32px;
    border-radius: 50px;
    font-weight: 600;
    font-family: 'Poppins', sans-serif;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 20000;
    transition: transform 0.3s ease;
    max-width: 90%;
    text-align: center;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 100);
  
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Show confirmation modal
function showConfirmationModal(message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'kickshaus-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 32px; border-radius: 16px; max-width: 400px; width: 100%;">
      <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 16px; color: #1A1A1A;">Confirm Action</h3>
      <p style="color: #666; margin-bottom: 24px; line-height: 1.6;">${message}</p>
      <div style="display: flex; gap: 12px;">
        <button class="modal-cancel" style="flex: 1; padding: 12px; border: 2px solid #E5E5E5; border-radius: 8px; background: white; color: #666; font-weight: 600; cursor: pointer;">Cancel</button>
        <button class="modal-confirm" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: #FF4444; color: white; font-weight: 600; cursor: pointer;">Confirm</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.modal-cancel').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.querySelector('.modal-confirm').addEventListener('click', () => {
    onConfirm();
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Generate star rating HTML
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  let stars = '';
  
  for (let i = 0; i < fullStars; i++) {
    stars += '<i class="fas fa-star"></i>';
  }
  
  if (hasHalf) {
    stars += '<i class="fas fa-star-half-alt"></i>';
  }
  
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars += '<i class="far fa-star"></i>';
  }
  
  return stars;
}

// Format currency
function formatCurrency(amount) {
  return `₦${amount.toLocaleString()}`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Update all badges
  KickshausState.updateBadges();
  
  // Setup user icon click handler
  const userIcons = document.querySelectorAll('.account-btn, .icon-btn[aria-label="Account"]');
  userIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      // Check if KickshausAPI is available and user is authenticated
      if (typeof KickshausAPI !== 'undefined' && KickshausAPI.isAuthenticated()) {
        const user = KickshausAPI.getUser();
        if (user && user.type === 'merchant') {
          window.location.href = 'merchant-dashboard.html';
        } else if (user && user.type === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else {
          // Regular user - redirect to customer dashboard
          window.location.href = 'dashboard.html';
        }
      } else {
        window.location.href = 'login.html';
      }
    });
  });
  
  console.log('✨ Kickshaus Global State Initialized');
  console.log('Favorites:', KickshausState.favorites.length);
  console.log('Cart Items:', KickshausState.getCartItemCount());
});