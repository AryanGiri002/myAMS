// signup.js:
// Password Visibility Toggle
function setupPasswordToggles() {
  const togglePassword = document.getElementById('toggle-password');
  const toggleConfirmPassword = document.getElementById(
    'toggle-confirm-password'
  );
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');

  const toggleVisibility = (input, iconId) => {
    if (input.type === 'password') {
      input.type = 'text';
      document.getElementById(iconId).innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      `;
    } else {
      input.type = 'password';
      document.getElementById(iconId).innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      `;
    }
  };

  togglePassword.addEventListener('click', () =>
    toggleVisibility(passwordInput, 'eye-icon-1')
  );
  toggleConfirmPassword.addEventListener('click', () =>
    toggleVisibility(confirmPasswordInput, 'eye-icon-2')
  );
}

// Password Strength Indicator
function setupPasswordStrength() {
  const passwordInput = document.getElementById('password');
  const strengthFill = document.getElementById('password-strength-fill');
  const reqLength = document.getElementById('req-length');
  const reqLower = document.getElementById('req-lower');
  const reqUpper = document.getElementById('req-upper');
  const reqNumber = document.getElementById('req-number');

  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    let strength = 0;
    const requirements = {
      length: password.length >= 8,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };

    // Update requirement checks
    reqLength.textContent = requirements.length
      ? '✓ At least 8 characters'
      : '✗ At least 8 characters';
    reqLength.className = requirements.length
      ? 'text-green-600'
      : 'text-gray-500';

    reqLower.textContent = requirements.lower
      ? '✓ One lowercase letter'
      : '✗ One lowercase letter';
    reqLower.className = requirements.lower ? 'text-green-600' : 'text-gray-500';

    reqUpper.textContent = requirements.upper
      ? '✓ One uppercase letter'
      : '✗ One uppercase letter';
    reqUpper.className = requirements.upper ? 'text-green-600' : 'text-gray-500';

    reqNumber.textContent = requirements.number
      ? '✓ One number'
      : '✗ One number';
    reqNumber.className = requirements.number
      ? 'text-green-600'
      : 'text-gray-500';

    // Calculate strength
    Object.values(requirements).forEach((met) => {
      if (met) strength += 25;
    });

    // Update strength bar
    strengthFill.style.width = strength + '%';
    if (strength === 0) {
      strengthFill.style.backgroundColor = '#e5e7eb';
    } else if (strength <= 25) {
      strengthFill.style.backgroundColor = '#ef4444';
    } else if (strength <= 50) {
      strengthFill.style.backgroundColor = '#f59e0b';
    } else if (strength <= 75) {
      strengthFill.style.backgroundColor = '#eab308';
    } else {
      strengthFill.style.backgroundColor = '#22c55e';
    }
  });
}

// Role Selection Handler
function setupRoleSelection() {
  const roleInputs = document.querySelectorAll('input[name="role"]');
  const studentFields = document.getElementById('student-fields');
  const teacherFields = document.getElementById('teacher-fields');

  roleInputs.forEach((input) => {
    input.addEventListener('change', (e) => {
      if (e.target.value === 'student') {
        studentFields.classList.remove('hidden');
        teacherFields.classList.add('hidden');
        // Clear teacher field errors
        clearFieldError('teacher-id');
        clearFieldError('teacher-name');
        clearFieldError('department');
      } else {
        studentFields.classList.add('hidden');
        teacherFields.classList.remove('hidden');
        // Clear student field errors
        clearFieldError('prn');
        clearFieldError('srn');
        clearFieldError('student-name');
        clearFieldError('branch');
        clearFieldError('semester');
        clearFieldError('section');
      }
    });
  });
}

// Clear field error
function clearFieldError(fieldId) {
  const errorElement = document.getElementById(`${fieldId}-error`);
  if (errorElement) {
    errorElement.classList.add('hidden');
  }
}

// Show field error
function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(`${fieldId}-error`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

// Clear all errors
function clearAllErrors() {
  const errorElements = document.querySelectorAll('[id$="-error"]');
  errorElements.forEach((el) => el.classList.add('hidden'));
}

// Validate form
function validateForm() {
  clearAllErrors();
  let isValid = true;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const role = document.querySelector('input[name="role"]:checked').value;

  // Email validation
  if (!validateEmail(email)) {
    showFieldError('email', 'Please enter a valid PESU email address');
    isValid = false;
  }

  // Password validation
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    showFieldError(
      'password',
      'Password must meet all requirements'
    );
    isValid = false;
  }

  // Confirm password validation
  if (password !== confirmPassword) {
    showFieldError('confirm-password', 'Passwords do not match');
    isValid = false;
  }

  // Role-specific validation
  if (role === 'student') {
    const prn = document.getElementById('prn').value.trim().toUpperCase();
    const srn = document.getElementById('srn').value.trim().toUpperCase();
    const studentName = document.getElementById('student-name').value.trim();
    const branch = document.getElementById('branch').value;
    const semester = document.getElementById('semester').value;
    const section = document.getElementById('section').value.trim().toUpperCase();

    if (!VALIDATION_PATTERNS.PRN.test(prn)) {
      showFieldError('prn', 'Invalid PRN format (e.g., PES2202300055)');
      isValid = false;
    }

    if (!VALIDATION_PATTERNS.SRN.test(srn)) {
      showFieldError('srn', 'Invalid SRN format (e.g., PES2UG23CS068)');
      isValid = false;
    }

    if (studentName.length < 2) {
      showFieldError('student-name', 'Please enter your full name');
      isValid = false;
    }

    if (!branch) {
      showFieldError('branch', 'Please select a branch');
      isValid = false;
    }

    if (!semester) {
      showFieldError('semester', 'Please select a semester');
      isValid = false;
    }

    if (section.length < 1) {
      showFieldError('section', 'Please enter section');
      isValid = false;
    }
  } else if (role === 'teacher') {
    const teacherId = document.getElementById('teacher-id').value.trim().toUpperCase();
    const teacherName = document.getElementById('teacher-name').value.trim();
    const department = document.getElementById('department').value;

    if (!VALIDATION_PATTERNS.TEACHER_ID.test(teacherId)) {
      showFieldError('teacher-id', 'Invalid Teacher ID format (e.g., TCH001)');
      isValid = false;
    }

    if (teacherName.length < 2) {
      showFieldError('teacher-name', 'Please enter your full name');
      isValid = false;
    }

    if (!department) {
      showFieldError('department', 'Please select a department');
      isValid = false;
    }
  }

  return isValid;
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    showWarningToast('Please fix the errors in the form');
    return;
  }

  showLoading();

  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    let roleSpecificData = {};

    if (role === 'student') {
      roleSpecificData = {
        prn: document.getElementById('prn').value.trim().toUpperCase(),
        srn: document.getElementById('srn').value.trim().toUpperCase(),
        name: document.getElementById('student-name').value.trim(),
        branch: document.getElementById('branch').value,
        currentSemester: parseInt(document.getElementById('semester').value),
        section: document.getElementById('section').value.trim().toUpperCase(),
      };
    } else if (role === 'teacher') {
      roleSpecificData = {
        teacherId: document.getElementById('teacher-id').value.trim().toUpperCase(),
        name: document.getElementById('teacher-name').value.trim(),
        department: document.getElementById('department').value,
      };
    }

    const requestBody = {
      email,
      password,
      confirmPassword,
      role,
      roleSpecificData,
    };

    const data = await apiRequest(`${API_CONFIG.BASE_URL}/auth/signup`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    hideLoading();
    showSuccessToast('Account created successfully! Redirecting to login...');

    setTimeout(() => {
      window.location.href = APP_ROUTES.LOGIN;
    }, 2000);
  } catch (error) {
    hideLoading();

    // Handle specific error cases
    if (error.errors && error.errors.length > 0) {
      error.errors.forEach((err) => {
        if (err.field) {
          showFieldError(err.field, err.message);
        }
      });
      showErrorToast('Please fix the errors in the form');
    } else if (error.statusCode === 409) {
      showErrorToast('Email or PRN/SRN/Teacher ID already exists');
    } else {
      showErrorToast(getUserFriendlyError(error.message));
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupPasswordToggles();
  setupPasswordStrength();
  setupRoleSelection();

  document.getElementById('signup-form').addEventListener('submit', handleSubmit);

  // Auto-uppercase for certain fields
  ['prn', 'srn', 'section', 'teacher-id'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
      });
    }
  });
});
