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
      hardware: "Laptop",
      asset: "ABC-123",
      notes: "Ordered.",
      solution: "Pending."
    }),
    Core.blankItem({
      uid: "c",
      kind: "NOTE",
      title: "Morning handover",
      status: "",
      created: "2026-08-27",
      notes: "Review open tickets."
    })
  ];

  const text = Core.renderTk(items);
  assert.match(text, /^TKFILE 1/);
  assert.match(text, /HARDWARE ASSIGNED TO @CB1 \| https:\/\/link\.kdo\.de\/itsm\/4565 \| New laptop/);
  assert.match(text, /REMINDER 2026-08-27 14:30 \| Call again/);
  assert.match(text, /TIME SPENT 01:02:03/);

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
  assert.equal(parsed[1].asset, "ABC-123");
  assert.equal(parsed[2].notes, "Review open tickets.");
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
