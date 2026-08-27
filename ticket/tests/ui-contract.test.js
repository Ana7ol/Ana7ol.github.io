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

test("uses Ticket Forge branding, its generated icon, and Mocha for first visits", () => {
  assert.match(html, /<title>Ticket Forge \/\/ Encrypted Desk<\/title>/);
  assert.match(html, /ticket-forge-icon-256\.png/);
  assert.match(html, /ticket forge<span class="cursor"/);
  assert.match(themeInit, /const defaultTheme = "mocha"/);
});

test("exposes timer reset and the requested deletion shortcut", () => {
  assert.match(app, /async function resetTimer/);
  assert.match(app, /data-item-action="reset-timer"/);
  assert.match(app, /event\.ctrlKey && event\.altKey && key === "d"/);
  assert.match(html, /<kbd>Ctrl Alt D<\/kbd>/);
});

test("supports arrow navigation, note checklists, and growing text areas", () => {
  assert.match(app, /function navigateItems/);
  assert.match(app, /event\.key === "ArrowDown"/);
  assert.match(app, /event\.key === "ArrowUp"/);
  assert.match(app, /event\.key === "ArrowRight"/);
  assert.match(app, /event\.key === "ArrowLeft"/);
  assert.match(app, /function checklistMarkup/);
  assert.match(app, /function growTextarea/);
  assert.match(styles, /\.checklist-toggle:checked::after/);
  assert.match(styles, /content: "X"/);
  assert.match(styles, /resize: vertical/);
});
