/**
 * MERCHANT DASHBOARD FUNCTIONS
 * Handles interactivity, tab switching, and data fetching for merchants.
 */
const API_BASE = '/api';

// Helper for authenticated requests with auto-logout on 401
async function fetchAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('kickshaus_auth_token');
  
  const defaultHeaders = {
    "Authorization": `Bearer ${token}`
  };

  const headers = { ...defaultHeaders, ...(options.headers || {}) };
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("kickshaus_auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("kickshaus_user");
    localStorage.removeItem("userType");
    window.location.href = "merchant-login.html?error=session_expired";
    throw new Error("Session expired");
  }

  return response;
}

document.addEventListener('DOMContentLoaded', () => {
  checkMerchantAuth();
  setupNavigation();
  setupLogout();
  
  // Initial data load
  loadDashboardData();
  
  // Refresh data every 30 seconds
  setInterval(loadDashboardData, 30000);
});

function checkMerchantAuth() {
  const token = localStorage.getItem('token') || localStorage.getItem('kickshaus_auth_token');
  const userType = localStorage.getItem('userType');
  const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('kickshaus_user') || '{}');
  
  const isMerchant = userType === 'merchant' || user.type === 'merchant';
  
  if (!token || !isMerchant) {
    console.warn('Authentication failed: No valid merchant session found');
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    window.location.href = 'merchant-login.html?error=unauthorized&message=Please%20login%20as%20a%20merchant';
  } else {
    // Populate header info
    const nameEl = document.getElementById('merchantName');
    const emailEl = document.getElementById('merchantEmail');
    const avatarEl = document.getElementById('merchantAvatar');
    
    if (nameEl) nameEl.textContent = user.business_name || user.email || 'Merchant';
    if (emailEl) emailEl.textContent = user.email || '';
    if (avatarEl) avatarEl.textContent = (user.business_name || user.email || 'M').charAt(0).toUpperCase();
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.dashboard-section');
  const pageTitle = document.getElementById('pageTitle');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = item.getAttribute('data-section');
      
      // Update Active Nav
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Show Target Section
      sections.forEach(sec => {
        if (sec.id === `${targetSection}-section`) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });
      
      // Update Page Title
      if (pageTitle) {
        pageTitle.textContent = item.querySelector('span').textContent;
      }
      
      // Close mobile sidebar if open
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('active');
      }
      
      // Load specific data if needed
      if (targetSection === 'my-products') loadMyProducts();
      if (targetSection === 'orders') loadMerchantOrders();
      if (targetSection === 'overview') loadDashboardData();
    });
  });

  // Mobile Toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('kickshaus_auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('kickshaus_user');
        localStorage.removeItem('userType');
        window.location.href = 'merchant-login.html';
      }
    });
  }
}

async function loadDashboardData() {
  await Promise.all([
    loadMyProducts(),
    loadMerchantOrders()
  ]);
}

async function loadMyProducts() {
  try {
    const response = await fetchAuth('/merchant/products');
    
    const result = await response.json();
    const products = result.data.products || result.data || [];

    // Update Stats
    const totalProdEl = document.getElementById('totalProducts');
    if(totalProdEl) totalProdEl.textContent = products.length;
    
    // Render Table
    const table = document.getElementById('productsTable');
    if (table) {
      if(products.length === 0) {
        table.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No products found. Add one!</td></tr>';
        return;
      }
      table.innerHTML = products.map(p => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${p.images?.main || p.images?.primary || 'https://via.placeholder.com/40'}" width="40" height="40" style="border-radius:4px; object-fit:cover;"> 
              <span style="font-weight: 500;">${p.name}</span>
            </div>
          </td>
          <td>₦${(Number(p.base_price) || 0).toLocaleString()}</td>
          <td>${p.stock}</td>
          <td><span class="status-badge ${p.status}">${p.status === 'live' ? 'Live' : p.status.replace('_', ' ')}</span></td>
          <td>
            <button onclick="deleteProduct('${p.id}')" style="color:#F44336; border:none; background:none; cursor:pointer; font-size:1.1rem; padding: 5px;" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (e) {
    console.error('Error loading products', e);
  }
}

async function loadMerchantOrders() {
  try {
    const response = await fetchAuth('/merchant/orders');
    
    if (!response.ok) throw new Error('Failed to fetch orders');
    
    const result = await response.json();
    const orders = result.data.orders || result.data || [];
    
    const table = document.getElementById('merchantOrdersTable');
    if (table) {
      if (orders.length === 0) {
        table.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No orders for your products yet.</td></tr>';
        return;
      }
      
      table.innerHTML = orders.map(order => {
        const itemsList = order.merchant_items.map(i => `${i.name} (x${i.quantity})`).join(', ');
        const date = new Date(order.created_at).toLocaleDateString();
        
        return `
          <tr>
            <td>#${order.id.slice(0, 8)}</td>
            <td>
              <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 600;">${order.customer_name}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${order.customer_email}</span>
              </div>
            </td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsList}">
              ${itemsList}
            </td>
            <td>₦${(Number(order.total_amount_fiat) || 0).toLocaleString()}</td>
            <td><span class="status-badge ${order.payment_status}">${order.payment_status}</span></td>
            <td>${date}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading merchant orders:', error);
  }
}

// Add Product Logic
const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
  addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = addProductForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Product...';

    const token = localStorage.getItem('token') || localStorage.getItem('kickshaus_auth_token');
    
    const formData = {
      name: document.getElementById('pName').value,
      base_price: parseFloat(document.getElementById('pPrice').value),
      category: document.getElementById('pCategory').value,
      stock: parseInt(document.getElementById('pStock').value),
      description: document.getElementById('pDesc').value,
      images: { 
        main: document.getElementById('pImage').value,
        top: document.getElementById('pImage').value,
        left: document.getElementById('pImage').value,
        right: document.getElementById('pImage').value
      } 
    };

    try {
      const res = await fetchAuth('/merchant/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();

      if (res.ok) {
        alert('Product Added Successfully! It is now live on the store.');
        addProductForm.reset();
        
        // Refresh and switch
        await loadMyProducts();
        document.querySelector('[data-section="my-products"]').click();
      } else {
        alert('Failed to add product: ' + (result.error || result.message));
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

window.deleteProduct = async (id) => {
  if(!confirm('Are you sure you want to delete this product?')) return;
  
  try {
    const res = await fetchAuth(`/merchant/products/${id}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      alert('Product deleted successfully');
      loadMyProducts();
    } else {
      alert('Failed to delete product');
    }
  } catch (e) {
    console.error(e);
    alert('Error deleting product');
  }
};
