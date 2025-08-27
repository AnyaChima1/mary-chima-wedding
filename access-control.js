// ========================================
// ACCESS RESTRICTION FUNCTIONALITY
// ========================================

// Check if user has RSVP'd as attending
function hasRSVPdAsAttending() {
  const rsvpStatus = localStorage.getItem('weddingRSVPStatus');
  return rsvpStatus === 'attending';
}

// Hide restricted sections for non-attending users
function hideRestrictedSections() {
  // Only hide sections if user hasn't RSVP'd as attending
  if (!hasRSVPdAsAttending()) {
    // Hide the restricted sections
    const restrictedSections = ['story', 'details', 'rsvp', 'calendar', 'photos'];
    restrictedSections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = 'none';
      }
    });
    
    // Show a message instead
    showAccessRestrictedMessage();
  }
}

// Show access restricted message
function showAccessRestrictedMessage() {
  // Check if message already exists
  if (document.getElementById('access-restricted-message')) {
    return;
  }
  
  const message = document.createElement('div');
  message.id = 'access-restricted-message';
  message.innerHTML = '<div></div>'; // Create a placeholder
  
  // Set styles using JavaScript to avoid CSS conflicts
  Object.assign(message.style, {
    background: 'linear-gradient(135deg, #fafafa 0%, #f8f6f0 100%)',
    border: '2px solid #c8a951',
    borderRadius: '16px',
    padding: '40px 20px',
    textAlign: 'center',
    margin: '40px auto',
    maxWidth: '600px',
    boxShadow: '0 8px 32px rgba(0,0,0,.06)'
  });
  
  // Create content using DOM methods instead of innerHTML with special characters
  const iconDiv = document.createElement('div');
  iconDiv.textContent = '🔒';
  iconDiv.style.fontSize = '3rem';
  iconDiv.style.marginBottom = '20px';
  
  const title = document.createElement('h2');
  title.textContent = 'Private Wedding Information';
  Object.assign(title.style, {
    color: '#c8a951',
    marginBottom: '15px'
  });
  
  const text = document.createElement('p');
  text.innerHTML = 'This content is only available to confirmed guests.<br>Please RSVP as attending to access the full wedding information.';
  Object.assign(text.style, {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    color: '#333',
    marginBottom: '25px'
  });
  
  const button = document.createElement('button');
  button.textContent = 'RSVP Now to Access';
  Object.assign(button.style, {
    fontSize: '1.1rem',
    padding: '12px 30px',
    background: '#c8a951',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    fontWeight: '500'
  });
  
  button.addEventListener('click', function() {
    document.getElementById('rsvp-modal').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });
  
  // Assemble the message
  message.appendChild(iconDiv);
  message.appendChild(title);
  message.appendChild(text);
  message.appendChild(button);
  
  // Insert the message before the footer
  const footer = document.querySelector('.footer');
  if (footer) {
    footer.parentNode.insertBefore(message, footer);
  }
}

// Show restricted sections after successful RSVP
function showRestrictedSections() {
  const restrictedSections = ['story', 'details', 'rsvp', 'calendar', 'photos'];
  restrictedSections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = 'block';
    }
  });
  
  // Remove the access restricted message if it exists
  const message = document.getElementById('access-restricted-message');
  if (message) {
    message.remove();
  }
}

// Show confirmation message after successful RSVP
function showRSVPConfirmation() {
  // Remove existing confirmation if any
  const existingConfirmation = document.getElementById('rsvp-confirmation');
  if (existingConfirmation) {
    existingConfirmation.remove();
  }
  
  // Create confirmation message
  const confirmation = document.createElement('div');
  confirmation.id = 'rsvp-confirmation';
  
  // Set styles using JavaScript
  Object.assign(confirmation.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    color: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    zIndex: '10000',
    maxWidth: '350px'
  });
  
  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  confirmation.style.animation = 'slideInRight 0.5s ease';
  
  // Create content using DOM methods
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px'
  });
  
  const iconDiv = document.createElement('div');
  iconDiv.textContent = '🎉';
  iconDiv.style.fontSize = '1.5rem';
  iconDiv.style.marginRight = '10px';
  
  const title = document.createElement('h3');
  title.textContent = 'Access Granted!';
  title.style.margin = '0';
  
  header.appendChild(iconDiv);
  header.appendChild(title);
  
  const text = document.createElement('p');
  text.textContent = 'Thank you for confirming your attendance. You now have access to all wedding information.';
  Object.assign(text.style, {
    margin: '0 0 15px 0',
    lineHeight: '1.5'
  });
  
  const dismissButton = document.createElement('button');
  dismissButton.textContent = 'Dismiss';
  Object.assign(dismissButton.style, {
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer'
  });
  
  dismissButton.addEventListener('click', function() {
    confirmation.remove();
  });
  
  // Assemble the confirmation
  confirmation.appendChild(header);
  confirmation.appendChild(text);
  confirmation.appendChild(dismissButton);
  
  document.body.appendChild(confirmation);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (confirmation.parentNode) {
      confirmation.remove();
    }
  }, 8000);
}

// Initialize access restriction on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check if user has already RSVP'd as attending
  if (hasRSVPdAsAttending()) {
    // Show all sections if they've already RSVP'd
    showRestrictedSections();
  } else {
    // Hide restricted sections for new visitors
    hideRestrictedSections();
  }
  
  // Also hide the song request section by default since it should only be accessible after RSVP
  const songSection = document.querySelector('.card--song');
  if (songSection) {
    songSection.style.display = 'none';
  }
});