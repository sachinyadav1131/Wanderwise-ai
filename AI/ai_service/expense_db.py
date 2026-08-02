"""Small, dependency-free SQLite ledger for trip expenses."""
import sqlite3
from collections import defaultdict
from pathlib import Path

DB_PATH = Path(__file__).with_name("expenses.db")


def _connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0),
        category TEXT NOT NULL,
        subcategory TEXT DEFAULT '',
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    return conn


def init_db():
    conn = _connection()
    try:
        conn.commit()
    finally:
        conn.close()
    return DB_PATH


def add_expense(trip_id, date, amount, category, subcategory="", note=""):
    amount_value = float(amount)
    conn = _connection()
    try:
        cur = conn.execute(
            "INSERT INTO expenses (trip_id,date,amount,category,subcategory,note) VALUES (?,?,?,?,?,?)",
            (trip_id, date, amount_value, category, subcategory, note),
        )
        conn.commit()
        return {
            "id": cur.lastrowid,
            "trip_id": trip_id,
            "amount": amount_value,
            "category": category,
        }
    finally:
        conn.close()


def get_expense_summary(trip_id, planned_budget=0):
    conn = _connection()
    try:
        rows = conn.execute(
            "SELECT date, category, amount FROM expenses WHERE trip_id=? ORDER BY date",
            (trip_id,),
        ).fetchall()
    finally:
        conn.close()

    total = sum(float(row["amount"]) for row in rows)
    categories = defaultdict(float)
    days = defaultdict(float)
    for row in rows:
        categories[row["category"]] += float(row["amount"])
        days[row["date"]] += float(row["amount"])

    budget = float(planned_budget or 0)
    return {
        "trip_id": trip_id,
        "total_spent": round(total, 2),
        "planned_budget": budget,
        "remaining_budget": round(budget - total, 2),
        "budget_percent": round((total / budget * 100) if budget else 0, 1),
        "by_category": dict(categories),
        "by_day": dict(days),
        "expense_count": len(rows),
    }


def summarize_expenses(trip_id, planned_budget=0):
    return get_expense_summary(trip_id, planned_budget=planned_budget)
