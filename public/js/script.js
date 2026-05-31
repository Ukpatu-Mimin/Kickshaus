// ===============================================
// PREMIUM FOOTWEAR E-COMMERCE - ENHANCED INTERACTIVE JS
// ===============================================

// This file depends on global-state.js being loaded first

// ===== HELPER FUNCTIONS =====
/**
 * Get the primary image URL for a product
 * @param {Object} product - Product object
 * @returns {string} - Image URL or placeholder
 */
function getProductImageUrl(product) {
  const placeholder = 'images/placeholder.svg';
  if (!product || !product.images) return placeholder;
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }
  if (typeof product.images === 'object' && product.images.main) {
    return product.images.main;
  }
  return placeholder;
}

// ===== THEME TOGGLE =====
{
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const body = document.body;
    const themeIcon = themeToggle.querySelector('i');

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      body.classList.add('dark-theme');
      themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggle.addEventListener('click', () => {
      body.classList.toggle('dark-theme');
      const isDark = body.classList.contains('dark-theme');
      
      if (isDark) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
      } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
      }
    });
  }
}

// ===== SEARCH FUNCTIONALITY =====
function initializeSearch() {
  const searchButtons = document.querySelectorAll('.icon-btn[aria-label="Search"], button[aria-label="Search"]');
  
  searchButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showSearchModal();
    });
  });
}

function showSearchModal() {
  const modal = document.createElement('div');
  modal.className = 'search-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 10002;
    padding-top: 100px;
    animation: fadeIn 0.3s ease;
  `;
  
  modal.innerHTML = `
    <div style="background: var(--bg-card, white); padding: 32px; border-radius: 20px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary, #1A1A1A);">Search Products</h3>
        <button class="close-search" style="font-size: 2rem; border: none; background: none; cursor: pointer; color: var(--text-muted, #999);">&times;</button>
      </div>
      
      <div style="position: relative; margin-bottom: 24px;">
        <input 
          type="text" 
          id="searchInput" 
          placeholder="Search for shoes, categories..."
          style="width: 100%; padding: 16px 48px 16px 16px; border: 2px solid var(--border-color, #E5E5E5); border-radius: 12px; font-size: 1rem; background: var(--bg-primary, #F5F5F7); color: var(--text-primary, #1A1A1A);"
          autofocus
        />
        <i class="fas fa-search" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted, #999); font-size: 1.2rem;"></i>
      </div>
      
      <div id="searchResults" style="display: grid; gap: 16px;">
        <p style="text-align: center; color: var(--text-muted, #999); padding: 20px;">Type to search products...</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const closeBtn = modal.querySelector('.close-search');
  const searchInput = modal.querySelector('#searchInput');
  const resultsContainer = modal.querySelector('#searchResults');
  
  closeBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Search functionality
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(e.target.value, resultsContainer);
    }, 300);
  });
}

function performSearch(query, resultsContainer) {
  if (!query.trim()) {
    resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted, #999); padding: 20px;">Type to search products...</p>';
    return;
  }
  
  const results = PRODUCTS_DATABASE.filter(product => 
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.category.toLowerCase().includes(query.toLowerCase()) ||
    product.description.toLowerCase().includes(query.toLowerCase())
  );
  
  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <p style="text-align: center; color: var(--text-muted, #999); padding: 20px;">
        No products found for "${query}"
      </p>
    `;
    return;
  }
  
  resultsContainer.innerHTML = results.map(product => `
    <div 
      onclick="window.location.href='product-detail.html?id=${product.id}'"
      style="display: flex; gap: 16px; padding: 16px; border: 1px solid var(--border-color, #E5E5E5); border-radius: 12px; cursor: pointer; transition: all 0.3s; background: var(--bg-card, white);"
      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
    >
      <img src="${product.images[0]}" alt="${product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />
      <div style="flex: 1;">
        <h4 style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary, #1A1A1A);">${product.name}</h4>
        <p style="font-size: 0.9rem; color: var(--text-muted, #999); margin-bottom: 8px;">${product.category}</p>
        <p style="font-size: 1.2rem; font-weight: 700; color: var(--primary, #00A8E8);">${formatCurrency(product.price)}</p>
      </div>
    </div>
  `).join('');
}

// ===== RENDER PRODUCTS (Home Page) =====
function renderProducts() {
  const grid = document.querySelector('.products-grid');
  if (!grid) return;
  
  const products = PRODUCTS_DATABASE.slice(0, 6); // Show first 6 products
  
  // Handle empty state
  if (products.length === 0) {
    grid.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">No products available at the moment. Please check back later.</p>';
    return;
  }
  
  grid.innerHTML = products.map(product => `
    <div class="product-card" data-id="${product.id}">
      <div class="product-image" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor: pointer;">
        <img src="${getProductImageUrl(product)}" alt="${product.name}">
        <div class="product-actions" style="opacity: 1; transform: translateX(0);">
          <button class="action-btn favorite-btn ${KickshausState.isFavorited(product.id) ? 'active' : ''}" 
                  data-id="${product.id}" 
                  onclick="event.stopPropagation(); handleFavoriteClick(${JSON.stringify(product).replace(/"/g, '&quot;')}, this);"
                  aria-label="Add to favorites">
            <i class="${KickshausState.isFavorited(product.id) ? 'fas' : 'far'} fa-heart"></i>
          </button>
          <button class="action-btn quick-view-btn" 
                  data-id="${product.id}" 
                  onclick="event.stopPropagation(); window.location.href='product-detail.html?id=${product.id}';"
                  aria-label="Quick view">
            <i class="fas fa-eye"></i>
          </button>
        </div>
        ${product.badge ? `<span class="product-badge ${product.badge}">${product.badge === 'new' ? 'New' : product.badge === 'bestseller' ? 'Best Seller' : '-20%'}</span>` : ''}
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-category">${product.category}</p>
        ${product.rating ? `
        <div class="product-rating">
          ${generateStars(product.rating)}
          <span>(${product.rating})</span>
        </div>
        ` : ''}
        <div class="product-footer">
          <span class="product-price">${formatCurrency(product.price)}</span>
          <button class="btn-icon add-cart" 
                  data-id="${product.id}" 
                  onclick="event.stopPropagation(); handleQuickAddToCart(${JSON.stringify(product).replace(/"/g, '&quot;')});"
                  aria-label="Add to cart">
            <i class="fas fa-shopping-bag"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== RENDER FEATURED PRODUCTS =====
function renderFeatured() {
  const grid = document.querySelector('.featured-grid');
  if (!grid) return;
  
  const featuredProducts = PRODUCTS_DATABASE.slice(0, 4);
  
  // Handle empty state
  if (featuredProducts.length === 0) {
    grid.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">No featured products available.</p>';
    return;
  }
  
  grid.innerHTML = featuredProducts.map(product => `
    <div class="featured-card" data-id="${product.id}" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor:pointer;">
      <div class="featured-image">
        <img src="${getProductImageUrl(product)}" alt="${product.name}">
        <div class="product-actions" style="position:absolute; top:12px; right:12px; display:flex; flex-direction:column; gap:8px;">
          <button class="action-btn favorite-btn ${KickshausState.isFavorited(product.id) ? 'active' : ''}" 
                  data-id="${product.id}" 
                  onclick="event.stopPropagation(); handleFavoriteClick(${JSON.stringify(product).replace(/"/g, '&quot;')}, this);"
                  aria-label="Add to favorites">
            <i class="${KickshausState.isFavorited(product.id) ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
      </div>
      <div class="featured-info">
        <h3 class="featured-name">${product.name}</h3>
        <div class="product-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
          <span class="featured-price">${formatCurrency(product.price)}</span>
          <button class="btn-icon add-cart" 
                  data-id="${product.id}" 
                  onclick="event.stopPropagation(); handleQuickAddToCart(${JSON.stringify(product).replace(/"/g, '&quot;')});"
                  aria-label="Add to cart">
            <i class="fas fa-shopping-bag"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== RENDER BESTSELLERS =====
function renderBestsellers() {
  const grid = document.querySelector('.bestsellers-grid');
  if (!grid) return;
  
  let bestSellers = PRODUCTS_DATABASE.filter(p => p.badge === 'bestseller').slice(0, 3);
  if (bestSellers.length === 0) {
    // If no bestsellers, show first 3 products
    bestSellers = PRODUCTS_DATABASE.slice(0, 3);
  }
  
  // Handle empty state
  if (bestSellers.length === 0) {
    grid.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">No bestsellers available.</p>';
    return;
  }
  
  grid.innerHTML = bestSellers.map(product => `
    <div class="product-card featured" data-id="${product.id}" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor:pointer;">
      <div class="product-image">
        <img src="${getProductImageUrl(product)}" alt="${product.name}">
        <div class="product-actions">
          <button class="action-btn favorite-btn ${KickshausState.isFavorited(product.id) ? 'active' : ''}" 
                  data-id="${product.id}" 
                  onclick="event.stopPropagation(); handleFavoriteClick(${JSON.stringify(product).replace(/"/g, '&quot;')}, this);"
                  aria-label="Add to favorites">
            <i class="${KickshausState.isFavorited(product.id) ? 'fas' : 'far'} fa-heart"></i>
          </button>
          <button class="action-btn quick-view-btn" 
                  data-id="${product.id}" 
                  onclick="event.stopPropagation(); window.location.href='product-detail.html?id=${product.id}';"
                  aria-label="Quick view">
            <i class="fas fa-eye"></i>
          </button>
        </div>
        <span class="product-badge bestseller">Best Seller</span>
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-category">${product.category}</p>
        <div class="product-rating">
          ${generateStars(product.rating || 4.5)}
          <span>(${product.rating || 4.5})</span>
        </div>
        <div class="product-footer">
          <span class="product-price">${formatCurrency(product.price)}</span>
          <button class="btn-icon add-cart" 
                  data-id="${product.id}" 
                  onclick="event.stopPropagation(); handleQuickAddToCart(${JSON.stringify(product).replace(/"/g, '&quot;')});"
                  aria-label="Add to cart">
            <i class="fas fa-shopping-bag"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== RENDER REVIEWS =====
const reviews = [
  {
    name: "Sarah Johnson",
    rating: 5,
    text: "Absolutely love the quality and comfort! Best purchase I've made this year.",
    avatar: "https://i.pravatar.cc/150?img=12"
  },
  {
    name: "Mike Chen",
    rating: 5,
    text: "Fast shipping and amazing customer service. Will definitely shop here again!",
    avatar: "https://i.pravatar.cc/150?img=33"
  },
  {
    name: "Emma Wilson",
    rating: 4.5,
    text: "Great selection and perfect fit. These shoes exceeded my expectations!",
    avatar: "https://i.pravatar.cc/150?img=45"
  }
];

function renderReviews() {
  const grid = document.querySelector('.reviews-grid');
  if (!grid) return;
  
  grid.innerHTML = reviews.map(review => `
    <div class="review-card">
      <div class="review-avatar">
        <img src="${review.avatar}" alt="${review.name}">
      </div>
      <div class="review-content">
        <div class="review-rating">
          ${generateStars(review.rating)}
        </div>
        <p class="review-text">"${review.text}"</p>
        <p class="review-author">${review.name}</p>
      </div>
    </div>
  `).join('');
}

// ===== FAVORITE HANDLING =====
function handleFavoriteClick(product, btn) {
  const isFavorited = KickshausState.toggleFavorite(product);
  const icon = btn.querySelector('i');
  
  if (isFavorited) {
    icon.classList.replace('far', 'fas');
    btn.classList.add('active');
    showToast('Added to favorites!');
  } else {
    icon.classList.replace('fas', 'far');
    btn.classList.remove('active');
    showToast('Removed from favorites');
  }
}

// ===== QUICK ADD TO CART =====
function handleQuickAddToCart(product) {
  KickshausState.addToCart({
    ...product,
    size: product.sizes ? product.sizes[0] : 'N/A',
    color: product.colors ? product.colors[0] : 'N/A'
  });
  showToast('Added to cart! Continue shopping or checkout.');
}

// ===== CAROUSEL DOTS =====
const heroSlides = [
  {
    id: 1,
    image: "images/hero-shoe-1.png",
    alt: "Nike React Infinity Run"
  },
  {
    id: 2,
    image: "images/hero-shoe-2.png",
    alt: "Red Sports Sneaker"
  },
  {
    id: 3,
    image: "images/hero-shoe-3.png",
    alt: "Premium Sneaker Collection"
  }
];

function initializeCarousel() {
  const dots = document.querySelectorAll('.carousel-dots .dot');
  const heroShoeImg = document.querySelector('.hero-shoe');
  let currentSlide = 0;

  function updateHeroCarousel() {
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentSlide);
    });
    
    if (heroShoeImg) {
      heroShoeImg.style.opacity = '0';
      heroShoeImg.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        heroShoeImg.src = heroSlides[currentSlide].image;
        heroShoeImg.alt = heroSlides[currentSlide].alt;
        heroShoeImg.style.opacity = '1';
        heroShoeImg.style.transform = 'scale(1)';
      }, 300);
    }
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      currentSlide = index;
      updateHeroCarousel();
    });
  });

  // Auto-rotate carousel every 5 seconds
  setInterval(() => {
    currentSlide = (currentSlide + 1) % heroSlides.length;
    updateHeroCarousel();
  }, 5000);
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== BACK TO TOP BUTTON =====
function initializeBackToTop() {
  const backToTop = document.getElementById('backToTop');
  if (!backToTop) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== HEADER SCROLL EFFECT =====
function initializeHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    
    if (currentScroll > 100) {
      header.style.boxShadow = 'var(--shadow-md)';
    } else {
      header.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
  });
}

// ===== CONTACT FORM =====
function initializeContactForm() {
  const contactForm = document.querySelector('.contact-form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      message: document.getElementById('message').value
    };
    
    console.log('Form submitted:', formData);
    showToast('Message sent successfully!');
    contactForm.reset();
  });
}

// ===== MOBILE MENU =====
function initializeMobileMenu() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = mobileMenuToggle.querySelector('i');
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-times');
    });
  }
}

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
function initializeAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.product-card, .featured-card, .review-card').forEach(el => {
    observer.observe(el);
  });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
  // Load products from API first, then render
  await loadProducts();
  
  // Initialize features
  initializeSearch();
  initializeCarousel();
  initializeBackToTop();
  initializeHeaderScroll();
  initializeContactForm();
  initializeMobileMenu();
  initializeAnimations();
  
  console.log('✨ Kickshaus initialized successfully!');
});

/**
 * Load products from the API and render all product sections
 */
async function loadProducts() {
  try {
    // Show loading state
    const productGrid = document.querySelector('.products-grid');
    const featuredGrid = document.querySelector('.featured-grid');
    const bestsellersGrid = document.querySelector('.bestsellers-grid');
    
    if (productGrid) {
      productGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-muted);">Loading products...</p>';
    }
    
    // Load products from API (this function is defined in global-state.js)
    if (typeof loadProductsFromAPI === 'function') {
      await loadProductsFromAPI();
    }
    
    // Render all sections with loaded products
    renderProducts();
    renderFeatured();
    renderBestsellers();
    renderReviews();
    
  } catch (error) {
    console.error('Failed to load products:', error);
    showToast('Could not load products. Please try again later.', 'error');
    
    // Show error state
    const productGrid = document.querySelector('.products-grid');
    if (productGrid) {
      productGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--accent);">Failed to load products. Please refresh the page.</p>';
    }
  }
}