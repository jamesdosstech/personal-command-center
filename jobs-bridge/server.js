require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3335;

const APP_ID = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;

const COUNTRY = process.env.JOBS_COUNTRY || "us";
const DEFAULT_WHERE = process.env.JOBS_WHERE || "Dallas";

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour - Adzuna's free tier is ~1,000 calls/month

const cache = new Map();

app.use(
  cors({
    origin: "http://localhost:4200",
  })
);

function cacheKey(params) {
  return JSON.stringify(params);
}

async function fetchJobs(params) {
  const key = cacheKey(params);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return { ...cached.data, cached: true };
  }

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`);

  url.searchParams.set("app_id", APP_ID);
  url.searchParams.set("app_key", APP_KEY);
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

  cache.set(key, { data, timestamp: now });

  return { ...data, cached: false };
}

app.get("/api/jobs", async (req, res) => {
  if (!APP_ID || !APP_KEY) {
    return res.status(500).json({
      error:
        "ADZUNA_APP_ID / ADZUNA_APP_KEY are not set. Add them to jobs-bridge/.env",
    });
  }

  try {
    const params = {
      what: req.query.what || "",
      where: req.query.where || DEFAULT_WHERE,
      resultsPerPage: req.query.resultsPerPage || "20",
      salaryMin: req.query.salaryMin || undefined,
      sortBy: req.query.sortBy || "date",
    };

    const result = await fetchJobs(params);

    res.json(result);
  } catch (error) {
    console.error("Jobs bridge error:", error);

    res.status(500).json({
      error: "Unable to load jobs right now.",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasCredentials: Boolean(APP_ID && APP_KEY),
  });
});

app.listen(PORT, () => {
  console.log(`Jobs bridge running at http://localhost:${PORT}`);
});
