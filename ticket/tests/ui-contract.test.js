"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ticketRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ticketRoot, "index.html"), "utf8");
const app = fs.readFileSync(path.join(ticketRoot, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(ticketRoot, "styles.css"), "utf8");
const themeInit = fs.readFileSync(path.join(ticketRoot, "theme-init.js"), "utf8");
const shortcuts = fs.readFileSync(path.join(ticketRoot, "shortcuts.js"), "utf8");

function sourceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source start: ${start}`);
  const endIndex = end ? source.indexOf(end, startIndex + start.length) : source.length;
  assert.notEqual(endIndex, -1, `Missing source end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("uses Ticket Forge branding, its generated icon, and Mocha for first visits", () => {
  assert.match(html, /<title>Ticket Forge \/\/ Encrypted Desk<\/title>/);
  assert.match(html, /ticket-forge-icon-256\.png/);
  assert.match(html, /ticket forge<span class="cursor"/);
  assert.match(themeInit, /const defaultTheme = "mocha"/);
});

test("exposes timer reset and the requested deletion shortcut", () => {
  assert.match(app, /async function resetTimer/);
  assert.match(app, /data-item-action="reset-timer"/);
  assert.match(shortcuts, /delete: \["Ctrl\+Alt\+D", "Delete"\]/);
  assert.match(shortcuts, /remind: "Ctrl\+Alt\+R"/);
  assert.match(shortcuts, /confirm: "Ctrl\+Alt\+Y"/);
  assert.match(html, /<kbd>Ctrl Alt R<\/kbd>/);
  assert.match(html, /<kbd>Ctrl Alt D<\/kbd>/);
});

test("supports arrow navigation, note checklists, and growing text areas", () => {
  assert.match(app, /function navigateItems/);
  assert.match(shortcuts, /"move-next": "ArrowDown"/);
  assert.match(shortcuts, /"move-previous": "ArrowUp"/);
  assert.match(shortcuts, /expand: "ArrowRight"/);
  assert.match(shortcuts, /collapse: "ArrowLeft"/);
  assert.match(app, /function checklistMarkup/);
  assert.match(app, /function growTextarea/);
  assert.match(styles, /\.checklist-toggle:checked::after/);
  assert.match(styles, /content: "X"/);
  assert.match(styles, /resize: vertical/);
});

test("makes note creation explicit and restores editable classic shortcuts", () => {
  assert.match(app, /NOTE TITLE \(NO ID NEEDED\)/);
  assert.match(app, /Notes are local text records and do not use ticket IDs/);
  assert.match(html, /<script src="shortcuts\.js"><\/script>\s*<script src="app\.js"><\/script>/);
  assert.match(shortcuts, /fold: "Ctrl\+Alt\+F"/);
  assert.match(shortcuts, /storageKey: "ticket-forge\.shortcuts\.v1"/);
  assert.match(app, /async function editShortcuts/);
  assert.match(app, /RESTORE OLD DEFAULTS/);
  assert.match(app, /localStorage\.setItem\(ShortcutConfig\.storageKey/);
  assert.doesNotMatch(html, /KEY MODE/);
  assert.doesNotMatch(app, /handleKeyboardModeKey/);
});

test("uses Ctrl+Alt+Y for modal confirmation and Enter for select opening only", () => {
  const dialog = sourceBetween(app, "function openDialog(config)", "async function createItem()");
  assert.match(app, /function dialogConfirmShortcutMatches/);
  assert.match(dialog, /dialogConfirmShortcutMatches\(event\)/);
  assert.match(dialog, /elements\.modalForm\.requestSubmit\(action\)/);
  assert.match(dialog, /if \(event\.key !== "Enter"\) return/);
  assert.match(dialog, /event\.target\.matches\("textarea, button"\)/);
  assert.match(dialog, /openSelectPicker\(event\.target\)/);
  assert.doesNotMatch(dialog, /if \(event\.key !== "Enter"[\s\S]*requestSubmit/);
  assert.doesNotMatch(app, /requestSubmit\(affirmativeAction\)/);
});

test("allows theme changes while locked and Alt+R double-tap timer reset", () => {
  const keydown = sourceBetween(app, "document.addEventListener(\"keydown\", function (event)", "[\"pointerdown\", \"keydown\", \"touchstart\"]");
  assert.match(keydown, /elements\.modal\.open\) return/);
  assert.match(keydown, /globalCommand !== "theme"/);
  assert.match(app, /function isReservedShortcut\(shortcut\)/);
  assert.match(app, /Alt\+R is reserved for timer reset/);
  assert.match(app, /usableShortcuts = rawShortcuts\.filter/);
  assert.match(keydown, /String\(event\.key \|\| ""\)\.toLowerCase\(\) === "r"/);
  assert.match(keydown, /event\.altKey && !event\.ctrlKey/);
  assert.match(app, /ALT_R_DOUBLE_TAP_MS = 700/);
  assert.match(keydown, /lastAltRAt = 0/);
  assert.match(keydown, /resetTimer\(\)/);
  assert.doesNotMatch(app, /resetTimerOnReminderDoubleTap/);
});

test("opens select-first command dialogs immediately", () => {
  const dialogs = [
    sourceBetween(app, "async function createItem()", "async function editHeading"),
    sourceBetween(app, "async function switchStatus()", "async function setReminder"),
    sourceBetween(app, "async function pickContact()", "function toggleFold"),
    sourceBetween(app, "async function dataMenu()", "async function checkReminders"),
    sourceBetween(app, "async function chooseTheme()", "function buildDialogField")
  ];
  dialogs.forEach((dialog) => assert.match(dialog, /openFirstSelect: true/));
  assert.match(app, /function openSelectPicker\(select\)/);
  assert.match(app, /select\.showPicker\(\)/);
  assert.match(styles, /select\.select-picker-fallback/);
});

test("renders the hardware ticket workflow fields", () => {
  const createDialog = sourceBetween(app, "async function createItem()", "async function editHeading");
  const renderer = sourceBetween(app, "function renderItem(item)", "function makeGroups");
  assert.match(createDialog, /JIRA ID \(OPTIONAL\)/);
  assert.match(createDialog, /dialog-jiraId/);
  assert.match(createDialog, /ADD HARDWARE NOTE TEMPLATE/);
  assert.match(createDialog, /HARDWARE_NOTE_TEMPLATE/);
  assert.match(createDialog, /kind === "HARDWARE"/);
  assert.match(createDialog, /Core\.extractJiraId\(result\.values\.jiraId\)/);
  assert.match(app, /Hardware workflow:/);
  assert.match(renderer, /REQUESTED HARDWARE/);
  assert.match(renderer, /oldSerial/);
  assert.match(renderer, /newSerial/);
  assert.match(app, /function jiraFieldMarkup/);
  assert.match(app, /function hardwareProgressMarkup/);
  assert.match(app, /function refreshHardwareProgress/);
  assert.match(renderer, /hardwareProgressMarkup\(item\)/);
  assert.match(app, /refreshHardwareProgress\(item\)/);
  assert.match(app, /item\.jiraId = Core\.extractJiraId\(fieldControl\.value\)/);
  assert.match(app, /data-boolean-field/);
  assert.match(renderer, /matrixManaged/);
  assert.match(renderer, /jiraDone/);
  assert.match(styles, /\.field-with-link/);
  assert.match(styles, /\.boolean-field/);
  assert.match(styles, /\.hardware-progress-chip\.complete/);
});

test("wires search, daily summary, and timer history into the UI", () => {
  const renderTree = sourceBetween(app, "function visibleItems()", "function findItem(uid)");
  const commands = sourceBetween(app, "async function runCommand(command)", "function bindEvents()");
  const timer = sourceBetween(app, "function stopTimerAt(item, stoppedAt)", "function toggleTimer(uid)");
  assert.match(app, /let searchQuery = ""/);
  assert.match(app, /function setSearchQuery/);
  assert.match(app, /function focusSearchInput/);
  assert.match(renderTree, /Core\.itemMatchesSearch/);
  assert.match(renderTree, /No matches for/);
  assert.match(renderTree, /MATCHES/);
  assert.match(commands, /summary: copyDailySummary/);
  assert.match(commands, /daily: copyDailySummary/);
  assert.match(commands, /today: copyDailySummary/);
  assert.match(commands, /search: \(\) => args \? setSearchQuery\(args\) : focusSearchInput\(\)/);
  assert.match(commands, /"clear-search": \(\) => setSearchQuery\(""\)/);
  assert.match(app, /function copyDailySummary/);
  assert.match(app, /Core\.renderDailySummary\(ticketState\.items, date\)/);
  assert.match(app, /ticket-summary-\$\{date\}\.txt/);
  assert.match(app, /function timeHistoryMarkup/);
  assert.match(app, /Core\.formatTimerSession\(session\)/);
  assert.match(timer, /item\.timeSessions\.push/);
  assert.match(styles, /\.time-history ol/);
  assert.match(html, /<dt>\/text<\/dt><dd>search visible records<\/dd>/);
  assert.match(html, /<dt>summary<\/dt><dd>copy daily summary<\/dd>/);
});
