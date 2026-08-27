(function (root) {
  "use strict";

  // Edit this file to customize keyboard controls.
  // Global keys work anywhere in the unlocked app. Key-mode sequences work
  // after entering KEY MODE; press Escape to leave it. Keep sequences unique
  // and avoid making one sequence the beginning of another.
  root.TicketShortcutConfig = {
    sequenceTimeoutMs: 1400,

    global: {
      "Ctrl+Alt+K": "key-mode",
      "Ctrl+Alt+T": "new",
      "Ctrl+Alt+D": "delete",
      "Ctrl+Alt+M": "theme",
      "Ctrl+Alt+L": "lock",
      "Alt+R": "remind",
      "Alt+N": "next",
      "Alt+O": "open",
      "Alt+C": "status",
      "Alt+P": "contact",
      "Alt+T": "time",
      "Delete": "delete",
      ":": "focus-command"
    },

    sequences: {
      new: "nn",
      remind: "rr",
      next: "ni",
      open: "oo",
      status: "ss",
      contact: "cc",
      contacts: "pc",
      time: "tt",
      "reset-time": "tz",
      fold: "ff",
      copy: "yy",
      edit: "ee",
      delete: "dd",
      checklist: "cx",
      theme: "th",
      data: "da",
      password: "pw",
      "export-tk": "et",
      "import-tk": "it",
      "export-vault": "ev",
      "import-vault": "iv",
      "move-next": "jj",
      "move-previous": "kk",
      expand: "ll",
      collapse: "hh",
      keys: "gk",
      help: "??",
      lock: "qq"
    }
  };
}(window));
