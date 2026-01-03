// ==========================================
// MERCHANT AUTHENTICATION SYSTEM
// ==========================================

const MerchantAuth = {
  // Check if merchant is authenticated
  isAuthenticated() {
    const session = localStorage.getItem('kickshaus_merchant_session');
    if (!session) return false;
    
    try {
      const data = JSON.parse(session);
      const now = new Date().getTime();
      
      // Check if session expired (24 hours)
      if (now > data.expires) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // Login merchant
  login(email, password) {
    // Get merchants from localStorage
    const merchants = JSON.parse(localStorage.getItem('merchants') || '[]');
    const merchant = merchants.find(m => m.email === email && m.password === password);
    
    if (!merchant) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    if (merchant.status !== 'approved') {
      return { success: false, message: 'Your merchant account is pending approval' };
    }
    
    // Check if first login (needs password change)
    if (merchant.mustChangePassword) {
      sessionStorage.setItem('merchantNeedsPasswordChange', email);
      return { success: true, needsPasswordChange: true, email: merchant.email };
    }
    
    // Create session
    const session = {
      merchantId: merchant.id,
      email: merchant.email,
      businessName: merchant.businessName,
      loginTime: new Date().toISOString(),
      expires: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    localStorage.setItem('kickshaus_merchant_session', JSON.stringify(session));
    return { success: true };
  },
  
  // Logout merchant
  logout() {
    localStorage.removeItem('kickshaus_merchant_session');
    sessionStorage.removeItem('merchantNeedsPasswordChange');
  },
  
  // Get current merchant
  getCurrentMerchant() {
    const session = localStorage.getItem('kickshaus_merchant_session');
    if (!session) return null;
    
    try {
      const data = JSON.parse(session);
      const merchants = JSON.parse(localStorage.getItem('merchants') || '[]');
      return merchants.find(m => m.id === data.merchantId);
    } catch (error) {
      return null;
    }
  },
  
  // Protect merchant pages
  protectPage() {
    if (!this.isAuthenticated()) {
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = 'merchant-login.html';
    }
  },
  
  // Change password
  changePassword(email, oldPassword, newPassword) {
    const merchants = JSON.parse(localStorage.getItem('merchants') || '[]');
    const merchant = merchants.find(m => m.email === email);
    
    if (!merchant) {
      return { success: false, message: 'Merchant not found' };
    }
    
    if (merchant.password !== oldPassword) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    merchant.password = newPassword;
    merchant.mustChangePassword = false;
    localStorage.setItem('merchants', JSON.stringify(merchants));
    
    return { success: true, message: 'Password updated successfully' };
  },
  
  // Force password change on first login
  forcePasswordChange(email, oldPassword, newPassword) {
    const result = this.changePassword(email, oldPassword, newPassword);
    
    if (result.success) {
      // Create session after password change
      const merchants = JSON.parse(localStorage.getItem('merchants') || '[]');
      const merchant = merchants.find(m => m.email === email);
      
      const session = {
        merchantId: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        loginTime: new Date().toISOString(),
        expires: new Date().getTime() + (24 * 60 * 60 * 1000)
      };
      
      localStorage.setItem('kickshaus_merchant_session', JSON.stringify(session));
      sessionStorage.removeItem('merchantNeedsPasswordChange');
    }
    
    return result;
  }
};

// Auto-protect merchant dashboard
if (window.location.pathname.includes('merchant-dashboard.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    MerchantAuth.protectPage();
  });
}