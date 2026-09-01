const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3336;

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Only allow simple, safe key names - this key becomes a filename,
// so we don't want anything that could escape the data directory.
const KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

function filePathFor(key) {
  return path.join(DATA_DIR, `${key}.json`);
}

app.get("/api/store/:key", (req, res) => {
  const { key } = req.params;

  if (!KEY_PATTERN.test(key)) {
    return res.status(400).json({ error: "Invalid key" });
  }

  const filePath = filePathFor(key);

  if (!fs.existsSync(filePath)) {
    return res.json({ key, value: null });
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");

    res.json({ key, value: JSON.parse(raw) });
  } catch (error) {
    console.error(`Failed to read ${key}:`, error);

    res.status(500).json({ error: "Failed to read stored data" });
  }
});

app.put("/api/store/:key", (req, res) => {
  const { key } = req.params;

  if (!KEY_PATTERN.test(key)) {
    return res.status(400).json({ error: "Invalid key" });
  }

  if (!("value" in req.body)) {
    return res
      .status(400)
      .json({ error: "Request body must include a 'value' field" });
  }

  const filePath = filePathFor(key);

  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body.value, null, 2));

    res.json({ key, ok: true });
  } catch (error) {
    console.error(`Failed to write ${key}:`, error);

    res.status(500).json({ error: "Failed to save data" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Data bridge running at http://localhost:${PORT}`);
  console.log(`Storing files in ${DATA_DIR}`);
});
