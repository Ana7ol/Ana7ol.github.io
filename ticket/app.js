(function () {
  "use strict";

  const Core = window.TicketCore;
  const STORAGE_KEY = "tkfile.encrypted-vault.v1";
  const PBKDF2_ITERATIONS = 310000;
  const AUTO_LOCK_MS = 15 * 60 * 1000;
  const DEFAULT_CONTACTS = {
    CB1: "CB1",
    CID: "CID",
    CPB: "CPB",
    DMS: "DMS",
    EUF: "EUF",
    TID: "TID"
  };

  const elements = {
    authScreen: document.getElementById("auth-screen"),
    authCopy: document.getElementById("auth-copy"),
    authError: document.getElementById("auth-error"),
    unlockForm: document.getElementById("unlock-form"),
    setupForm: document.getElementById("setup-form"),
    restoreVault: document.getElementById("restore-vault"),
    restoreInput: document.getElementById("restore-input"),
    app: document.getElementById("app"),
    lockButton: document.getElementById("lock-button"),
    saveStatus: document.getElementById("save-status"),
    ticketCount: document.getElementById("ticket-count"),
    emptyState: document.getElementById("empty-state"),
    ticketTree: document.getElementById("ticket-tree"),
    helpPanel: document.querySelector(".help-panel"),
    commandForm: document.getElementById("command-form"),
    commandInput: document.getElementById("command-input"),
    modal: document.getElementById("modal"),
    modalForm: document.getElementById("modal-form"),
    modalKicker: document.getElementById("modal-kicker"),
    modalTitle: document.getElementById("modal-title"),
    modalCopy: document.getElementById("modal-copy"),
    modalFields: document.getElementById("modal-fields"),
    modalActions: document.getElementById("modal-actions"),
    modalClose: document.getElementById("modal-close"),
    toast: document.getElementById("toast"),
    tkImportInput: document.getElementById("tk-import-input"),
    vaultImportInput: document.getElementById("vault-import-input")
  };

  let ticketState = null;
  let vaultKey = null;
  let vaultSalt = null;
  let vaultIterations = PBKDF2_ITERATIONS;
  let selectedItemId = null;
  let activeEditor = null;
  let activeFoldKey = null;
  let saveTimer = null;
  let saveChain = Promise.resolve();
  let toastTimer = null;
  let autoLockTimer = null;
  let reminderTimer = null;
  let reminderCheckRunning = false;
  const collapsed = new Set();
  const acknowledgedReminders = new Set();

  function bytesToBase64(bytes) {
    let binary = "";
    const view = new Uint8Array(bytes);
    for (let index = 0; index < view.length; index += 1) binary += String.fromCharCode(view[index]);
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function deriveVaultKey(password, salt, iterations) {
    const source = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      source,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  function parseVaultRecord(raw) {
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record || record.version !== 1 || record.kdf !== "PBKDF2-SHA256" || record.cipher !== "AES-256-GCM") {
      throw new Error("Unsupported vault file.");
    }
    if (!Number.isInteger(record.iterations) || record.iterations < 100000 || record.iterations > 1000000) {
      throw new Error("Invalid vault key settings.");
    }
    const salt = base64ToBytes(record.salt);
    const iv = base64ToBytes(record.iv);
    const ciphertext = base64ToBytes(record.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) throw new Error("Invalid vault data.");
    return { record, salt, iv, ciphertext };
  }

  function newState() {
    return {
      version: 1,
      contacts: Object.assign({}, DEFAULT_CONTACTS),
      items: [],
      updatedAt: new Date().toISOString()
    };
  }

  function normalizedItem(value) {
    const kind = ["TICKET", "HARDWARE", "NOTE"].includes(value && value.kind) ? value.kind : "TICKET";
    const itemValues = {
      kind,
      ticketId: value && typeof value.ticketId === "string" ? value.ticketId : "",
      title: value && typeof value.title === "string" ? value.title : "",
      status: kind === "NOTE" ? "" : (value && typeof value.status === "string" ? value.status : "WORKING"),
      created: value && /^\d{4}-\d{2}-\d{2}$/.test(value.created) ? value.created : Core.localDateString(new Date()),
      problem: value && typeof value.problem === "string" ? value.problem : "",
      notes: value && typeof value.notes === "string" ? value.notes : "",
      solution: value && typeof value.solution === "string" ? value.solution : "",
      requester: value && typeof value.requester === "string" ? value.requester : "",
      hardware: value && typeof value.hardware === "string" ? value.hardware : "",
      asset: value && typeof value.asset === "string" ? value.asset : "",
      reminder: null
    };
    if (value && typeof value.uid === "string" && value.uid) itemValues.uid = value.uid;
    const base = Core.blankItem(itemValues);
    if (value && value.reminder && !Number.isNaN(new Date(value.reminder.due).getTime())) {
      base.reminder = {
        due: new Date(value.reminder.due).toISOString(),
        message: String(value.reminder.message || base.title || "Ticket reminder"),
        snoozedUntil: value.reminder.snoozedUntil && !Number.isNaN(new Date(value.reminder.snoozedUntil).getTime())
          ? new Date(value.reminder.snoozedUntil).toISOString()
          : null
      };
    }
    return base;
  }

  function normalizeState(value) {
    const result = newState();
    if (value && value.contacts && typeof value.contacts === "object" && !Array.isArray(value.contacts)) {
      result.contacts = {};
      Object.entries(value.contacts).slice(0, 500).forEach(([key, contact]) => {
        const cleanKey = String(key).trim().slice(0, 80);
        if (cleanKey) result.contacts[cleanKey] = String(contact).slice(0, 500);
      });
    }
    result.items = Array.isArray(value && value.items) ? value.items.slice(0, 10000).map(normalizedItem) : [];
    result.updatedAt = new Date().toISOString();
    return result;
  }

  async function decryptVault(raw, password) {
    const parsed = parseVaultRecord(raw);
    const key = await deriveVaultKey(password, parsed.salt, parsed.record.iterations);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: parsed.iv }, key, parsed.ciphertext);
    const value = JSON.parse(new TextDecoder().decode(plaintext));
    return { key, salt: parsed.salt, iterations: parsed.record.iterations, state: normalizeState(value) };
  }

  function setSaveStatus(text, stateName) {
    elements.saveStatus.textContent = text;
    if (stateName) elements.saveStatus.dataset.state = stateName;
    else delete elements.saveStatus.dataset.state;
  }

  function persistNow() {
    if (!vaultKey || !vaultSalt || !ticketState) return Promise.resolve();
    clearTimeout(saveTimer);
    saveTimer = null;
    ticketState.updatedAt = new Date().toISOString();
    const stateSnapshot = JSON.stringify(ticketState);
    const keySnapshot = vaultKey;
    const saltSnapshot = new Uint8Array(vaultSalt);
    setSaveStatus("ENCRYPTING…", "saving");

    saveChain = saveChain.then(async function () {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        keySnapshot,
        new TextEncoder().encode(stateSnapshot)
      );
      const record = {
        version: 1,
        kdf: "PBKDF2-SHA256",
        iterations: vaultIterations,
        salt: bytesToBase64(saltSnapshot),
        cipher: "AES-256-GCM",
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(ciphertext),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      setSaveStatus("SAVED");
    }).catch(function (error) {
      console.error(error);
      setSaveStatus("SAVE FAILED", "error");
      showToast("Could not save the encrypted vault.");
    });
    return saveChain;
  }

  function queueSave() {
    if (!ticketState) return;
    clearTimeout(saveTimer);
    setSaveStatus("CHANGED", "saving");
    saveTimer = setTimeout(persistNow, 180);
  }

  function showAuth(mode, errorMessage) {
    elements.app.hidden = true;
    elements.authScreen.hidden = false;
    elements.unlockForm.hidden = mode !== "unlock";
    elements.setupForm.hidden = mode !== "setup";
    elements.authError.textContent = errorMessage || "";
    if (mode === "setup") {
      elements.authCopy.textContent = "Create a password for this browser. The vault starts empty; you can import your existing .tk file after unlocking.";
      setTimeout(() => document.getElementById("setup-password").focus(), 0);
    } else {
      elements.authCopy.textContent = "Enter your password to decrypt the ticket vault on this device.";
      setTimeout(() => document.getElementById("unlock-password").focus(), 0);
    }
  }

  function unlockApp() {
    elements.authScreen.hidden = true;
    elements.app.hidden = false;
    elements.unlockForm.reset();
    elements.setupForm.reset();
    acknowledgedReminders.clear();
    if (!selectedItemId && ticketState.items.length) selectedItemId = Core.sortItems(ticketState.items)[0].uid;
    renderTree();
    resetAutoLock();
    clearInterval(reminderTimer);
    reminderTimer = setInterval(checkReminders, 15000);
    checkReminders();
  }

  async function lockVault(options) {
    const skipSave = options && options.skipSave;
    if (!skipSave) await persistNow();
    clearTimeout(autoLockTimer);
    clearInterval(reminderTimer);
    clearTimeout(saveTimer);
    ticketState = null;
    vaultKey = null;
    vaultSalt = null;
    vaultIterations = PBKDF2_ITERATIONS;
    selectedItemId = null;
    activeEditor = null;
    activeFoldKey = null;
    if (elements.modal.open) elements.modal.close("cancel");
    showAuth(localStorage.getItem(STORAGE_KEY) ? "unlock" : "setup");
  }

  function resetAutoLock() {
    if (!ticketState) return;
    clearTimeout(autoLockTimer);
    autoLockTimer = setTimeout(function () {
      lockVault();
      showToast("Vault locked after 15 minutes of inactivity.");
    }, AUTO_LOCK_MS);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function statusClass(status) {
    const upper = String(status || "").toUpperCase();
    if (upper === "DONE") return "status-done";
    if (upper.startsWith("ASSIGNED")) return "status-assigned";
    if (upper.startsWith("WAITING")) return "status-waiting";
    return "status-working";
  }

  function fieldMarkup(item, field, label, options) {
    const settings = options || {};
    const tag = settings.input ? "input" : "textarea";
    const full = settings.full ? " full" : "";
    const type = settings.type ? ` type="${settings.type}"` : "";
    const rows = settings.rows ? ` rows="${settings.rows}"` : "";
    const value = escapeHtml(item[field] || "");
    const control = tag === "input"
      ? `<input${type} value="${value}" data-field="${field}" aria-label="${escapeHtml(label)}">`
      : `<textarea${rows} data-field="${field}" aria-label="${escapeHtml(label)}">${value}</textarea>`;
    return `<div class="field${full}"><label>${escapeHtml(label)}</label>${control}</div>`;
  }

  function renderItem(item) {
    const foldKey = `i:${item.uid}`;
    const open = collapsed.has(foldKey) ? "" : " open";
    const active = item.uid === selectedItemId ? " active" : "";
    const reminder = item.reminder
      ? `<span class="reminder-chip">REMINDER ${escapeHtml(Core.formatReminderTime(item.reminder.snoozedUntil || item.reminder.due))} | ${escapeHtml(item.reminder.message)}</span>`
      : "";
    let heading;
    let body;

    if (item.kind === "NOTE") {
      heading = `<span class="kind">NOTE</span><span class="pipe">|</span><span class="item-title note-title">${escapeHtml(item.title || "Untitled note")}</span>${reminder}`;
      body = fieldMarkup(item, "title", "TITLE", { input: true, full: true }) +
        fieldMarkup(item, "notes", "NOTES", { full: true, rows: 5 });
    } else {
      const kindClass = item.kind === "TICKET" ? " ticket-kind" : "";
      heading = `<span class="kind${kindClass}">${escapeHtml(item.kind)}</span>` +
        `<span class="status ${statusClass(item.status)}">${escapeHtml(item.status || "WORKING")}</span>` +
        `<span class="pipe">|</span>` +
        `<a class="ticket-id" href="${escapeHtml(Core.makeTicketUrl(item.ticketId) || "#")}" target="_blank" rel="noopener">${escapeHtml(item.ticketId)}</a>` +
        `<span class="pipe">|</span>` +
        `<span class="item-title">${escapeHtml(item.title || "Untitled ticket")}</span>${reminder}`;

      body = fieldMarkup(item, "ticketId", "TICKET ID", { input: true }) +
        fieldMarkup(item, "title", "TITLE", { input: true });
      if (item.kind === "HARDWARE") {
        body += fieldMarkup(item, "requester", "REQUESTER", { full: true });
        body += fieldMarkup(item, "hardware", "HARDWARE", { full: true });
        body += fieldMarkup(item, "asset", "ASSET / SERIAL", { full: true });
      } else {
        body += fieldMarkup(item, "problem", "PROBLEM", { full: true, rows: 4 });
      }
      body += fieldMarkup(item, "notes", "NOTES", { full: true, rows: 5 });
      body += fieldMarkup(item, "solution", "SOLUTION", { full: true, rows: 4 });
    }

    return `<details class="item${active}" data-item-id="${escapeHtml(item.uid)}" data-fold-key="${escapeHtml(foldKey)}"${open}>` +
      `<summary data-fold-key="${escapeHtml(foldKey)}">${heading}</summary>` +
      `<div class="item-body">${body}</div></details>`;
  }

  function makeGroups(items) {
    const years = new Map();
    Core.sortItems(items).forEach(function (item) {
      const parts = item.created.split("-");
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      if (!years.has(year)) years.set(year, new Map());
      if (!years.get(year).has(month)) years.get(year).set(month, new Map());
      if (!years.get(year).get(month).has(day)) years.get(year).get(month).set(day, []);
      years.get(year).get(month).get(day).push(item);
    });
    return years;
  }

  function groupDetails(className, foldKey, label, children) {
    const open = collapsed.has(foldKey) ? "" : " open";
    return `<details class="group ${className}" data-fold-key="${escapeHtml(foldKey)}"${open}>` +
      `<summary data-fold-key="${escapeHtml(foldKey)}"><span class="group-label">${escapeHtml(label)}</span></summary>` +
      `<div class="group-children">${children}</div></details>`;
  }

  function renderTree() {
    if (!ticketState) return;
    const validSelection = ticketState.items.some((item) => item.uid === selectedItemId);
    if (!validSelection) selectedItemId = ticketState.items.length ? Core.sortItems(ticketState.items)[0].uid : null;
    let html = "";
    const groups = makeGroups(ticketState.items);
    groups.forEach(function (months, year) {
      let monthHtml = "";
      months.forEach(function (days, month) {
        let dayHtml = "";
        days.forEach(function (items, day) {
          const itemsHtml = items.map(renderItem).join("");
          dayHtml += groupDetails("day", `d:${year}-${month}-${day}`, `DAY ${day}.${month}.${year}`, itemsHtml);
        });
        monthHtml += groupDetails("month", `m:${year}-${month}`, `MONTH ${month}`, dayHtml);
      });
      html += groupDetails("year", `y:${year}`, `YEAR ${year}`, monthHtml);
    });
    elements.ticketTree.innerHTML = html;
    elements.emptyState.hidden = ticketState.items.length !== 0;
    elements.ticketCount.textContent = `${ticketState.items.length} ${ticketState.items.length === 1 ? "ITEM" : "ITEMS"}`;
  }

  function findItem(uid) {
    return ticketState && ticketState.items.find((item) => item.uid === uid);
  }

  function selectItem(uid, options) {
    if (!findItem(uid)) return;
    selectedItemId = uid;
    elements.ticketTree.querySelectorAll(".item.active").forEach((node) => node.classList.remove("active"));
    const node = Array.from(elements.ticketTree.querySelectorAll(".item")).find((entry) => entry.dataset.itemId === uid);
    if (!node) return;
    node.classList.add("active");
    activeFoldKey = `i:${uid}`;
    if (options && options.open) {
      node.open = true;
      collapsed.delete(activeFoldKey);
    }
    if (options && options.scroll) node.scrollIntoView({ block: "center", behavior: "smooth" });
    if (options && options.flash) {
      node.classList.add("flash");
      setTimeout(() => node.classList.remove("flash"), 900);
    }
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2800);
  }

  function buildDialogField(field) {
    const row = document.createElement("div");
    row.className = "field-row";
    const label = document.createElement("label");
    label.textContent = field.label;
    label.htmlFor = `dialog-${field.name}`;
    let control;
    if (field.type === "select") {
      control = document.createElement("select");
      (field.options || []).forEach(function (option) {
        const node = document.createElement("option");
        if (typeof option === "string") {
          node.value = option;
          node.textContent = option;
        } else {
          node.value = option.value;
          node.textContent = option.label;
        }
        if (node.value === field.value) node.selected = true;
        control.appendChild(node);
      });
    } else if (field.type === "textarea") {
      control = document.createElement("textarea");
      control.rows = field.rows || 5;
      control.value = field.value || "";
    } else {
      control = document.createElement("input");
      control.type = field.type || "text";
      control.value = field.value || "";
    }
    control.id = `dialog-${field.name}`;
    control.name = field.name;
    control.required = Boolean(field.required);
    if (field.minlength) control.minLength = field.minlength;
    if (field.placeholder) control.placeholder = field.placeholder;
    if (field.autocomplete) control.autocomplete = field.autocomplete;
    row.append(label, control);
    elements.modalFields.appendChild(row);
  }

  function openDialog(config) {
    if (elements.modal.open) return Promise.resolve(null);
    elements.modalKicker.textContent = config.kicker || "COMMAND";
    elements.modalTitle.textContent = config.title || "";
    elements.modalCopy.textContent = config.copy || "";
    elements.modalCopy.hidden = !config.copy;
    elements.modalFields.replaceChildren();
    elements.modalActions.replaceChildren();
    (config.fields || []).forEach(buildDialogField);

    (config.actions || [{ value: "ok", label: "OK", primary: true }]).forEach(function (action) {
      const button = document.createElement("button");
      button.type = "submit";
      button.name = "dialogAction";
      button.value = action.value;
      button.textContent = action.label;
      if (action.primary) button.classList.add("primary-action");
      if (action.danger) button.classList.add("danger-action");
      elements.modalActions.appendChild(button);
    });

    return new Promise(function (resolve) {
      let result = null;
      function onSubmit(event) {
        event.preventDefault();
        if (!elements.modalForm.reportValidity()) return;
        const values = {};
        new FormData(elements.modalForm).forEach((value, key) => {
          if (key !== "dialogAction") values[key] = value;
        });
        result = { action: event.submitter ? event.submitter.value : "ok", values };
        elements.modal.close("submit");
      }
      function onClose() {
        elements.modalForm.removeEventListener("submit", onSubmit);
        elements.modal.removeEventListener("close", onClose);
        resolve(result);
      }
      elements.modalForm.addEventListener("submit", onSubmit);
      elements.modal.addEventListener("close", onClose);
      elements.modal.showModal();
      const first = elements.modalFields.querySelector("input, textarea, select");
      if (first) setTimeout(() => first.focus(), 0);
    });
  }

  async function createItem() {
    const result = await openDialog({
      kicker: "CTRL + ALT + T",
      title: "CREATE ITEM",
      copy: "For tickets, paste the ID and title together.\nExamples: 4564 Printer problem · 4564 | Printer problem · full ITSM URL + title",
      fields: [
        { name: "kind", label: "TYPE", type: "select", value: "TICKET", options: [
          { value: "TICKET", label: "1 — STANDARD TICKET" },
          { value: "HARDWARE", label: "2 — NEW HARDWARE" },
          { value: "NOTE", label: "3 — NOTE" }
        ] },
        { name: "value", label: "TICKET ID + TITLE / NOTE TITLE", required: true, placeholder: "4564 Printer problem" },
        { name: "created", label: "DATE", type: "date", required: true, value: Core.localDateString(new Date()) }
      ],
      actions: [
        { value: "cancel", label: "CANCEL" },
        { value: "create", label: "CREATE", primary: true }
      ]
    });
    if (!result || result.action !== "create") return;
    const kind = result.values.kind;
    let item;
    if (kind === "NOTE") {
      const title = result.values.value.trim();
      if (!title) return showToast("A note title is required.");
      item = Core.blankItem({ kind, title, status: "", created: result.values.created });
    } else {
      const parsed = Core.parseTicketInput(result.values.value);
      if (!parsed) return showToast("Put the ticket ID first, followed by the title.");
      item = Core.blankItem({ kind, ticketId: parsed.ticketId, title: parsed.title, created: result.values.created });
    }
    ticketState.items.push(item);
    selectedItemId = item.uid;
    collapsed.delete(`i:${item.uid}`);
    queueSave();
    renderTree();
    selectItem(item.uid, { open: true, scroll: true, flash: true });
    const firstEditor = Array.from(elements.ticketTree.querySelectorAll(".item")).find((node) => node.dataset.itemId === item.uid)?.querySelector("textarea");
    if (firstEditor) firstEditor.focus();
    showToast(`${kind} created under ${Core.displayDate(item.created)}.`);
  }

  async function switchStatus() {
    const item = findItem(selectedItemId);
    if (!item || item.kind === "NOTE") return showToast("Select a standard or hardware ticket first.");
    const contactOptions = Object.keys(ticketState.contacts).sort((a, b) => a.localeCompare(b)).map((key) => ({ value: key, label: `${key}: ${ticketState.contacts[key]}` }));
    if (!contactOptions.length) contactOptions.push({ value: "", label: "No contacts saved" });
    const result = await openDialog({
      kicker: "ALT + C",
      title: "CHANGE STATUS",
      fields: [
        { name: "status", label: "STATUS", type: "select", value: item.status.startsWith("ASSIGNED") ? "ASSIGNED" : item.status, options: [
          { value: "DONE", label: "1 — DONE" },
          { value: "ASSIGNED", label: "2 — ASSIGN TO @" },
          { value: "WAITING EXTERNALLY", label: "3 — WAITING EXTERNALLY" },
          { value: "WORKING", label: "4 — WORKING" }
        ] },
        { name: "assignee", label: "ASSIGNEE (USED FOR ASSIGNED)", type: "select", options: contactOptions }
      ],
      actions: [{ value: "cancel", label: "CANCEL" }, { value: "save", label: "APPLY", primary: true }]
    });
    if (!result || result.action !== "save") return;
    if (result.values.status === "ASSIGNED") {
      if (!result.values.assignee) return showToast("Add a contact before assigning this ticket.");
      item.status = `ASSIGNED TO @${result.values.assignee.replace(/^@/, "")}`;
    } else {
      item.status = result.values.status;
    }
    queueSave();
    renderTree();
    selectItem(item.uid, { open: true });
    showToast(`Status changed to ${item.status}.`);
  }

  async function setReminder() {
    const item = findItem(selectedItemId);
    if (!item) return showToast("Select a ticket or note first.");
    const result = await openDialog({
      kicker: "ALT + R",
      title: item.reminder ? "REPLACE / CLEAR REMINDER" : "SET REMINDER",
      copy: "Accepted: +30m · +2h · tomorrow 09:00 · 2026-08-27 14:30 · 27.08.2026 14:30\nEnter 0 to clear the current reminder.",
      fields: [
        { name: "when", label: "WHEN", value: item.reminder ? Core.formatReminderTime(item.reminder.due) : "+30m", required: true },
        { name: "message", label: "MESSAGE", value: item.reminder ? item.reminder.message : (item.title || "Ticket reminder"), required: false }
      ],
      actions: [{ value: "cancel", label: "CANCEL" }, { value: "save", label: "SAVE", primary: true }]
    });
    if (!result || result.action !== "save") return;
    if (["0", "clear", "delete", "remove"].includes(result.values.when.trim().toLowerCase())) {
      item.reminder = null;
      acknowledgedReminders.delete(item.uid);
      queueSave();
      renderTree();
      selectItem(item.uid, { open: true });
      return showToast("Reminder cleared.");
    }
    const due = Core.parseReminderTime(result.values.when);
    if (!due) return showToast("That reminder time was not understood.");
    item.reminder = { due: due.toISOString(), message: result.values.message.trim() || item.title || "Ticket reminder", snoozedUntil: null };
    acknowledgedReminders.delete(item.uid);
    queueSave();
    renderTree();
    selectItem(item.uid, { open: true });
    showToast(`Reminder set for ${Core.formatReminderTime(due)}.`);
    checkReminders();
  }

  function nextTicketId() {
    const tickets = Core.sortItems(ticketState.items).filter((item) => item.kind !== "NOTE" && item.ticketId);
    if (!tickets.length) return showToast("No ticket IDs were found.");
    const currentIndex = tickets.findIndex((item) => item.uid === selectedItemId);
    const next = tickets[(currentIndex + 1 + tickets.length) % tickets.length];
    selectItem(next.uid, { open: true, scroll: true, flash: true });
    showToast(`Selected ticket ${next.ticketId}.`);
  }

  function openCurrentTicket() {
    const item = findItem(selectedItemId);
    if (!item || item.kind === "NOTE" || !Core.makeTicketUrl(item.ticketId)) return showToast("Select a standard or hardware ticket first.");
    window.open(Core.makeTicketUrl(item.ticketId), "_blank", "noopener,noreferrer");
  }

  async function pickContact() {
    const entries = Object.entries(ticketState.contacts).sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) {
      showToast("No contacts saved. Opening contact editor.");
      return editContacts();
    }
    const editorSnapshot = activeEditor && activeEditor.isConnected ? {
      element: activeEditor,
      start: activeEditor.selectionStart,
      end: activeEditor.selectionEnd
    } : null;
    const result = await openDialog({
      kicker: "ALT + P",
      title: "INSERT CONTACT",
      fields: [{
        name: "contact",
        label: "CONTACT / NAME",
        type: "select",
        options: entries.map(([key, value]) => ({ value: key, label: `${key}: ${value}` }))
      }],
      actions: [{ value: "cancel", label: "CANCEL" }, { value: "insert", label: "INSERT", primary: true }]
    });
    if (!result || result.action !== "insert") return;
    const value = ticketState.contacts[result.values.contact];
    if (editorSnapshot && editorSnapshot.element.isConnected) {
      const control = editorSnapshot.element;
      const start = editorSnapshot.start == null ? control.value.length : editorSnapshot.start;
      const end = editorSnapshot.end == null ? start : editorSnapshot.end;
      control.setRangeText(value, start, end, "end");
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.focus();
      showToast("Contact inserted.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showToast("Contact copied to clipboard.");
    } catch (error) {
      showToast(`Contact: ${value}`);
    }
  }

  function toggleFold() {
    const foldKey = activeFoldKey || (selectedItemId ? `i:${selectedItemId}` : null);
    if (!foldKey) return showToast("Select a year, month, day, ticket, or note first.");
    const target = Array.from(elements.ticketTree.querySelectorAll("details[data-fold-key]")).find((node) => node.dataset.foldKey === foldKey);
    if (!target) return showToast("That section is not visible.");
    target.open = !target.open;
    if (target.open) collapsed.delete(foldKey);
    else collapsed.add(foldKey);
    showToast(`${target.open ? "Expanded" : "Folded"} ${foldKey.slice(2)}.`);
  }

  function downloadFile(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type: type || "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function chooseFile(input) {
    return new Promise(function (resolve) {
      input.value = "";
      input.addEventListener("change", () => resolve(input.files && input.files[0]), { once: true });
      input.click();
    });
  }

  function exportTk() {
    downloadFile("tickets.tk", Core.renderTk(ticketState.items), "text/plain;charset=utf-8");
    showToast("Plain-text .tk export downloaded.");
  }

  async function importTk() {
    const file = await chooseFile(elements.tkImportInput);
    if (!file) return;
    const imported = Core.parseTk(await file.text());
    if (!imported.length) return showToast("No tickets or notes were found in that file.");
    const result = await openDialog({
      kicker: "IMPORT .TK",
      title: `FOUND ${imported.length} ITEMS`,
      copy: "Merge keeps the current vault. Replace removes the current in-browser ticket list after the next encrypted save.",
      actions: [
        { value: "cancel", label: "CANCEL" },
        { value: "replace", label: "REPLACE", danger: true },
        { value: "merge", label: "MERGE", primary: true }
      ]
    });
    if (!result || result.action === "cancel") return;
    if (result.action === "replace") ticketState.items = imported;
    else ticketState.items.push(...imported);
    selectedItemId = imported[0].uid;
    queueSave();
    renderTree();
    selectItem(selectedItemId, { open: true, scroll: true });
    showToast(`${imported.length} items imported.`);
  }

  async function exportVault() {
    await persistNow();
    const raw = localStorage.getItem(STORAGE_KEY);
    const date = Core.localDateString(new Date());
    downloadFile(`ticket-vault-${date}.ticket-vault`, raw, "application/json");
    showToast("Encrypted vault backup downloaded.");
  }

  async function importVault(input) {
    const file = await chooseFile(input || elements.vaultImportInput);
    if (!file) return;
    try {
      const raw = await file.text();
      parseVaultRecord(raw);
      if (ticketState) {
        const result = await openDialog({
          kicker: "RESTORE VAULT",
          title: "REPLACE LOCAL VAULT?",
          copy: "The current local vault will be replaced by this encrypted backup. You will need the backup's password.",
          actions: [{ value: "cancel", label: "CANCEL" }, { value: "replace", label: "REPLACE + LOCK", danger: true }]
        });
        if (!result || result.action !== "replace") return;
      }
      localStorage.setItem(STORAGE_KEY, raw);
      await lockVault({ skipSave: true });
      showAuth("unlock", "Backup restored. Enter its password.");
    } catch (error) {
      showToast("That file is not a valid encrypted ticket vault.");
    }
  }

  async function editContacts() {
    const value = Object.entries(ticketState.contacts).sort((a, b) => a[0].localeCompare(b[0])).map(([key, contact]) => `${key}=${contact}`).join("\n");
    const result = await openDialog({
      kicker: "CONTACTS",
      title: "EDIT CONTACTS",
      copy: "One reusable contact per line: key=value",
      fields: [{ name: "contacts", label: "CONTACTS", type: "textarea", rows: 10, value }],
      actions: [{ value: "cancel", label: "CANCEL" }, { value: "save", label: "SAVE", primary: true }]
    });
    if (!result || result.action !== "save") return;
    const contacts = {};
    const invalid = [];
    result.values.contacts.split(/\r?\n/).forEach(function (line, index) {
      if (!line.trim()) return;
      const separator = line.indexOf("=");
      if (separator < 1) return invalid.push(index + 1);
      const key = line.slice(0, separator).trim();
      const contact = line.slice(separator + 1).trim();
      if (!key || !contact) return invalid.push(index + 1);
      contacts[key] = contact;
    });
    if (invalid.length) return showToast(`Invalid contact line${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}.`);
    ticketState.contacts = contacts;
    queueSave();
    showToast(`${Object.keys(contacts).length} contacts saved.`);
  }

  async function changePassword() {
    const result = await openDialog({
      kicker: "SECURITY",
      title: "CHANGE PASSWORD",
      copy: "This re-encrypts the local vault. Download a new backup afterward.",
      fields: [
        { name: "password", label: "NEW PASSWORD", type: "password", minlength: 10, required: true, autocomplete: "new-password" },
        { name: "confirm", label: "CONFIRM PASSWORD", type: "password", minlength: 10, required: true, autocomplete: "new-password" }
      ],
      actions: [{ value: "cancel", label: "CANCEL" }, { value: "change", label: "RE-ENCRYPT", primary: true }]
    });
    if (!result || result.action !== "change") return;
    if (result.values.password !== result.values.confirm) return showToast("The passwords do not match.");
    vaultSalt = crypto.getRandomValues(new Uint8Array(16));
    vaultIterations = PBKDF2_ITERATIONS;
    vaultKey = await deriveVaultKey(result.values.password, vaultSalt, PBKDF2_ITERATIONS);
    await persistNow();
    showToast("Password changed. Export a fresh encrypted backup.");
  }

  async function dataMenu() {
    const result = await openDialog({
      kicker: "DATA",
      title: "VAULT & FILES",
      fields: [{ name: "action", label: "ACTION", type: "select", options: [
        { value: "export-tk", label: "Export plain tickets.tk" },
        { value: "import-tk", label: "Import / merge .tk" },
        { value: "export-vault", label: "Export encrypted backup" },
        { value: "import-vault", label: "Restore encrypted backup" },
        { value: "contacts", label: "Edit contacts" },
        { value: "password", label: "Change password" }
      ] }],
      actions: [{ value: "cancel", label: "CANCEL" }, { value: "run", label: "RUN", primary: true }]
    });
    if (!result || result.action !== "run") return;
    const actions = {
      "export-tk": exportTk,
      "import-tk": importTk,
      "export-vault": exportVault,
      "import-vault": () => importVault(elements.vaultImportInput),
      contacts: editContacts,
      password: changePassword
    };
    await actions[result.values.action]();
  }

  async function checkReminders() {
    if (!ticketState || reminderCheckRunning || elements.modal.open) return;
    const now = Date.now();
    const dueItem = Core.sortItems(ticketState.items).find(function (item) {
      if (!item.reminder || acknowledgedReminders.has(item.uid)) return false;
      const due = new Date(item.reminder.snoozedUntil || item.reminder.due).getTime();
      return !Number.isNaN(due) && due <= now;
    });
    if (!dueItem) return;
    reminderCheckRunning = true;
    selectItem(dueItem.uid, { open: true, scroll: true, flash: true });
    const result = await openDialog({
      kicker: "REMINDER DUE",
      title: dueItem.reminder.message,
      copy: `${dueItem.title}${dueItem.ticketId ? ` (${dueItem.ticketId})` : ""}\nDue: ${Core.formatReminderTime(dueItem.reminder.due)}`,
      actions: [
        { value: "ack", label: "ACKNOWLEDGE" },
        { value: "snooze", label: "SNOOZE 10 MIN", primary: true }
      ]
    });
    if (result && result.action === "ack") {
      acknowledgedReminders.add(dueItem.uid);
      showToast("Reminder acknowledged for this session.");
    } else {
      dueItem.reminder.snoozedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      queueSave();
      showToast("Reminder snoozed for 10 minutes.");
    }
    reminderCheckRunning = false;
    setTimeout(checkReminders, 0);
  }

  async function runCommand(command) {
    const name = String(command || "").trim().toLowerCase().split(/\s+/)[0];
    const commands = {
      new: createItem,
      create: createItem,
      remind: setReminder,
      reminder: setReminder,
      next: nextTicketId,
      open: openCurrentTicket,
      status: switchStatus,
      contact: pickContact,
      contacts: editContacts,
      fold: toggleFold,
      data: dataMenu,
      export: dataMenu,
      import: dataMenu,
      password: changePassword,
      lock: lockVault,
      help: function () {
        elements.helpPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        showToast("Command reference focused.");
      }
    };
    if (!name) return;
    if (!commands[name]) return showToast(`Unknown command: ${name}. Type help.`);
    await commands[name]();
  }

  function bindEvents() {
    elements.setupForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const data = new FormData(elements.setupForm);
      const password = data.get("password");
      if (password !== data.get("confirm")) return showAuth("setup", "The passwords do not match.");
      if (password.length < 10) return showAuth("setup", "Use at least 10 characters.");
      try {
        elements.authError.textContent = "Creating encrypted vault…";
        vaultSalt = crypto.getRandomValues(new Uint8Array(16));
        vaultIterations = PBKDF2_ITERATIONS;
        vaultKey = await deriveVaultKey(password, vaultSalt, PBKDF2_ITERATIONS);
        ticketState = newState();
        await persistNow();
        unlockApp();
      } catch (error) {
        console.error(error);
        showAuth("setup", "Could not create the local encrypted vault.");
      }
    });

    elements.unlockForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const password = new FormData(elements.unlockForm).get("password");
      elements.authError.textContent = "Decrypting…";
      try {
        const unlocked = await decryptVault(localStorage.getItem(STORAGE_KEY), password);
        vaultKey = unlocked.key;
        vaultSalt = unlocked.salt;
        vaultIterations = unlocked.iterations;
        ticketState = unlocked.state;
        elements.authError.textContent = "";
        unlockApp();
      } catch (error) {
        showAuth("unlock", "Wrong password or damaged vault backup.");
      }
    });

    elements.restoreVault.addEventListener("click", () => importVault(elements.restoreInput));
    elements.lockButton.addEventListener("click", () => lockVault());
    elements.modalClose.addEventListener("click", () => elements.modal.close("cancel"));

    document.addEventListener("click", function (event) {
      const commandButton = event.target.closest("[data-command]");
      if (commandButton && !elements.app.hidden) runCommand(commandButton.dataset.command);
    });

    elements.ticketTree.addEventListener("click", function (event) {
      const foldTarget = event.target.closest("[data-fold-key]");
      if (foldTarget) activeFoldKey = foldTarget.dataset.foldKey;
      const itemNode = event.target.closest(".item[data-item-id]");
      if (itemNode) selectItem(itemNode.dataset.itemId);
    });

    elements.ticketTree.addEventListener("toggle", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.dataset.foldKey) return;
      if (target.open) collapsed.delete(target.dataset.foldKey);
      else collapsed.add(target.dataset.foldKey);
    }, true);

    elements.ticketTree.addEventListener("focusin", function (event) {
      const itemNode = event.target.closest(".item[data-item-id]");
      if (itemNode) selectItem(itemNode.dataset.itemId);
      if (event.target.matches("input[data-field], textarea[data-field]")) activeEditor = event.target;
    });

    elements.ticketTree.addEventListener("input", function (event) {
      const control = event.target.closest("[data-field]");
      const itemNode = event.target.closest(".item[data-item-id]");
      if (!control || !itemNode) return;
      const item = findItem(itemNode.dataset.itemId);
      if (!item) return;
      item[control.dataset.field] = control.value;
      const summary = itemNode.querySelector(":scope > summary");
      if (control.dataset.field === "title") {
        const title = summary.querySelector(".item-title");
        if (title) title.textContent = control.value || (item.kind === "NOTE" ? "Untitled note" : "Untitled ticket");
      }
      if (control.dataset.field === "ticketId") {
        const ticketId = summary.querySelector(".ticket-id");
        if (ticketId) {
          ticketId.textContent = control.value;
          ticketId.href = Core.makeTicketUrl(control.value) || "#";
        }
      }
      queueSave();
    });

    elements.commandForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const command = elements.commandInput.value;
      elements.commandInput.value = "";
      runCommand(command);
    });

    document.addEventListener("keydown", function (event) {
      if (elements.app.hidden || elements.modal.open) return;
      const key = event.key.toLowerCase();
      let command = null;
      if (event.ctrlKey && event.altKey && key === "t") command = "new";
      else if (event.ctrlKey && event.altKey && key === "f") command = "fold";
      else if (event.altKey && !event.ctrlKey && key === "r") command = "remind";
      else if (event.altKey && !event.ctrlKey && key === "n") command = "next";
      else if (event.altKey && !event.ctrlKey && key === "o") command = "open";
      else if (event.altKey && !event.ctrlKey && key === "c") command = "status";
      else if (event.altKey && !event.ctrlKey && key === "p") command = "contact";
      else if (event.key === ":" && !event.ctrlKey && !event.altKey && !event.metaKey && !event.target.matches("input, textarea, select")) {
        event.preventDefault();
        return elements.commandInput.focus();
      }
      if (command) {
        event.preventDefault();
        runCommand(command);
      }
    });

    ["pointerdown", "keydown", "touchstart"].forEach(function (eventName) {
      document.addEventListener(eventName, resetAutoLock, { passive: true });
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && ticketState) checkReminders();
    });
  }

  function init() {
    bindEvents();
    if (!window.isSecureContext || !window.crypto || !window.crypto.subtle) {
      elements.authCopy.textContent = "This browser cannot open an encrypted vault. Use the HTTPS GitHub Pages address in a current browser.";
      elements.unlockForm.hidden = true;
      elements.setupForm.hidden = true;
      elements.authError.textContent = "Web Crypto is unavailable.";
      return;
    }
    showAuth(localStorage.getItem(STORAGE_KEY) ? "unlock" : "setup");
  }

  init();
}());
