// utils.js:
// ============================================================================
// API REQUEST HANDLER
// ============================================================================

/**
 * Make API request with automatic token refresh
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response data
 */
async function apiRequest(url, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    let response = await fetch(url, mergedOptions);

    // If 401, try to refresh token
    if (response.status === 401) {
      const refreshResponse = await fetch(
        `${API_CONFIG.BASE_URL}/auth/refresh`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (refreshResponse.ok) {
        // Retry original request
        response = await fetch(url, mergedOptions);
      } else {
        // Refresh failed, redirect to login
        window.location.href = APP_ROUTES.LOGIN;
        return null;
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw {
        message: data.message || 'Request failed',
        statusCode: response.status,
        errors: data.errors || [],
      };
    }

    return data;
  } catch (error) {
    if (error.message && error.message.includes('Failed to fetch')) {
      throw { message: 'Network error. Please check your connection.' };
    }
    throw error;
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Check if user is authenticated
 * @returns {Promise<object|null>} - User data or null
 */
async function checkAuth() {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/profile`, {
      credentials: 'include',
    });

    if (!response.ok) {
      window.location.href = APP_ROUTES.LOGIN;
      return null;
    }

    const data = await response.json();
    return data.data.user;
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = APP_ROUTES.LOGIN;
    return null;
  }
}

/**
 * Check if user has required role
 * @param {object} user - User object
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
function checkRole(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    switch (user.role) {
      case 'student':
        window.location.href = APP_ROUTES.STUDENT_DASHBOARD;
        break;
      case 'teacher':
        window.location.href = APP_ROUTES.TEACHER_DASHBOARD;
        break;
      case 'admin':
        window.location.href = APP_ROUTES.ADMIN_DASHBOARD;
        break;
    }
  }
}

/**
 * Logout user
 */
async function logout() {
  try {
    await apiRequest(`${API_CONFIG.BASE_URL}/auth/logout`, {
      method: 'POST',
    });
    showSuccessToast('Logged out successfully');
    setTimeout(() => {
      window.location.href = APP_ROUTES.LOGIN;
    }, 1000);
  } catch (error) {
    showErrorToast(error.message);
  }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {number} duration - Display duration in ms
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full flex items-center gap-3`;

  const colors = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  toast.classList.add(...colors[type].split(' '));

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  toast.innerHTML = `
    <div class="flex items-center gap-3 w-full">
      <span class="text-xl font-bold">${icons[type]}</span>
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 hover:opacity-75">
        ✕
      </button>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 10);

  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showSuccessToast(message) {
  showToast(message, 'success', TOAST_DURATION.SUCCESS);
}

function showErrorToast(message) {
  showToast(message, 'error', TOAST_DURATION.ERROR);
}

function showWarningToast(message) {
  showToast(message, 'warning', TOAST_DURATION.WARNING);
}

function showInfoToast(message) {
  showToast(message, 'info', TOAST_DURATION.INFO);
}

// ============================================================================
// LOADING SPINNER
// ============================================================================

function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

// ============================================================================
// CONFIRMATION MODAL
// ============================================================================

function showConfirmModal(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  if (!modal) return;

  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;

  modal.classList.remove('hidden');

  const confirmBtn = document.getElementById('confirm-action');
  const cancelBtn = document.getElementById('confirm-cancel');

  const handleConfirm = () => {
    onConfirm();
    hideConfirmModal();
    cleanup();
  };

  const handleCancel = () => {
    hideConfirmModal();
    cleanup();
  };

  const cleanup = () => {
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
}

function hideConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ============================================================================
// DATE FORMATTING UTILITIES
// ============================================================================

/**
 * Convert DD-MM-YYYY to Date object
 * @param {string} dateString - Date in DD-MM-YYYY format
 * @returns {Date}
 */
function parseDate(dateString) {
  const [day, month, year] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Convert Date object to DD-MM-YYYY
 * @param {Date} date - Date object
 * @returns {string}
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get today's date in DD-MM-YYYY format
 * @returns {string}
 */
function getTodayFormatted() {
  return formatDate(new Date());
}

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD for HTML input
 * @param {string} dateString - Date in DD-MM-YYYY format
 * @returns {string}
 */
function formatDateForInput(dateString) {
  const [day, month, year] = dateString.split('-');
  return `${year}-${month}-${day}`;
}

/**
 * Convert YYYY-MM-DD from HTML input to DD-MM-YYYY
 * @param {string} inputDate - Date in YYYY-MM-DD format
 * @returns {string}
 */
function formatDateFromInput(inputDate) {
  const [year, month, day] = inputDate.split('-');
  return `${day}-${month}-${year}`;
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Create pagination UI
 * @param {HTMLElement} container - Container element
 * @param {object} paginationData - Pagination data from API
 * @param {function} onPageChange - Callback for page change
 */
function createPagination(container, paginationData, onPageChange) {
  const { currentPage, totalPages, hasNextPage, hasPrevPage } = paginationData;

  let html = '<div class="flex items-center justify-center gap-2 mt-6">';

  // Previous button
  html += `
    <button 
      ${!hasPrevPage ? 'disabled' : ''} 
      onclick="window.paginationCallback(${currentPage - 1})"
      class="px-4 py-2 border border-gray-300 rounded-lg ${!hasPrevPage ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-50 bg-white'} transition"
    >
      Previous
    </button>
  `;

  // Page numbers
  const maxPages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let endPage = Math.min(totalPages, startPage + maxPages - 1);

  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button 
        onclick="window.paginationCallback(${i})"
        class="px-4 py-2 border rounded-lg ${i === currentPage ? 'bg-cyan-500 text-white border-cyan-500' : 'border-gray-300 hover:bg-gray-50 bg-white'} transition"
      >
        ${i}
      </button>
    `;
  }

  // Next button
  html += `
    <button 
      ${!hasNextPage ? 'disabled' : ''} 
      onclick="window.paginationCallback(${currentPage + 1})"
      class="px-4 py-2 border border-gray-300 rounded-lg ${!hasNextPage ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-50 bg-white'} transition"
    >
      Next
    </button>
  `;

  html += '</div>';

  container.innerHTML = html;
  window.paginationCallback = onPageChange;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function validateEmail(email) {
  return VALIDATION_PATTERNS.EMAIL.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result
 */
function validatePassword(password) {
  const result = {
    valid: false,
    errors: [],
  };

  if (password.length < 8) {
    result.errors.push('At least 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    result.errors.push('One lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    result.errors.push('One uppercase letter');
  }
  if (!/\d/.test(password)) {
    result.errors.push('One number');
  }

  result.valid = result.errors.length === 0;
  return result;
}

/**
 * Get attendance color class based on percentage
 * @param {number} percentage - Attendance percentage
 * @returns {string} - Tailwind class
 */
function getAttendanceColorClass(percentage) {
  if (percentage >= ATTENDANCE_COLORS.EXCELLENT.min) {
    return ATTENDANCE_COLORS.EXCELLENT.class;
  } else if (
    percentage >= ATTENDANCE_COLORS.WARNING.min &&
    percentage <= ATTENDANCE_COLORS.WARNING.max
  ) {
    return ATTENDANCE_COLORS.WARNING.class;
  } else {
    return ATTENDANCE_COLORS.CRITICAL.class;
  }
}

/**
 * Get user-friendly error message
 * @param {string} technicalError - Technical error message
 * @returns {string} - User-friendly error message
 */
function getUserFriendlyError(technicalError) {
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (technicalError.includes(key)) {
      return value;
    }
  }
  return technicalError || 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// EMPTY STATE HANDLER
// ============================================================================

/**
 * Display empty state message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Empty state message
 * @param {string} actionButton - Optional action button HTML
 */
function handleEmptyState(container, message, actionButton = null) {
  const html = `
    <div class="text-center py-12">
      <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900">${message}</h3>
      ${
        actionButton
          ? `
        <div class="mt-6">
          ${actionButton}
        </div>
      `
          : ''
      }
    </div>
  `;
  container.innerHTML = html;
}

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

/**
 * Debounce function execution
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {function} - Debounced function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================================================
// NUMBER ANIMATION
// ============================================================================

/**
 * Animate number from 0 to target
 * @param {HTMLElement} element - Element to animate
 * @param {number} target - Target number
 * @param {number} duration - Animation duration in ms
 */
function animateNumber(element, target, duration = 1000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = Math.round(target);
      clearInterval(timer);
    } else {
      element.textContent = Math.round(current);
    }
  }, 16);
}
