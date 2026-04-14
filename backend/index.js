const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Serve React frontend
app.use(express.static(path.join(__dirname, "../frontend/build")));

// ── GET all notes ──────────────────────────────────────────
app.get("/notes", (req, res) => {
  const { search } = req.query;
  let sql, params;

  if (search && search.trim()) {
    sql = `SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC`;
    params = [`%${search}%`, `%${search}%`];
  } else {
    sql = `SELECT * FROM notes ORDER BY updated_at DESC`;
    params = [];
  }

  db.all(sql, params, (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows });
  });
});

// ── GET single note ─────────────────────────────────────────
app.get("/notes/:id", (req, res) => {
  db.get(`SELECT * FROM notes WHERE id = ?`, [req.params.id], (err, row) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (!row)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, data: row });
  });
});

// ── POST create note ────────────────────────────────────────
app.post("/notes", (req, res) => {
  const { title = "Untitled", content = "" } = req.body;
  db.run(
    `INSERT INTO notes (title, content) VALUES (?, ?)`,
    [title, content],
    function (err) {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      db.get(`SELECT * FROM notes WHERE id = ?`, [this.lastID], (err, row) => {
        if (err)
          return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({ success: true, data: row });
      });
    },
  );
});

// ── PUT update note ─────────────────────────────────────────
app.put("/notes/:id", (req, res) => {
  const { title, content } = req.body;
  const id = req.params.id;

  db.get(`SELECT * FROM notes WHERE id = ?`, [id], (err, existing) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });

    // Save version
    db.run(
      `INSERT INTO note_versions (note_id, title, content) VALUES (?, ?, ?)`,
      [existing.id, existing.title, existing.content],
    );

    const newTitle = title ?? existing.title;
    const newContent = content ?? existing.content;

    db.run(
      `UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newTitle, newContent, id],
      (err) => {
        if (err)
          return res.status(500).json({ success: false, message: err.message });
        db.get(`SELECT * FROM notes WHERE id = ?`, [id], (err, row) => {
          if (err)
            return res
              .status(500)
              .json({ success: false, message: err.message });
          res.json({ success: true, data: row });
        });
      },
    );
  });
});

// ── DELETE note ─────────────────────────────────────────────
app.delete("/notes/:id", (req, res) => {
  db.run(`DELETE FROM notes WHERE id = ?`, [req.params.id], function (err) {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (this.changes === 0)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, message: "Note deleted" });
  });
});

// ── GET version history ─────────────────────────────────────
app.get("/notes/:id/versions", (req, res) => {
  db.all(
    `SELECT * FROM note_versions WHERE note_id = ? ORDER BY saved_at DESC LIMIT 20`,
    [req.params.id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, data: rows });
    },
  );
});

// ── Catch-all → React app ───────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
