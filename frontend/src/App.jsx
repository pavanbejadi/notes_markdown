import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const API = process.env.REACT_APP_API_URL || "/notes";

function formatDate(str) {
  return new Date(str).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [view, setView] = useState("split"); // 'editor' | 'preview' | 'split'
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const debounceRef = useRef(null);
  const isDirty = useRef(false);

  // ── Fetch notes ─────────────────────────────────────────
  const fetchNotes = useCallback(async (q = "") => {
    try {
      const res = await axios.get(
        API + (q ? `?search=${encodeURIComponent(q)}` : ""),
      );
      setNotes(res.data.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // ── Search debounce ──────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => fetchNotes(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchNotes]);

  // ── Select note ──────────────────────────────────────────
  const selectNote = (note) => {
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSaveStatus("");
    isDirty.current = false;
  };

  // ── Create note ──────────────────────────────────────────
  const createNote = async () => {
    const res = await axios.post(API, { title: "Untitled", content: "" });
    const note = res.data.data;
    setNotes((prev) => [note, ...prev]);
    selectNote(note);
  };

  // ── Save note ────────────────────────────────────────────
  const saveNote = useCallback(
    async (t, c) => {
      if (!activeNote) return;
      setSaveStatus("saving");
      try {
        const res = await axios.put(`${API}/${activeNote.id}`, {
          title: t,
          content: c,
        });
        setNotes((prev) =>
          prev.map((n) => (n.id === activeNote.id ? res.data.data : n)),
        );
        setActiveNote(res.data.data);
        setSaveStatus("saved");
        isDirty.current = false;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch (e) {
        setSaveStatus("");
        console.error(e);
      }
    },
    [activeNote],
  );

  // ── Auto-save with debounce ──────────────────────────────
  const handleContentChange = (val) => {
    setContent(val);
    isDirty.current = true;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(title, val), 1500);
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    isDirty.current = true;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(val, content), 1500);
  };

  // ── Delete note ──────────────────────────────────────────
  const deleteNote = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this note?")) return;
    await axios.delete(`${API}/${id}`);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) {
      setActiveNote(null);
      setTitle("");
      setContent("");
    }
  };

  // ── Version history ──────────────────────────────────────
  const openHistory = async () => {
    if (!activeNote) return;
    const res = await axios.get(`${API}/${activeNote.id}/versions`);
    setVersions(res.data.data);
    setShowHistory(true);
  };

  const restoreVersion = (v) => {
    setTitle(v.title);
    setContent(v.content);
    setShowHistory(false);
    isDirty.current = true;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(v.title, v.content), 500);
  };

  return (
    <div className="app">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>
            Mark<span>notes</span>
          </h1>
          <button className="new-note-btn" onClick={createNote}>
            ＋ New Note
          </button>
        </div>
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="notes-list">
          {notes.length === 0 && (
            <div className="no-notes">
              No notes yet.
              <br />
              Create one to get started.
            </div>
          )}
          {notes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${activeNote?.id === note.id ? "active" : ""}`}
              onClick={() => selectNote(note)}
            >
              <div className="note-item-title">{note.title || "Untitled"}</div>
              <div className="note-item-date">
                {formatDate(note.updated_at)}
              </div>
              <div className="note-item-preview">
                {note.content.replace(/[#*`>\-\[\]]/g, "").slice(0, 60)}
              </div>
              <button
                className="note-delete-btn"
                onClick={(e) => deleteNote(e, note.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="main">
        {!activeNote ? (
          <div className="empty-state">
            <h2>No note selected</h2>
            <p>Pick a note from the list or create a new one.</p>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <input
                className="title-input"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Note title…"
              />
              <div className="toolbar-actions">
                <div className="view-toggle">
                  <button
                    className={view === "editor" ? "active" : ""}
                    onClick={() => setView("editor")}
                  >
                    Edit
                  </button>
                  <button
                    className={view === "split" ? "active" : ""}
                    onClick={() => setView("split")}
                  >
                    Split
                  </button>
                  <button
                    className={view === "preview" ? "active" : ""}
                    onClick={() => setView("preview")}
                  >
                    Preview
                  </button>
                </div>
                <button
                  className="history-btn"
                  onClick={openHistory}
                  title="Version History"
                >
                  ⏱ History
                </button>
                <span
                  className={`save-status ${saveStatus === "saving" ? "saving" : ""}`}
                >
                  {saveStatus === "saved"
                    ? "✓ Saved"
                    : saveStatus === "saving"
                      ? "Saving…"
                      : ""}
                </span>
                <button
                  className="save-btn"
                  onClick={() => {
                    clearTimeout(debounceRef.current);
                    saveNote(title, content);
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="editor-area">
              {(view === "editor" || view === "split") && (
                <div className="editor-pane">
                  <textarea
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Write your note in Markdown…&#10;&#10;# Heading&#10;**bold** *italic*&#10;- list item&#10;`code`"
                  />
                </div>
              )}
              {(view === "preview" || view === "split") && (
                <div className="preview-pane">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || "*Nothing to preview yet…*"}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Version History Modal ─────────────────────────── */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Version History</h3>
              <button
                className="modal-close"
                onClick={() => setShowHistory(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {versions.length === 0 ? (
                <div className="no-versions">
                  No versions saved yet. Versions are created each time you
                  save.
                </div>
              ) : (
                versions.map((v) => (
                  <div
                    className="version-item"
                    key={v.id}
                    onClick={() => restoreVersion(v)}
                  >
                    <div className="version-item-title">
                      {v.title || "Untitled"}
                    </div>
                    <div className="version-item-date">
                      {formatDate(v.saved_at)}
                    </div>
                    <div className="version-item-preview">
                      {v.content.slice(0, 80)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
