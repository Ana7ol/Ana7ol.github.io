# TKFILE ticket desk

The ticket desk at `https://ana7ol.github.io/ticket/` is a dependency-free, static web application. It stores an encrypted ticket vault in the current browser and can import or export the plain-text TKFILE format.

The application source is in `ticket/`:

- `index.html` contains the accessible page, command toolbar, dialogs, and Content Security Policy.
- `theme-init.js` restores the selected theme before the page renders.
- `core.js` contains pure ticket parsing, formatting, grouping, and time helpers.
- `app.js` contains vault encryption, persistence, commands, reminders, timers, note checklists, and UI behavior.
- `styles.css` contains all four themes and the Emacs fullscreen layout.
- `tests/core.test.js` verifies the portable core and TKFILE round trips.

Run the checks from this repository root:

```powershell
node --check ticket/app.js
node --check ticket/core.js
node --test ticket/tests
```

See [ticket/ARCHITECTURE_SECURITY.md](ticket/ARCHITECTURE_SECURITY.md) for the architecture, security assessment, and Outlook/SAP integration options.
