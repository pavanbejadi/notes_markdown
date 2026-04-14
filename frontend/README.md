# Markdown Notes App

A full-stack Markdown notes application with live split-screen preview, auto-save, search, and version history.

## Tech Stack

- **Frontend**: React.js, react-markdown, axios
- **Backend**: Node.js, Express
- **Database**: SQLite (via better-sqlite3)

## Setup Instructions

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd markdown-notes-app
```

### 2. Start the Backend

```bash
cd backend
npm install
npm start
# Runs on http://localhost:5000
# SQLite DB is auto-created as notes.db
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

## Features

- ✅ Create, edit, delete, list notes
- ✅ Live split-screen Markdown preview
- ✅ Debounced auto-save (1.5s after typing stops)
- ✅ Manual save button
- ✅ Full-text search
- ✅ Version history (restore any past version)
- ✅ Editor / Split / Preview toggle
- ✅ RESTful API with proper status codes

## API Endpoints

| Method | Endpoint            | Description                       |
| ------ | ------------------- | --------------------------------- |
| GET    | /notes              | Get all notes (supports ?search=) |
| GET    | /notes/:id          | Get single note                   |
| POST   | /notes              | Create note                       |
| PUT    | /notes/:id          | Update note                       |
| DELETE | /notes/:id          | Delete note                       |
| GET    | /notes/:id/versions | Get version history               |
