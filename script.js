
// Enhanced Countdown with Dynamic Animations - Reliable Implementation
(function initCountdown() {
  let countdownInitialized = false;
  
  function startCountdown() {
    if (countdownInitialized) return;
    
    const el = document.getElementById('countdown');
    if (!el) {
      console.log('Countdown element not ready, retrying...');
      setTimeout(startCountdown, 100);
      return;
    }
    
    countdownInitialized = true;
    console.log('Starting countdown timer...');
    
    let previousValues = {};
    
    function pad(n) { return n.toString().padStart(2,'0'); }
    
    function createSparkles(element) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const sparkle = document.createElement('div');
          sparkle.innerHTML = '✨';
          sparkle.style.cssText = `
            position: absolute;
            font-size: 16px;
            pointer-events: none;
            animation: sparkleFloat 1s ease-out forwards;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
          `;
          element.appendChild(sparkle);
          setTimeout(() => sparkle.remove(), 1000);
        }, i * 150);
      }
    }
    
    function render() {
      const target = new Date('2025-10-04T17:00:00+03:00').getTime();
      const now = Date.now();
      let diff = Math.max(0, target - now);
      
      const d = Math.floor(diff / (1000*60*60*24)); diff -= d*86400000;
      const h = Math.floor(diff / (1000*60*60)); diff -= h*3600000;
      const m = Math.floor(diff / (1000*60)); diff -= m*60000;
      const s = Math.floor(diff / 1000);
      
      const currentValues = { d, h, m, s };
      
      // Force immediate visibility and populate content
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.style.visibility = 'visible';
      
      el.innerHTML = `
        <div class="box" data-type="days"><b>${pad(d)}</b><small>days</small></div>
        <div class="box" data-type="hours"><b>${pad(h)}</b><small>hours</small></div>
        <div class="box" data-type="minutes"><b>${pad(m)}</b><small>minutes</small></div>
        <div class="box" data-type="seconds"><b>${pad(s)}</b><small>seconds</small></div>
      `;
      
      // Add dynamic animations
      const boxes = el.querySelectorAll('.box');
      boxes.forEach((box, index) => {
        const type = ['d', 'h', 'm', 's'][index];
        
        // Set initial visibility for each box
        box.style.opacity = '1';
        box.style.visibility = 'visible';
        
        if (previousValues[type] !== undefined && previousValues[type] !== currentValues[type]) {
          box.style.animation = 'numberFlip 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
          
          if (type === 'd' || type === 'h') {
            createSparkles(box);
          }
        }
        
        if (type === 's') {
          box.style.animation = 'secondsPulse 1s ease-in-out infinite';
        }
      });
      
      previousValues = { ...currentValues };
      console.log('Countdown updated:', currentValues);
    }
    
    // Initial render and setup interval
    render();
    setInterval(render, 1000);
  }
  
  // Start countdown when DOM is ready or immediately if already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCountdown);
  } else {
    startCountdown();
  }
  
  // Additional fallback - force start after a short delay
  setTimeout(startCountdown, 500);
})();

// Immediate test to populate countdown if element exists
setTimeout(function() {
  const el = document.getElementById('countdown');
  if (el && !el.innerHTML.trim()) {
    console.log('Emergency countdown activation...');
    const now = Date.now();
    const target = new Date('2025-10-04T17:00:00+03:00').getTime();
    let diff = Math.max(0, target - now);
    const d = Math.floor(diff / (1000*60*60*24)); diff -= d*86400000;
    const h = Math.floor(diff / (1000*60*60)); diff -= h*3600000;
    const m = Math.floor(diff / (1000*60)); diff -= m*60000;
    const s = Math.floor(diff / 1000);
    
    function pad(n) { return n.toString().padStart(2,'0'); }
    
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.innerHTML = `
      <div class="box" data-type="days"><b>${pad(d)}</b><small>days</small></div>
      <div class="box" data-type="hours"><b>${pad(h)}</b><small>hours</small></div>
      <div class="box" data-type="minutes"><b>${pad(m)}</b><small>minutes</small></div>
      <div class="box" data-type="seconds"><b>${pad(s)}</b><small>seconds</small></div>
    `;
    
    // Ensure all boxes are visible
    el.querySelectorAll('.box').forEach(box => {
      box.style.opacity = '1';
      box.style.visibility = 'visible';
    });
  }
}, 1000);

// Mobile nav toggle
const toggle = document.querySelector('.nav__toggle');
const nav = document.querySelector('#site-nav');
if (toggle && nav){
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    
    // Add ripple effect
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(200,169,81,0.3);
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    `;
    toggle.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
  
  // Close nav after clicking a link (mobile)
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=> {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

// Scroll-triggered animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'slideInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards';
      entry.target.style.opacity = '1';
      
      // Stagger children animations
      const children = entry.target.querySelectorAll('.card, .btn, .pill');
      children.forEach((child, index) => {
        setTimeout(() => {
          child.style.animation = 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        }, index * 100);
      });
    }
  });
}, observerOptions);

// Observe sections for scroll animations
document.querySelectorAll('.section').forEach(section => {
  section.style.opacity = '0';
  section.style.transform = 'translateY(30px)';
  observer.observe(section);
});

// Parallax effect for hero watermark
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const rate = scrolled * -0.5;
  const heroWatermark = document.querySelector('.header::before');
  if (heroWatermark) {
    heroWatermark.style.transform = `translateX(-50%) translateY(${rate}px)`;
  }
});

// Interactive card tilt effect
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)';
  });
});

// Enhanced button interactions
document.querySelectorAll('.btn').forEach(button => {
  // Ripple effect on click
  button.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255,255,255,0.4);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    `;
    
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
  
  // Shimmer effect on hover
  button.addEventListener('mouseenter', function() {
    if (!this.querySelector('.shimmer')) {
      const shimmer = document.createElement('div');
      shimmer.className = 'shimmer';
      shimmer.style.cssText = `
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: shimmerSweep 1.5s ease-in-out infinite;
        pointer-events: none;
      `;
      this.appendChild(shimmer);
    }
  });
  
  button.addEventListener('mouseleave', function() {
    const shimmer = this.querySelector('.shimmer');
    if (shimmer) {
      shimmer.remove();
    }
  });
});

// Enhanced CSS animations via JavaScript
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(50px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  @keyframes numberFlip {
    0% { transform: rotateY(0deg) scale(1); }
    50% { transform: rotateY(90deg) scale(1.1); color: var(--gold); }
    100% { transform: rotateY(0deg) scale(1); }
  }
  
  @keyframes secondsPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(200,169,81,0.4); }
    50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(200,169,81,0); }
  }
  
  @keyframes sparkleFloat {
    0% {
      transform: translateY(0) rotate(0deg) scale(0);
      opacity: 1;
    }
    100% {
      transform: translateY(-30px) rotate(180deg) scale(1.2);
      opacity: 0;
    }
  }
  
  @keyframes shimmerSweep {
    0% { transform: translateX(-100%) skewX(-15deg); }
    100% { transform: translateX(200%) skewX(-15deg); }
  }
  
  @keyframes backgroundPulse {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.3; }
  }
  
  .nav__toggle {
    position: relative;
    overflow: hidden;
  }
  
  .particle {
    position: fixed;
    pointer-events: none;
    z-index: 1;
    width: 4px;
    height: 4px;
    background: radial-gradient(circle, rgba(200,169,81,0.6), transparent);
    border-radius: 50%;
    animation: particleFloat 8s linear infinite;
  }
  
  @keyframes particleFloat {
    0% {
      transform: translateY(100vh) translateX(0) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 1;
      transform: translateY(90vh) translateX(0) scale(1);
    }
    90% {
      opacity: 1;
      transform: translateY(10vh) translateX(var(--random-x)) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(0) translateX(var(--random-x)) scale(0);
    }
  }
`;
document.head.appendChild(style);

// RSVP Modal Functionality
const rsvpModal = document.getElementById('rsvp-modal');
const rsvpHeroBtn = document.getElementById('rsvp-hero-btn');
const modalCloseBtn = document.querySelector('.modal__close');
const modalCloseBtns = document.querySelectorAll('.modal-close-btn');
const rsvpForm = document.getElementById('rsvp-form');
const attendanceSelect = document.getElementById('attendance');
const guestCountGroup = document.getElementById('guest-count-group');
const guestNamesGroup = document.getElementById('guest-names-group');
const dietaryGroup = document.getElementById('dietary-group');
const guestCountSelect = document.getElementById('guest-count');
const rsvpSuccess = document.getElementById('rsvp-success');

// Open modal
function openRSVPModal() {
  rsvpModal.classList.add('is-open');
  rsvpModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  // Focus first input
  setTimeout(() => {
    document.getElementById('guest-name').focus();
  }, 300);
  
  // Add sparkle effect
  createCelebration(rsvpHeroBtn);
}

// Close modal
function closeRSVPModal() {
  rsvpModal.classList.remove('is-open');
  rsvpModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  // Reset form after a delay
  setTimeout(() => {
    rsvpForm.reset();
    rsvpForm.style.display = 'flex';
    rsvpSuccess.style.display = 'none';
    toggleConditionalFields();
  }, 300);
}

// Event listeners for modal
rsvpHeroBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  openRSVPModal();
});

modalCloseBtn?.addEventListener('click', closeRSVPModal);
modalCloseBtns?.forEach(btn => btn.addEventListener('click', closeRSVPModal));

// Close on backdrop click
rsvpModal?.addEventListener('click', (e) => {
  if (e.target === rsvpModal || e.target.classList.contains('modal__backdrop')) {
    closeRSVPModal();
  }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && rsvpModal.classList.contains('is-open')) {
    closeRSVPModal();
  }
});

// Handle conditional form fields
function toggleConditionalFields() {
  const attendance = attendanceSelect.value;
  
  if (attendance === 'yes') {
    guestCountGroup.style.display = 'flex';
    dietaryGroup.style.display = 'flex';
    toggleGuestNamesField();
  } else {
    guestCountGroup.style.display = 'none';
    guestNamesGroup.style.display = 'none';
    dietaryGroup.style.display = 'none';
  }
}

function toggleGuestNamesField() {
  const guestCount = parseInt(guestCountSelect.value);
  
  if (guestCount > 1) {
    guestNamesGroup.style.display = 'flex';
    document.getElementById('guest-names').required = true;
  } else {
    guestNamesGroup.style.display = 'none';
    document.getElementById('guest-names').required = false;
  }
}

attendanceSelect?.addEventListener('change', toggleConditionalFields);
guestCountSelect?.addEventListener('change', toggleGuestNamesField);

// Form submission handling with Netlify Functions
rsvpForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Add loading state
  const submitBtn = rsvpForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Submitting... ⏳';
  submitBtn.disabled = true;
  
  try {
    // Get form data
    const formData = new FormData(rsvpForm);
    const rsvpData = {
      name: formData.get('name'),
      email: formData.get('email'),
      attendance: formData.get('attendance'),
      guest_count: formData.get('guest_count') || '1',
      guest_names: formData.get('guest_names') || '',
      dietary: formData.get('dietary') || ''
    };
    
    // Submit to Netlify function
    const response = await fetch('/.netlify/functions/submit-rsvp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rsvpData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit RSVP');
    }
    
    // Show success state
    rsvpForm.style.display = 'none';
    rsvpSuccess.style.display = 'block';
    
    // Update success message based on whether it was an update
    const successTitle = rsvpSuccess.querySelector('h3');
    const successText = rsvpSuccess.querySelector('p');
    
    if (result.updated) {
      successTitle.textContent = 'RSVP Updated!';
      successText.textContent = 'Your RSVP has been successfully updated. We look forward to celebrating with you!';
    } else {
      successTitle.textContent = 'Thank You!';
      successText.textContent = 'Your RSVP has been received. We can\'t wait to celebrate with you!';
    }
    
    // Create celebration effect
    createCelebration(rsvpSuccess);
    
    console.log('RSVP Submitted Successfully:', result);
    
  } catch (error) {
    console.error('RSVP submission error:', error);
    
    // Show user-friendly error message
    let errorMessage = 'Sorry, there was an error submitting your RSVP. Please try again.';
    
    if (error.message.includes('email already exists')) {
      errorMessage = 'An RSVP with this email already exists. Please use the same form to update your response.';
    } else if (error.message.includes('Invalid email')) {
      errorMessage = 'Please enter a valid email address.';
    } else if (error.message.includes('Missing required fields')) {
      errorMessage = 'Please fill in all required fields (name, email, and attendance).';
    }
    
    // Create and show error message
    const existingError = rsvpForm.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      background: rgba(244, 67, 54, 0.1);
      color: #d32f2f;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      border: 1px solid rgba(244, 67, 54, 0.3);
      animation: fadeInUp 0.3s ease;
    `;
    errorDiv.textContent = errorMessage;
    
    rsvpForm.insertBefore(errorDiv, rsvpForm.querySelector('.form-actions'));
    
    // Remove error message after 5 seconds
    setTimeout(() => {
      if (errorDiv && errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
    
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Form validation enhancements
function addFormValidation() {
  const inputs = rsvpForm?.querySelectorAll('input, select, textarea');
  
  inputs?.forEach(input => {
    input.addEventListener('blur', validateField);
    input.addEventListener('input', clearFieldError);
  });
}

function validateField(e) {
  const field = e.target;
  const value = field.value.trim();
  
  // Remove existing error styling
  field.classList.remove('error');
  
  // Basic validation
  if (field.required && !value) {
    field.classList.add('error');
    return false;
  }
  
  // Email validation
  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      field.classList.add('error');
      return false;
    }
  }
  
  return true;
}

function clearFieldError(e) {
  e.target.classList.remove('error');
}

// Initialize form validation
addFormValidation();

// Initialize conditional fields
toggleConditionalFields();

console.log('🎉 RSVP Modal functionality loaded!');

// ========================================
// SONG REQUEST MODAL FUNCTIONALITY
// ========================================
const songModal = document.getElementById('song-modal');
const songForm = document.getElementById('song-form');
const songSuccess = document.getElementById('song-success');

// Open song modal
function openSongModal() {
  songModal.classList.add('is-open');
  songModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  setTimeout(() => {
    document.getElementById('song-requester-name').focus();
  }, 300);
  
  createCelebration(document.querySelector('.card--song'));
}

// Close song modal
function closeSongModal() {
  songModal.classList.remove('is-open');
  songModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  setTimeout(() => {
    songForm.reset();
    songForm.style.display = 'flex';
    songSuccess.style.display = 'none';
  }, 300);
}

// Song form submission
songForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = songForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Submitting... ⏳';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(songForm);
    const songData = {
      name: formData.get('name'),
      email: formData.get('email'),
      song_title: formData.get('song_title'),
      artist_name: formData.get('artist_name'),
      genre: formData.get('genre'),
      reason: formData.get('reason')
    };
    
    const response = await fetch('/.netlify/functions/submit-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(songData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit song request');
    }
    
    songForm.style.display = 'none';
    songSuccess.style.display = 'flex';
    createCelebration(songSuccess);
    
  } catch (error) {
    console.error('Song submission error:', error);
    alert('Sorry, there was an error submitting your song request. Please try again.');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// ========================================
// ENHANCED PHOTO SHARING & GALLERY FUNCTIONALITY
// ========================================
const photoModal = document.getElementById('photo-modal');
const photoForm = document.getElementById('photo-form');
const photoSuccess = document.getElementById('photo-success');
let galleryPhotos = [];
let currentLightboxIndex = 0;
let currentUploadMethod = 'url';
let selectedFiles = [];

// Open photo modal with specific tab
function openPhotoModal(tab = 'share') {
  photoModal.classList.add('is-open');
  photoModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  // Switch to specified tab
  switchPhotoTab(tab);
  
  if (tab === 'share') {
    setTimeout(() => {
      document.getElementById('photo-sharer-name').focus();
    }, 300);
  } else if (tab === 'gallery') {
    loadGallery();
  }
  
  createCelebration(document.querySelector('.card--photos'));
}

// Switch between photo modal tabs
function switchPhotoTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event?.target?.classList.add('active') || document.querySelector(`.tab-btn:${tab === 'share' ? 'first' : 'last'}-child`).classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById(tab === 'share' ? 'share-tab' : 'gallery-tab').classList.add('active');
  
  // Load gallery if switching to gallery tab
  if (tab === 'gallery') {
    loadGallery();
  }
}

// Upload method selection
function selectUploadMethod(method) {
  currentUploadMethod = method;
  
  // Update method option styling
  document.querySelectorAll('.method-option').forEach(option => option.classList.remove('active'));
  event.target.closest('.method-option').classList.add('active');
  
  // Show/hide upload sections
  document.querySelectorAll('.upload-section').forEach(section => section.classList.remove('active'));
  document.getElementById(method + '-upload').classList.add('active');
  
  // Update form validation
  const urlInput = document.getElementById('photo-url');
  const fileInput = document.getElementById('photo-files');
  
  if (method === 'url') {
    urlInput.required = true;
    fileInput.required = false;
    selectedFiles = [];
    updateFilePreview();
  } else {
    urlInput.required = false;
    fileInput.required = true;
  }
}

// File upload handling
function setupFileUpload() {
  const fileInput = document.getElementById('photo-files');
  const uploadArea = document.querySelector('.file-upload-area');
  
  // File input change
  fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  
  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  });
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  handleFiles(files);
}

function handleFiles(files) {
  const validFiles = files.filter(file => {
    const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
    const isSmallEnough = file.size <= 10 * 1024 * 1024; // 10MB
    return isValid && isSmallEnough;
  });
  
  selectedFiles = [...selectedFiles, ...validFiles];
  updateFilePreview();
}

function updateFilePreview() {
  const preview = document.getElementById('file-preview');
  preview.innerHTML = '';
  
  selectedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      item.appendChild(img);
    } else {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      item.appendChild(video);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-item-remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => removeFile(index);
    item.appendChild(removeBtn);
    
    preview.appendChild(item);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFilePreview();
}

// Close photo modal
function closePhotoModal() {
  photoModal.classList.remove('is-open');
  photoModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  setTimeout(() => {
    photoForm.reset();
    photoForm.style.display = 'flex';
    photoSuccess.style.display = 'none';
    selectedFiles = [];
    updateFilePreview();
  }, 300);
}

// Load gallery photos
async function loadGallery() {
  const galleryGrid = document.getElementById('gallery-grid');
  galleryGrid.innerHTML = '<div class="gallery-loading">Loading photos...</div>';
  
  try {
    const response = await fetch('/.netlify/functions/get-photos');
    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      galleryPhotos = result.data;
      displayGallery(galleryPhotos);
      updateGalleryStats(result.statistics);
    } else {
      galleryGrid.innerHTML = `
        <div class="gallery-empty">
          <div class="gallery-empty-icon">📷</div>
          <h3>No photos yet</h3>
          <p>Be the first to share a memory!</p>
          <button class="btn btn--primary" onclick="switchPhotoTab('share')">Share Photo</button>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading gallery:', error);
    galleryGrid.innerHTML = '<div class="gallery-loading">Error loading photos. Please try again.</div>';
  }
}

// Display gallery photos
function displayGallery(photos) {
  const galleryGrid = document.getElementById('gallery-grid');
  
  if (photos.length === 0) {
    galleryGrid.innerHTML = `
      <div class="gallery-empty">
        <div class="gallery-empty-icon">📷</div>
        <h3>No photos in this category</h3>
        <p>Try a different filter or be the first to share!</p>
      </div>
    `;
    return;
  }
  
  galleryGrid.innerHTML = photos.map((photo, index) => {
    const isVideo = photo.photo_url.includes('.mp4') || photo.photo_url.includes('.mov') || photo.photo_url.includes('video');
    return `
      <div class="gallery-item ${isVideo ? 'is-video' : ''}" onclick="openLightbox(${index})">
        ${isVideo ? 
          `<video src="${photo.photo_url}" muted></video>` : 
          `<img src="${photo.photo_url}" alt="${photo.description || 'Wedding photo'}" loading="lazy">`
        }
        <div class="gallery-item-overlay">
          <div class="gallery-item-title">${photo.name}</div>
          <div class="gallery-item-meta">${photo.category} • ${new Date(photo.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Filter gallery
function filterGallery(category) {
  // Update filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // Filter photos
  const filteredPhotos = category === 'all' ? 
    galleryPhotos : 
    galleryPhotos.filter(photo => photo.category === category);
  
  displayGallery(filteredPhotos);
}

// Update gallery stats
function updateGalleryStats(statistics) {
  const photoCount = document.getElementById('photo-count');
  const contributorCount = document.getElementById('contributor-count');
  
  if (photoCount && contributorCount) {
    photoCount.textContent = `${statistics.total_photos} photos`;
    contributorCount.textContent = `${statistics.category_breakdown?.length || 0} contributors`;
  }
}

// Lightbox functionality
function openLightbox(index) {
  currentLightboxIndex = index;
  const lightbox = document.getElementById('photo-lightbox');
  const photo = galleryPhotos[index];
  
  // Set media
  const image = document.getElementById('lightbox-image');
  const video = document.getElementById('lightbox-video');
  const isVideo = photo.photo_url.includes('.mp4') || photo.photo_url.includes('.mov') || photo.photo_url.includes('video');
  
  if (isVideo) {
    video.src = photo.photo_url;
    video.style.display = 'block';
    image.style.display = 'none';
  } else {
    image.src = photo.photo_url;
    image.style.display = 'block';
    video.style.display = 'none';
  }
  
  // Set info
  document.getElementById('lightbox-description').textContent = photo.description || 'No description';
  document.getElementById('lightbox-contributor').textContent = photo.name;
  document.getElementById('lightbox-category').textContent = photo.category;
  document.getElementById('lightbox-date').textContent = new Date(photo.created_at).toLocaleDateString();
  
  lightbox.style.display = 'flex';
  setTimeout(() => lightbox.classList.add('active'), 10);
}

function closeLightbox() {
  const lightbox = document.getElementById('photo-lightbox');
  lightbox.classList.remove('active');
  setTimeout(() => lightbox.style.display = 'none', 300);
}

function navigateLightbox(direction) {
  currentLightboxIndex += direction;
  
  if (currentLightboxIndex < 0) {
    currentLightboxIndex = galleryPhotos.length - 1;
  } else if (currentLightboxIndex >= galleryPhotos.length) {
    currentLightboxIndex = 0;
  }
  
  openLightbox(currentLightboxIndex);
}

// Keyboard navigation for lightbox
document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('photo-lightbox');
  if (lightbox && lightbox.style.display === 'flex') {
    switch(e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        navigateLightbox(-1);
        break;
      case 'ArrowRight':
        navigateLightbox(1);
        break;
    }
  }
});

// Enhanced photo form submission with file upload support
photoForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = photoForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Uploading... ⏳';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(photoForm);
    
    if (currentUploadMethod === 'url') {
      // Handle URL submission
      const photoData = {
        name: formData.get('name'),
        email: formData.get('email'),
        photo_url: formData.get('photo_url'),
        description: formData.get('description'),
        category: formData.get('category')
      };
      
      const response = await fetch('/.netlify/functions/submit-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photoData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit photo');
      }
      
      showPhotoSuccess();
      
    } else {
      // Handle file upload
      if (selectedFiles.length === 0) {
        throw new Error('Please select at least one file to upload');
      }
      
      // Upload files one by one
      let successCount = 0;
      const totalFiles = selectedFiles.length;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        submitBtn.textContent = `Uploading ${i + 1}/${totalFiles}... ⏳`;
        
        // Create a unique filename
        const timestamp = Date.now();
        const filename = `wedding_${timestamp}_${i + 1}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        // Convert file to base64 for upload
        const base64 = await fileToBase64(file);
        
        const uploadData = {
          name: formData.get('name'),
          email: formData.get('email'),
          description: formData.get('description'),
          category: formData.get('category'),
          file_data: base64,
          filename: filename,
          file_type: file.type
        };
        
        const response = await fetch('/.netlify/functions/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadData)
        });
        
        if (response.ok) {
          successCount++;
        } else {
          console.error(`Failed to upload file ${i + 1}:`, await response.text());
        }
      }
      
      if (successCount === totalFiles) {
        showPhotoSuccess(`Successfully uploaded ${successCount} photo${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0) {
        showPhotoSuccess(`Uploaded ${successCount} of ${totalFiles} photos. Some uploads may have failed.`);
      } else {
        throw new Error('Failed to upload any photos. Please try again.');
      }
    }
    
  } catch (error) {
    console.error('Photo submission error:', error);
    alert(`Sorry, there was an error: ${error.message}. Please try again.`);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Show photo success with custom message
function showPhotoSuccess(message = 'Thank you for sharing your memories with us!') {
  photoForm.style.display = 'none';
  photoSuccess.style.display = 'flex';
  
  // Update success message if provided
  const successText = photoSuccess.querySelector('p');
  if (successText && message) {
    successText.textContent = message;
  }
  
  createCelebration(photoSuccess);
  
  // Reset form and files
  selectedFiles = [];
  updateFilePreview();
}

// ========================================
// WISHES MODAL FUNCTIONALITY
// ========================================
const wishesModal = document.getElementById('wishes-modal');
const wishesForm = document.getElementById('wishes-form');
const wishesSuccess = document.getElementById('wishes-success');

// Open wishes modal
function openWishesModal() {
  wishesModal.classList.add('is-open');
  wishesModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  setTimeout(() => {
    document.getElementById('wishes-name').focus();
  }, 300);
  
  createCelebration(document.querySelector('.card--wishes'));
}

// Close wishes modal
function closeWishesModal() {
  wishesModal.classList.remove('is-open');
  wishesModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  setTimeout(() => {
    wishesForm.reset();
    wishesForm.style.display = 'flex';
    wishesSuccess.style.display = 'none';
  }, 300);
}

// Wishes form submission
wishesForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = wishesForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Submitting... ⏳';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(wishesForm);
    const wishesData = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
      message_type: formData.get('message_type'),
      relationship: formData.get('relationship')
    };
    
    const response = await fetch('/.netlify/functions/submit-wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wishesData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit wishes');
    }
    
    wishesForm.style.display = 'none';
    wishesSuccess.style.display = 'flex';
    createCelebration(wishesSuccess);
    
  } catch (error) {
    console.error('Wishes submission error:', error);
    alert('Sorry, there was an error submitting your wishes. Please try again.');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// ========================================
// GLOBAL MODAL MANAGEMENT
// ========================================
// Handle all modal close buttons
document.querySelectorAll('.modal__close, .modal-close-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      
      // Reset forms after closing
      setTimeout(() => {
        const form = modal.querySelector('form');
        const success = modal.querySelector('[id$="-success"]');
        if (form && success) {
          form.reset();
          form.style.display = 'flex';
          success.style.display = 'none';
        }
      }, 300);
    }
  });
});

// Handle backdrop clicks
document.querySelectorAll('.modal__backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });
});

// Handle ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModal = document.querySelector('.modal.is-open');
    if (openModal) {
      openModal.classList.remove('is-open');
      openModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }
});

// Enhanced loading sequence with elegant reveals
window.addEventListener('load', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.8s ease';
  
  // Initialize file upload functionality
  setupFileUpload();
  
  // Create loading overlay
  const loadingOverlay = document.createElement('div');
  loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #fafafa 0%, #f8f6f0 50%, #fafafa 100%);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    transition: opacity 0.8s ease, transform 0.8s ease;
  `;
  
  const loadingContent = document.createElement('div');
  loadingContent.innerHTML = `
    <div style="
      font-size: 2rem;
      margin-bottom: 1rem;
      animation: pulse 1.5s ease-in-out infinite;
    ">💍</div>
    <div style="
      font-family: Georgia, serif;
      font-size: 1.2rem;
      color: #c8a951;
      letter-spacing: 2px;
      animation: fadeInUp 1s ease 0.5s both;
    ">Mary & Chima</div>
  `;
  
  loadingOverlay.appendChild(loadingContent);
  document.body.appendChild(loadingOverlay);
  
  setTimeout(() => {
    loadingOverlay.style.opacity = '0';
    loadingOverlay.style.transform = 'scale(1.1)';
    document.body.style.opacity = '1';
    
    setTimeout(() => {
      loadingOverlay.remove();
      
      // Trigger entrance animations
      document.querySelectorAll('.card, .btn, .pill').forEach((el, index) => {
        el.style.animation = `fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s both`;
      });
    }, 800);
  }, 1500);
});

// Enhanced floating elements system
function createFloatingHeart() {
  const hearts = ['💕', '💖', '💝', '💗', '💓'];
  const heart = document.createElement('div');
  heart.innerHTML = hearts[Math.floor(Math.random() * hearts.length)];
  heart.style.cssText = `
    position: fixed;
    font-size: ${15 + Math.random() * 10}px;
    pointer-events: none;
    z-index: 1000;
    animation: floatUp ${3 + Math.random() * 2}s ease-out forwards;
    left: ${Math.random() * 100}vw;
    top: 100vh;
    filter: drop-shadow(0 0 5px rgba(200,169,81,0.3));
  `;
  
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 5000);
}

// Create background particles
function createParticle() {
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.left = Math.random() * 100 + 'vw';
  particle.style.setProperty('--random-x', (Math.random() - 0.5) * 200 + 'px');
  particle.style.animationDelay = Math.random() * 8 + 's';
  
  document.body.appendChild(particle);
  
  setTimeout(() => particle.remove(), 8000);
}

// Trigger floating hearts occasionally
setInterval(createFloatingHeart, 12000);

// Create continuous particle background
setInterval(createParticle, 2000);

// Initial burst of particles
for (let i = 0; i < 5; i++) {
  setTimeout(createParticle, i * 500);
}

// Enhanced floating hearts CSS with more variety
const heartsStyle = document.createElement('style');
heartsStyle.textContent = `
  @keyframes floatUp {
    0% {
      transform: translateY(0) rotate(0deg) scale(0.8);
      opacity: 1;
    }
    50% {
      transform: translateY(-50vh) rotate(180deg) scale(1.2);
      opacity: 0.8;
    }
    100% {
      transform: translateY(-100vh) rotate(360deg) scale(0.6);
      opacity: 0;
    }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.2); opacity: 1; }
  }
  
  @keyframes fadeDot {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(0); opacity: 0; }
  }
`;
document.head.appendChild(heartsStyle);

// Scroll progress indicator
function createScrollProgress() {
  const progress = document.createElement('div');
  progress.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    background: linear-gradient(90deg, var(--gold), var(--gold-dark));
    z-index: 1000;
    transition: width 0.1s ease;
    box-shadow: 0 0 10px rgba(200,169,81,0.5);
  `;
  document.body.appendChild(progress);
  
  window.addEventListener('scroll', () => {
    const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    progress.style.width = Math.min(scrolled, 100) + '%';
  });
}
createScrollProgress();

// Enhanced parallax for multiple elements
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  
  // Header background parallax
  const header = document.querySelector('.header');
  if (header) {
    header.style.transform = `translateY(${scrolled * 0.3}px)`;
  }
  
  // Card subtle parallax
  document.querySelectorAll('.card').forEach((card, index) => {
    const rate = (scrolled - card.offsetTop + window.innerHeight) * 0.02;
    card.style.transform = `translateY(${rate}px)`;
  });
});

// Interactive cursor trail (subtle)
let cursorTrail = [];
document.addEventListener('mousemove', (e) => {
  // Only on larger screens
  if (window.innerWidth > 768) {
    cursorTrail.push({ x: e.clientX, y: e.clientY, time: Date.now() });
    
    // Keep trail manageable
    if (cursorTrail.length > 10) {
      cursorTrail.shift();
    }
    
    // Create trail dots occasionally
    if (Math.random() < 0.1) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        position: fixed;
        width: 3px;
        height: 3px;
        background: rgba(200,169,81,0.3);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        animation: fadeDot 1s ease-out forwards;
      `;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 1000);
    }
  }
});

// Magnetic effect for buttons
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    btn.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) scale(1.02)`;
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translate(0, 0) scale(1)';
  });
});

// Add fade dot animation
const trailStyle = document.createElement('style');
trailStyle.textContent = `
  @keyframes fadeDot {
    0% { opacity: 0.6; transform: scale(1); }
    100% { opacity: 0; transform: scale(2); }
  }
`;
document.head.appendChild(trailStyle);

// Enhanced section reveal with staggered elements
const enhancedObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      
      // Animate child elements with stagger
      const animatableElements = entry.target.querySelectorAll('h2, h3, p, .btn, .card, .pill, .tag');
      animatableElements.forEach((el, index) => {
        setTimeout(() => {
          el.style.animation = 'slideInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        }, index * 100);
      });
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
});

// Observe all sections and cards
document.querySelectorAll('.section, .card').forEach(el => {
  enhancedObserver.observe(el);
});

// Add celebration effect for special interactions
function createCelebration(element) {
  const colors = ['#c8a951', '#a98c3e', '#ffd700', '#f0e68c'];
  
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        animation: confettiFall 2s ease-out forwards;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      `;
      
      const angle = (i / 12) * 360;
      const velocity = 50 + Math.random() * 50;
      confetti.style.setProperty('--angle', angle + 'deg');
      confetti.style.setProperty('--velocity', velocity + 'px');
      
      element.appendChild(confetti);
      setTimeout(() => confetti.remove(), 2000);
    }, i * 50);
  }
}

// Add confetti animation
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
  @keyframes confettiFall {
    0% {
      transform: translate(-50%, -50%) rotate(0deg) translateY(0);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) rotate(720deg) translateY(var(--velocity));
      opacity: 0;
    }
  }
`;
document.head.appendChild(confettiStyle);

// Trigger celebration on RSVP and form buttons
document.querySelectorAll('.btn--primary').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (btn.textContent.includes('RSVP') || btn.textContent.includes('Suggest')) {
      createCelebration(btn);
    }
  });
});

// Auto-hide mobile nav on scroll
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  const currentScrollY = window.scrollY;
  
  if (currentScrollY > lastScrollY && currentScrollY > 100) {
    navbar.style.transform = 'translateY(-100%)';
  } else {
    navbar.style.transform = 'translateY(0)';
  }
  
  lastScrollY = currentScrollY;
});

console.log('🎉 Enhanced wedding site loaded with dynamic features!');
console.log('💕 Features: Floating hearts, particles, enhanced animations, scroll effects, and more!');
