const DEFAULT_CITY = process.env.EVENTS_CITY || "Dallas";
const DEFAULT_STATE_CODE = process.env.EVENTS_STATE_CODE || "TX";
const DEFAULT_RADIUS_MILES = process.env.EVENTS_RADIUS_MILES || "20";

const CACHE_DURATION = 30 * 60 * 1000;

const cache = new Map();

function cacheKey(params) {
  return JSON.stringify(params);
}

async function fetchEvents(params) {
  const key = cacheKey(params);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return {
      ...cached.data,
      cached: true,
    };
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    throw new Error("TICKETMASTER_API_KEY is not configured.");
  }

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");

  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("city", params.city);
  url.searchParams.set("stateCode", params.stateCode);
  url.searchParams.set("radius", params.radius);
  url.searchParams.set("unit", "miles");
  url.searchParams.set("size", params.size);
  url.searchParams.set("classificationName", params.classificationName);

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

    const priceRange = event.priceRanges?.[0];

    const classification = event.classifications?.[0];

    const image =
      event.images?.find((image) => image.width >= 640)?.url ||
      event.images?.[0]?.url;

    return {
      id: event.id,
      name: event.name,
      url: event.url,

      start: event.dates?.start?.localTime
        ? `${event.dates.start.localDate}T${event.dates.start.localTime}`
        : event.dates?.start?.localDate ?? null,

      status: event.dates?.status?.code ?? null,

      venue: venue?.name ?? null,

      city: venue?.city?.name ?? null,

      address: venue?.address?.line1 ?? venue?.address?.line2 ?? null,

      segment: classification?.segment?.name ?? null,

      genre: classification?.genre?.name ?? null,

      subGenre: classification?.subGenre?.name ?? null,

      image,

      priceMin: priceRange?.min ?? null,

      priceMax: priceRange?.max ?? null,

      currency: priceRange?.currency ?? null,
    };
  });

  const data = {
    events,
    total: json.page?.totalElements ?? events.length,
  };

  cache.set(key, {
    data,
    timestamp: now,
  });

  return {
    ...data,
    cached: false,
  };
}

export default async (request) => {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const url = new URL(request.url);

    const params = {
      city: url.searchParams.get("city") || DEFAULT_CITY,

      stateCode: url.searchParams.get("stateCode") || DEFAULT_STATE_CODE,

      radius: url.searchParams.get("radius") || DEFAULT_RADIUS_MILES,

      size: url.searchParams.get("size") || "40",

      classificationName: url.searchParams.get("classificationName") || "Music",

      keyword: url.searchParams.get("keyword") || "",
    };

    const result = await fetchEvents(params);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Events function error:", error);

    return new Response(
      JSON.stringify({
        error: "Unable to load events right now.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

export const config = {
  path: "/api/events",
};
