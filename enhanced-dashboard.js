/**
 * Enhanced Dashboard with AI Features
 */

let dashboardState = {
  autoRefresh: true,
  refreshInterval: 30000
};

function initializeEnhancedDashboard() {
  addDashboardEnhancements();
  initializeRealTimeUpdates();
  loadIntelligentInsights();
}

function addDashboardEnhancements() {
  const headerContent = document.querySelector('.header-content');
  
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'dashboard-controls';
  controlsContainer.innerHTML = `
    <button class="btn btn-info" onclick="toggleInsightsPanel()">🧠 AI Insights</button>
    <button class="btn btn-success" onclick="toggleAutomationPanel()">⚡ Automation</button>
    <button class="btn btn-secondary" onclick="toggleRealTimeUpdates()">📊 Live Updates</button>
  `;
  
  headerContent.appendChild(controlsContainer);
}

function createInsightsPanel() {
  const panel = document.createElement('div');
  panel.id = 'insights-panel';
  panel.style.cssText = `
    position: fixed; top: 0; right: -400px; width: 400px; height: 100vh;
    background: white; box-shadow: -5px 0 15px rgba(0,0,0,0.1);
    transition: right 0.3s ease; z-index: 1000; overflow-y: auto; padding: 20px;
  `;
  
  panel.innerHTML = `
    <div class="panel-header">
      <h3>🧠 AI Insights</h3>
      <button onclick="toggleInsightsPanel()" style="float: right;">✕</button>
    </div>
    <div id="predictions-content">Loading predictions...</div>
    <div id="recommendations-content">Analyzing data...</div>
    <div id="alerts-content">Checking for issues...</div>
  `;
  
  document.body.appendChild(panel);
}

function toggleInsightsPanel() {
  const panel = document.getElementById('insights-panel');
  if (!panel) {
    createInsightsPanel();
    return;
  }
  
  const isOpen = panel.style.right === '0px';
  panel.style.right = isOpen ? '-400px' : '0px';
  
  if (!isOpen) {
    loadInsights();
  }
}

async function loadInsights() {
  try {
    const response = await fetch('/api/intelligent-automation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('adminAuth')}`
      },
      body: JSON.stringify({ action: 'guest_analytics' })
    });
    
    const data = await response.json();
    updateInsightsDisplay(data);
  } catch (error) {
    console.error('Failed to load insights:', error);
  }
}

function updateInsightsDisplay(data) {
  document.getElementById('predictions-content').innerHTML = `
    <div class="insight-card">
      <h5>Response Rate: ${data.response_rate}%</h5>
      <p>Predicted final attendance: ${data.predicted_attendance}</p>
    </div>
  `;
}

// Automation functions
async function runTableOptimization() {
  try {
    const response = await fetch('/api/intelligent-automation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('adminAuth')}`
      },
      body: JSON.stringify({ action: 'auto_table_optimization' })
    });
    
    const result = await response.json();
    showNotification(`✅ Optimized ${result.data.guests_assigned} guest assignments`, 'success');
    loadTableData(); // Refresh table view
  } catch (error) {
    showNotification('❌ Table optimization failed', 'error');
  }
}

// Real-time updates
function initializeRealTimeUpdates() {
  if (dashboardState.autoRefresh) {
    setInterval(() => {
      refreshDashboardData();
    }, dashboardState.refreshInterval);
  }
}

function refreshDashboardData() {
  const activeTab = document.querySelector('.tab-btn.active').textContent.toLowerCase();
  
  switch(activeTab) {
    case 'rsvps':
      loadRSVPs();
      break;
    case 'guests':
      loadGuests();
      break;
    case 'tables':
      loadTableData();
      break;
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 15px; 
    background: ${type === 'success' ? '#4caf50' : '#f44336'}; 
    color: white; border-radius: 5px; z-index: 2000;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Initialize when DOM loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEnhancedDashboard);
} else {
  initializeEnhancedDashboard();
}