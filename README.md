# TKFILE ticket desk

The ticket desk at `https://ana7ol.github.io/ticket/` is a dependency-free, static web application. It stores an encrypted ticket vault in the current browser and can import or export the plain-text TKFILE format.

The application source is in `ticket/`:

- `index.html` contains the accessible page, command toolbar, dialogs, and Content Security Policy.
- `theme-init.js` restores the selected theme before the page renders.
- `shortcuts.js` defines the classic default shortcuts and the editable command catalog.
- `core.js` contains pure ticket parsing, formatting, grouping, and time helpers.
- `app.js` contains vault encryption, persistence, commands, reminders, timers, note checklists, and UI behavior.
- `styles.css` contains all four themes and the Emacs fullscreen layout.
- `tests/core.test.js` verifies the portable core and TKFILE round trips.
- `tests/shortcut-config.test.js` verifies the default shortcut map.
- `tests/ui-contract.test.js` checks the expected browser interaction wiring.

Run the checks from this repository root:

```powershell
node --check ticket/app.js
node --check ticket/core.js
node --check ticket/shortcuts.js
node --test ticket/tests/*.test.js
```

See [ticket/ARCHITECTURE_SECURITY.md](ticket/ARCHITECTURE_SECURITY.md) for the architecture, security assessment, and Outlook/SAP integration options.

## Keyboard customization

The original shortcuts are the defaults again: Ctrl+Alt+T creates an item, Ctrl+Alt+F folds, Ctrl+Alt+D or Delete removes, Ctrl+Alt+M changes theme, Ctrl+Alt+L locks, Ctrl+Alt+R sets reminders, Alt+N/O/C/P/T run their toolbar commands, colon focuses the command line, and the arrow keys navigate and fold items. Ctrl+Alt+Y confirms the open dialog instead of Enter, and double-tapping Alt+R resets the selected timer.

Open the KEYS toolbar button or type `keys` in the command line to create personal mappings. Click a command field and press the desired combination; Backspace clears it. Duplicate combinations move to the newly selected command. SAVE SHORTCUTS stores the map in this browser, while RESTORE OLD DEFAULTS removes the override. Developers can change the starting command catalog and defaults in `ticket/shortcuts.js`.

## Hardware Tickets

Hardware tickets keep the normal ticket ID and title, then track requested hardware, old and new serial numbers, whether Matrix was managed, an optional Jira ID/link, and whether the Jira steps are done. Plain `.tk` export writes those fields as `REQUESTED HARDWARE`, `OLD SN`, `NEW SN`, `MATRIX MANAGED`, and `JIRA ... STEPS DONE`; legacy `ASSET / SERIAL` imports into `NEW SN`.
