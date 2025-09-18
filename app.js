// Trello Sprint Tracker Power-Up
// Global board variables: sprintNumber, nextBranchNumber, pointsDone

const BOARD_VARS = {
    SPRINT_NUMBER: 'sprintNumber',
    NEXT_BRANCH_NUMBER: 'nextBranchNumber', 
    POINTS_DONE: 'pointsDone'
};

const DEFAULT_VALUES = {
    SPRINT_NUMBER: 1,
    NEXT_BRANCH_NUMBER: 100,
    POINTS_DONE: 0
};

// Helper function to get board variable
async function getBoardVar(t, key, defaultValue = 0) {
    try {
        const data = await t.get('board', 'shared', key);
        return data !== undefined ? data : defaultValue;
    } catch (error) {
        console.error(`Error getting board variable ${key}:`, error);
        return defaultValue;
    }
}

// Helper function to set board variable
async function setBoardVar(t, key, value) {
    try {
        await t.set('board', 'shared', key, value);
        console.log(`Set ${key} to ${value}`);
    } catch (error) {
        console.error(`Error setting board variable ${key}:`, error);
        throw error;
    }
}

// Helper function to copy text to clipboard
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
        }
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
}

// Get card's estimate custom field value
async function getCardEstimate(t) {
    try {
        // Get card data including custom field items
        const card = await t.card('customFieldItems');
        
        if (!card.customFieldItems || card.customFieldItems.length === 0) {
            return null;
        }
        
        // Get board custom field definitions
        const board = await t.board('customFields');
        
        if (!board.customFields || board.customFields.length === 0) {
            return null;
        }
        
        // Find the estimate field definition
        const estimateField = board.customFields.find(field => 
            field.name && field.name.toLowerCase() === 'estimate' && field.type === 'number'
        );
        
        if (!estimateField) {
            return null;
        }
        
        // Find the corresponding field item on the card
        const fieldItem = card.customFieldItems.find(item => 
            item.idCustomField === estimateField.id
        );
        
        if (!fieldItem || !fieldItem.value) {
            return null;
        }
        
        return fieldItem.value.number ? parseFloat(fieldItem.value.number) : null;
        
    } catch (error) {
        console.error('Error getting card estimate:', error);
        return null;
    }
}

// Initialize Power-Up
TrelloPowerUp.initialize({
    // Board buttons
    'board-buttons': function(t, options) {
        return [{
            icon: {
                dark: './icon-light.svg',
                light: './icon-dark.svg'
            },
            text: 'New Sprint',
            callback: function(t) {
                return newSprintHandler(t);
            }
        }, {
            icon: {
                dark: './icon-light.svg', 
                light: './icon-dark.svg'
            },
            text: 'Sprint Settings',
            callback: function(t) {
                return sprintSettingsHandler(t);
            }
        }];
    },

    // Card buttons
    'card-buttons': function(t, options) {
        return [{
            icon: {
                dark: './icon-light.svg',
                light: './icon-dark.svg'
            },
            text: 'Use next branch #',
            callback: function(t) {
                return useNextBranchHandler(t);
            }
        }, {
            icon: {
                dark: './icon-light.svg',
                light: './icon-dark.svg'  
            },
            text: 'Add estimate to sprint points',
            callback: function(t) {
                return addEstimateHandler(t);
            }
        }];
    },

    // Board badges
    'board-badges': function(t, options) {
        return getBoardBadge(t);
    }
});

// New Sprint Handler
async function newSprintHandler(t) {
    try {
        const currentSprint = await getBoardVar(t, BOARD_VARS.SPRINT_NUMBER, DEFAULT_VALUES.SPRINT_NUMBER);
        const newSprint = currentSprint + 1;
        
        // Increment sprint number
        await setBoardVar(t, BOARD_VARS.SPRINT_NUMBER, newSprint);
        
        // Reset branch number to 100
        await setBoardVar(t, BOARD_VARS.NEXT_BRANCH_NUMBER, DEFAULT_VALUES.NEXT_BRANCH_NUMBER);
        
        // Reset points done to 0
        await setBoardVar(t, BOARD_VARS.POINTS_DONE, DEFAULT_VALUES.POINTS_DONE);
        
        // Show success message
        return t.alert({
            message: `Started Sprint #${newSprint}! Branch counter reset to 100, points reset to 0.`,
            duration: 4
        });
        
    } catch (error) {
        console.error('Error in newSprintHandler:', error);
        return t.alert({
            message: 'Failed to start new sprint. Please try again.',
            display: 'error',
            duration: 4
        });
    }
}

// Sprint Settings Handler
async function sprintSettingsHandler(t) {
    try {
        const sprintNumber = await getBoardVar(t, BOARD_VARS.SPRINT_NUMBER, DEFAULT_VALUES.SPRINT_NUMBER);
        const nextBranchNumber = await getBoardVar(t, BOARD_VARS.NEXT_BRANCH_NUMBER, DEFAULT_VALUES.NEXT_BRANCH_NUMBER);
        const pointsDone = await getBoardVar(t, BOARD_VARS.POINTS_DONE, DEFAULT_VALUES.POINTS_DONE);
        
        return t.popup({
            title: 'Sprint Settings',
            url: './sprint-settings.html',
            args: {
                sprintNumber,
                nextBranchNumber,
                pointsDone
            },
            height: 300
        });
    } catch (error) {
        console.error('Error in sprintSettingsHandler:', error);
        return t.alert({
            message: 'Failed to open sprint settings.',
            display: 'error',
            duration: 4
        });
    }
}

// Use Next Branch Handler
async function useNextBranchHandler(t) {
    try {
        const sprintNumber = await getBoardVar(t, BOARD_VARS.SPRINT_NUMBER, DEFAULT_VALUES.SPRINT_NUMBER);
        const branchNumber = await getBoardVar(t, BOARD_VARS.NEXT_BRANCH_NUMBER, DEFAULT_VALUES.NEXT_BRANCH_NUMBER);
        
        const branchName = `${sprintNumber}-${branchNumber}`;
        
        // Copy to clipboard
        const copied = await copyToClipboard(branchName);
        
        // Comment on the card
        await t.card('id').then(async (card) => {
            const comment = `Branch: ${branchName}`;
            // Note: t.card('comments') is read-only, so we'll use the attachment instead
            return t.attach({
                name: `Branch: ${branchName}`,
                url: `#branch-${branchName}`
            });
        });
        
        // Increment branch counter
        await setBoardVar(t, BOARD_VARS.NEXT_BRANCH_NUMBER, branchNumber + 1);
        
        // Show success message
        const message = copied 
            ? `Branch ${branchName} created and copied to clipboard!`
            : `Branch ${branchName} created and attached to card!`;
            
        return t.alert({
            message: message,
            duration: 4
        });
        
    } catch (error) {
        console.error('Error in useNextBranchHandler:', error);
        return t.alert({
            message: 'Failed to create branch. Please try again.',
            display: 'error',
            duration: 4
        });
    }
}

// Add Estimate Handler
async function addEstimateHandler(t) {
    try {
        const estimate = await getCardEstimate(t);
        
        if (estimate === null) {
            return t.alert({
                message: 'No estimate found. Please add an "estimate" custom field with a number value.',
                display: 'warning',
                duration: 5
            });
        }
        
        if (estimate <= 0) {
            return t.alert({
                message: 'Estimate must be greater than 0.',
                display: 'warning',
                duration: 4
            });
        }
        
        // Add estimate to points done
        const currentPoints = await getBoardVar(t, BOARD_VARS.POINTS_DONE, DEFAULT_VALUES.POINTS_DONE);
        const newPoints = currentPoints + estimate;
        
        await setBoardVar(t, BOARD_VARS.POINTS_DONE, newPoints);
        
        return t.alert({
            message: `Added ${estimate} points to sprint total (now ${newPoints} points)`,
            duration: 4
        });
        
    } catch (error) {
        console.error('Error in addEstimateHandler:', error);
        return t.alert({
            message: 'Failed to add estimate to sprint points.',
            display: 'error',
            duration: 4
        });
    }
}

// Get Board Badge
async function getBoardBadge(t) {
    try {
        const sprintNumber = await getBoardVar(t, BOARD_VARS.SPRINT_NUMBER, DEFAULT_VALUES.SPRINT_NUMBER);
        const pointsDone = await getBoardVar(t, BOARD_VARS.POINTS_DONE, DEFAULT_VALUES.POINTS_DONE);
        
        return [{
            dynamic: function() {
                return {
                    title: 'Sprint Tracker',
                    text: `Sprint #${sprintNumber} • Pts ${pointsDone}`,
                    icon: {
                        dark: './icon-light.svg',
                        light: './icon-dark.svg'
                    },
                    color: 'blue',
                    refresh: 10 // Refresh every 10 seconds
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