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
  const TICKET_URL = /(?:https?:\/\/)?link\.kdo\.de\/itsm\/([A-Za-z0-9][A-Za-z0-9._-]*)/i;
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

  function makeTicketUrl(value) {
    const id = extractTicketId(value);
    return id ? TICKET_URL_PREFIX + id : null;
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
      reminder: null
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
      if (currentItem && currentField) currentItem[currentField] = trimBlock(fieldLines);
      currentField = null;
      fieldLines = [];
    }

    function flushItem() {
      flushField();
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

      match = line.match(/^\s*(PROBLEM|NOTES|SOLUTION|REQUESTER|HARDWARE|ASSET\s*\/\s*SERIAL)\s*$/i);
      if (match) {
        flushField();
        const label = match[1].toUpperCase().replace(/\s+/g, " ");
        const fieldMap = {
          PROBLEM: "problem",
          NOTES: "notes",
          SOLUTION: "solution",
          REQUESTER: "requester",
          HARDWARE: "hardware",
          "ASSET / SERIAL": "asset"
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

    if (item.kind === "HARDWARE") {
      lines.push(labelIndent + "REQUESTER", indentText(item.requester, valueIndent), "");
      lines.push(labelIndent + "HARDWARE", indentText(item.hardware, valueIndent), "");
      lines.push(labelIndent + "ASSET / SERIAL", indentText(item.asset, valueIndent), "");
    } else if (item.kind !== "NOTE") {
      lines.push(labelIndent + "PROBLEM", indentText(item.problem, valueIndent), "");
    }

    lines.push(labelIndent + "NOTES", indentText(item.notes, valueIndent), "");
    if (item.kind !== "NOTE") lines.push(labelIndent + "SOLUTION", indentText(item.solution, valueIndent), "");
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
    extractTicketId,
    makeTicketUrl,
    parseTicketInput,
    parseReminderTime,
    formatReminderTime,
    localDateString,
    displayDate,
    blankItem,
    formatItemHeading,
    parseTk,
    renderTk,
    sortItems
  };
}));
