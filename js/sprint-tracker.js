// Sprint Tracker Trello Power-Up
window.TrelloPowerUp = window.TrelloPowerUp || {};

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

let t = null;

// Initialize the Power-Up
window.TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        return [{
            icon: {
                dark: 'https://smdynamo.github.io/trello-sprint-tracker/icon-light.svg',
                light: 'https://smdynamo.github.io/trello-sprint-tracker/icon-dark.svg'
            },
            text: 'Start New Sprint',
            callback: function(t) {
                return startNewSprint(t);
            }
        }];
    },
    'card-buttons': function(t, options) {
        return [{
            icon: {
                dark: 'https://smdynamo.github.io/trello-sprint-tracker/icon-light.svg',
                light: 'https://smdynamo.github.io/trello-sprint-tracker/icon-dark.svg'
            }, 
            text: 'Create Branch',
            callback: function(t) {
                return createBranch(t);
            }
        }, {
            icon: {
                dark: 'https://smdynamo.github.io/trello-sprint-tracker/icon-light.svg',
                light: 'https://smdynamo.github.io/trello-sprint-tracker/icon-dark.svg'
            },
            text: 'Add estimate to sprint',
            callback: function(t) {
                return addEstimateToSprint(t);
            }
        }];
    },
    'board-badges': function(t, options) {
        return getBoardBadge(t);
    },
    'show-settings': function(t, options) {
        return t.popup({
            title: 'Sprint Tracker Settings',
            url: 'https://smdynamo.github.io/trello-sprint-tracker/settings.html',
            height: 400
        });
    },
    'card-badges': function(t, options) {
        return t.card('customFieldItems')
            .then(function(customFields) {
                const estimateField = customFields.find(field => 
                    field.customField && field.customField.name.toLowerCase() === 'estimate'
                );
                
                if (estimateField && estimateField.value && estimateField.value.number) {
                    return [{
                        text: `${estimateField.value.number} pts`,
                        color: 'blue'
                    }];
                }
                
                return [];
            })
            .catch(function(error) {
                console.log('Error getting card badges:', error);
                return [];
            });
    },
    'card-detail-badges': function(t, options) {
        return t.card('customFieldItems')
            .then(function(customFields) {
                const estimateField = customFields.find(field => 
                    field.customField && field.customField.name.toLowerCase() === 'estimate'
                );
                
                if (estimateField && estimateField.value && estimateField.value.number) {
                    return [{
                        title: 'Story Points',
                        text: `${estimateField.value.number} points`,
                        color: 'blue',
                        callback: function(t) {
                            return addPointsToSprint(t, estimateField.value.number);
                        }
                    }];
                }
                
                return [];
            })
            .catch(function(error) {
                console.log('Error getting card detail badges:', error);
                return [];
            });
    }
});

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

// Create a new branch
async function createBranch(trelloContext = null) {
    const context = trelloContext || t;
    
    try {
        const data = await getSprintData(context);
        const branchName = `${data.sprint}-${data.branch}`;
        
        // Increment branch counter
        data.branch += 1;
        
        // Save updated data
        const saved = await saveSprintData(context, data);
        
        if (saved) {
            // Copy branch name to clipboard if possible
            let copied = false;
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(branchName);
                    console.log('Branch name copied to clipboard');
                    copied = true;
                } catch (clipboardError) {
                    console.log('Could not copy to clipboard:', clipboardError);
                }
            }
            
            // Attach branch info to the card
            try {
                await context.attach({
                    name: `Branch: ${branchName}`,
                    url: `#branch-${branchName}`
                });
            } catch (attachError) {
                console.warn('Could not attach branch to card:', attachError);
                // Continue execution even if attachment fails
            }
            
            // Show success message
            const message = copied 
                ? `Branch ${branchName} created and copied to clipboard!`
                : `Branch ${branchName} created and attached to card!`;
                
            await context.alert({
                message: message,
                duration: 5
            });
        } else {
            await context.alert({
                message: 'Error creating branch. Please try again.',
                duration: 3
            });
        }
        
        // Update display if we're on the main page
        if (typeof updateDisplay === 'function') {
            updateDisplay();
        }
        
    } catch (error) {
        console.error('Error in createBranch:', error);
        if (context && context.alert) {
            await context.alert({
                message: 'Error creating branch. Please check console for details.',
                duration: 3
            });
        }
    }
}

// Start a new sprint
async function startNewSprint(trelloContext = null) {
    const context = trelloContext || t;
    
    try {
        const data = await getSprintData(context);
        
        // Show confirmation dialog
        const confirmed = await context.confirm({
            message: `Start Sprint ${data.sprint + 1}?\n\nThis will:\n- Increment sprint to ${data.sprint + 1}\n- Reset branch counter to 100\n- Reset points to 0`
        });
        
        if (confirmed) {
            // Update sprint data
            data.sprint += 1;
            data.branch = DEFAULT_VALUES.branch;
            data.points = DEFAULT_VALUES.points;
            
            // Save updated data
            const saved = await saveSprintData(context, data);
            
            if (saved) {
                await context.alert({
                    message: `Sprint ${data.sprint} started!\nBranch counter reset to ${data.branch}\nPoints reset to ${data.points}`,
                    duration: 5
                });
            } else {
                await context.alert({
                    message: 'Error starting new sprint. Please try again.',
                    duration: 3
                });
            }
            
            // Update display if we're on the main page
            if (typeof updateDisplay === 'function') {
                updateDisplay();
            }
        }
        
    } catch (error) {
        console.error('Error in startNewSprint:', error);
        if (context && context.alert) {
            await context.alert({
                message: 'Error starting new sprint. Please check console for details.',
                duration: 3
            });
        }
    }
}

// Add points from estimate field to sprint total
async function addPointsToSprint(trelloContext, points) {
    const context = trelloContext || t;
    
    try {
        const data = await getSprintData(context);
        
        // Add points to current total
        data.points += points;
        
        // Save updated data
        const saved = await saveSprintData(context, data);
        
        if (saved) {
            await context.alert({
                message: `Added ${points} points to sprint!\nTotal points done: ${data.points}`,
                duration: 3
            });
        } else {
            await context.alert({
                message: 'Error adding points. Please try again.',
                duration: 3
            });
        }
        
        // Update display if we're on the main page
        if (typeof updateDisplay === 'function') {
            updateDisplay();
        }
        
    } catch (error) {
        console.error('Error in addPointsToSprint:', error);
        if (context && context.alert) {
            await context.alert({
                message: 'Error adding points. Please check console for details.',
                duration: 3
            });
        }
    }
}

// Function for standalone page usage
async function refreshStatus() {
    if (typeof updateDisplay === 'function') {
        await updateDisplay();
    }
}

// Update the display with current sprint data (for main page)
async function updateDisplay() {
    // This function should not be used in the main connector file
    // It's only for demonstration purposes in iframe contexts
    showMessage('This function is for demonstration only', 'info');
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

// Add estimate from card to sprint points
async function addEstimateToSprint(trelloContext = null) {
    const context = trelloContext || t;
    
    try {
        // Get card's custom fields
        const card = await context.card('customFieldItems');
        if (!card.customFieldItems || card.customFieldItems.length === 0) {
            return context.alert({
                message: 'No custom fields found on this card. Please add an "estimate" field.',
                duration: 4
            });
        }
        
        // Get board's custom field definitions
        const board = await context.board('customFields');
        if (!board.customFields || board.customFields.length === 0) {
            return context.alert({
                message: 'No custom fields defined on this board. Please add an "estimate" number field.',
                duration: 4
            });
        }
        
        // Find estimate field
        const estimateField = board.customFields.find(field => 
            field.name && field.name.toLowerCase() === 'estimate' && field.type === 'number'
        );
        
        if (!estimateField) {
            return context.alert({
                message: 'No "estimate" number field found. Please create one using Custom Fields Power-Up.',
                duration: 5
            });
        }
        
        // Find the field value on the card
        const fieldItem = card.customFieldItems.find(item => 
            item.idCustomField === estimateField.id
        );
        
        if (!fieldItem || !fieldItem.value || !fieldItem.value.number) {
            return context.alert({
                message: 'No estimate value set on this card. Please set a number value for the estimate field.',
                duration: 4
            });
        }
        
        const estimate = parseFloat(fieldItem.value.number);
        if (estimate <= 0) {
            return context.alert({
                message: 'Estimate must be greater than 0.',
                duration: 4
            });
        }
        
        // Get current sprint data and add estimate
        const data = await getSprintData(context);
        data.points += estimate;
        
        // Save updated data
        const saved = await saveSprintData(context, data);
        
        if (saved) {
            await context.alert({
                message: `Added ${estimate} points to sprint total (now ${data.points} points)`,
                duration: 4
            });
        } else {
            await context.alert({
                message: 'Error adding points. Please try again.',
                duration: 3
            });
        }
        
        // Update display if we're on the main page
        if (typeof updateDisplay === 'function') {
            updateDisplay();
        }
        
    } catch (error) {
        console.error('Error in addEstimateToSprint:', error);
        if (context && context.alert) {
            await context.alert({
                message: 'Error adding estimate. Please check console for details.',
                duration: 3
            });
        }
    }
}

// Get board badge for sprint status
async function getBoardBadge(t) {
    try {
        const data = await getSprintData(t);
        
        return [{
            dynamic: function() {
                return {
                    title: 'Sprint Tracker',
                    text: `Sprint #${data.sprint} • Pts ${data.points}`,
                    icon: {
                        dark: './icon-light.svg',
                        light: './icon-dark.svg'
                    },
                    color: 'blue',
                    refresh: 10
                };
            }
        }];
    } catch (error) {
        console.error('Error in getBoardBadge:', error);
        return [{
            title: 'Sprint Tracker',
            text: 'Error loading sprint data',
            color: 'red'
        }];
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Do not call TrelloPowerUp.iframe() in the main connector file
    // This is only for secondary iframes, not the main Power-Up initialization
    console.log('Sprint Tracker connector loaded');
});

// Export functions for global access
window.createBranch = createBranch;
window.startNewSprint = startNewSprint;
window.refreshStatus = refreshStatus;