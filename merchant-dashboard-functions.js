// ==========================================
// ENHANCED MERCHANT DASHBOARD WITH ANGLES
// ==========================================

const MerchantDashboard = {
  merchant: null,
  products: [],
  uploadedImages: {
    main: null,
    top: null,
    left: null,
    right: null,
    additional: []
  },
  
  init() {
    MerchantAuth.protectPage();
    this.merchant = MerchantAuth.getCurrentMerchant();
    if (!this.merchant) {
      window.location.href = 'merchant-login.html';
      return;
    }
    
    document.getElementById('merchantName').textContent = this.merchant.businessName;
    document.getElementById('merchantEmail').textContent = this.merchant.email;
    document.getElementById('merchantAvatar').textContent = this.merchant.businessName.charAt(0).toUpperCase();
    
    this.loadProducts();
    
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.showSection(item.getAttribute('data-section'));
      });
    });
    
    this.renderOverview();
  },
  
  loadProducts() {
    const allProducts = JSON.parse(localStorage.getItem('merchantProducts') || '[]');
    this.products = allProducts.filter(p => p.merchantId === this.merchant.id);
  },
  
  showSection(sectionName) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
      section.classList.remove('active');
      section.style.display = 'none';
    });
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    const section = document.getElementById(`${sectionName}-section`);
    const navItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    
    if (section) {
      section.classList.add('active');
      section.style.display = 'block';
    }
    if (navItem) navItem.classList.add('active');
    
    const titles = { 
      overview: 'Overview', 
      'add-product': 'Add New Product', 
      'my-products': 'My Products', 
      settings: 'Settings' 
    };
    document.getElementById('pageTitle').textContent = titles[sectionName] || sectionName;
    
    const renderFunctions = { 
      overview: () => this.renderOverview(), 
      'add-product': () => this.renderAddProduct(), 
      'my-products': () => this.renderMyProducts(), 
      settings: () => this.renderSettings() 
    };
    if (renderFunctions[sectionName]) renderFunctions[sectionName]();
    
    document.getElementById('sidebar')?.classList.remove('active');
  },
  
  renderOverview() {
    const pending = this.products.filter(p => p.status === 'pending').length;
    const approved = this.products.filter(p => p.status === 'approved').length;
    const rejected = this.products.filter(p => p.status === 'rejected').length;
    
    document.getElementById('overview-section').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-box"></i></div>
          <div class="stat-value">${this.products.length}</div>
          <div class="stat-label">Total Products Submitted</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
          <div class="stat-value">${pending}</div>
          <div class="stat-label">Pending Approval</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
          <div class="stat-value">${approved}</div>
          <div class="stat-label">Approved Products</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fas fa-times-circle"></i></div>
          <div class="stat-value">${rejected}</div>
          <div class="stat-label">Rejected Products</div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Quick Actions</h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <button class="btn btn-primary" onclick="MerchantDashboard.showSection('add-product')" style="justify-content: center;">
            <i class="fas fa-plus"></i> Add New Product
          </button>
          <button class="btn btn-secondary" onclick="MerchantDashboard.showSection('my-products')" style="justify-content: center;">
            <i class="fas fa-box"></i> View My Products
          </button>
          <button class="btn btn-secondary" onclick="MerchantDashboard.showSection('settings')" style="justify-content: center;">
            <i class="fas fa-cog"></i> Settings
          </button>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Recent Products</h2>
        </div>
        ${this.products.length > 0 ? `
          <div class="table-container">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Base Price</th><th>Status</th><th>Submitted</th></tr></thead>
              <tbody>
                ${this.products.slice(0, 5).map(product => `
                  <tr>
                    <td><strong>${product.name}</strong></td>
                    <td>${product.category}</td>
                    <td>₦${product.basePrice.toLocaleString()}</td>
                    <td><span class="status-badge ${product.status}">${product.status.charAt(0).toUpperCase() + product.status.slice(1)}</span></td>
                    <td>${new Date(product.submittedAt).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="padding: 20px; text-align: center; color: var(--text-muted);">No products yet. Add your first product!</p>'}
      </div>
    `;
  },
  
  renderAddProduct() {
    this.uploadedImages = {
      main: null,
      top: null,
      left: null,
      right: null,
      additional: []
    };
    
    document.getElementById('add-product-section').innerHTML = `
      <div class="card">
        <form id="addProductForm">
          <div class="form-group">
            <label for="productName">Product Name *</label>
            <input type="text" id="productName" required placeholder="e.g., Nike Air Max 2024">
          </div>
          
          <div class="form-group">
            <label for="productDescription">Description *</label>
            <textarea id="productDescription" required rows="4" placeholder="Describe your product in detail..."></textarea>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="form-group">
              <label for="productCategory">Category *</label>
              <select id="productCategory" required>
                <option value="">Select Category</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Kids">Kids</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="productPrice">Base Price (₦) *</label>
              <input type="number" id="productPrice" required min="1000" placeholder="e.g., 150000">
            </div>
          </div>
          
          <div class="form-group">
            <label style="display: block; margin-bottom: 12px; font-weight: 600;">Product Images with Angles *</label>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
              Upload images from different angles for better product showcase. All angles are required.
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 16px;">
              <!-- Main Image -->
              <div>
                <label style="font-size: 0.9rem; font-weight: 600; color: var(--primary); margin-bottom: 8px; display: block;">
                  <i class="fas fa-camera"></i> Main View *
                </label>
                <div class="angle-upload-box" id="mainUploadBox" onclick="document.getElementById('mainImageInput').click()">
                  <div id="mainPreview" class="angle-preview">
                    <i class="fas fa-plus" style="font-size: 2rem; color: var(--text-muted);"></i>
                    <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);">Upload Main</p>
                  </div>
                </div>
                <input type="file" id="mainImageInput" accept="image/jpeg,image/png,image/jpg" style="display: none;">
              </div>
              
              <!-- Top View -->
              <div>
                <label style="font-size: 0.9rem; font-weight: 600; color: var(--primary); margin-bottom: 8px; display: block;">
                  <i class="fas fa-arrow-up"></i> Top View *
                </label>
                <div class="angle-upload-box" id="topUploadBox" onclick="document.getElementById('topImageInput').click()">
                  <div id="topPreview" class="angle-preview">
                    <i class="fas fa-plus" style="font-size: 2rem; color: var(--text-muted);"></i>
                    <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);">Upload Top</p>
                  </div>
                </div>
                <input type="file" id="topImageInput" accept="image/jpeg,image/png,image/jpg" style="display: none;">
              </div>
              
              <!-- Left View -->
              <div>
                <label style="font-size: 0.9rem; font-weight: 600; color: var(--primary); margin-bottom: 8px; display: block;">
                  <i class="fas fa-arrow-left"></i> Left View *
                </label>
                <div class="angle-upload-box" id="leftUploadBox" onclick="document.getElementById('leftImageInput').click()">
                  <div id="leftPreview" class="angle-preview">
                    <i class="fas fa-plus" style="font-size: 2rem; color: var(--text-muted);"></i>
                    <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);">Upload Left</p>
                  </div>
                </div>
                <input type="file" id="leftImageInput" accept="image/jpeg,image/png,image/jpg" style="display: none;">
              </div>
              
              <!-- Right View -->
              <div>
                <label style="font-size: 0.9rem; font-weight: 600; color: var(--primary); margin-bottom: 8px; display: block;">
                  <i class="fas fa-arrow-right"></i> Right View *
                </label>
                <div class="angle-upload-box" id="rightUploadBox" onclick="document.getElementById('rightImageInput').click()">
                  <div id="rightPreview" class="angle-preview">
                    <i class="fas fa-plus" style="font-size: 2rem; color: var(--text-muted);"></i>
                    <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);">Upload Right</p>
                  </div>
                </div>
                <input type="file" id="rightImageInput" accept="image/jpeg,image/png,image/jpg" style="display: none;">
              </div>
            </div>
            
            <div style="margin-top: 16px;">
              <label style="font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; display: block;">
                <i class="fas fa-images"></i> Additional Images (Optional, max 3)
              </label>
              <div style="display: flex; gap: 12px; flex-wrap: wrap;" id="additionalImagesContainer">
                <div class="angle-upload-box" style="width: 120px; height: 120px;" onclick="document.getElementById('additionalImageInput').click()">
                  <i class="fas fa-plus" style="font-size: 1.5rem; color: var(--text-muted);"></i>
                  <p style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">Add More</p>
                </div>
              </div>
              <input type="file" id="additionalImageInput" accept="image/jpeg,image/png,image/jpg" multiple style="display: none;">
            </div>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
            <button type="button" class="btn btn-secondary" onclick="MerchantDashboard.showSection('overview')">Cancel</button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-paper-plane"></i> Submit for Approval
            </button>
          </div>
        </form>
      </div>
      
      <div class="card" style="background: rgba(0, 168, 232, 0.05); border-left: 4px solid var(--primary);">
        <h3 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-info-circle" style="color: var(--primary);"></i> Image Guidelines
        </h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 8px 0; display: flex; align-items: start; gap: 8px;">
            <i class="fas fa-check" style="color: var(--primary); margin-top: 4px;"></i>
            <span><strong>Main View:</strong> Front-facing product shot (required)</span>
          </li>
          <li style="padding: 8px 0; display: flex; align-items: start; gap: 8px;">
            <i class="fas fa-check" style="color: var(--primary); margin-top: 4px;"></i>
            <span><strong>Top View:</strong> Show the top of the shoe (required)</span>
          </li>
          <li style="padding: 8px 0; display: flex; align-items: start; gap: 8px;">
            <i class="fas fa-check" style="color: var(--primary); margin-top: 4px;"></i>
            <span><strong>Left & Right Views:</strong> Side profile shots (required)</span>
          </li>
          <li style="padding: 8px 0; display: flex; align-items: start; gap: 8px;">
            <i class="fas fa-check" style="color: var(--primary); margin-top: 4px;"></i>
            <span><strong>Additional:</strong> Detail shots, sole, branding (optional)</span>
          </li>
          <li style="padding: 8px 0; display: flex; align-items: start; gap: 8px;">
            <i class="fas fa-check" style="color: var(--primary); margin-top: 4px;"></i>
            <span>Use good lighting and clean background</span>
          </li>
          <li style="padding: 8px 0; display: flex; align-items: start; gap: 8px;">
            <i class="fas fa-check" style="color: var(--primary); margin-top: 4px;"></i>
            <span>Max 5MB per image, JPG/PNG format</span>
          </li>
        </ul>
      </div>
      
      <style>
        .angle-upload-box {
          width: 100%;
          height: 150px;
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
        }
        
        .angle-upload-box:hover {
          border-color: var(--primary);
          background: rgba(0, 168, 232, 0.05);
        }
        
        .angle-upload-box.uploaded {
          border-color: #4CAF50;
          border-style: solid;
        }
        
        .angle-preview {
          text-align: center;
        }
        
        .angle-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          top: 0;
          left: 0;
        }
        
        .remove-angle {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          background: var(--accent);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          font-size: 0.9rem;
        }
        
        .remove-angle:hover {
          background: #ff5252;
        }
      </style>
    `;
    
    // Setup angle image uploads
    ['main', 'top', 'left', 'right'].forEach(angle => {
      document.getElementById(`${angle}ImageInput`).addEventListener('change', (e) => {
        this.handleAngleUpload(e, angle);
      });
    });
    
    // Setup additional images
    document.getElementById('additionalImageInput').addEventListener('change', (e) => {
      this.handleAdditionalUpload(e);
    });
    
    // Setup form submission
    document.getElementById('addProductForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitProduct();
    });
  },
  
  handleAngleUpload(event, angle) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast(`Image too large (max 5MB)`, 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImages[angle] = e.target.result;
      this.renderAnglePreview(angle, e.target.result);
    };
    reader.readAsDataURL(file);
  },
  
  renderAnglePreview(angle, imageData) {
    const preview = document.getElementById(`${angle}Preview`);
    const box = document.getElementById(`${angle}UploadBox`);
    
    box.classList.add('uploaded');
    preview.innerHTML = `
      <img src="${imageData}" alt="${angle} view">
      <div class="remove-angle" onclick="event.stopPropagation(); MerchantDashboard.removeAngle('${angle}')">
        <i class="fas fa-times"></i>
      </div>
    `;
  },
  
  removeAngle(angle) {
    this.uploadedImages[angle] = null;
    const preview = document.getElementById(`${angle}Preview`);
    const box = document.getElementById(`${angle}UploadBox`);
    
    box.classList.remove('uploaded');
    preview.innerHTML = `
      <i class="fas fa-plus" style="font-size: 2rem; color: var(--text-muted);"></i>
      <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);">Upload ${angle.charAt(0).toUpperCase() + angle.slice(1)}</p>
    `;
  },
  
  handleAdditionalUpload(event) {
    const files = Array.from(event.target.files);
    
    if (this.uploadedImages.additional.length + files.length > 3) {
      showToast('Maximum 3 additional images allowed', 'error');
      return;
    }
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name} is too large (max 5MB)`, 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImages.additional.push(e.target.result);
        this.renderAdditionalPreviews();
      };
      reader.readAsDataURL(file);
    });
  },
  
  renderAdditionalPreviews() {
    const container = document.getElementById('additionalImagesContainer');
    container.innerHTML = this.uploadedImages.additional.map((img, index) => `
      <div style="position: relative; width: 120px; height: 120px;">
        <img src="${img}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">
        <div class="remove-angle" onclick="MerchantDashboard.removeAdditional(${index})">
          <i class="fas fa-times"></i>
        </div>
      </div>
    `).join('');
    
    if (this.uploadedImages.additional.length < 3) {
      container.innerHTML += `
        <div class="angle-upload-box" style="width: 120px; height: 120px;" onclick="document.getElementById('additionalImageInput').click()">
          <i class="fas fa-plus" style="font-size: 1.5rem; color: var(--text-muted);"></i>
          <p style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">Add More</p>
        </div>
      `;
    }
  },
  
  removeAdditional(index) {
    this.uploadedImages.additional.splice(index, 1);
    this.renderAdditionalPreviews();
  },
  
  submitProduct() {
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const category = document.getElementById('productCategory').value;
    const basePrice = parseInt(document.getElementById('productPrice').value);
    
    if (!name || !description || !category || !basePrice) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    
    // Validate all required angles
    if (!this.uploadedImages.main || !this.uploadedImages.top || !this.uploadedImages.left || !this.uploadedImages.right) {
      showToast('Please upload all required angle images (Main, Top, Left, Right)', 'error');
      return;
    }
    
    const product = {
      id: 'PROD-' + Date.now(),
      merchantId: this.merchant.id,
      merchantName: this.merchant.businessName,
      merchantEmail: this.merchant.email,
      name,
      description,
      category,
      basePrice,
      finalPrice: null,
      images: {
        main: this.uploadedImages.main,
        top: this.uploadedImages.top,
        left: this.uploadedImages.left,
        right: this.uploadedImages.right,
        additional: this.uploadedImages.additional
      },
      status: 'pending',
      submittedAt: new Date().toISOString(),
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null
    };
    
    let allProducts = JSON.parse(localStorage.getItem('merchantProducts') || '[]');
    allProducts.push(product);
    localStorage.setItem('merchantProducts', JSON.stringify(allProducts));
    
    let notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
    notifications.unshift({
      id: 'NOTIF-' + Date.now(),
      type: 'product_submission',
      title: `New product submitted by ${this.merchant.businessName}`,
      message: `Product: ${name}`,
      productId: product.id,
      merchantId: this.merchant.id,
      read: false,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('adminNotifications', JSON.stringify(notifications));
    
    showToast('✅ Product submitted successfully!');
    this.loadProducts();
    this.showSection('my-products');
  },
  
  // Keep all other methods the same (renderMyProducts, renderSettings, etc.)
  // ... (copy from original file)
  
  renderMyProducts() {
    this.loadProducts();
    
    document.getElementById('my-products-section').innerHTML = `
      <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
        <button class="btn btn-secondary" onclick="MerchantDashboard.filterProducts('all')">All (${this.products.length})</button>
        <button class="btn btn-secondary" onclick="MerchantDashboard.filterProducts('pending')">Pending (${this.products.filter(p => p.status === 'pending').length})</button>
        <button class="btn btn-secondary" onclick="MerchantDashboard.filterProducts('approved')">Approved (${this.products.filter(p => p.status === 'approved').length})</button>
        <button class="btn btn-secondary" onclick="MerchantDashboard.filterProducts('rejected')">Rejected (${this.products.filter(p => p.status === 'rejected').length})</button>
      </div>
      
      <div class="card" id="productsTableCard">
        ${this.renderProductsTable(this.products)}
      </div>
    `;
  },
  
  renderProductsTable(products) {
    if (products.length === 0) {
      return '<p style="padding: 40px; text-align: center; color: var(--text-muted);"><i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i>No products found</p>';
    }
    
    return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Main Image</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Base Price</th>
              <th>Final Price</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(product => {
              const mainImage = product.images.main || (product.images[0] || '');
              return `
              <tr>
                <td><img src="${mainImage}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;"></td>
                <td><strong>${product.name}</strong></td>
                <td>${product.category}</td>
                <td>₦${product.basePrice.toLocaleString()}</td>
                <td>${product.finalPrice ? '₦' + product.finalPrice.toLocaleString() : '<span style="color: var(--text-muted);">Pending</span>'}</td>
                <td><span class="status-badge ${product.status}">${product.status.charAt(0).toUpperCase() + product.status.slice(1)}</span></td>
                <td>${new Date(product.submittedAt).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="MerchantDashboard.viewProduct('${product.id}')">
                    <i class="fas fa-eye"></i>
                  </button>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
  
  filterProducts(status) {
    const filtered = status === 'all' ? this.products : this.products.filter(p => p.status === status);
    document.getElementById('productsTableCard').innerHTML = this.renderProductsTable(filtered);
  },
  
  viewProduct(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    
    const images = product.images;
    const hasAngles = images.main && images.top && images.left && images.right;
    
    showModal(`
      <h2 style="margin-bottom: 20px; font-family: 'Playfair Display', serif;">Product Details</h2>
      
      ${hasAngles ? `
        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 12px;">Product Angles</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
            <div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">Main View</p>
              <img src="${images.main}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">
            </div>
            <div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">Top View</p>
              <img src="${images.top}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">
            </div>
            <div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">Left View</p>
              <img src="${images.left}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">
            </div>
            <div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">Right View</p>
              <img src="${images.right}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">
            </div>
          </div>
          ${images.additional && images.additional.length > 0 ? `
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">Additional Images</p>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
              ${images.additional.map(img => `<img src="${img}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">`).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 8px;">${product.name}</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">${product.description}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Category</p>
            <p><strong>${product.category}</strong></p>
          </div>
          <div>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Status</p>
            <p><span class="status-badge ${product.status}">${product.status}</span></p>
          </div>
          <div>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Your Price</p>
            <p><strong>₦${product.basePrice.toLocaleString()}</strong></p>
          </div>
          <div>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Final Price</p>
            <p><strong>${product.finalPrice ? '₦' + product.finalPrice.toLocaleString() : 'Pending'}</strong></p>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>
    `);
  },
  
  renderSettings() {
    document.getElementById('settings-section').innerHTML = `
      <div style="max-width: 800px;">
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <h2 class="card-title">Change Password</h2>
          </div>
          <form id="changePasswordForm">
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input type="password" id="currentPassword" required>
            </div>
            <div class="form-group">
              <label for="newPassword">New Password (min 8 characters)</label>
              <input type="password" id="newPassword" required minlength="8">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input type="password" id="confirmPassword" required>
            </div>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-key"></i> Update Password
            </button>
          </form>
        </div>
        
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <h2 class="card-title">Change Email</h2>
          </div>
          <form id="changeEmailForm">
            <div class="form-group">
              <label for="newEmail">New Email Address</label>
              <input type="email" id="newEmail" required>
            </div>
            <div class="form-group">
              <label for="confirmPasswordEmail">Current Password (for confirmation)</label>
              <input type="password" id="confirmPasswordEmail" required>
            </div>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-envelope"></i> Update Email
            </button>
          </form>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Business Details</h2>
          </div>
          <form id="businessDetailsForm">
            <div class="form-group">
              <label for="businessName">Business Name</label>
              <input type="text" id="businessName" value="${this.merchant.businessName}" required>
            </div>
            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input type="tel" id="phone" value="${this.merchant.phone}" required>
            </div>
            <div class="form-group">
              <label for="address">Business Address</label>
              <input type="text" id="address" value="${this.merchant.address}" required>
            </div>
            <div class="form-group">
              <label for="website">Website (optional)</label>
              <input type="url" id="website" value="${this.merchant.website || ''}" placeholder="https://">
            </div>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Save Details
            </button>
          </form>
        </div>
      </div>
    `;
    
    document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePasswordChange();
    });
    
    document.getElementById('changeEmailForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEmailChange();
    });
    
    document.getElementById('businessDetailsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleBusinessDetailsUpdate();
    });
  },
  
  handlePasswordChange() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    if (newPass !== confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    if (newPass.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    
    const result = MerchantAuth.changePassword(this.merchant.email, current, newPass);
    
    if (result.success) {
      showToast('✅ Password updated successfully!');
      document.getElementById('changePasswordForm').reset();
    } else {
      showToast(result.message, 'error');
    }
  },
  
  handleEmailChange() {
    const newEmail = document.getElementById('newEmail').value;
    const password = document.getElementById('confirmPasswordEmail').value;
    
    if (password !== this.merchant.password) {
      showToast('Incorrect password', 'error');
      return;
    }
    
    let merchants = JSON.parse(localStorage.getItem('merchants') || '[]');
    const merchant = merchants.find(m => m.id === this.merchant.id);
    
    if (merchant) {
      merchant.email = newEmail;
      localStorage.setItem('merchants', JSON.stringify(merchants));
      this.merchant.email = newEmail;
      
      showToast('✅ Email updated successfully!');
      document.getElementById('merchantEmail').textContent = newEmail;
      document.getElementById('changeEmailForm').reset();
    }
  },
  
  handleBusinessDetailsUpdate() {
    const businessName = document.getElementById('businessName').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const website = document.getElementById('website').value;
    
    let merchants = JSON.parse(localStorage.getItem('merchants') || '[]');
    const merchant = merchants.find(m => m.id === this.merchant.id);
    
    if (merchant) {
      merchant.businessName = businessName;
      merchant.phone = phone;
      merchant.address = address;
      merchant.website = website;
      localStorage.setItem('merchants', JSON.stringify(merchants));
      
      this.merchant = merchant;
      document.getElementById('merchantName').textContent = businessName;
      
      showToast('✅ Business details updated!');
    }
  }
};

// Modal functions
function showModal(content) {
  const existingModal = document.getElementById('merchant-modal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'merchant-modal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; animation: fadeIn 0.3s ease;';
  modal.innerHTML = `<div style="background: var(--bg-card); border-radius: 16px; padding: 32px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); animation: slideUp 0.3s ease;">${content}</div>`;
  modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('merchant-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => modal.remove(), 300);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  MerchantDashboard.init();
  
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      MerchantAuth.logout();
      showToast('Logged out successfully');
      setTimeout(() => window.location.href = 'merchant-login.html', 1000);
    }
  });
  
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
  });
});

const style = document.createElement('style');
style.textContent = '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } } @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }';
document.head.appendChild(style);