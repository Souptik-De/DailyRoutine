from datetime import date, timedelta
from app.services.completions import get_all_completions_dict


def calculate_streak(habit_id: str) -> dict:
    """
    Calculate current streak and longest streak for a habit.
    Reads all completion docs and computes streaks based on consecutive days.
    """
    comp_dict = get_all_completions_dict()

    completed_dates = set()
    for date_str, completed_ids in comp_dict.items():
        if habit_id in completed_ids:
            try:
                d = date.fromisoformat(date_str)
                completed_dates.add(d)
            except ValueError:
                pass

    if not completed_dates:
        return {"current_streak": 0, "longest_streak": 0}

    sorted_dates = sorted(completed_dates)

    # Calculate longest streak
    longest = 1
    current_run = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            current_run += 1
            longest = max(longest, current_run)
        else:
            current_run = 1

    # Calculate current streak (backward from today)
    today = date.today()
    current_streak = 0
    check_date = today

    # Allow grace: if today not yet checked, start from yesterday
    if today not in completed_dates:
        check_date = today - timedelta(days=1)

    while check_date in completed_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    return {"current_streak": current_streak, "longest_streak": longest}
