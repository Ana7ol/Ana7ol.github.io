(function (root) {
  "use strict";

  // Source defaults for keyboard controls. Users can override every command
  // from the KEYS screen; those personal choices stay in this browser.
  root.TicketShortcutConfig = {
    storageKey: "ticket-forge.shortcuts.v1",

    commands: [
      { command: "new", label: "New item" },
      { command: "remind", label: "Set reminder" },
      { command: "next", label: "Next ticket ID" },
      { command: "open", label: "Open ITSM ticket" },
      { command: "status", label: "Change status" },
      { command: "contact", label: "Insert contact" },
      { command: "contacts", label: "Edit contacts" },
      { command: "time", label: "Start / stop timer" },
      { command: "reset-time", label: "Reset timer" },
      { command: "fold", label: "Fold selected section" },
      { command: "copy", label: "Copy heading" },
      { command: "edit", label: "Edit heading" },
      { command: "delete", label: "Delete selected item" },
      { command: "checklist", label: "Add note checkbox" },
      { command: "theme", label: "Choose theme" },
      { command: "data", label: "Data menu" },
      { command: "password", label: "Change password" },
      { command: "export-tk", label: "Export tickets.tk" },
      { command: "import-tk", label: "Import tickets.tk" },
      { command: "export-vault", label: "Export encrypted vault" },
      { command: "import-vault", label: "Import encrypted vault" },
      { command: "move-next", label: "Select next item" },
      { command: "move-previous", label: "Select previous item" },
      { command: "expand", label: "Open selected item" },
      { command: "collapse", label: "Fold selected item" },
      { command: "focus-command", label: "Focus command line" },
      { command: "keys", label: "Edit shortcuts" },
      { command: "help", label: "Show command help" },
      { command: "lock", label: "Lock vault" }
    ],

    // These are the shortcuts from before KEY MODE was introduced.
    defaults: {
      new: "Ctrl+Alt+T",
      remind: "Alt+R",
      next: "Alt+N",
      open: "Alt+O",
      status: "Alt+C",
      contact: "Alt+P",
      time: "Alt+T",
      fold: "Ctrl+Alt+F",
      delete: ["Ctrl+Alt+D", "Delete"],
      theme: "Ctrl+Alt+M",
      lock: "Ctrl+Alt+L",
      "move-next": "ArrowDown",
      "move-previous": "ArrowUp",
      expand: "ArrowRight",
      collapse: "ArrowLeft",
      "focus-command": ":"
    }
  };
}(window));
