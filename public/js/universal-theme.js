// ==========================================
// UNIVERSAL DARK MODE & MOBILE MENU HANDLER
// Include this in ALL pages for consistency
// ==========================================

(function() {
  'use strict';

  // ===== 1. DARK MODE INITIALIZATION =====
  function initDarkMode() {
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem('kickshaus_theme');
    
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      updateThemeIcon(true);
    }

    // Theme toggle button handler
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('kickshaus_theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);
      });
    }
  }

  // Update theme icon
  function updateThemeIcon(isDark) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const icon = themeToggle.querySelector('i');
    if (icon) {
      icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  // ===== 2. MOBILE MENU HANDLER =====
  function initMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        mobileToggle.classList.toggle('active');
        
        // Change icon
        const icon = mobileToggle.querySelector('i');
        if (icon) {
          if (navMenu.classList.contains('active')) {
            icon.classList.replace('fa-bars', 'fa-times');
          } else {
            icon.classList.replace('fa-times', 'fa-bars');
          }
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
      });

      // Close menu when clicking nav links
      const navLinks = navMenu.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', function() {
          navMenu.classList.remove('active');
          mobileToggle.classList.remove('active');
          const icon = mobileToggle.querySelector('i');
          if (icon) icon.classList.replace('fa-times', 'fa-bars');
          document.body.style.overflow = '';
        });
      });

      // Close menu when clicking outside
      document.addEventListener('click', function(e) {
        if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
          if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
            const icon = mobileToggle.querySelector('i');
            if (icon) icon.classList.replace('fa-times', 'fa-bars');
            document.body.style.overflow = '';
          }
        }
      });
    }
  }

  // ===== 3. INITIALIZE ON DOM READY =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initDarkMode();
      initMobileMenu();
    });
  } else {
    initDarkMode();
    initMobileMenu();
  }

})();