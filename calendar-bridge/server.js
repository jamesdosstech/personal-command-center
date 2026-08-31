const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

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

const scriptPath = path.join(__dirname, "calendar.applescript");

function runCalendarScript() {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    execFile(
      "osascript",
      [scriptPath],
      {
        timeout: 60000,
      },
      (error, stdout, stderr) => {
        const duration = Date.now() - start;

        console.log(`Calendar AppleScript completed in ${duration}ms`);

        if (error) {
          console.error("Calendar error:", error);
          console.error("stdout:", JSON.stringify(stdout));
          console.error("stderr:", JSON.stringify(stderr));

          reject(new Error(stderr || error.message));

          return;
        }

        resolve(stdout);
      }
    );
  });
}

function parseAppleDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Unable to parse Apple Calendar date: ${dateString}`);
  }

  return date.toISOString();
}

function parseEvents(output) {
  if (!output.trim()) {
    return [];
  }

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      const [calendar, title, start, end, location] = line.split("|");

      return {
        id: `${calendar}-${index}-${start}`,

        title,

        start: parseAppleDate(start),

        end: parseAppleDate(end),

        location: location || undefined,

        calendar,
      };
    });
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

    const output = await runCalendarScript();

    const events = parseEvents(output);

    calendarCache = {
      events,
      timestamp: now,
    };

    res.json({
      events,
      cached: false,
    });
  } catch (error) {
    console.error("Calendar bridge error:", error);

    res.status(500).json({
      error: "Unable to read Apple Calendar.",
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
