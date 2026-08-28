"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../core.js");

test("parses ticket IDs and titles from every supported input shape", () => {
  assert.deepEqual(Core.parseTicketInput("4564 Printer problem"), { ticketId: "4564", title: "Printer problem" });
  assert.deepEqual(Core.parseTicketInput("4564 | Printer problem"), { ticketId: "4564", title: "Printer problem" });
  assert.deepEqual(Core.parseTicketInput("https://link.kdo.de/itsm/4564 Printer problem"), { ticketId: "4564", title: "Printer problem" });
  assert.equal(Core.parseTicketInput("4564"), null);
});

test("parses relative, tomorrow, clock, ISO-like, and German reminder times", () => {
  const now = new Date(2026, 7, 26, 12, 0, 0, 0);
  assert.equal(Core.parseReminderTime("+30m", now).getTime(), new Date(2026, 7, 26, 12, 30).getTime());
  assert.equal(Core.parseReminderTime("+2h", now).getTime(), new Date(2026, 7, 26, 14, 0).getTime());
  assert.equal(Core.parseReminderTime("tomorrow 09:00", now).getTime(), new Date(2026, 7, 27, 9, 0).getTime());
  assert.equal(Core.parseReminderTime("11:00", now).getTime(), new Date(2026, 7, 27, 11, 0).getTime());
  assert.equal(Core.parseReminderTime("2026-08-27 14:30", now).getTime(), new Date(2026, 7, 27, 14, 30).getTime());
  assert.equal(Core.parseReminderTime("27.08.2026 14:30", now).getTime(), new Date(2026, 7, 27, 14, 30).getTime());
  assert.equal(Core.parseReminderTime("tomorrow 99:00", now), null);
});

test("formats, parses, and totals tracked ticket time", () => {
  assert.equal(Core.formatDuration(3723000), "01:02:03");
  assert.equal(Core.parseDuration("101:02:03"), 363723000);
  assert.equal(Core.parseDuration("1:99:00"), null);
  assert.equal(Core.totalTimeMs({ timeMs: 60000, timeStartedAt: "2026-08-27T10:00:00.000Z" }, "2026-08-27T10:02:30.000Z"), 210000);
  assert.equal(Core.timerSessionMs({ start: "2026-08-27T10:00:00.000Z", end: "2026-08-27T10:02:30.000Z" }), 150000);
  assert.match(Core.formatTimerSession({ start: "2026-08-27T10:00:00.000Z", end: "2026-08-27T10:02:30.000Z" }), /\| 00:02:30$/);
});

test("matches exact shortcuts and converts keyboard events for the editor", () => {
  assert.equal(Core.shortcutMatches({ key: "D", ctrlKey: true, altKey: true, metaKey: false }, "Ctrl+Alt+D"), true);
  assert.equal(Core.shortcutMatches({ key: "D", ctrlKey: true, altKey: false, metaKey: false }, "Ctrl+Alt+D"), false);
  assert.equal(Core.shortcutMatches({ key: "D", ctrlKey: true, altKey: true, shiftKey: true, metaKey: false }, "Ctrl+Alt+D"), false);
  assert.equal(Core.shortcutMatches({ key: ":", shiftKey: true, ctrlKey: false, altKey: false, metaKey: false }, ":"), true);
  assert.equal(Core.shortcutFromEvent({ key: "f", ctrlKey: true, altKey: true }), "Ctrl+Alt+F");
  assert.equal(Core.shortcutFromEvent({ key: ":", shiftKey: true }), ":");
  assert.equal(Core.shortcutFromEvent({ key: "," }), "Comma");
  assert.equal(Core.shortcutFromEvent({ key: "Control", ctrlKey: true }), null);
});

test("keeps confirmation and reminder shortcuts distinct", () => {
  assert.equal(Core.shortcutMatches({ key: "Y", ctrlKey: true, altKey: true, shiftKey: false, metaKey: false }, "Ctrl+Alt+Y"), true);
  assert.equal(Core.shortcutMatches({ key: "Enter", ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }, "Ctrl+Alt+Y"), false);
  assert.equal(Core.shortcutMatches({ key: "R", ctrlKey: true, altKey: true, shiftKey: false, metaKey: false }, "Ctrl+Alt+R"), true);
  assert.equal(Core.shortcutMatches({ key: "R", ctrlKey: false, altKey: true, shiftKey: false, metaKey: false }, "Ctrl+Alt+R"), false);
  assert.equal(Core.shortcutFromEvent({ key: "r", ctrlKey: true, altKey: true, shiftKey: false, metaKey: false }), "Ctrl+Alt+R");
});

test("parses Jira IDs and links for hardware tickets", () => {
  assert.equal(Core.extractJiraId("ABC-123"), "ABC-123");
  assert.equal(Core.extractJiraId("https://link.kdo.de/jira/ABC-123"), "ABC-123");
  assert.equal(Core.makeJiraUrl("ABC-123"), "https://link.kdo.de/jira/ABC-123");
  assert.equal(Core.makeJiraUrl("not valid"), null);
});

test("calculates hardware progress and searches all important fields", () => {
  const item = Core.blankItem({
    kind: "HARDWARE",
    ticketId: "4565",
    title: "New laptop",
    hardware: "ThinkPad T14",
    oldSerial: "OLD-456",
    newSerial: "NEW-123",
    matrixManaged: true,
    jiraId: "JRA-987",
    jiraDone: false
  });
  assert.deepEqual(Core.hardwareProgress(item), { done: 4, total: 5, complete: false });
  assert.equal(Core.itemMatchesSearch(item, "/thinkpad new-123"), true);
  assert.equal(Core.itemMatchesSearch(item, "link.kdo.de/jira/JRA-987"), true);
  assert.equal(Core.itemMatchesSearch(item, "printer"), false);
});

test("round-trips standard, hardware, and note items through .tk text", () => {
  const items = [
    Core.blankItem({
      uid: "a",
      kind: "TICKET",
      ticketId: "4564",
      title: "Printer problem",
      status: "WORKING",
      created: "2026-08-26",
      problem: "Printer is offline.",
      notes: "Restarted queue.\nCalled user.",
      solution: "",
      timeMs: 3723000,
      timeSessions: [
        { start: "2026-08-26T08:00:00.000Z", end: "2026-08-26T08:30:00.000Z", ms: 1800000 }
      ],
      reminder: { due: new Date(2026, 7, 27, 14, 30).toISOString(), message: "Call again", snoozedUntil: null }
    }),
    Core.blankItem({
      uid: "b",
      kind: "HARDWARE",
      ticketId: "4565",
      title: "New laptop",
      status: "ASSIGNED TO @CB1",
      created: "2026-08-26",
      requester: "Example User",
      hardware: "ThinkPad T14",
      newSerial: "NEW-123",
      oldSerial: "OLD-456",
      matrixManaged: true,
      jiraId: "JRA-987",
      jiraDone: false,
      notes: "Ordered.",
      solution: "Pending."
    }),
    Core.blankItem({
      uid: "c",
      kind: "NOTE",
      title: "Morning handover",
      status: "",
      created: "2026-08-27",
      checklist: [
        { uid: "check-a", text: "Review open tickets", done: true },
        { uid: "check-b", text: "Call requester", done: false }
      ],
      notes: "Review open tickets."
    })
  ];

  const text = Core.renderTk(items);
  assert.match(text, /^TKFILE 1/);
  assert.match(text, /HARDWARE ASSIGNED TO @CB1 \| https:\/\/link\.kdo\.de\/itsm\/4565 \| New laptop/);
  assert.match(text, /REMINDER 2026-08-27 14:30 \| Call again/);
  assert.match(text, /TIME SPENT 01:02:03/);
  assert.match(text, /TIME SESSION 2026-08-26T08:00:00\.000Z \| 2026-08-26T08:30:00\.000Z \| 00:30:00/);
  assert.match(text, /REQUESTED HARDWARE\n\s+ThinkPad T14/);
  assert.match(text, /NEW SN\n\s+NEW-123/);
  assert.match(text, /OLD SN\n\s+OLD-456/);
  assert.match(text, /MATRIX MANAGED \[x\]/);
  assert.match(text, /JIRA https:\/\/link\.kdo\.de\/jira\/JRA-987 \[ \] STEPS DONE/);
  assert.match(text, /CHECKLIST\n\s+\[x\] Review open tickets\n\s+\[ \] Call requester/);

  const parsed = Core.parseTk(text);
  assert.equal(parsed.length, 3);
  assert.deepEqual(
    parsed.map((item) => ({ kind: item.kind, ticketId: item.ticketId, title: item.title, created: item.created })),
    [
      { kind: "TICKET", ticketId: "4564", title: "Printer problem", created: "2026-08-26" },
      { kind: "HARDWARE", ticketId: "4565", title: "New laptop", created: "2026-08-26" },
      { kind: "NOTE", ticketId: "", title: "Morning handover", created: "2026-08-27" }
    ]
  );
  assert.equal(parsed[0].notes, "Restarted queue.\nCalled user.");
  assert.equal(parsed[0].timeMs, 3723000);
  assert.equal(parsed[0].timeSessions.length, 1);
  assert.equal(parsed[0].timeSessions[0].ms, 1800000);
  assert.equal(parsed[1].hardware, "ThinkPad T14");
  assert.equal(parsed[1].newSerial, "NEW-123");
  assert.equal(parsed[1].oldSerial, "OLD-456");
  assert.equal(parsed[1].matrixManaged, true);
  assert.equal(parsed[1].jiraId, "JRA-987");
  assert.equal(parsed[1].jiraDone, false);
  assert.equal(parsed[2].notes, "Review open tickets.");
  assert.deepEqual(parsed[2].checklist.map((entry) => ({ text: entry.text, done: entry.done })), [
    { text: "Review open tickets", done: true },
    { text: "Call requester", done: false }
  ]);
});

test("renders a daily summary from created items and timer sessions", () => {
  const summary = Core.renderDailySummary([
    Core.blankItem({
      kind: "TICKET",
      ticketId: "1111",
      title: "Created today",
      status: "DONE",
      created: "2026-08-28",
      timeMs: 60000
    }),
    Core.blankItem({
      kind: "HARDWARE",
      ticketId: "2222",
      title: "Worked today",
      created: "2026-08-20",
      hardware: "Monitor",
      newSerial: "NEW-1",
      oldSerial: "OLD-1",
      matrixManaged: true,
      jiraId: "JRA-1",
      jiraDone: true,
      timeSessions: [
        { start: "2026-08-28T07:00:00.000Z", end: "2026-08-28T07:15:00.000Z", ms: 900000 }
      ]
    })
  ], "2026-08-28");
  assert.match(summary, /Ticket Forge Daily Summary - 28\.08\.2026/);
  assert.match(summary, /Items touched: 2/);
  assert.match(summary, /Time spent: 00:16:00/);
  assert.match(summary, /Done items: 1/);
  assert.match(summary, /2222 \| HW 5\/5 DONE \| Monitor/);
});

test("imports legacy hardware serial labels into the new serial field", () => {
  const text = [
    "TKFILE 1",
    "YEAR 2026",
    "    MONTH 08",
    "        DAY 26.08.2026",
    "            HARDWARE WORKING | 4565 | New laptop",
    "                HARDWARE",
    "                    Laptop",
    "",
    "                ASSET / SERIAL",
    "                    ABC-123"
  ].join("\n");
  const [item] = Core.parseTk(text);
  assert.equal(item.kind, "HARDWARE");
  assert.equal(item.hardware, "Laptop");
  assert.equal(item.newSerial, "ABC-123");
});

test("imports dashed checklist syntax in notes", () => {
  const text = [
    "TKFILE 1",
    "YEAR 2026",
    "    MONTH 08",
    "        DAY 27.08.2026",
    "            NOTE | Deployment",
    "                CHECKLIST",
    "                    - [x] Build",
    "                    - [ ] Verify"
  ].join("\n");
  const [item] = Core.parseTk(text);
  assert.deepEqual(item.checklist.map((entry) => ({ text: entry.text, done: entry.done })), [
    { text: "Build", done: true },
    { text: "Verify", done: false }
  ]);
});

test("imports legacy TICKET-prefixed headings", () => {
  const text = [
    "TKFILE 1",
    "YEAR 2026",
    "    MONTH 08",
    "        DAY 26.08.2026",
    "            TICKET DONE | 7890 | Legacy heading",
    "                NOTES",
    "                    Imported"
  ].join("\n");
  const [item] = Core.parseTk(text);
  assert.equal(item.kind, "TICKET");
  assert.equal(item.status, "DONE");
  assert.equal(item.ticketId, "7890");
});

test("formats headings for direct clipboard copying", () => {
  assert.equal(
    Core.formatItemHeading(Core.blankItem({ ticketId: "4564", title: "Printer problem", status: "DONE" })),
    "DONE | https://link.kdo.de/itsm/4564 | Printer problem"
  );
  assert.equal(
    Core.formatItemHeading(Core.blankItem({ kind: "NOTE", title: "Handover", status: "" })),
    "NOTE | Handover"
  );
});
