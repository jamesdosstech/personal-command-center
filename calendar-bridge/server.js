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

function runAppleCalendarRead() {
  return new Promise((resolve, reject) => {
    const script = `
tell application "Calendar"

    set todayDate to current date
    set time of todayDate to 0

    set endDate to todayDate + (7 * days)

    set output to ""

    set calendarNames to {"Work", "Home", "Calendar", "Family"}

    repeat with calendarName in calendarNames

        try

            set currentCalendar to calendar (calendarName as string)

            set matchingEvents to every event of currentCalendar whose start date is greater than or equal to todayDate

            repeat with currentEvent in matchingEvents

                set eventStart to start date of currentEvent

                if eventStart is less than endDate then

                    set eventUID to uid of currentEvent
                    set eventTitle to summary of currentEvent
                    set eventLocation to location of currentEvent
                    set eventNotes to description of currentEvent

                    if eventTitle is missing value then
                        set eventTitle to ""
                    end if

                    if eventLocation is missing value then
                        set eventLocation to ""
                    end if

                    if eventNotes is missing value then
                        set eventNotes to ""
                    end if

                    set startYear to year of eventStart as integer
                    set startMonth to month of eventStart as integer
                    set startDay to day of eventStart as integer
                    set startHour to hours of eventStart as integer
                    set startMinute to minutes of eventStart as integer
                    set startSecond to seconds of eventStart as integer

                    set eventEnd to end date of currentEvent

                    set endYear to year of eventEnd as integer
                    set endMonth to month of eventEnd as integer
                    set endDay to day of eventEnd as integer
                    set endHour to hours of eventEnd as integer
                    set endMinute to minutes of eventEnd as integer
                    set endSecond to seconds of eventEnd as integer

                    set output to output & ¬
                        (eventUID as string) & "|" & ¬
                        (calendarName as string) & "|" & ¬
                        (eventTitle as string) & "|" & ¬
                        (startYear as string) & "|" & ¬
                        (startMonth as string) & "|" & ¬
                        (startDay as string) & "|" & ¬
                        (startHour as string) & "|" & ¬
                        (startMinute as string) & "|" & ¬
                        (startSecond as string) & "|" & ¬
                        (endYear as string) & "|" & ¬
                        (endMonth as string) & "|" & ¬
                        (endDay as string) & "|" & ¬
                        (endHour as string) & "|" & ¬
                        (endMinute as string) & "|" & ¬
                        (endSecond as string) & "|" & ¬
                        (eventLocation as string) & "|" & ¬
                        (eventNotes as string) & linefeed

                end if

            end repeat

        on error errorMessage
            log "Unable to read calendar " & (calendarName as string) & ": " & errorMessage
        end try

    end repeat

    return output

end tell
`;

    console.log("[calendar] Reading Apple Calendar...");
    console.log("[calendar] APPLESCRIPT:");
    console.log(script);

    execFile(
      "osascript",
      ["-e", script],
      {
        timeout: 15000,
      },
      (error, stdout, stderr) => {
        console.log("[calendar] RAW STDOUT:", JSON.stringify(stdout));
        console.log("[calendar] RAW STDERR:", JSON.stringify(stderr));

        if (error) {
          console.error("[calendar] AppleScript read error:", error);
          console.error("[calendar] AppleScript signal:", error.signal);
          console.error(
            "[calendar] AppleScript stderr:",
            JSON.stringify(stderr)
          );

          reject(new Error(stderr || error.message));
          return;
        }

        resolve(stdout);
      }
    );
  });
}

function parseAppleCalendarEvents(output) {
  if (!output.trim()) {
    return [];
  }

  const events = [];

  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.split("|");

    if (parts.length < 17) {
      console.warn("[calendar] Skipping malformed event:", line);
      continue;
    }

    const [
      id,
      calendar,
      title,
      startYear,
      startMonth,
      startDay,
      startHour,
      startMinute,
      startSecond,
      endYear,
      endMonth,
      endDay,
      endHour,
      endMinute,
      endSecond,
      location,
      notes,
    ] = parts;

    const start = buildLocalDateString(
      Number(startYear),
      Number(startMonth),
      Number(startDay),
      Number(startHour),
      Number(startMinute),
      Number(startSecond)
    );

    const end = buildLocalDateString(
      Number(endYear),
      Number(endMonth),
      Number(endDay),
      Number(endHour),
      Number(endMinute),
      Number(endSecond)
    );

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      console.warn("[calendar] Skipping event with invalid dates:", line);
      continue;
    }

    events.push({
      id,
      calendar,
      title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: location || undefined,
      notes: notes || undefined,
    });
  }

  return events;
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

function updateCalendarEvent({
  id,
  calendar,
  title,
  start,
  end,
  location,
  notes,
}) {
  return new Promise((resolve, reject) => {
    const safeId = escapeAppleScriptString(id);

    const safeCalendar =
      calendar !== undefined ? escapeAppleScriptString(calendar) : "";

    const safeTitle = title !== undefined ? escapeAppleScriptString(title) : "";

    const safeLocation =
      location !== undefined ? escapeAppleScriptString(location) : "";

    const safeNotes = notes !== undefined ? escapeAppleScriptString(notes) : "";

    let dateCommands = "";

    if (start !== undefined) {
      const startDate = new Date(start);

      if (Number.isNaN(startDate.getTime())) {
        reject(new Error("start must be a valid date."));
        return;
      }

      dateCommands += buildAppleScriptDateCommands("startDate", startDate);
    }

    if (end !== undefined) {
      const endDate = new Date(end);

      if (Number.isNaN(endDate.getTime())) {
        reject(new Error("end must be a valid date."));
        return;
      }

      dateCommands += buildAppleScriptDateCommands("endDate", endDate);
    }

    const script = `
tell application "Calendar"

    set targetEvent to missing value

    set calendarList to every calendar

    repeat with currentCalendar in calendarList

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

${dateCommands}

${
  calendar !== undefined
    ? `    set targetCalendar to calendar "${safeCalendar}"
    set calendar of targetEvent to targetCalendar
`
    : ""
}

${
  title !== undefined
    ? `    set summary of targetEvent to "${safeTitle}"
`
    : ""
}

${
  start !== undefined
    ? `    set start date of targetEvent to startDate
`
    : ""
}

${
  end !== undefined
    ? `    set end date of targetEvent to endDate
`
    : ""
}

${
  location !== undefined
    ? `    set location of targetEvent to "${safeLocation}"
`
    : ""
}

${
  notes !== undefined
    ? `    set description of targetEvent to "${safeNotes}"
`
    : ""
}

    return uid of targetEvent

end tell
`;

    console.log("[calendar] Updating Apple Calendar event:", id);

    execFile(
      "osascript",
      ["-e", script],
      {
        timeout: 15000,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("[calendar] AppleScript update error:", error);

          console.error("[calendar] stderr:", JSON.stringify(stderr));

          reject(new Error(stderr || error.message));
          return;
        }

        const uid = stdout.trim();

        console.log("[calendar] Event updated successfully.");

        resolve(uid);
      }
    );
  });
}

function deleteCalendarEvent(id) {
  return new Promise((resolve, reject) => {
    const safeId = escapeAppleScriptString(id);

    const script = `
tell application "Calendar"

    set targetEvent to missing value

    set calendarList to every calendar

    repeat with currentCalendar in calendarList

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

end tell
`;

    console.log("[calendar] Deleting Apple Calendar event:", id);

    execFile(
      "osascript",
      ["-e", script],
      {
        timeout: 15000,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("[calendar] AppleScript delete error:", error);

          console.error("[calendar] stderr:", JSON.stringify(stderr));

          reject(new Error(stderr || error.message));
          return;
        }

        console.log("[calendar] Event deleted successfully.");

        resolve();
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

    const updatedId = await updateCalendarEvent({
      id,
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

app.delete("/api/calendar/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Event ID is required.",
      });
    }

    await deleteCalendarEvent(id);

    clearCalendarCache();

    res.json({
      success: true,
      id,
    });
  } catch (error) {
    console.error("[calendar] Calendar delete route error:", error);

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

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.listen(PORT, () => {
  console.log(`Calendar bridge running at http://localhost:${PORT}`);
});
