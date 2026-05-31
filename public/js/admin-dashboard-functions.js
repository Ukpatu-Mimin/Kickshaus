/**
 * ADMIN DASHBOARD FUNCTIONS
 * Fetches real data and handles dashboard interactivity.
 */

const API_BASE = "/api";
let isFetching = false;

// Helper for authenticated requests with auto-logout on 401
async function fetchAuth(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    window.location.href = "login.html?error=auth_required";
    throw new Error("No authentication token found");
  }

  const defaultHeaders = {
    "Authorization": `Bearer ${token}`
  };

  // Merge headers
  const headers = { ...defaultHeaders, ...(options.headers || {}) };
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    window.location.href = "login.html?error=session_expired";
    throw new Error("Session expired");
  }

  return response;
}

// --- INITIALIZATION ---
function init() {
  if (document.querySelector(".dashboard-container")) {
    checkAdminAuth();
    setupNavigation();
    setupLogout();
    setupNotifications();

    fetchAllData();
    setInterval(fetchAllData, 10000); // Refresh every 10 seconds

    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", fetchAllData);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function fetchAllData() {
  if (isFetching) return;
  isFetching = true;
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.disabled = true;
    const btnText = refreshBtn.querySelector("span");
    if (btnText) btnText.textContent = "Refreshing...";
  }

  try {
    await Promise.all([
      loadDashboardStats(),
      loadAllMerchants(),
      loadAllOrders(),
      loadAllCustomers(),
      loadAllProducts(),
    ]);
  } catch (error) {
    console.error("Dashboard data fetch failed:", error);
  } finally {
    isFetching = false;
    if (refreshBtn) {
      refreshBtn.disabled = false;
      const btnText = refreshBtn.querySelector("span");
      if (btnText) btnText.textContent = "Refresh";
    }
  }
}

function checkAdminAuth() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!token || (user.role !== "admin" && user.type !== "admin")) {
    showToast("Unauthorized access. Redirecting to login.", "error");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
  }
}

window.showSection = (sectionName) => {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".dashboard-section");
  const pageTitle = document.getElementById("pageTitle");

  navItems.forEach(nav => {
    if (nav.dataset.section === sectionName) {
      nav.classList.add("active");
      if (pageTitle) pageTitle.textContent = nav.querySelector("span").textContent;
    } else {
      nav.classList.remove("active");
    }
  });

  sections.forEach(sec => {
    if (sec.id === `${sectionName}-section`) {
      sec.classList.add("active");
    } else {
      sec.classList.remove("active");
    }
  });
  
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768 && sidebar) {
    sidebar.classList.remove("active");
  }
};

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      showSection(item.dataset.section);
    });
  });

  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof showConfirmationModal === "function") {
        showConfirmationModal("Are you sure you want to logout?", () => { performLogout(); });
      } else if (confirm("Are you sure you want to logout?")) {
        performLogout();
      }
    });
  }
}

function performLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userType");
  showToast("Logged out successfully.", "success");
  setTimeout(() => { window.location.href = "login.html"; }, 1000);
}

function setupNotifications() {
  const notificationBtn = document.getElementById("notificationBtn");
  if (notificationBtn) {
    notificationBtn.addEventListener("click", () => {
      showToast("No new notifications at this time.", "info");
      const badge = notificationBtn.querySelector(".notification-badge");
      if (badge) badge.style.display = "none";
    });
  }
}

async function loadDashboardStats() {
  try {
    const response = await fetchAuth('/admin/stats');
    if (!response.ok) throw new Error("Failed to fetch stats");
    const result = await response.json();
    const data = result.data;
    if (data) {
      updateElement("totalRevenue", `₦${(data.total_revenue || 0).toLocaleString()}`);
      updateElement("totalOrders", data.total_orders || (data.recent_orders || []).length);
      updateElement("totalCustomers", data.total_users || 0);
      updateElement("totalMerchants", data.total_merchants || 0);
      renderRecentOrders(data.recent_orders || []);
    }
  } catch (error) { console.error("Failed to load stats:", error); }
}

async function loadAllMerchants() {
  try {
    const response = await fetchAuth('/admin/merchants');
    if (!response.ok) throw new Error("Failed to fetch merchants");
    const result = await response.json();
    const merchants = result.data.merchants || [];
    renderAllMerchants(merchants);
  } catch (error) { console.error("Failed to load merchants:", error); }
}

function renderAllMerchants(merchants) {
  const pendingContainer = document.getElementById("pendingMerchantsTable");
  const otherContainer = document.getElementById("merchantsTable");
  if (!pendingContainer || !otherContainer) return;

  const pendingMerchants = merchants.filter(m => m.status === "pending");
  const otherMerchants = merchants.filter(m => m.status !== "pending");

  if (pendingMerchants.length === 0) {
    pendingContainer.innerHTML = "<tr><td colspan='4' style='text-align: center;'>No merchants awaiting approval.</td></tr>";
  } else {
    pendingContainer.innerHTML = pendingMerchants.map(merchant => `
      <tr>
        <td>${merchant.business_name || "N/A"}</td>
        <td>${merchant.email}</td>
        <td><span class="status-badge pending">Pending</span></td>
        <td>
          <button onclick="approveMerchant('${merchant.id}')" class="btn btn-secondary" style="font-size: 12px; padding: 6px 10px;">Approve</button>
          <button onclick="rejectMerchant('${merchant.id}')" class="btn btn-secondary" style="font-size: 12px; padding: 6px 10px;">Reject</button>
        </td>
      </tr>
    `).join("");
  }

  if (otherMerchants.length === 0) {
    otherContainer.innerHTML = "<tr><td colspan='4' style='text-align: center;'>No other merchants found.</td></tr>";
  } else {
    otherContainer.innerHTML = otherMerchants.map(merchant => `
      <tr>
        <td>${merchant.business_name || "N/A"}</td>
        <td>${merchant.email}</td>
        <td><span class="status-badge ${merchant.status}">${merchant.status.charAt(0).toUpperCase() + merchant.status.slice(1)}</span></td>
        <td><button class="btn btn-secondary" style="font-size: 12px; padding: 6px 10px;" disabled>Handled</button></td>
      </tr>
    `).join("");
  }
}

async function loadAllOrders() {
  try {
    const response = await fetchAuth('/admin/orders');
    if (!response.ok) throw new Error("Failed to fetch orders");
    const result = await response.json();
    const orders = result.data.orders || [];
    renderAllOrders(orders);
    renderDeliveries(orders);
  } catch (error) { console.error("Failed to load orders:", error); }
}

function renderRecentOrders(orders) {
  const container = document.getElementById("recentOrdersTable");
  if (!container) return;
  if (orders.length === 0) {
    container.innerHTML = "<tr><td colspan='4' style='text-align: center;'>No recent orders.</td></tr>";
    return;
  }
  container.innerHTML = orders.slice(0, 5).map(order => `
    <tr>
      <td>#${order.id.slice(0, 8)}</td>
      <td>${order.customer_name || "Guest User"}</td>
      <td>₦${(Number(order.total_amount_fiat) || 0).toLocaleString()}</td>
      <td><span class="status-badge ${order.payment_status}">${order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}</span></td>
    </tr>
  `).join("");
}

function renderAllOrders(orders) {
  const container = document.getElementById("allOrdersTable");
  if (!container) return;
  if (orders.length === 0) {
    container.innerHTML = "<tr><td colspan='8' style='text-align: center;'>No orders found.</td></tr>";
    return;
  }
  container.innerHTML = orders.map(order => `
    <tr>
      <td>#${order.id.slice(0, 8)}</td>
      <td>${order.customer_name || "Guest User"}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${order.items_summary || ''}">${order.items_summary || 'N/A'}</td>
      <td>₦${(Number(order.total_amount_fiat) || 0).toLocaleString()}</td>
      <td><span class="status-badge ${order.payment_status}">${order.payment_status}</span></td>
      <td>
        <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
          <option value="pending" ${order.order_status === "pending" ? "selected" : ""}>Pending</option>
          <option value="processing" ${order.order_status === "processing" ? "selected" : ""}>Processing</option>
          <option value="shipped" ${order.order_status === "shipped" ? "selected" : ""}>Shipped</option>
          <option value="delivered" ${order.order_status === "delivered" ? "selected" : ""}>Delivered</option>
          <option value="cancelled" ${order.order_status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
      <td><button onclick="viewOrderDetails('${order.id}')" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px;">View</button></td>
    </tr>
  `).join("");
}

function renderDeliveries(orders) {
  const container = document.getElementById("deliveryOrdersTable");
  if (!container) return;
  const deliveryOrders = orders.filter(o => o.order_status === "shipped" || o.order_status === "delivered");
  if (deliveryOrders.length === 0) {
    container.innerHTML = "<tr><td colspan='5' style='text-align: center;'>No active deliveries.</td></tr>";
    return;
  }
  container.innerHTML = deliveryOrders.map(order => `
    <tr>
      <td>#${order.id.slice(0, 8)}</td>
      <td>${order.customer_name || "N/A"}</td>
      <td><span class="status-badge ${order.order_status}">${order.order_status}</span></td>
      <td>${new Date(order.updated_at).toLocaleString()}</td>
      <td><button onclick="viewOrderDetails('${order.id}')" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px;">Track</button></td>
    </tr>
  `).join("");
}

async function loadAllCustomers() {
  const container = document.getElementById("customersTable");
  if (!container) return;
  try {
    const response = await fetchAuth('/admin/customers');
    if (!response.ok) throw new Error("Failed to fetch customers");
    const result = await response.json();
    const customers = result.data.customers || [];
    if (customers.length === 0) {
      container.innerHTML = "<tr><td colspan='3' style='text-align: center;'>No customers found.</td></tr>";
      return;
    }
    container.innerHTML = customers.map(customer => `
      <tr>
        <td>${customer.full_name || "N/A"}</td>
        <td>${customer.email}</td>
        <td>${new Date(customer.created_at).toLocaleDateString()}</td>
      </tr>
    `).join("");
  } catch (error) { console.error("Failed to load customers:", error); }
}

async function loadAllProducts() {
  const container = document.getElementById("productsTable");
  if (!container) return;
  try {
    const response = await fetchAuth('/admin/products');
    if (!response.ok) throw new Error("Failed to fetch products");
    const result = await response.json();
    const products = result.data.products || [];
    if (products.length === 0) {
      container.innerHTML = "<tr><td colspan='4' style='text-align: center;'>No products found.</td></tr>";
      return;
    }
    container.innerHTML = products.map(product => `
      <tr>
        <td>${product.name || "N/A"}</td>
        <td>${product.merchant_name || "N/A"}</td>
        <td>${product.category}</td>
        <td>₦${(Number(product.base_price) || 0).toLocaleString()}</td>
        <td>${product.stock}</td>
        <td><span class="status-badge ${product.status}">${product.status || 'N/A'}</span></td>
      </tr>
    `).join("");
  } catch (error) { console.error("Failed to load products:", error); }
}

function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

window.openOrderTab = (evt, tabName) => {
  const tabcontent = document.getElementsByClassName("tab-content");
  for (let i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; }
  const tablinks = document.getElementsByClassName("tab-link");
  for (let i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" active", ""); }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
};

window.approveMerchant = async (id) => {
  if (confirm("Are you sure you want to approve this merchant?")) {
    await updateMerchantStatus(id, "approved");
  }
};

window.rejectMerchant = async (id) => {
  if (confirm("Are you sure you want to reject this merchant?")) {
    await updateMerchantStatus(id, "rejected");
  }
};

async function updateMerchantStatus(id, status) {
  try {
    const response = await fetchAuth(`/admin/merchants/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error("Failed to update merchant status");
    showToast(`Merchant ${status} successfully!`, "success");
    loadAllMerchants();
  } catch (error) { showToast(error.message, "error"); }
}

window.updateOrderStatus = async (orderId, status) => {
  try {
    const response = await fetchAuth(`/admin/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error("Failed to update order status");
    showToast("Order status updated successfully!", "success");
    loadAllOrders();
  } catch (error) { showToast(error.message, "error"); }
};

window.viewOrderDetails = async (id) => {
  try {
    const response = await fetchAuth(`/admin/orders/${id}`);
    if (!response.ok) throw new Error("Failed to fetch order details");
    const result = await response.json();
    const order = result.data.order;
    
    // Fill Modal
    document.getElementById("modalOrderId").textContent = `Order #${order.id.slice(0, 8)}`;
    document.getElementById("modalCustomerName").textContent = order.users?.full_name || order.contact_name || "N/A";
    document.getElementById("modalCustomerEmail").textContent = order.users?.email || order.contact_email || "N/A";
    document.getElementById("modalCustomerPhone").textContent = order.receiver_phone || order.sender_phone || "N/A";
    
    document.getElementById("modalShippingAddress").textContent = order.shipping_address || "N/A";
    document.getElementById("modalCity").textContent = order.city || "";
    document.getElementById("modalState").textContent = order.state || "";
    
    const payStatus = document.getElementById("modalPaymentStatus");
    payStatus.textContent = order.payment_status;
    payStatus.className = `status-badge ${order.payment_status}`;
    
    document.getElementById("modalReference").textContent = order.reference_key || "N/A";
    const signatureEl = document.getElementById("modalSignature");
    const txSig = order.transaction_signature;
    
    if (txSig && txSig !== 'N/A') {
      const isPaystack = txSig.startsWith('KICK-') || txSig.startsWith('TEST-');
      
      if (isPaystack) {
        signatureEl.innerHTML = `<span style="color:var(--text-secondary);"><i class="fas fa-receipt"></i> ${txSig}</span>`;
      } else {
        const explorerUrl = window.api ? window.api.getSolanaExplorerUrl(txSig) : `https://solscan.io/tx/${txSig}`;
        signatureEl.innerHTML = `<a href="${explorerUrl}" target="_blank" style="color:var(--primary); text-decoration:none;"><i class="fas fa-external-link-alt"></i> ${txSig.slice(0, 8)}...${txSig.slice(-8)}</a>`;
      }
    } else {
      signatureEl.textContent = "N/A";
    }
    
    document.getElementById("modalOrderTotal").textContent = `₦${(Number(order.total_amount_fiat) || 0).toLocaleString()}`;
    
    // Fill Items Table
    const itemsTable = document.getElementById("modalItemsTable");
    if (order.order_items && order.order_items.length > 0) {
      itemsTable.innerHTML = order.order_items.map(item => {
        const productName = item.products?.name || 'Unknown Product';
        const merchantName = item.products?.merchants?.business_name || 'Unknown Merchant';
        return `
        <tr>
          <td>
            <div style="font-weight:500;">${productName}</div>
            <div style="font-size:0.75rem; color:#666;">
              <i class="fas fa-store" style="font-size:0.7rem; margin-right:4px;"></i>
              ${merchantName}
            </div>
          </td>
          <td>${item.quantity}</td>
          <td>₦${(Number(item.price_at_purchase) || 0).toLocaleString()}</td>
          <td>₦${(Number(item.price_at_purchase) * item.quantity).toLocaleString()}</td>
        </tr>
      `}).join("");
    } else {
      itemsTable.innerHTML = "<tr><td colspan='4' style='text-align:center'>No items found in this order.</td></tr>";
    }
    
    // Show Modal
    document.getElementById("orderModal").style.display = "flex";
  } catch (error) {
    console.error("Failed to load order details:", error);
    showToast("Failed to load order details.", "error");
  }
};

window.closeOrderModal = () => {
  document.getElementById("orderModal").style.display = "none";
};
