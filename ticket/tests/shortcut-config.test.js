"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ticketRoot = path.resolve(__dirname, "..");
const Core = require("../core.js");
const source = fs.readFileSync(path.join(ticketRoot, "shortcuts.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "shortcuts.js" });
const config = sandbox.window.TicketShortcutConfig;

function defaultValues(value) {
  return (Array.isArray(value) ? value : [value])
    .map((shortcut) => String(shortcut || "").trim())
    .filter(Boolean);
}

test("shortcut defaults include the requested command set", () => {
  const commands = new Set(config.commands.map((entry) => entry.command));
  ["theme", "remind", "reset-time", "search", "summary", "delete", "confirm", "keys"].forEach((command) => {
    assert.equal(commands.has(command), true, `${command} command is missing`);
  });
  assert.equal(config.defaults.theme, "Ctrl+Alt+M");
  assert.equal(config.defaults.remind, "Ctrl+Alt+R");
  assert.equal(config.defaults["reset-time"], undefined);
  assert.equal(config.defaults.search, undefined);
  assert.equal(config.defaults.summary, undefined);
  assert.equal(config.defaults.confirm, "Ctrl+Alt+Y");
});

test("default shortcuts do not conflict across commands", () => {
  const owners = new Map();
  Object.entries(config.defaults).forEach(([command, value]) => {
    defaultValues(value).forEach((shortcut) => {
      const normalized = shortcut.toLowerCase();
      assert.notEqual(normalized, "alt+r", "Alt+R is reserved for the timer reset double-tap");
      assert.equal(owners.has(normalized), false, `${shortcut} is assigned to both ${owners.get(normalized)} and ${command}`);
      owners.set(normalized, command);
    });
  });
});

test("requested defaults match actual keyboard events", () => {
  assert.equal(Core.shortcutMatches({ key: "m", ctrlKey: true, altKey: true, shiftKey: false, metaKey: false }, config.defaults.theme), true);
  assert.equal(Core.shortcutMatches({ key: "r", ctrlKey: true, altKey: true, shiftKey: false, metaKey: false }, config.defaults.remind), true);
  assert.equal(Core.shortcutMatches({ key: "r", ctrlKey: false, altKey: true, shiftKey: false, metaKey: false }, config.defaults.remind), false);
  assert.equal(Core.shortcutMatches({ key: "y", ctrlKey: true, altKey: true, shiftKey: false, metaKey: false }, config.defaults.confirm), true);
  assert.equal(Core.shortcutMatches({ key: "Enter", ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }, config.defaults.confirm), false);
});
