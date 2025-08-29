// ========================================
// ACCESS RESTRICTION FUNCTIONALITY
// ========================================

// Check if user has RSVP'd as attending
function hasRSVPdAsAttending() {
  const rsvpStatus = localStorage.getItem('weddingRSVPStatus');
  return rsvpStatus === 'attending';
}

// Check if RSVP deadline has passed (September 20, 2025)
function hasRSVPDeadlinePassed() {
  const deadline = new Date('2025-09-20T23:59:59');
  const now = new Date();
  return now > deadline;
}

// Hide restricted sections for non-attending users
// Keep the story section visible to everyone
function hideRestrictedSections() {
  // Only hide sections if user hasn't RSVP'd as attending
  if (!hasRSVPdAsAttending()) {
    // Hide the restricted sections (excluding story section)
    const restrictedSections = ['details', 'calendar', 'photos'];
    restrictedSections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = 'none';
      }
    });
    
    // Show a message in the header instead of the RSVP button
    showAccessRestrictedMessageInHeader();
  }
}

// Show access restricted message in the header
function showAccessRestrictedMessageInHeader() {
  // Check if message already exists
  if (document.getElementById('access-restricted-message-header')) {
    return;
  }
  
  // Remove the existing RSVP button
  const rsvpButton = document.getElementById('rsvp-hero-btn');
  if (rsvpButton) {
    rsvpButton.style.display = 'none';
  }
  
  // Create the access restricted message in the header
  const headerContent = document.querySelector('.header__content .container');
  if (headerContent) {
    const messageDiv = document.createElement('div');
    messageDiv.id = 'access-restricted-message-header';
    
    // Set styles using JavaScript
    Object.assign(messageDiv.style, {
      background: 'linear-gradient(135deg, #fafafa 0%, #f8f6f0 100%)',
      border: '2px solid #c8a951',
      borderRadius: '16px',
      padding: '30px 20px',
      textAlign: 'center',
      margin: '30px auto',
      maxWidth: '600px',
      boxShadow: '0 8px 32px rgba(0,0,0,.06)'
    });
    
    // Create content
    const title = document.createElement('h2');
    title.textContent = 'Save Your Spot';
    Object.assign(title.style, {
      color: '#c8a951',
      marginBottom: '15px',
      fontSize: '1.8rem'
    });
    
    const text = document.createElement('p');
    //text.textContent = 'This content is only available to confirmed guests.';
    Object.assign(text.style, {
      fontSize: '1.1rem',
      lineHeight: '1.6',
      color: '#333',
      marginBottom: '15px'
    });
    
    const subtext = document.createElement('p');
    const button = document.createElement('button');
    
    // Check if RSVP deadline has passed
    if (hasRSVPDeadlinePassed()) {
      // Deadline has passed - show emotional and appreciative message with emojis
      subtext.textContent = 'Our plans are set, our hearts are full, and your love makes it all the more special. 🌟❤️';
      Object.assign(subtext.style, {
        fontSize: '1.1rem',
        lineHeight: '1.6',
        color: '#333',
        marginBottom: '25px'
      });
      
      // Create disabled button
      button.textContent = 'Plans Finalized 🌟';
      Object.assign(button.style, {
        fontSize: '1.1rem',
        padding: '12px 30px',
        background: '#cccccc',
        color: '#666666',
        border: 'none',
        borderRadius: '24px',
        cursor: 'not-allowed',
        fontWeight: '500'
      });
      
      // Disable button functionality
      button.disabled = true;
    } else {
      // Deadline has not passed - show normal message
      subtext.textContent = 'We’d love to know if you’ll be celebrating with us! Kindly RSVP before 20 September 2025 to see all the wedding info. ❤️';
      Object.assign(subtext.style, {
        fontSize: '1.1rem',
        lineHeight: '1.6',
        color: '#333',
        marginBottom: '25px'
      });
      
      button.textContent = 'RSVP Now to Access ✨';
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
    }
    
    // Assemble the message
    messageDiv.appendChild(title);
    messageDiv.appendChild(text);
    messageDiv.appendChild(subtext);
    messageDiv.appendChild(button);
    
    // Insert the message in the header content
    headerContent.appendChild(messageDiv);
  }
}

// Show restricted sections after successful RSVP
function showRestrictedSections() {
  // Updated to include the 'rsvp' section which contains both RSVP form and song request card
  const restrictedSections = ['details', 'calendar', 'photos', 'rsvp'];
  restrictedSections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = 'block';
    }
  });
  
  // Also show the song request card specifically
  const songSection = document.querySelector('.card--song');
  if (songSection) {
    songSection.style.display = 'block';
  }
  
  // Remove the access restricted message from header if it exists
  const headerMessage = document.getElementById('access-restricted-message-header');
  if (headerMessage) {
    headerMessage.remove();
  }
  
  // Handle the RSVP button in the header
  const rsvpButton = document.getElementById('rsvp-hero-btn');
  if (rsvpButton) {
    // Check if RSVP deadline has passed
    if (hasRSVPDeadlinePassed()) {
      // Deadline has passed - disable the button
      rsvpButton.textContent = 'RSVP Deadline Passed';
      rsvpButton.style.background = '#cccccc';
      rsvpButton.style.color = '#666666';
      rsvpButton.style.cursor = 'not-allowed';
      rsvpButton.onclick = function(e) {
        e.preventDefault();
        return false;
      };
    } else {
      // Deadline has not passed - hide the button when user has already RSVP'd
      rsvpButton.style.display = 'none';
    }
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
  // Only hide if user hasn't RSVP'd as attending
  if (!hasRSVPdAsAttending()) {
    const songSection = document.querySelector('.card--song');
    if (songSection) {
      songSection.style.display = 'none';
    }
  }
});