// Sprint Tracker iframe functionality for index.html
let t = null;

// Default values
const DEFAULT_VALUES = {
    sprint: 1,
    branch: 100,
    points: 0
};

// Storage keys
const STORAGE_KEYS = {
    sprint: 'sprint_tracker_sprint',
    branch: 'sprint_tracker_branch', 
    points: 'sprint_tracker_points'
};

// Get current sprint data from board storage
async function getSprintData(trelloContext) {
    try {
        const boardData = await trelloContext.get('board', 'private');
        return {
            sprint: boardData[STORAGE_KEYS.sprint] || DEFAULT_VALUES.sprint,
            branch: boardData[STORAGE_KEYS.branch] || DEFAULT_VALUES.branch,
            points: boardData[STORAGE_KEYS.points] || DEFAULT_VALUES.points
        };
    } catch (error) {
        console.error('Error getting sprint data:', error);
        return DEFAULT_VALUES;
    }
}

// Save sprint data to board storage
async function saveSprintData(trelloContext, data) {
    try {
        await trelloContext.set('board', 'private', {
            [STORAGE_KEYS.sprint]: data.sprint,
            [STORAGE_KEYS.branch]: data.branch,
            [STORAGE_KEYS.points]: data.points
        });
        return true;
    } catch (error) {
        console.error('Error saving sprint data:', error);
        return false;
    }
}

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

// Create a new branch
async function createBranch() {
    if (!t) {
        showMessage('Trello context not available', 'error');
        return;
    }
    
    try {
        const data = await getSprintData(t);
        const branchName = `${data.sprint}-${data.branch}`;
        
        // Increment branch counter
        data.branch += 1;
        
        // Save updated data
        const saved = await saveSprintData(t, data);
        
        if (saved) {
            showMessage(`Branch ${branchName} created! Next branch will be ${data.sprint}-${data.branch}`, 'success');
            await updateDisplay();
        } else {
            showMessage('Error creating branch. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Error in createBranch:', error);
        showMessage('Error creating branch. Please check console for details.', 'error');
    }
}

// Start a new sprint
async function startNewSprint() {
    if (!t) {
        showMessage('Trello context not available', 'error');
        return;
    }
    
    try {
        const data = await getSprintData(t);
        
        if (confirm(`Start Sprint ${data.sprint + 1}?\n\nThis will:\n- Increment sprint to ${data.sprint + 1}\n- Reset branch counter to 100\n- Reset points to 0`)) {
            // Update sprint data
            data.sprint += 1;
            data.branch = DEFAULT_VALUES.branch;
            data.points = DEFAULT_VALUES.points;
            
            // Save updated data
            const saved = await saveSprintData(t, data);
            
            if (saved) {
                showMessage(`Sprint ${data.sprint} started! Branch counter reset to ${data.branch}, Points reset to ${data.points}`, 'success');
                await updateDisplay();
            } else {
                showMessage('Error starting new sprint. Please try again.', 'error');
            }
        }
        
    } catch (error) {
        console.error('Error in startNewSprint:', error);
        showMessage('Error starting new sprint. Please check console for details.', 'error');
    }
}

// Update the display with current sprint data
async function updateDisplay() {
    if (!window.TrelloPowerUp || !window.TrelloPowerUp.iframe) {
        showMessage('This page needs to be loaded as a Trello Power-Up', 'error');
        return;
    }
    
    try {
        if (!t) {
            t = window.TrelloPowerUp.iframe();
        }
        
        const data = await getSprintData(t);
        
        document.getElementById('current-sprint').textContent = data.sprint;
        document.getElementById('next-branch').textContent = `${data.sprint}-${data.branch}`;
        document.getElementById('points-done').textContent = data.points;
        
        showMessage('Status updated successfully', 'success');
    } catch (error) {
        console.error('Error updating display:', error);
        showMessage('Error updating status', 'error');
    }
}

// Function for standalone page usage
async function refreshStatus() {
    await updateDisplay();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (window.TrelloPowerUp && window.TrelloPowerUp.iframe) {
        t = window.TrelloPowerUp.iframe();
        updateDisplay();
    }
});

// Export functions for global access
window.createBranch = createBranch;
window.startNewSprint = startNewSprint;
window.refreshStatus = refreshStatus;