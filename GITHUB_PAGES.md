# GitHub Pages Configuration for Trello Sprint Tracker

This repository is configured to be hosted on GitHub Pages. The Power-Up files are served directly from the repository root.

## Files Structure

- `index.html` - Main Power-Up connector page (loaded by Trello)
- `demo.html` - Demonstration dashboard page for users to preview functionality
- `client.js` - Core Power-Up functionality and Trello API integration (main entry point)
- `js/iframe.js` - Dashboard iframe functionality for demo page
- `js/sprint-tracker.js` - Legacy file (kept for reference)
- `settings.html` - Settings popup for manual variable editing
- `styles.css` - Styling for all UI components
- `manifest.json` - Power-Up manifest file (for reference)
- `icon-light.svg` / `icon-dark.svg` - Power-Up icons
- `README.md` - Documentation

## GitHub Pages Setup

1. Go to your repository Settings
2. Navigate to Pages section
3. Set Source to "Deploy from a branch"
4. Select branch: `main` (or your default branch)
5. Set folder: `/ (root)`
6. Save settings

Your Power-Up will be available at: `https://[username].github.io/[repository-name]/`

## Trello Power-Up Registration

Use your GitHub Pages URL (e.g., `https://yourusername.github.io/trello-sprint-tracker/`) as the iframe connector URL when registering the Power-Up in Trello's Developer Portal.