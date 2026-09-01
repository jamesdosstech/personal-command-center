require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3334;

const API_KEY = process.env.TICKETMASTER_API_KEY;

const DISCOVERY_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

// Defaults tuned for "local Dallas music/art events" rather than
// national arena tours - narrow city + a generous size so smaller
// club/venue shows aren't crowded out of the first page.
const DEFAULT_CITY = process.env.EVENTS_CITY || "Dallas";
const DEFAULT_STATE = process.env.EVENTS_STATE_CODE || "TX";
const DEFAULT_RADIUS_MILES = process.env.EVENTS_RADIUS_MILES || "20";

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - keeps us well under the 5,000/day quota

const cache = new Map();

app.use(
  cors({
    origin: "http://localhost:4200",
  })
);

function cacheKey(params) {
  return JSON.stringify(params);
}

async function fetchEvents(params) {
  const key = cacheKey(params);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return { ...cached.data, cached: true };
  }

  const url = new URL(DISCOVERY_URL);

  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("city", params.city);
  url.searchParams.set("stateCode", params.stateCode);
  url.searchParams.set("radius", params.radius);
  url.searchParams.set("unit", "miles");
  url.searchParams.set("sort", "date,asc");
  url.searchParams.set("size", params.size);

  if (params.classificationName) {
    url.searchParams.set("classificationName", params.classificationName);
  }

  if (params.keyword) {
    url.searchParams.set("keyword", params.keyword);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Ticketmaster error ${response.status}: ${body}`);
  }

  const json = await response.json();

  const events = (json._embedded?.events ?? []).map((event) => {
    const venue = event._embedded?.venues?.[0];
    const classification = event.classifications?.[0];
    const priceRange = event.priceRanges?.[0];

    return {
      id: event.id,
      name: event.name,
      url: event.url,
      start: event.dates?.start?.dateTime ?? event.dates?.start?.localDate,
      status: event.dates?.status?.code,
      venue: venue?.name,
      city: venue?.city?.name,
      address: venue?.address?.line1,
      segment: classification?.segment?.name,
      genre: classification?.genre?.name,
      subGenre: classification?.subGenre?.name,
      image:
        event.images?.find((img) => img.ratio === "16_9" && img.width > 500)
          ?.url ?? event.images?.[0]?.url,
      priceMin: priceRange?.min,
      priceMax: priceRange?.max,
      currency: priceRange?.currency,
    };
  });

  const data = {
    events,
    total: json.page?.totalElements ?? events.length,
  };

  cache.set(key, { data, timestamp: now });

  return { ...data, cached: false };
}

app.get("/api/events", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: "TICKETMASTER_API_KEY is not set. Add it to events-bridge/.env",
    });
  }

  try {
    const params = {
      city: req.query.city || DEFAULT_CITY,
      stateCode: req.query.stateCode || DEFAULT_STATE,
      radius: req.query.radius || DEFAULT_RADIUS_MILES,
      size: req.query.size || "40",
      classificationName: req.query.classificationName || "Music",
      keyword: req.query.keyword || undefined,
    };

    const result = await fetchEvents(params);

    res.json(result);
  } catch (error) {
    console.error("Events bridge error:", error);

    res.status(500).json({
      error: "Unable to load events right now.",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(API_KEY),
  });
});

app.listen(PORT, () => {
  console.log(`Events bridge running at http://localhost:${PORT}`);
});
