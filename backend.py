from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path


def db_file(context) -> Path:
    return Path(context["app_dir"]) / "sop_database.db"


def init_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS revisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            data TEXT,
            author TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def latest_revision(path: Path):
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    cursor.execute("SELECT data, id FROM revisions ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {"status": "empty"}
    return {"status": "success", "data": json.loads(row[0]), "timestamp": row[1]}


def save_revision(path: Path, payload):
    data = payload.get("data")
    if data is None:
        return {"status": "error", "message": "No data provided."}
    author = payload.get("author", "ROOTS_Intranet")
    timestamp = payload.get(
        "timestamp", datetime.now().strftime("%d.%m.%Y - %H:%M:%S")
    )
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO revisions (timestamp, data, author) VALUES (?, ?, ?)",
        (timestamp, json.dumps(data), author),
    )
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Gespeichert"}


def history(path: Path):
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, timestamp, author FROM revisions ORDER BY id DESC LIMIT 50"
    )
    rows = cursor.fetchall()
    conn.close()
    return {
        "status": "success",
        "history": [
            {"id": row[0], "timestamp": row[1], "author": row[2] or "Unbekannt"}
            for row in rows
        ],
    }


def load_revision(path: Path, payload):
    revision_id = payload.get("revision_id")
    if revision_id is None:
        return {"status": "error", "message": "revision_id is required."}
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM revisions WHERE id = ?", (revision_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {"status": "error", "message": "Revision nicht gefunden"}
    return {"status": "success", "data": json.loads(row[0])}


def handle_tool_request(payload, context):
    payload = payload or {}
    path = db_file(context)
    init_db(path)
    action = payload.get("action", "latest")

    if action == "latest":
        return latest_revision(path)
    if action == "save":
        return save_revision(path, payload)
    if action == "history":
        return history(path)
    if action == "load":
        return load_revision(path, payload)
    if action == "ping":
        return {
            "status": "success",
            "message": "SOP runtime is online.",
            "db_file": str(path),
        }
    return {"status": "error", "message": f"Unknown action: {action}"}
