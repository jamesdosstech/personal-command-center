const COUNTRY = process.env.JOBS_COUNTRY || "us";
const DEFAULT_WHERE = process.env.JOBS_WHERE || "Dallas";

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const cache = new Map();

function cacheKey(params) {
  return JSON.stringify(params);
}

async function fetchJobs(params) {
  const key = cacheKey(params);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return {
      ...cached.data,
      cached: true,
    };
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY are not configured.");
  }

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`);

  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", params.resultsPerPage);
  url.searchParams.set("what", params.what);
  url.searchParams.set("where", params.where);
  url.searchParams.set("content-type", "application/json");

  if (params.salaryMin) {
    url.searchParams.set("salary_min", params.salaryMin);
  }

  if (params.sortBy) {
    url.searchParams.set("sort_by", params.sortBy);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Adzuna error ${response.status}: ${body}`);
  }

  const json = await response.json();

  const jobs = (json.results ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company?.display_name,
    location: job.location?.display_name,
    url: job.redirect_url,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    salaryIsPredicted: job.salary_is_predicted === "1",
    category: job.category?.label,
    description: job.description,
    created: job.created,
  }));

  const data = {
    jobs,
    total: json.count ?? jobs.length,
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
      what: url.searchParams.get("what") || "",
      where: url.searchParams.get("where") || DEFAULT_WHERE,
      resultsPerPage: url.searchParams.get("resultsPerPage") || "20",
      salaryMin: url.searchParams.get("salaryMin") || undefined,
      sortBy: url.searchParams.get("sortBy") || "date",
    };

    const result = await fetchJobs(params);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Jobs function error:", error);

    return new Response(
      JSON.stringify({
        error: "Unable to load jobs right now.",
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
  path: "/api/jobs",
};
