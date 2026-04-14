const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
const PORT = 5000;
const path = require("path");

app.use(cors());
app.use(bodyParser.json());

// ── GET all notes ──────────────────────────────────────────
app.get("/notes", (req, res) => {
  try {
    const { search } = req.query;
    let notes;

    if (search && search.trim()) {
      notes = db
        .prepare(
          `
        SELECT id, title, content, created_at, updated_at
        FROM notes
        WHERE title LIKE ? OR content LIKE ?
        ORDER BY updated_at DESC
      `,
        )
        .all(`%${search}%`, `%${search}%`);
    } else {
      notes = db
        .prepare(
          `
        SELECT id, title, content, created_at, updated_at
        FROM notes ORDER BY updated_at DESC
      `,
        )
        .all();
    }

    res.json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET single note ─────────────────────────────────────────
app.get("/notes/:id", (req, res) => {
  try {
    const note = db
      .prepare("SELECT * FROM notes WHERE id = ?")
      .get(req.params.id);
    if (!note)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST create note ────────────────────────────────────────
app.post("/notes", (req, res) => {
  try {
    const { title = "Untitled", content = "" } = req.body;
    const result = db
      .prepare(
        `
      INSERT INTO notes (title, content) VALUES (?, ?)
    `,
      )
      .run(title, content);

    const note = db
      .prepare("SELECT * FROM notes WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT update note ─────────────────────────────────────────
app.put("/notes/:id", (req, res) => {
  try {
    const { title, content } = req.body;
    const existing = db
      .prepare("SELECT * FROM notes WHERE id = ?")
      .get(req.params.id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });

    // Save version before updating
    db.prepare(
      `
      INSERT INTO note_versions (note_id, title, content) VALUES (?, ?, ?)
    `,
    ).run(existing.id, existing.title, existing.content);

    db.prepare(
      `
      UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `,
    ).run(title ?? existing.title, content ?? existing.content, req.params.id);

    const updated = db
      .prepare("SELECT * FROM notes WHERE id = ?")
      .get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE note ─────────────────────────────────────────────
app.delete("/notes/:id", (req, res) => {
  try {
    const existing = db
      .prepare("SELECT * FROM notes WHERE id = ?")
      .get(req.params.id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });

    db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET version history ─────────────────────────────────────
app.get("/notes/:id/versions", (req, res) => {
  try {
    const versions = db
      .prepare(
        `
      SELECT * FROM note_versions WHERE note_id = ? ORDER BY saved_at DESC LIMIT 20
    `,
      )
      .all(req.params.id);
    res.json({ success: true, data: versions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
