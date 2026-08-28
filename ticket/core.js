(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.TicketCore = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TICKET_URL_PREFIX = "https://link.kdo.de/itsm/";
  const JIRA_URL_PREFIX = "https://link.kdo.de/jira/";
  const TICKET_URL = /(?:https?:\/\/)?link\.kdo\.de\/itsm\/([A-Za-z0-9][A-Za-z0-9._-]*)/i;
  const JIRA_URL = /(?:https?:\/\/)?link\.kdo\.de\/jira\/([A-Za-z0-9][A-Za-z0-9._-]*)/i;
  const PLAIN_TICKET_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function localDateString(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function displayDate(dateValue) {
    const parts = String(dateValue).split("-");
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateValue;
  }

  function extractTicketId(value) {
    if (value == null) return null;
    const text = String(value).trim();
    const urlMatch = text.match(TICKET_URL);
    if (urlMatch) return urlMatch[1];
    const stripped = text.replace(/^[ <>\[\](){}.,;:"']+|[ <>\[\](){}.,;:"']+$/g, "");
    return PLAIN_TICKET_ID.test(stripped) ? stripped : null;
  }

  function extractJiraId(value) {
    if (value == null) return null;
    const text = String(value).trim();
    const urlMatch = text.match(JIRA_URL);
    if (urlMatch) return urlMatch[1];
    const stripped = text.replace(/^[ <>\[\](){}.,;:"']+|[ <>\[\](){}.,;:"']+$/g, "");
    return PLAIN_TICKET_ID.test(stripped) ? stripped : null;
  }

  function makeTicketUrl(value) {
    const id = extractTicketId(value);
    return id ? TICKET_URL_PREFIX + id : null;
  }

  function makeJiraUrl(value) {
    const id = extractJiraId(value);
    return id ? JIRA_URL_PREFIX + id : null;
  }

  function parseTicketInput(value) {
    if (value == null) return null;
    const text = String(value).replace(/[\r\n\t]+/g, " ").trim();
    if (!text) return null;

    const urlMatch = TICKET_URL.exec(text);
    if (urlMatch) {
      const title = text.slice(urlMatch.index + urlMatch[0].length).replace(/^[\s|,;:-]+/, "").trim();
      return title ? { ticketId: urlMatch[1], title } : null;
    }

    const match = text.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\s*\|\s*|\s*,\s*|\s*;\s*|\s+[-:]\s+|\s+)(.+?)\s*$/);
    if (!match) return null;
    const ticketId = extractTicketId(match[1]);
    const title = match[2].trim();
    return ticketId && title ? { ticketId, title } : null;
  }

  function validLocalDate(year, month, day, hour, minute) {
    const result = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (
      result.getFullYear() !== year ||
      result.getMonth() !== month - 1 ||
      result.getDate() !== day ||
      result.getHours() !== hour ||
      result.getMinutes() !== minute
    ) return null;
    return result;
  }

  function parseReminderTime(value, suppliedNow) {
    const now = suppliedNow ? new Date(suppliedNow) : new Date();
    if (value == null || Number.isNaN(now.getTime())) return null;
    const text = String(value).trim();
    const lower = text.toLowerCase();

    let match = lower.match(/^\+(\d+)\s*([mhd])$/);
    if (match) {
      const amount = Number(match[1]);
      const factors = { m: 60e3, h: 36e5, d: 864e5 };
      return new Date(now.getTime() + amount * factors[match[2]]);
    }

    match = lower.match(/^tomorrow(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (match) {
      const hour = Number(match[1] || 9);
      const minute = Number(match[2] || 0);
      if (hour > 23 || minute > 59) return null;
      const result = new Date(now);
      result.setDate(result.getDate() + 1);
      result.setHours(hour, minute, 0, 0);
      return result;
    }

    match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour > 23 || minute > 59) return null;
      const result = new Date(now);
      result.setHours(hour, minute, 0, 0);
      if (result <= now) result.setDate(result.getDate() + 1);
      return result;
    }

    match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
    if (match) {
      return validLocalDate(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]));
    }

    match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
    if (match) {
      return validLocalDate(Number(match[3]), Number(match[2]), Number(match[1]), Number(match[4]), Number(match[5]));
    }

    return null;
  }

  function formatReminderTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatDuration(milliseconds) {
    const numeric = Number(milliseconds);
    const totalSeconds = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric / 1000)) : 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${pad(minutes)}:${pad(seconds)}`;
  }

  function compactDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${displayDate(localDateString(date))} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function parseDuration(value) {
    const match = String(value || "").trim().match(/^(\d+):([0-5]\d):([0-5]\d)$/);
    if (!match) return null;
    const result = ((Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3])) * 1000;
    return Number.isSafeInteger(result) ? result : null;
  }

  function totalTimeMs(item, suppliedNow) {
    const base = Number.isFinite(item && item.timeMs) ? Math.max(0, item.timeMs) : 0;
    if (!item || !item.timeStartedAt) return base;
    const started = new Date(item.timeStartedAt).getTime();
    const now = suppliedNow == null ? Date.now() : new Date(suppliedNow).getTime();
    if (Number.isNaN(started) || Number.isNaN(now)) return base;
    return Math.min(Number.MAX_SAFE_INTEGER, base + Math.max(0, now - started));
  }

  function timerSessionMs(session) {
    const recorded = Number(session && session.ms);
    if (Number.isFinite(recorded) && recorded >= 0) return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(recorded));
    const start = new Date(session && session.start).getTime();
    const end = new Date(session && session.end).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return 0;
    return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, end - start));
  }

  function formatTimerSession(session) {
    const start = compactDateTime(session && session.start);
    const end = compactDateTime(session && session.end);
    const duration = formatDuration(timerSessionMs(session));
    return start && end ? `${start} - ${end} | ${duration}` : duration;
  }

  function hardwareProgress(item) {
    const checks = [
      Boolean(String(item && (item.newSerial || item.asset) || "").trim()),
      Boolean(String(item && item.oldSerial || "").trim()),
      Boolean(item && item.matrixManaged),
      Boolean(String(item && item.jiraId || "").trim()),
      Boolean(item && item.jiraDone)
    ];
    const done = checks.filter(Boolean).length;
    return {
      done,
      total: checks.length,
      complete: done === checks.length
    };
  }

  function itemMatchesSearch(item, query) {
    const terms = String(query || "").replace(/^\//, "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return true;
    const fields = [
      item && item.kind,
      item && item.ticketId,
      item && item.title,
      item && item.status,
      item && item.problem,
      item && item.notes,
      item && item.solution,
      item && item.requester,
      item && item.hardware,
      item && item.asset,
      item && item.newSerial,
      item && item.oldSerial,
      item && item.jiraId,
      item && makeTicketUrl(item.ticketId),
      item && makeJiraUrl(item.jiraId)
    ];
    const text = fields.filter(Boolean).join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  }

  function shortcutMatches(event, shortcut) {
    const parts = String(shortcut || "").split("+").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return false;
    const key = parts.pop().toLowerCase();
    const modifiers = parts.map((part) => part.toLowerCase());
    if (Boolean(event.ctrlKey) !== modifiers.includes("ctrl")) return false;
    if (Boolean(event.altKey) !== modifiers.includes("alt")) return false;
    if (Boolean(event.metaKey) !== modifiers.includes("meta")) return false;
    const implicitShift = Boolean(event.shiftKey) && key.length === 1 && !/[a-z0-9 ]/i.test(key);
    if (Boolean(event.shiftKey) !== modifiers.includes("shift") && !implicitShift) return false;
    const aliases = { esc: "escape", space: " ", plus: "+", comma: "," };
    return String(event.key || "").toLowerCase() === (aliases[key] || key);
  }

  function shortcutFromEvent(event) {
    const rawKey = String(event && event.key || "");
    if (!rawKey || ["Control", "Alt", "Shift", "Meta"].includes(rawKey)) return null;
    const namedKeys = {
      " ": "Space",
      Esc: "Escape",
      Del: "Delete",
      Up: "ArrowUp",
      Down: "ArrowDown",
      Left: "ArrowLeft",
      Right: "ArrowRight",
      "+": "Plus",
      ",": "Comma"
    };
    let key = namedKeys[rawKey] || rawKey;
    if (key.length === 1 && /[a-z]/i.test(key)) key = key.toUpperCase();
    const parts = [];
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.metaKey) parts.push("Meta");
    const shiftedSymbol = key.length === 1 && !/[a-z0-9 ]/i.test(key);
    if (event.shiftKey && !shiftedSymbol) parts.push("Shift");
    parts.push(key);
    return parts.join("+");
  }

  function randomId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function blankItem(overrides) {
    return Object.assign({
      uid: randomId(),
      kind: "TICKET",
      ticketId: "",
      title: "",
      status: "WORKING",
      created: localDateString(new Date()),
      problem: "",
      notes: "",
      solution: "",
      requester: "",
      hardware: "",
      asset: "",
      newSerial: "",
      oldSerial: "",
      matrixManaged: false,
      jiraId: "",
      jiraDone: false,
      checklist: [],
      reminder: null,
      timeMs: 0,
      timeStartedAt: null,
      timeSessions: []
    }, overrides || {});
  }

  function trimBlock(lines) {
    const result = lines.slice();
    while (result.length && !result[0].trim()) result.shift();
    while (result.length && !result[result.length - 1].trim()) result.pop();
    return result.map((line) => line.replace(/^\s{16}/, "").replace(/^\s+/, "")).join("\n");
  }

  function parseTk(text) {
    const items = [];
    const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    let currentDate = localDateString(new Date());
    let currentItem = null;
    let currentField = null;
    let fieldLines = [];

    function flushField() {
      if (currentItem && currentField === "checklist") {
        const block = trimBlock(fieldLines);
        currentItem.checklist = block ? block.split("\n").map(function (line) {
          const match = line.match(/^(?:-\s*)?\[([ xX])\]\s*(.*)$/);
          return match ? { uid: randomId(), text: match[2].trim(), done: match[1].toLowerCase() === "x" } : null;
        }).filter(Boolean) : [];
      } else if (currentItem && currentField) {
        currentItem[currentField] = trimBlock(fieldLines);
      }
      currentField = null;
      fieldLines = [];
    }

    function flushItem() {
      flushField();
      if (currentItem && currentItem.timeMs === 0 && Array.isArray(currentItem.timeSessions) && currentItem.timeSessions.length) {
        currentItem.timeMs = currentItem.timeSessions.reduce((total, session) => total + timerSessionMs(session), 0);
      }
      if (currentItem) items.push(currentItem);
      currentItem = null;
    }

    for (const line of lines) {
      let match = line.match(/^\s*DAY\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/i);
      if (match) {
        flushItem();
        currentDate = `${match[3]}-${pad(match[2])}-${pad(match[1])}`;
        continue;
      }

      match = line.match(/^\s*NOTE\b\s*(?:\|\s*)?(.*?)\s*$/i);
      if (match) {
        flushItem();
        currentItem = blankItem({ kind: "NOTE", title: match[1].trim(), status: "", created: currentDate });
        continue;
      }

      match = line.match(/^\s*(?:(TICKET|HARDWARE)\s+)?([^|\r\n]+?)\s*\|\s*([^|\r\n]+?)\s*\|\s*(.*?)\s*$/i);
      if (match) {
        const ticketId = extractTicketId(match[3]);
        if (ticketId) {
          flushItem();
          currentItem = blankItem({
            kind: (match[1] || "TICKET").toUpperCase(),
            ticketId,
            status: match[2].trim().toUpperCase(),
            title: match[4].trim(),
            created: currentDate
          });
          continue;
        }
      }

      if (!currentItem) continue;

      match = line.match(/^\s*REMINDER\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*\|\s*(.*?)\s*$/i);
      if (match) {
        flushField();
        const due = parseReminderTime(match[1]);
        if (due) currentItem.reminder = { due: due.toISOString(), message: match[2].trim(), snoozedUntil: null };
        continue;
      }

      match = line.match(/^\s*TIME\s+SPENT\s+(\d+:[0-5]\d:[0-5]\d)\s*$/i);
      if (match) {
        flushField();
        currentItem.timeMs = parseDuration(match[1]) || 0;
        currentItem.timeStartedAt = null;
        continue;
      }

      match = line.match(/^\s*TIME\s+SESSION\s+([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+:[0-5]\d:[0-5]\d)\s*$/i);
      if (match) {
        flushField();
        const start = new Date(match[1].trim());
        const end = new Date(match[2].trim());
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          currentItem.timeSessions.push({
            start: start.toISOString(),
            end: end.toISOString(),
            ms: parseDuration(match[3]) || Math.max(0, end.getTime() - start.getTime())
          });
        }
        continue;
      }

      match = line.match(/^\s*MATRIX\s+MANAGED\s+\[([ xX])\]\s*$/i);
      if (match) {
        flushField();
        currentItem.matrixManaged = match[1].toLowerCase() === "x";
        continue;
      }

      match = line.match(/^\s*JIRA(?:\s+([^\[\r\n]+?))?\s*\[([ xX])\]\s*STEPS\s+DONE\s*$/i);
      if (match) {
        flushField();
        const jiraText = (match[1] || "").trim();
        currentItem.jiraId = extractJiraId(jiraText) || jiraText;
        currentItem.jiraDone = match[2].toLowerCase() === "x";
        continue;
      }

      match = line.match(/^\s*(PROBLEM|NOTES|SOLUTION|REQUESTER|REQUESTED\s+HARDWARE|HARDWARE|CHECKLIST|NEW\s+SN|OLD\s+SN|JIRA|ASSET\s*\/\s*SERIAL)\s*$/i);
      if (match) {
        flushField();
        const label = match[1].toUpperCase().replace(/\s+/g, " ");
        const fieldMap = {
          PROBLEM: "problem",
          NOTES: "notes",
          SOLUTION: "solution",
          REQUESTER: "requester",
          "REQUESTED HARDWARE": "hardware",
          HARDWARE: "hardware",
          CHECKLIST: "checklist",
          "NEW SN": "newSerial",
          "OLD SN": "oldSerial",
          JIRA: "jiraId",
          "ASSET / SERIAL": "newSerial"
        };
        currentField = fieldMap[label];
        continue;
      }

      if (currentField) fieldLines.push(line);
    }

    flushItem();
    return items;
  }

  function indentText(value, indent) {
    const text = String(value || "");
    if (!text) return indent;
    return text.split("\n").map((line) => indent + line).join("\n");
  }

  function checkboxMark(value) {
    return value ? "x" : " ";
  }

  function formatItemHeading(item) {
    if (item.kind === "NOTE") return `NOTE | ${item.title}`;
    const prefix = item.kind === "HARDWARE" ? "HARDWARE " : "";
    return `${prefix}${item.status || "WORKING"} | ${makeTicketUrl(item.ticketId)} | ${item.title}`;
  }

  function itemBlock(item) {
    const headingIndent = "            ";
    const labelIndent = "                ";
    const valueIndent = "                    ";
    const lines = [];

    lines.push(headingIndent + formatItemHeading(item));

    if (item.reminder) {
      lines.push(`${labelIndent}REMINDER ${formatReminderTime(item.reminder.due)} | ${item.reminder.message || item.title}`);
    }

    const trackedTime = totalTimeMs(item);
    if (trackedTime > 0 || item.timeStartedAt) {
      lines.push(`${labelIndent}TIME SPENT ${formatDuration(trackedTime)}`);
    }
    if (Array.isArray(item.timeSessions) && item.timeSessions.length) {
      item.timeSessions.forEach(function (session) {
        if (!session || !session.start || !session.end) return;
        lines.push(`${labelIndent}TIME SESSION ${session.start} | ${session.end} | ${formatDuration(timerSessionMs(session))}`);
      });
    }

    if (item.kind === "HARDWARE") {
      lines.push(labelIndent + "REQUESTER", indentText(item.requester, valueIndent), "");
      lines.push(labelIndent + "REQUESTED HARDWARE", indentText(item.hardware, valueIndent), "");
      lines.push(labelIndent + "NEW SN", indentText(item.newSerial || item.asset, valueIndent), "");
      lines.push(labelIndent + "OLD SN", indentText(item.oldSerial, valueIndent), "");
      lines.push(`${labelIndent}MATRIX MANAGED [${checkboxMark(item.matrixManaged)}]`);
      const jira = item.jiraId ? (makeJiraUrl(item.jiraId) || item.jiraId) : "";
      lines.push(`${labelIndent}JIRA${jira ? ` ${jira}` : ""} [${checkboxMark(item.jiraDone)}] STEPS DONE`, "");
    } else if (item.kind !== "NOTE") {
      lines.push(labelIndent + "PROBLEM", indentText(item.problem, valueIndent), "");
    }

    if (item.kind === "NOTE" && Array.isArray(item.checklist) && item.checklist.length) {
      lines.push(labelIndent + "CHECKLIST");
      item.checklist.forEach(function (entry) {
        lines.push(`${valueIndent}[${entry.done ? "x" : " "}] ${entry.text || ""}`);
      });
      lines.push("");
    }

    lines.push(labelIndent + "NOTES", indentText(item.notes, valueIndent), "");
    if (item.kind !== "NOTE") lines.push(labelIndent + "SOLUTION", indentText(item.solution, valueIndent), "");
    return lines.join("\n");
  }

  function summaryDate(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? localDateString(new Date()) : localDateString(date);
  }

  function sessionTouchesDate(session, date) {
    const start = new Date(session && session.start);
    const end = new Date(session && session.end);
    return (!Number.isNaN(start.getTime()) && localDateString(start) === date) ||
      (!Number.isNaN(end.getTime()) && localDateString(end) === date);
  }

  function itemTimeMsForDate(item, date) {
    const sessions = Array.isArray(item && item.timeSessions) ? item.timeSessions : [];
    const sessionMs = sessions
      .filter((session) => sessionTouchesDate(session, date))
      .reduce((total, session) => total + timerSessionMs(session), 0);
    let activeMs = 0;
    if (item && item.timeStartedAt) {
      const start = new Date(item.timeStartedAt);
      if (!Number.isNaN(start.getTime()) && localDateString(start) === date) {
        activeMs = Math.max(0, totalTimeMs(item) - Math.max(0, Number(item.timeMs) || 0));
      }
    }
    if (sessionMs > 0 || activeMs > 0) return sessionMs + activeMs;
    return item && item.created === date ? totalTimeMs(item) : 0;
  }

  function itemTouchedOnDate(item, date) {
    return Boolean(item && item.created === date) || itemTimeMsForDate(item, date) > 0;
  }

  function renderDailySummary(items, dateValue) {
    const date = summaryDate(dateValue);
    const dayItems = sortItems(items || []).filter((item) => itemTouchedOnDate(item, date));
    const totalMs = dayItems.reduce((total, item) => total + itemTimeMsForDate(item, date), 0);
    const doneItems = dayItems.filter((item) => String(item.status || "").toUpperCase() === "DONE");
    const hardwareItems = dayItems.filter((item) => item.kind === "HARDWARE");
    const lines = [
      `Ticket Forge Daily Summary - ${displayDate(date)}`,
      `Items touched: ${dayItems.length}`,
      `Time spent: ${formatDuration(totalMs)}`,
      `Done items: ${doneItems.length}`,
      ""
    ];

    if (!dayItems.length) {
      lines.push("No items for this day.");
      return lines.join("\n");
    }

    lines.push("Items");
    dayItems.forEach(function (item) {
      const id = item.kind === "NOTE" ? "NOTE" : (item.ticketId || "NO-ID");
      lines.push(`- ${id} | ${item.status || item.kind} | ${item.title || "Untitled"} | ${formatDuration(itemTimeMsForDate(item, date))}`);
    });

    if (hardwareItems.length) {
      lines.push("", "Hardware");
      hardwareItems.forEach(function (item) {
        const progress = hardwareProgress(item);
        const jira = item.jiraId ? (makeJiraUrl(item.jiraId) || item.jiraId) : "no Jira";
        lines.push(`- ${item.ticketId || "NO-ID"} | HW ${progress.done}/${progress.total} DONE | ${item.hardware || "hardware open"} | old ${item.oldSerial || "-"} | new ${item.newSerial || item.asset || "-"} | Matrix ${item.matrixManaged ? "done" : "open"} | Jira ${jira} ${item.jiraDone ? "done" : "open"}`);
      });
    }

    if (doneItems.length) {
      lines.push("", "Done");
      doneItems.forEach((item) => lines.push(`- ${item.ticketId || item.kind} | ${item.title || "Untitled"}`));
    }

    return lines.join("\n");
  }

  function sortItems(items) {
    return items.map((item, index) => ({ item, index })).sort((a, b) => {
      const dateOrder = String(a.item.created).localeCompare(String(b.item.created));
      return dateOrder || a.index - b.index;
    }).map((entry) => entry.item);
  }

  function renderTk(items) {
    const sorted = sortItems(items || []);
    const lines = ["TKFILE 1", ""];
    let year = null;
    let month = null;
    let day = null;

    for (const item of sorted) {
      const parts = String(item.created || localDateString(new Date())).split("-");
      const itemYear = parts[0];
      const itemMonth = parts[1];
      const itemDay = parts[2];
      if (itemYear !== year) {
        if (year !== null) lines.push("");
        lines.push(`YEAR ${itemYear}`);
        year = itemYear;
        month = null;
        day = null;
      }
      if (itemMonth !== month) {
        lines.push(`    MONTH ${itemMonth}`);
        month = itemMonth;
        day = null;
      }
      if (itemDay !== day) {
        lines.push(`        DAY ${itemDay}.${itemMonth}.${itemYear}`, "");
        day = itemDay;
      }
      lines.push(itemBlock(item), "");
    }

    return lines.join("\n").replace(/\n+$/, "\n");
  }

  return {
    TICKET_URL_PREFIX,
    JIRA_URL_PREFIX,
    extractTicketId,
    extractJiraId,
    makeTicketUrl,
    makeJiraUrl,
    parseTicketInput,
    parseReminderTime,
    formatReminderTime,
    formatDuration,
    compactDateTime,
    parseDuration,
    totalTimeMs,
    timerSessionMs,
    formatTimerSession,
    hardwareProgress,
    itemMatchesSearch,
    itemTimeMsForDate,
    renderDailySummary,
    shortcutMatches,
    shortcutFromEvent,
    localDateString,
    displayDate,
    blankItem,
    formatItemHeading,
    parseTk,
    renderTk,
    sortItems
  };
}));
