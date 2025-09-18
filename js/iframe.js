// Sprint Tracker standalone dashboard functionality for index.html
// This is a simple dashboard page that doesn't interact with Trello APIs

// Show message to user
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = type === 'error' ? '#ffebee' : 
                                     type === 'success' ? '#e8f5e8' : '#e3f2fd';
    messageDiv.style.color = type === 'error' ? '#c62828' : 
                            type === 'success' ? '#2e7d32' : '#1565c0';
    messageDiv.style.border = `1px solid ${type === 'error' ? '#ef5350' : 
                                          type === 'success' ? '#4caf50' : '#2196f3'}`;
    messageDiv.style.borderRadius = '4px';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Simple button handlers for the standalone dashboard
// These show information but don't actually interact with Trello

// Create a new branch
function createBranch() {
    showMessage('This is a demo page. Use the actual Trello Power-Up on your board to create branches.', 'info');
}

// Start a new sprint  
function startNewSprint() {
    showMessage('This is a demo page. Use the actual Trello Power-Up on your board to start new sprints.', 'info');
}

// Update the display with demo data
function updateDisplay() {
    document.getElementById('current-sprint').textContent = '44';
    document.getElementById('next-branch').textContent = '44-100';
    document.getElementById('points-done').textContent = '15';
    
    showMessage('Demo data loaded. This is a status dashboard - use the Power-Up on your Trello board for actual functionality.', 'info');
}

// Function for standalone page usage
function refreshStatus() {
    updateDisplay();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateDisplay();
});

// Export functions for global access
window.createBranch = createBranch;
window.startNewSprint = startNewSprint;
window.refreshStatus = refreshStatus;