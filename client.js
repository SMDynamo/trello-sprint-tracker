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

// Move card to In Progress - simplified version
async function moveToInProgress(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        const branchName = `${data.sprint}-${data.branch}`;

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
            message: `Branch ${branchName} created and copied!\n\nManual steps:\n• Join card\n• Move to In Progress\n• Set Branch: ${branchName}\n• Set Sprint: ${data.sprint}\n• Set Start Date: now`,
            duration: 10
        });

    } catch (error) {
        console.error('Error in moveToInProgress:', error);
        return trelloContext.alert({
            message: `Error: Could not create branch`,
            duration: 4
        });
    }
}

// Move card to Code Review
async function moveToCodeReview(trelloContext) {
    return trelloContext.alert({
        message: `Code Review Steps:\n\n• Move to Code Review list\n• Clear Blocker field\n• Assign reviewer`,
        duration: 6
    });
}

// Move card to Done
async function moveToDone(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        return trelloContext.alert({
            message: `Done Steps (Sprint ${data.sprint}):\n\n• Set End Date: now\n• Set Sprint: ${data.sprint}\n• Move to Ready on Dev Done board\n• Add estimate to sprint points`,
            duration: 10
        });
    } catch (error) {
        return trelloContext.alert({
            message: 'Error getting sprint data',
            duration: 3
        });
    }
}

// Move to Awaiting Epic
async function moveToAwaitingEpic(trelloContext) {
    try {
        const data = await getSprintData(trelloContext);
        return trelloContext.alert({
            message: `Awaiting Epic Steps (Sprint ${data.sprint}):\n\n• Set End Date: now\n• Set Sprint: ${data.sprint}\n• Move to Awaiting Epic list\n• Add estimate to sprint points`,
            duration: 10
        });
    } catch (error) {
        return trelloContext.alert({
            message: 'Error getting sprint data',
            duration: 3
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