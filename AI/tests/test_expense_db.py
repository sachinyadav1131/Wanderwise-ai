import sys
import tempfile
import unittest
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ROOT))

from ai_service import expense_db


class ExpenseDbTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        expense_db.DB_PATH = Path(self.temp_dir.name) / "expenses.db"
        expense_db.init_db()

    def test_add_and_summarize_expense(self):
        result = expense_db.add_expense(
            "trip-1",
            "2026-08-01",
            120.5,
            "Food",
            "Lunch",
            "Lunch with team",
        )

        self.assertEqual(result["trip_id"], "trip-1")
        self.assertEqual(result["category"], "Food")

        summary = expense_db.get_expense_summary("trip-1")
        self.assertEqual(summary["total_spent"], 120.5)
        self.assertEqual(summary["expense_count"], 1)
        self.assertEqual(summary["by_category"]["Food"], 120.5)
        self.assertEqual(summary["by_day"]["2026-08-01"], 120.5)
