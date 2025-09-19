// Sprint Tracker Trello Power-Up Client - Updated 2025-01-19 16:45
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

        // Find the field by name (case-sensitive first, then case-insensitive)
        let field = board.customFields.find(f =>
            f.name && f.name === fieldName
        );

        if (!field) {
            field = board.customFields.find(f =>
                f.name && f.name.toLowerCase() === fieldName.toLowerCase()
            );
        }

        if (!field) {
            console.log(`Custom field "${fieldName}" not found. Available fields:`,
                board.customFields.map(f => f.name).join(', '));
            return false;
        }

        // Get the card we're updating
        const cardContext = trelloContext.getContext();
        const cardId = cardContext.card;

        // Update the custom field value based on type
        let updateData = {};
        if (field.type === 'number') {
            updateData = { number: parseFloat(value) };
        } else if (field.type === 'text') {
            updateData = { text: String(value) };
        } else if (field.type === 'date') {
            updateData = { date: String(value) };
        } else if (field.type === 'checkbox') {
            updateData = { checked: Boolean(value) };
        } else {
            console.log(`Field "${fieldName}" has type "${field.type}" - attempting text update`);
            updateData = { text: String(value) };
        }

        // Make the API call to update the custom field
        await trelloContext.request('PUT', `/1/cards/${cardId}/customField/${field.id}/item`, {
            value: updateData
        });

        console.log(`Updated ${fieldName} (${field.type}) to ${value}`);
        return true;
    } catch (error) {
        console.error(`Error updating custom field ${fieldName}:`, error);
        return false;
    }
}

// Move card to In Progress with full automation
async function moveToInProgress(trelloContext) {
    try {
        console.log('Starting moveToInProgress automation...');
        const data = await getSprintData(trelloContext);
        const branchName = `${data.sprint}-${data.branch}`;

        // Get context information
        console.log('Getting context...');
        const context = trelloContext.getContext();
        console.log('Full context:', context);

        // Get member ID from context or API
        let memberId;
        try {
            const memberData = await trelloContext.request('GET', '/1/members/me?fields=id');
            memberId = memberData.id;
            console.log('Member ID from API:', memberId);
        } catch (error) {
            console.log('Could not get member ID:', error);
            memberId = context.member; // fallback to context
        }

        const cardId = context.card;
        console.log('Card ID from context:', cardId);

        // Get card details via REST API
        const cardData = await trelloContext.request('GET', `/1/cards/${cardId}?fields=id,idList,idMembers`);
        console.log('Card data from API:', cardData);

        const card = {
            id: cardData.id,
            idList: cardData.idList,
            idMembers: cardData.idMembers
        };

        // Add member to card if not already on it
        if (!card.idMembers.includes(memberId)) {
            await trelloContext.request('POST', `/1/cards/${card.id}/idMembers`, {
                value: memberId
            });
            console.log('Joined card');
        }

        // Find In Progress list
        const lists = await trelloContext.lists('all');
        const inProgressList = lists.find(list =>
            list.name.toLowerCase().includes('in progress')
        );

        if (inProgressList && card.idList !== inProgressList.id) {
            // Move card to In Progress list
            await trelloContext.request('PUT', `/1/cards/${card.id}`, {
                idList: inProgressList.id,
                pos: 'top'
            });
            console.log('Moved to In Progress');
        }

        // Set custom fields
        await updateCardCustomField(trelloContext, 'Start Date', new Date().toISOString());
        await updateCardCustomField(trelloContext, 'Branch', branchName);
        await updateCardCustomField(trelloContext, 'Sprint', String(data.sprint));

        // Increment branch counter
        data.branch += 1;
        await saveSprintData(trelloContext, data);

        // Copy branch to clipboard
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(branchName);
            } catch (err) {
                console.log('Could not copy to clipboard');
            }
        }

        return trelloContext.alert({
            message: `✅ Automated: Joined card, moved to In Progress, set Branch: ${branchName}, Sprint: ${data.sprint}, Start Date, copied to clipboard!`,
            duration: 6
        });

    } catch (error) {
        console.error('Error in moveToInProgress:', error);
        return trelloContext.alert({
            message: `❌ Error: ${error.message || 'Could not complete automation'}`,
            duration: 4
        });
    }
}

// Move card to Code Review
async function moveToCodeReview(trelloContext) {
    try {
        const cardContext = trelloContext.getContext();
        const card = await trelloContext.request('GET', `/1/cards/${cardContext.card}?fields=id,idList`);
        const lists = await trelloContext.lists('all');

        // Find Code Review list
        const codeReviewList = lists.find(list =>
            list.name.toLowerCase().includes('code review')
        );

        if (codeReviewList && card.idList !== codeReviewList.id) {
            await trelloContext.request('PUT', `/1/cards/${card.id}`, {
                idList: codeReviewList.id,
                pos: 'top'
            });
        }

        // Clear Blocker field
        await updateCardCustomField(trelloContext, 'Blocker', '');

        return trelloContext.alert({
            message: `✅ Automated: Moved to Code Review, cleared Blocker field`,
            duration: 4
        });

    } catch (error) {
        console.error('Error in moveToCodeReview:', error);
        return trelloContext.alert({
            message: `❌ Error: ${error.message || 'Could not complete automation'}`,
            duration: 4
        });
    }
}

// Move card to Done
async function moveToDone(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        const cardContext = trelloContext.getContext();
        const card = await trelloContext.request('GET', `/1/cards/${cardContext.card}?fields=id,customFieldItems`);

        // Add estimate points to sprint total
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

        // Set End Date and Sprint
        await updateCardCustomField(trelloContext, 'End Date', new Date().toISOString());
        await updateCardCustomField(trelloContext, 'Sprint', String(data.sprint));

        // Find Dev Done board and move card
        const boards = await trelloContext.request('GET', '/1/members/me/boards');
        const devDoneBoard = boards.find(board => board.name.includes('Dev Done'));

        if (devDoneBoard) {
            const lists = await trelloContext.request('GET', `/1/boards/${devDoneBoard.id}/lists`);
            const readyList = lists.find(list => list.name === 'Ready');

            if (readyList) {
                await trelloContext.request('PUT', `/1/cards/${card.id}`, {
                    idList: readyList.id,
                    idBoard: devDoneBoard.id,
                    pos: 'top'
                });
            }
        }

        const message = pointsAdded > 0
            ? `✅ Automated: Set End Date, Sprint ${data.sprint}, moved to Done board, added ${pointsAdded} points!`
            : `✅ Automated: Set End Date, Sprint ${data.sprint}, moved to Done board`;

        return trelloContext.alert({
            message: message,
            duration: 6
        });

    } catch (error) {
        console.error('Error in moveToDone:', error);
        return trelloContext.alert({
            message: `❌ Error: ${error.message || 'Could not complete automation'}`,
            duration: 4
        });
    }
}

// Move to Awaiting Epic
async function moveToAwaitingEpic(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        const cardContext = trelloContext.getContext();
        const card = await trelloContext.request('GET', `/1/cards/${cardContext.card}?fields=id,customFieldItems`);

        // Add estimate points to sprint total
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

        // Set End Date and Sprint
        await updateCardCustomField(trelloContext, 'End Date', new Date().toISOString());
        await updateCardCustomField(trelloContext, 'Sprint', String(data.sprint));

        // Find Dev Done board and move to Awaiting Epic list
        const boards = await trelloContext.request('GET', '/1/members/me/boards');
        const devDoneBoard = boards.find(board => board.name.includes('Dev Done'));

        if (devDoneBoard) {
            const lists = await trelloContext.request('GET', `/1/boards/${devDoneBoard.id}/lists`);
            const awaitingList = lists.find(list => list.name.includes('Awaiting Epic'));

            if (awaitingList) {
                await trelloContext.request('PUT', `/1/cards/${card.id}`, {
                    idList: awaitingList.id,
                    idBoard: devDoneBoard.id,
                    pos: 'top'
                });
            }
        }

        const message = pointsAdded > 0
            ? `✅ Automated: Set End Date, Sprint ${data.sprint}, moved to Awaiting Epic, added ${pointsAdded} points!`
            : `✅ Automated: Set End Date, Sprint ${data.sprint}, moved to Awaiting Epic`;

        return trelloContext.alert({
            message: message,
            duration: 6
        });

    } catch (error) {
        console.error('Error in moveToAwaitingEpic:', error);
        return trelloContext.alert({
            message: `❌ Error: ${error.message || 'Could not complete automation'}`,
            duration: 4
        });
    }
}

// Start a new sprint
async function startNewSprint(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);

        const confirmed = await trelloContext.confirm({
            message: `Start Sprint ${data.sprint + 1}?\n\nThis will:\n• Increment sprint to ${data.sprint + 1}\n• Reset branch counter to 100\n• Reset points to 0`
        });

        if (confirmed) {
            data.sprint += 1;
            data.branch = DEFAULT_VALUES.branch;
            data.points = DEFAULT_VALUES.points;

            const saved = await saveSprintData(trelloContext, data);

            if (saved) {
                return trelloContext.alert({
                    message: `Sprint ${data.sprint} started!\n\nBranch counter: ${data.branch}\nPoints: ${data.points}`,
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
        return trelloContext.alert({
            message: 'Error starting new sprint.',
            duration: 3
        });
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

// Show sprint summary (simplified)
async function showSprintSummary(t) {
    try {
        const data = await getSprintData(t);
        return t.alert({
            message: `Sprint ${data.sprint} Summary:\n\nCurrent Points: ${data.points}\nNext Branch: ${data.sprint}-${data.branch}\n\nNote: Check Dev Done board for completed cards with Sprint ${data.sprint}`,
            duration: 8
        });
    } catch (error) {
        return t.alert({
            message: 'Error loading sprint summary',
            duration: 3
        });
    }
}

// Initialize the Power-Up
console.log('Initializing Sprint Tracker Power-Up...');
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
        }, {
            icon: 'https://img.icons8.com/ios/50/000000/list.png',
            text: '📋 Sprint Summary',
            callback: function(t) {
                return showSprintSummary(t);
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
    }
});