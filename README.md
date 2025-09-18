# Trello Sprint Tracker Power-Up

A lightweight Trello Power-Up hosted on GitHub Pages that manages global board variables for agile sprint tracking and branch naming.

## Features

**Global Board Variables** stored in Trello's board/shared storage:
- `sprintNumber` → current sprint (e.g., 44)
- `nextBranchNumber` → branch counter starting at 100 each sprint
- `pointsDone` → total story points completed for the sprint

**Branching Workflow**
- Card button "Use next branch #" creates a branch name in the format SPRINT-BRANCH (e.g., 44-100), comments/attaches it to the card, copies to clipboard, then increments the branch counter.

**Sprint Management**
- Board button "New Sprint" increments the sprint number (e.g., 44 → 45), resets nextBranchNumber to 100, and resets pointsDone to 0.

**Story Points Tracking**
- Card button "Add estimate to sprint points" reads the card's custom field named `estimate` (must be a Number field) and adds its value to the board's pointsDone.

**Badges**
- Board badge showing: Sprint #44 • Pts 37 (auto-refreshing).

## Tech

- **Static Hosting**: GitHub Pages (no backend required)
- **Frontend**: Plain HTML/JS with Trello Power-Up client library
- **Storage**: Trello board-scoped t.get()/t.set() API
- **UI**: Modals/popups for editing board vars, alerts for feedback, and card comments/attachments for branch tracking

## Usage

1. Host this repo on GitHub Pages (Settings → Pages)
2. Register the Power-Up in Trello's Power-Up Admin Portal with your GitHub Pages URL as the iframe connector
3. Enable it on your board
4. Create a custom number field named `estimate` via the Trello Custom Fields Power-Up
5. Use card/board buttons to manage sprint, branches, and points

## Roadmap

- Optimistic concurrency/retry for branch counter (avoid race conditions)
- Optional integration with Git hosting providers for automatic branch creation
- More flexible points tracking (auto-add when moving cards to "Done")
