const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");

const app = express();

const PORT = 3333;
const CACHE_DURATION = 5 * 60 * 1000;

let calendarCache = {
  events: [],
  timestamp: 0,
};

app.use(
  cors({
    origin: "http://localhost:4200",
  })
);

app.use(express.json());

function escapeAppleScriptString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function buildAppleScriptDateCommands(variableName, date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `
    set ${variableName} to current date
    set year of ${variableName} to ${year}
    set month of ${variableName} to ${month}
    set day of ${variableName} to ${day}
    set time of ${variableName} to (${hour} * hours) + (${minute} * minutes) + ${second}
`;
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function buildLocalDateString(year, month, day, hour, minute, second) {
  return (
    `${year}-${padNumber(month)}-${padNumber(day)}` +
    `T${padNumber(hour)}:${padNumber(minute)}:${padNumber(second)}`
  );
}

/**
 * Convert an ISO timestamp from the API into the local date/time format
 * expected by CalendarEventKit.
 *
 * Example:
 *
 *   2026-09-18T21:00:00.000Z
 *
 * becomes:
 *
 *   2026-09-18T16:00:00
 *
 * when the Mac is in Dallas/CDT.
 */
function buildLocalDateStringFromISO(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  return buildLocalDateString(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
}

function runAppleCalendarRead() {
  return new Promise((resolve, reject) => {
    const args = [
      "-nc",
      "-nrd",
      "-ea",
      "-uid",
      "-df",
      "%Y-%m-%d",
      "-tf",
      "%H:%M",
      "eventsToday+7",
    ];

    console.log("[calendar] Reading Apple Calendar with icalBuddy...");

    execFile("icalBuddy", args, { timeout: 15000 }, (error, stdout, stderr) => {
      console.log("[calendar] icalBuddy RAW STDOUT:", JSON.stringify(stdout));

      console.log("[calendar] icalBuddy RAW STDERR:", JSON.stringify(stderr));

      if (error) {
        console.error("[calendar] icalBuddy read error:", error);

        reject(new Error(stderr || error.message));
        return;
      }

      resolve(stdout);
    });
  });
}

function parseAppleCalendarEvents(output) {
  const events = [];
  const lines = output.split(/\r?\n/);

  let currentEvent = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    /*
     * Event title
     *
     * Example:
     *
     * • Bish heart worm and flea meds
     */
    if (trimmed.startsWith("•")) {
      if (currentEvent) {
        events.push(currentEvent);
      }

      currentEvent = {
        id: null,
        calendar: "Work",
        title: trimmed.replace(/^•\s*/, "").trim(),
        start: null,
        end: null,
        location: "",
        notes: "",
      };

      continue;
    }

    if (!currentEvent) {
      continue;
    }

    /*
     * Date/time line
     *
     * Example:
     *
     * 2026-09-18 at 16:00 - 17:00
     */
    const dateMatch = trimmed.match(
      /^(\d{4}-\d{2}-\d{2})\s+at\s+(\d{2}:\d{2})\s+-\s+(\d{2}:\d{2})$/
    );

    if (dateMatch) {
      const [, date, startTime, endTime] = dateMatch;

      currentEvent.start = new Date(`${date}T${startTime}:00`).toISOString();

      currentEvent.end = new Date(`${date}T${endTime}:00`).toISOString();

      continue;
    }

    /*
     * icalBuddy UID
     *
     * This remains the API-facing ID.
     *
     * IMPORTANT:
     * It is NOT passed directly to Calendar.app or EventKit.
     */
    if (trimmed.startsWith("uid:")) {
      currentEvent.id = trimmed.substring(4).trim();
    }
  }

  if (currentEvent) {
    events.push(currentEvent);
  }

  return events.filter(
    (event) => event.id && event.title && event.start && event.end
  );
}

function buildRecurrenceRule(recurrence) {
  if (!recurrence) {
    return null;
  }

  const { frequency, interval = 1, endDate, occurrenceCount } = recurrence;

  const allowedFrequencies = {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
    yearly: "YEARLY",
  };

  if (!allowedFrequencies[frequency]) {
    throw new Error(
      "recurrence.frequency must be daily, weekly, monthly, or yearly."
    );
  }

  const numericInterval = Number(interval);

  if (!Number.isInteger(numericInterval) || numericInterval < 1) {
    throw new Error("recurrence.interval must be a positive integer.");
  }

  if (endDate && occurrenceCount !== undefined) {
    throw new Error(
      "Use either recurrence.endDate or recurrence.occurrenceCount, not both."
    );
  }

  const ruleParts = [
    `FREQ=${allowedFrequencies[frequency]}`,
    `INTERVAL=${numericInterval}`,
  ];

  if (endDate) {
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedEndDate.getTime())) {
      throw new Error("recurrence.endDate must be a valid date.");
    }

    const year = parsedEndDate.getUTCFullYear();
    const month = padNumber(parsedEndDate.getUTCMonth() + 1);
    const day = padNumber(parsedEndDate.getUTCDate());
    const hour = padNumber(parsedEndDate.getUTCHours());
    const minute = padNumber(parsedEndDate.getUTCMinutes());
    const second = padNumber(parsedEndDate.getUTCSeconds());

    ruleParts.push(`UNTIL=${year}${month}${day}T${hour}${minute}${second}Z`);
  }

  if (occurrenceCount !== undefined) {
    const numericCount = Number(occurrenceCount);

    if (!Number.isInteger(numericCount) || numericCount < 1) {
      throw new Error("recurrence.occurrenceCount must be a positive integer.");
    }

    ruleParts.push(`COUNT=${numericCount}`);
  }

  return ruleParts.join(";");
}

function createCalendarEvent({
  calendar,
  title,
  start,
  end,
  location = "",
  notes = "",
  recurrence = null,
}) {
  return new Promise((resolve, reject) => {
    const safeCalendar = escapeAppleScriptString(calendar);

    const safeTitle = escapeAppleScriptString(title);

    const safeLocation = escapeAppleScriptString(location);

    const safeNotes = escapeAppleScriptString(notes);

    const startDate = new Date(start);
    const endDate = new Date(end);

    const startDateCommands = buildAppleScriptDateCommands(
      "startDate",
      startDate
    );

    const endDateCommands = buildAppleScriptDateCommands("endDate", endDate);

    let recurrenceRule;

    try {
      recurrenceRule = buildRecurrenceRule(recurrence);
    } catch (error) {
      reject(error);
      return;
    }

    const optionalProperties = [];

    if (location) {
      optionalProperties.push(`location:"${safeLocation}"`);
    }

    if (notes) {
      optionalProperties.push(`description:"${safeNotes}"`);
    }

    const additionalProperties =
      optionalProperties.length > 0 ? `, ${optionalProperties.join(", ")}` : "";

    const recurrenceCommand = recurrenceRule
      ? `
        set recurrence of newEvent to "${escapeAppleScriptString(
          recurrenceRule
        )}"
`
      : "";

    const script = `
tell application "Calendar"

    set targetCalendar to calendar "${safeCalendar}"

${startDateCommands}

${endDateCommands}

    tell targetCalendar

        set newEvent to make new event with properties {summary:"${safeTitle}", start date:startDate, end date:endDate${additionalProperties}}

${recurrenceCommand}

        return uid of newEvent

    end tell

end tell
`;

    console.log("[calendar] Creating Apple Calendar event...");

    console.log("[calendar] Recurrence rule:", recurrenceRule || "none");

    execFile(
      "osascript",
      ["-e", script],
      {
        timeout: 15000,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("[calendar] AppleScript create error:", error);

          console.error("[calendar] stderr:", JSON.stringify(stderr));

          reject(new Error(stderr || error.message));

          return;
        }

        const uid = stdout.trim();

        console.log("[calendar] Event created successfully.");

        console.log("[calendar] Event UID:", uid);

        resolve(uid);
      }
    );
  });
}

/**
 * Find an event in the current icalBuddy-backed calendar data.
 *
 * The ID here is intentionally the icalBuddy UID.
 *
 * We use it only to identify which event Angular is referring to.
 * EventKit receives calendar + title + occurrence date instead.
 */
async function findEventById(id) {
  let events = calendarCache.events;

  const cacheIsValid = Date.now() - calendarCache.timestamp < CACHE_DURATION;

  if (!cacheIsValid) {
    const output = await runAppleCalendarRead();

    events = parseAppleCalendarEvents(output);

    calendarCache = {
      events,
      timestamp: Date.now(),
    };
  }

  const event = events.find((currentEvent) => currentEvent.id === id);

  if (!event) {
    throw new Error(`Calendar event not found: ${id}`);
  }

  return event;
}

/**
 * Run CalendarEventKit for an update.
 *
 * EventKit locates the actual event using:
 *
 *   calendar + original title + original occurrence start
 *
 * The API ID is NOT passed to EventKit.
 */
function updateCalendarEventWithEventKit({
  existingEvent,
  calendar,
  title,
  start,
  end,
  location,
  notes,
}) {
  return new Promise((resolve, reject) => {
    const eventKitBinary = `${__dirname}/CalendarEventKit`;

    let occurrenceStart;

    try {
      occurrenceStart = buildLocalDateStringFromISO(existingEvent.start);
    } catch (error) {
      reject(new Error(`Invalid existing event start: ${error.message}`));

      return;
    }

    const payload = {
      calendar,
      title,
      start:
        start !== undefined ? buildLocalDateStringFromISO(start) : undefined,
      end: end !== undefined ? buildLocalDateStringFromISO(end) : undefined,
      location,
      notes,
    };

    const payloadJSON = JSON.stringify(payload);

    console.log("[calendar] Updating event with EventKit...");

    console.log("[calendar] Calendar:", existingEvent.calendar);

    console.log("[calendar] Original title:", existingEvent.title);

    console.log("[calendar] Original occurrence:", occurrenceStart);

    execFile(
      eventKitBinary,
      [
        "update",
        existingEvent.calendar,
        existingEvent.title,
        occurrenceStart,
        payloadJSON,
      ],
      {
        timeout: 15000,
      },
      (error, stdout, stderr) => {
        console.log("[calendar] EventKit stdout:", JSON.stringify(stdout));

        console.log("[calendar] EventKit stderr:", JSON.stringify(stderr));

        if (error) {
          console.error("[calendar] EventKit update error:", error);

          reject(new Error(stderr?.trim() || stdout?.trim() || error.message));

          return;
        }

        console.log("[calendar] Calendar event updated successfully.");

        resolve(existingEvent.id);
      }
    );
  });
}

/**
 * Delete one occurrence using EventKit.
 *
 * Again, the icalBuddy ID is only used to identify
 * the event in our API data.
 */
function deleteCalendarEventOccurrence(existingEvent) {
  return new Promise((resolve, reject) => {
    const eventKitBinary = `${__dirname}/CalendarEventKit`;

    let occurrenceStart;

    try {
      occurrenceStart = buildLocalDateStringFromISO(existingEvent.start);
    } catch (error) {
      reject(new Error(`Invalid occurrence start: ${error.message}`));

      return;
    }

    console.log("[calendar] Deleting Calendar occurrence with EventKit...");

    console.log("[calendar] Calendar:", existingEvent.calendar);

    console.log("[calendar] Title:", existingEvent.title);

    console.log("[calendar] Occurrence:", occurrenceStart);

    execFile(
      eventKitBinary,
      [
        "delete-occurrence",
        existingEvent.calendar,
        existingEvent.title,
        occurrenceStart,
      ],
      {
        timeout: 15000,
      },
      (error, stdout, stderr) => {
        console.log("[calendar] EventKit stdout:", JSON.stringify(stdout));

        console.log("[calendar] EventKit stderr:", JSON.stringify(stderr));

        if (error) {
          console.error("[calendar] EventKit occurrence delete error:", error);

          reject(new Error(stderr?.trim() || stdout?.trim() || error.message));

          return;
        }

        console.log("[calendar] Calendar occurrence deleted successfully.");

        resolve(existingEvent.id);
      }
    );
  });
}

/**
 * Series deletion is intentionally still using Calendar.app
 * for now.
 *
 * We have not yet independently proven a safe EventKit
 * full-series deletion strategy.
 */
function deleteCalendarEvent(id) {
  return new Promise((resolve, reject) => {
    const safeId = escapeAppleScriptString(id);

    const script = `
tell application "Calendar"

    set targetEvent to missing value

    repeat with currentCalendar in every calendar

        try

            set matchingEvents to (every event of currentCalendar whose uid is "${safeId}")

            if (count of matchingEvents) > 0 then
                set targetEvent to item 1 of matchingEvents
                exit repeat
            end if

        end try

    end repeat

    if targetEvent is missing value then
        error "Calendar event not found: ${safeId}"
    end if

    delete targetEvent

    return "${safeId}"

end tell
`;

    console.log("[calendar] Deleting Apple Calendar series:", id);

    execFile(
      "osascript",
      ["-e", script],
      {
        timeout: 15000,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("[calendar] AppleScript series delete error:", error);

          console.error("[calendar] stderr:", JSON.stringify(stderr));

          reject(new Error(stderr || error.message));

          return;
        }

        const uid = stdout.trim();

        console.log("[calendar] Event series deleted successfully:", uid);

        resolve(uid);
      }
    );
  });
}

function clearCalendarCache() {
  calendarCache = {
    events: [],
    timestamp: 0,
  };
}

/*
|--------------------------------------------------------------------------
| GET CALENDAR
|--------------------------------------------------------------------------
*/

app.get("/api/calendar/today", async (req, res) => {
  try {
    const now = Date.now();

    const cacheIsValid = now - calendarCache.timestamp < CACHE_DURATION;

    if (cacheIsValid) {
      return res.json({
        events: calendarCache.events,
        cached: true,
      });
    }

    const output = await runAppleCalendarRead();

    const events = parseAppleCalendarEvents(output);

    console.log(
      `[calendar] Apple Calendar returned ${events.length} event(s).`
    );

    calendarCache = {
      events,
      timestamp: now,
    };

    res.json({
      events,
      cached: false,
    });
  } catch (error) {
    console.error("[calendar] Calendar bridge error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| CREATE
|--------------------------------------------------------------------------
*/

app.post("/api/calendar/events", async (req, res) => {
  try {
    const {
      calendar,
      title,
      start,
      end,
      location = "",
      notes = "",
      recurrence = null,
    } = req.body;

    if (!calendar || !title || !start || !end) {
      return res.status(400).json({
        error: "calendar, title, start, and end are required.",
      });
    }

    const startDate = new Date(start);

    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: "start and end must be valid dates.",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        error: "end must occur after start.",
      });
    }

    if (recurrence) {
      try {
        buildRecurrenceRule(recurrence);
      } catch (error) {
        return res.status(400).json({
          error: error.message,
        });
      }
    }

    const id = await createCalendarEvent({
      calendar,
      title,
      start,
      end,
      location,
      notes,
      recurrence,
    });

    clearCalendarCache();

    res.status(201).json({
      event: {
        id,
        calendar,
        title,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        location,
        notes,
        recurrence,
      },
    });
  } catch (error) {
    console.error("[calendar] Calendar create route error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE
|--------------------------------------------------------------------------
*/

app.put("/api/calendar/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Event ID is required.",
      });
    }

    const { calendar, title, start, end, location, notes } = req.body;

    const hasUpdate =
      calendar !== undefined ||
      title !== undefined ||
      start !== undefined ||
      end !== undefined ||
      location !== undefined ||
      notes !== undefined;

    if (!hasUpdate) {
      return res.status(400).json({
        error: "At least one event field must be provided.",
      });
    }

    if (start !== undefined) {
      const startDate = new Date(start);

      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({
          error: "start must be a valid date.",
        });
      }
    }

    if (end !== undefined) {
      const endDate = new Date(end);

      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: "end must be a valid date.",
        });
      }
    }

    if (start !== undefined && end !== undefined) {
      const startDate = new Date(start);

      const endDate = new Date(end);

      if (endDate <= startDate) {
        return res.status(400).json({
          error: "end must occur after start.",
        });
      }
    }

    /*
     * Find the original event using the icalBuddy ID.
     *
     * This gives us the original title and occurrence
     * date required by EventKit.
     */
    const existingEvent = await findEventById(id);

    const updatedId = await updateCalendarEventWithEventKit({
      existingEvent,
      calendar,
      title,
      start,
      end,
      location,
      notes,
    });

    clearCalendarCache();

    res.json({
      event: {
        id: updatedId,
        ...req.body,
      },
    });
  } catch (error) {
    console.error("[calendar] Calendar update route error:", error);

    if (error.message.includes("Calendar event not found")) {
      return res.status(404).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

app.delete("/api/calendar/events/:id", async (req, res) => {
  const { id } = req.params;
  const mode = req.query.mode || "occurrence";

  try {
    console.log(`[calendar] DELETE request: id=${id}, mode=${mode}`);

    /*
     * OCCURRENCE DELETE
     *
     * icalBuddy gives us the API-facing UID.
     * EventKit is then responsible for finding the actual
     * Calendar event using calendar + title + occurrence start.
     */
    if (mode === "occurrence") {
      console.log(`[calendar] Deleting calendar occurrence: ${id}`);

      const existingEvent = await findEventById(id);

      if (!existingEvent) {
        return res.status(404).json({
          error: `Calendar event not found: ${id}`,
        });
      }

      console.log(
        `[calendar] Found occurrence: "${existingEvent.title}" ` +
          `on ${existingEvent.calendar} at ${existingEvent.start}`
      );

      await deleteCalendarEventOccurrence(existingEvent);

      clearCalendarCache();

      return res.json({
        success: true,
        id,
        mode: "occurrence",
      });
    }

    /*
     * SERIES DELETE
     *
     * Keep the existing AppleScript implementation for now.
     * We have not yet replaced/proven full-series deletion through EventKit.
     */
    console.log(`[calendar] Deleting Apple Calendar series: ${id}`);

    const deletedId = await deleteCalendarEvent(id);

    clearCalendarCache();

    return res.json({
      success: true,
      id: deletedId,
      mode: "series",
    });
  } catch (error) {
    console.error("[calendar] Calendar delete route error:", error);

    res.status(500).json({
      error: error.message || "Failed to delete calendar event",
    });
  }
});

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.listen(PORT, () => {
  console.log(`Calendar bridge running at http://localhost:${PORT}`);
});
