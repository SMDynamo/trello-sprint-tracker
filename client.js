// Sprint Tracker Trello Power-Up Client
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

// Update custom field on a card
async function updateCardCustomField(trelloContext, fieldName, value) {
    try {
        // Get board's custom field definitions
        const board = await trelloContext.board('customFields');
        if (!board.customFields || board.customFields.length === 0) {
            console.log('No custom fields defined on board');
            return false;
        }

        // Find the field by name (case-insensitive)
        const field = board.customFields.find(f =>
            f.name && f.name.toLowerCase() === fieldName.toLowerCase()
        );

        if (!field) {
            console.log(`Custom field "${fieldName}" not found on board`);
            return false;
        }

        // Get the card we're updating
        const card = await trelloContext.card('id');

        // Update the custom field value based on type
        let updateData = {};
        if (field.type === 'number') {
            updateData = { number: String(value) };
        } else if (field.type === 'text') {
            updateData = { text: String(value) };
        } else {
            console.log(`Unsupported field type: ${field.type}`);
            return false;
        }

        // Make the API call to update the custom field
        await trelloContext.request({
            method: 'PUT',
            url: `/1/cards/${card.id}/customField/${field.id}/item`,
            data: { value: updateData }
        });

        console.log(`Updated ${fieldName} to ${value}`);
        return true;
    } catch (error) {
        console.error(`Error updating custom field ${fieldName}:`, error);
        return false;
    }
}

// Set sprint number on current card's custom field
async function setCardSprintNumber(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);

        // Update the sprint custom field on this card
        const updated = await updateCardCustomField(trelloContext, 'sprint', data.sprint);

        if (updated) {
            return trelloContext.alert({
                message: `Card sprint set to ${data.sprint}`,
                duration: 3
            });
        } else {
            return trelloContext.alert({
                message: 'Could not update sprint field. Make sure "sprint" custom field exists.',
                duration: 4
            });
        }
    } catch (error) {
        console.error('Error setting card sprint:', error);
        return trelloContext.alert({
            message: 'Error setting sprint number',
            duration: 3
        });
    }
}

// Move card to In Progress with all automations
async function moveToInProgress(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        const branchName = `${data.sprint}-${data.branch}`;

        // Get card and board info
        const card = await trelloContext.card('id');
        const board = await trelloContext.board('id', 'lists');

        // Find the In Progress list
        const inProgressList = board.lists.find(list =>
            list.name.toLowerCase().includes('in progress')
        );

        if (!inProgressList) {
            return trelloContext.alert({
                message: 'Could not find "In Progress" list',
                duration: 3
            });
        }

        // 1. Join the card (add current member)
        const member = await trelloContext.member('id');
        await trelloContext.request({
            method: 'POST',
            url: `/1/cards/${card.id}/idMembers`,
            data: { value: member.id }
        });

        // 2. Move card to top of In Progress list
        await trelloContext.request({
            method: 'PUT',
            url: `/1/cards/${card.id}`,
            data: {
                idList: inProgressList.id,
                pos: 'top'
            }
        });

        // 3. Set Start Date custom field to now
        await updateCardCustomField(trelloContext, 'Start Date', new Date().toISOString());

        // 4. Set Branch custom field
        await updateCardCustomField(trelloContext, 'branch', branchName);

        // 5. Set Sprint custom field
        await updateCardCustomField(trelloContext, 'sprint', data.sprint);

        // 6. Increment branch counter for next use
        data.branch += 1;
        await saveSprintData(trelloContext, data);

        // 7. Copy branch to clipboard
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(branchName);
            } catch (err) {
                console.log('Could not copy to clipboard');
            }
        }

        return trelloContext.alert({
            message: `Moved to In Progress with branch ${branchName}`,
            duration: 4
        });

    } catch (error) {
        console.error('Error moving to In Progress:', error);
        return trelloContext.alert({
            message: 'Error: ' + error.message,
            duration: 4
        });
    }
}

// Move card to Code Review
async function moveToCodeReview(trelloContext) {
    try {
        const card = await trelloContext.card('id');
        const board = await trelloContext.board('id', 'lists');

        // Find the Code Review list
        const codeReviewList = board.lists.find(list =>
            list.name.toLowerCase().includes('code review')
        );

        if (!codeReviewList) {
            return trelloContext.alert({
                message: 'Could not find "Code Review" list',
                duration: 3
            });
        }

        // 1. Move card to top of Code Review list
        await trelloContext.request({
            method: 'PUT',
            url: `/1/cards/${card.id}`,
            data: {
                idList: codeReviewList.id,
                pos: 'top'
            }
        });

        // 2. Clear Blocker custom field
        await updateCardCustomField(trelloContext, 'Blocker', '');

        return trelloContext.alert({
            message: 'Moved to Code Review',
            duration: 3
        });

    } catch (error) {
        console.error('Error moving to Code Review:', error);
        return trelloContext.alert({
            message: 'Error: ' + error.message,
            duration: 4
        });
    }
}

// Move card to Done
async function moveToDone(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        const card = await trelloContext.card('id', 'customFieldItems');

        // Check for estimate and add to sprint points
        let pointsAdded = 0;
        if (card.customFieldItems && card.customFieldItems.length > 0) {
            const board = await trelloContext.board('customFields');
            if (board.customFields) {
                const estimateField = board.customFields.find(field =>
                    field.name && field.name.toLowerCase() === 'estimate' && field.type === 'number'
                );

                if (estimateField) {
                    const fieldItem = card.customFieldItems.find(item =>
                        item.idCustomField === estimateField.id
                    );

                    if (fieldItem && fieldItem.value && fieldItem.value.number) {
                        pointsAdded = parseFloat(fieldItem.value.number);
                        if (pointsAdded > 0) {
                            data.points += pointsAdded;
                            await saveSprintData(trelloContext, data);
                        }
                    }
                }
            }
        }

        // Get board with ID for Dev Done board
        const boards = await trelloContext.request({
            method: 'GET',
            url: `/1/members/me/boards`
        });

        const devDoneBoard = boards.find(board =>
            board.name.includes('Dev Done')
        );

        if (!devDoneBoard) {
            return trelloContext.alert({
                message: 'Could not find "Dev Done" board',
                duration: 3
            });
        }

        // Get lists from Dev Done board
        const lists = await trelloContext.request({
            method: 'GET',
            url: `/1/boards/${devDoneBoard.id}/lists`
        });

        const readyList = lists.find(list => list.name === 'Ready');

        if (!readyList) {
            return trelloContext.alert({
                message: 'Could not find "Ready" list on Dev Done board',
                duration: 3
            });
        }

        // 1. Set End Date custom field to now
        await updateCardCustomField(trelloContext, 'End Date', new Date().toISOString());

        // 2. Set Sprint custom field
        await updateCardCustomField(trelloContext, 'sprint', data.sprint);

        // 3. Move card to top of Ready list on Dev Done board
        await trelloContext.request({
            method: 'PUT',
            url: `/1/cards/${card.id}`,
            data: {
                idList: readyList.id,
                idBoard: devDoneBoard.id,
                pos: 'top'
            }
        });

        const message = pointsAdded > 0
            ? `Moved to Done (Sprint ${data.sprint}) + ${pointsAdded} points added`
            : `Moved to Done (Sprint ${data.sprint})`;

        return trelloContext.alert({
            message: message,
            duration: 4
        });

    } catch (error) {
        console.error('Error moving to Done:', error);
        return trelloContext.alert({
            message: 'Error: ' + error.message,
            duration: 4
        });
    }
}

// Move card to Awaiting Epic Completion
async function moveToAwaitingEpic(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        const card = await trelloContext.card('id', 'customFieldItems');

        // Check for estimate and add to sprint points
        let pointsAdded = 0;
        if (card.customFieldItems && card.customFieldItems.length > 0) {
            const board = await trelloContext.board('customFields');
            if (board.customFields) {
                const estimateField = board.customFields.find(field =>
                    field.name && field.name.toLowerCase() === 'estimate' && field.type === 'number'
                );

                if (estimateField) {
                    const fieldItem = card.customFieldItems.find(item =>
                        item.idCustomField === estimateField.id
                    );

                    if (fieldItem && fieldItem.value && fieldItem.value.number) {
                        pointsAdded = parseFloat(fieldItem.value.number);
                        if (pointsAdded > 0) {
                            data.points += pointsAdded;
                            await saveSprintData(trelloContext, data);
                        }
                    }
                }
            }
        }

        // Get boards
        const boards = await trelloContext.request({
            method: 'GET',
            url: `/1/members/me/boards`
        });

        const devDoneBoard = boards.find(board =>
            board.name.includes('Dev Done')
        );

        if (!devDoneBoard) {
            return trelloContext.alert({
                message: 'Could not find "Dev Done" board',
                duration: 3
            });
        }

        // Get lists from Dev Done board
        const lists = await trelloContext.request({
            method: 'GET',
            url: `/1/boards/${devDoneBoard.id}/lists`
        });

        const awaitingList = lists.find(list =>
            list.name.includes('Awaiting Epic Completion')
        );

        if (!awaitingList) {
            return trelloContext.alert({
                message: 'Could not find "Awaiting Epic Completion" list',
                duration: 3
            });
        }

        // 1. Set End Date custom field to now
        await updateCardCustomField(trelloContext, 'End Date', new Date().toISOString());

        // 2. Set Sprint custom field
        await updateCardCustomField(trelloContext, 'sprint', data.sprint);

        // 3. Move card to top of Awaiting Epic Completion list
        await trelloContext.request({
            method: 'PUT',
            url: `/1/cards/${card.id}`,
            data: {
                idList: awaitingList.id,
                idBoard: devDoneBoard.id,
                pos: 'top'
            }
        });

        const message = pointsAdded > 0
            ? `Moved to Awaiting Epic Completion (Sprint ${data.sprint}) + ${pointsAdded} points added`
            : `Moved to Awaiting Epic Completion (Sprint ${data.sprint})`;

        return trelloContext.alert({
            message: message,
            duration: 4
        });

    } catch (error) {
        console.error('Error moving to Awaiting Epic:', error);
        return trelloContext.alert({
            message: 'Error: ' + error.message,
            duration: 4
        });
    }
}

// Create a new branch and set it on the card
async function createBranch(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        const branchName = `${data.sprint}-${data.branch}`;

        // Update the branch custom field on this card
        await updateCardCustomField(trelloContext, 'branch', branchName);

        // Also update sprint field since card is moving to in progress
        await updateCardCustomField(trelloContext, 'sprint', data.sprint);

        // Increment branch counter for next use
        data.branch += 1;

        // Save updated data
        const saved = await saveSprintData(trelloContext, data);

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
                await trelloContext.attach({
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

            return trelloContext.alert({
                message: message,
                duration: 5
            });
        } else {
            return trelloContext.alert({
                message: 'Error creating branch. Please try again.',
                duration: 3
            });
        }

    } catch (error) {
        console.error('Error in createBranch:', error);
        if (trelloContext && trelloContext.alert) {
            return trelloContext.alert({
                message: 'Error creating branch. Please check console for details.',
                duration: 3
            });
        }
    }
}

// Start a new sprint
async function startNewSprint(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        
        // Show confirmation dialog
        const confirmed = await trelloContext.confirm({
            message: `Start Sprint ${data.sprint + 1}?\n\nThis will:\n- Increment sprint to ${data.sprint + 1}\n- Reset branch counter to 100\n- Reset points to 0`
        });
        
        if (confirmed) {
            // Update sprint data
            data.sprint += 1;
            data.branch = DEFAULT_VALUES.branch;
            data.points = DEFAULT_VALUES.points;
            
            // Save updated data
            const saved = await saveSprintData(trelloContext, data);
            
            if (saved) {
                return trelloContext.alert({
                    message: `Sprint ${data.sprint} started!\nBranch counter reset to ${data.branch}\nPoints reset to ${data.points}`,
                    duration: 5
                });
            } else {
                return trelloContext.alert({
                    message: 'Error starting new sprint. Please try again.',
                    duration: 3
                });
            }
        }
        
    } catch (error) {
        console.error('Error in startNewSprint:', error);
        if (trelloContext && trelloContext.alert) {
            return trelloContext.alert({
                message: 'Error starting new sprint. Please check console for details.',
                duration: 3
            });
        }
    }
}

// Add points from estimate field to sprint total
async function addPointsToSprint(trelloContext, points) {
    try {
        const data = await getSprintData(trelloContext);
        
        // Add points to current total
        data.points += points;
        
        // Save updated data
        const saved = await saveSprintData(trelloContext, data);
        
        if (saved) {
            return trelloContext.alert({
                message: `Added ${points} points to sprint!\nTotal points done: ${data.points}`,
                duration: 3
            });
        } else {
            return trelloContext.alert({
                message: 'Error adding points. Please try again.',
                duration: 3
            });
        }
        
    } catch (error) {
        console.error('Error in addPointsToSprint:', error);
        if (trelloContext && trelloContext.alert) {
            return trelloContext.alert({
                message: 'Error adding points. Please check console for details.',
                duration: 3
            });
        }
    }
}

// Add estimate from card to sprint points
async function addEstimateToSprint(trelloContext) {
    try {
        // Get card's custom fields
        const card = await trelloContext.card('customFieldItems');
        if (!card.customFieldItems || card.customFieldItems.length === 0) {
            return trelloContext.alert({
                message: 'No custom fields found on this card. Please add an "estimate" field.',
                duration: 4
            });
        }
        
        // Get board's custom field definitions
        const board = await trelloContext.board('customFields');
        if (!board.customFields || board.customFields.length === 0) {
            return trelloContext.alert({
                message: 'No custom fields defined on this board. Please add an "estimate" number field.',
                duration: 4
            });
        }
        
        // Find estimate field
        const estimateField = board.customFields.find(field => 
            field.name && field.name.toLowerCase() === 'estimate' && field.type === 'number'
        );
        
        if (!estimateField) {
            return trelloContext.alert({
                message: 'No "estimate" number field found. Please create one using Custom Fields Power-Up.',
                duration: 5
            });
        }
        
        // Find the field value on the card
        const fieldItem = card.customFieldItems.find(item => 
            item.idCustomField === estimateField.id
        );
        
        if (!fieldItem || !fieldItem.value || !fieldItem.value.number) {
            return trelloContext.alert({
                message: 'No estimate value set on this card. Please set a number value for the estimate field.',
                duration: 4
            });
        }
        
        const estimate = parseFloat(fieldItem.value.number);
        if (estimate <= 0) {
            return trelloContext.alert({
                message: 'Estimate must be greater than 0.',
                duration: 4
            });
        }
        
        // Get current sprint data and add estimate
        const data = await getSprintData(trelloContext);
        data.points += estimate;
        
        // Save updated data
        const saved = await saveSprintData(trelloContext, data);
        
        if (saved) {
            return trelloContext.alert({
                message: `Added ${estimate} points to sprint total (now ${data.points} points)`,
                duration: 4
            });
        } else {
            return trelloContext.alert({
                message: 'Error adding points. Please try again.',
                duration: 3
            });
        }
        
    } catch (error) {
        console.error('Error in addEstimateToSprint:', error);
        if (trelloContext && trelloContext.alert) {
            return trelloContext.alert({
                message: 'Error adding estimate. Please check console for details.',
                duration: 3
            });
        }
    }
}

// Get board badge for sprint status
function getBoardBadge(t) {
    return [{
        dynamic: async function() {
            try {
                const data = await getSprintData(t);
                return {
                    title: 'Sprint Tracker',
                    text: `Sprint #${data.sprint} • Pts ${data.points}`,
                    icon: {
                        dark: 'https://smdynamo.github.io/trello-sprint-tracker/icon-light.svg',
                        light: 'https://smdynamo.github.io/trello-sprint-tracker/icon-dark.svg'
                    },
                    color: 'blue',
                    refresh: 10
                };
            } catch (error) {
                console.error('Error in getBoardBadge:', error);
                return {
                    title: 'Sprint Tracker',
                    text: 'Error loading sprint data',
                    color: 'red'
                };
            }
        }
    }];
}

// Show board variables popup
function showBoardVars(t) {
    return t.popup({
        title: 'Sprint Tracker - Board Variables',
        url: 'https://smdynamo.github.io/trello-sprint-tracker/settings.html',
        height: 400
    });
}

// Initialize the Power-Up
window.TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        return [{
            icon: 'https://img.icons8.com/ios/50/000000/settings.png',
            text: '⚙️ Board Vars',
            callback: function(t) {
                return showBoardVars(t);
            }
        }, {
            icon: 'https://img.icons8.com/ios/50/000000/rocket.png',
            text: '🚀 New Sprint',
            callback: function(t) {
                return startNewSprint(t);
            }
        }];
    },
    'card-buttons': function(t, options) {
        return [{
            icon: 'https://img.icons8.com/ios/50/000000/play.png',
            text: '1️⃣ In Progress',
            callback: function(t) {
                return moveToInProgress(t);
            }
        }, {
            icon: 'https://img.icons8.com/ios/50/000000/code.png',
            text: '2️⃣ Code Review',
            callback: function(t) {
                return moveToCodeReview(t);
            }
        }, {
            icon: 'https://img.icons8.com/ios/50/000000/checkmark.png',
            text: '3️⃣ Done',
            callback: function(t) {
                return moveToDone(t);
            }
        }, {
            icon: 'https://img.icons8.com/ios/50/000000/time.png',
            text: '⏳ Awaiting Epic',
            callback: function(t) {
                return moveToAwaitingEpic(t);
            }
        }, {
            icon: 'https://img.icons8.com/ios/50/000000/code-fork.png',
            text: '🌿 Use next branch #',
            callback: function(t) {
                return createBranch(t);
            }
        }, {
            icon: 'https://img.icons8.com/ios/50/000000/calendar.png',
            text: '📅 Set Sprint Number',
            callback: function(t) {
                return setCardSprintNumber(t);
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