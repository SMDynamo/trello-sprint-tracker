# Trello Sprint Tracker Power-Up

A Trello Power-Up hosted on GitHub Pages for agile teams. Tracks sprint number, branch counter, and points done using board-level storage.

## Features

- **Sprint Tracking**: Automatically tracks sprint numbers across your board
- **Branch Creation**: Card button creates branches in format `{sprint}-{branch}` (e.g., "44-100") and increments automatically
- **Sprint Management**: Board button starts a new sprint (increments sprint, resets branch=100, resets points=0)
- **Points Tracking**: Supports "estimate" custom field to add completed points to sprint total
- **Board-Level Storage**: All data is stored at the board level, shared across team members
- **Live Dashboard**: Board badge showing current sprint status with auto-refresh
- **Branch Attachments**: Automatically attaches branch info to cards and copies to clipboard

## Installation

1. Open your Trello board
2. Click "Show Menu" > "Power-Ups" 
3. Click "Add Power-Up"
4. Select "Custom" and enter the Power-Up URL: `https://smdynamo.github.io/trello-sprint-tracker/`
5. Enable the Power-Up

**Troubleshooting**: If the Power-Up doesn't appear on your board:
- Verify `https://smdynamo.github.io/trello-sprint-tracker/client.js` loads JavaScript code in your browser
- Check Trello Power-Up admin settings have the correct URL and enabled capabilities
- Open browser console (F12) on your Trello board to check for loading errors

## Usage

### Creating Branches
1. Open any card
2. Click the "Create Branch" button in the card
3. The branch name will be created in format `{sprint}-{branch}` (e.g., "44-100")
4. Branch name is copied to clipboard and attached to the card
5. The branch counter automatically increments for the next branch

### Starting New Sprints
1. From the board view, click the "Start New Sprint" button in the board header
2. Confirm the action
3. This will:
   - Increment the sprint number
   - Reset the branch counter to 100
   - Reset points done to 0

### Tracking Points
1. Add a custom field named "estimate" to your cards (number type)
2. Set the estimate value for each card
3. The estimate will be displayed as a badge on the card
4. Click "Add estimate to sprint" button on a card to add those points to the sprint total

### Settings
- Click the Power-Up settings to manually adjust sprint number, branch counter, or points
- All changes affect the entire board

## Technical Details

- Built with vanilla JavaScript and the Trello Power-Up framework
- Uses Trello's board-level private storage for data persistence
- Hosted on GitHub Pages for easy deployment
- No external dependencies beyond Trello's Power-Up SDK
- **Main entry point**: `client.js` (required by Trello Power-Up framework)

## Trello Power-Up Configuration

When setting up in Trello's Power-Up admin portal, ensure:

- **Iframe connector URL**: `https://smdynamo.github.io/trello-sprint-tracker/`
- **Capabilities enabled**: `board-buttons`, `card-buttons`, `board-badges`, `show-settings`
- **Client.js accessibility**: Verify `https://smdynamo.github.io/trello-sprint-tracker/client.js` returns JavaScript code

## Development

To modify this Power-Up:

1. Fork this repository
2. Make your changes
3. Update the GitHub Pages settings to serve from your fork
4. Update the Power-Up URL in Trello to point to your GitHub Pages URL

## File Structure

- `index.html` - Main Power-Up interface
- `client.js` - Core Power-Up functionality (main entry point for Trello)
- `js/iframe.js` - Dashboard iframe functionality  
- `js/sprint-tracker.js` - Legacy file (kept for reference)
- `settings.html` - Settings interface
- `styles.css` - Styling for all UI components
- `manifest.json` - Power-Up manifest for Trello
- `icon-light.svg` / `icon-dark.svg` - Power-Up icons
- `GITHUB_PAGES.md` - GitHub Pages setup guide

## License

MIT License - Feel free to use and modify for your team's needs.
