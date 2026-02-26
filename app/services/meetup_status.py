# Meetup status state machine: allowed transitions only.
# RECRUITING -> CONFIRMED, CANCELED
# CONFIRMED -> FINISHED
# FINISHED -> (none)
# CANCELED -> (none)

from typing import Optional

# Allowed target statuses from each current status.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "RECRUITING": {"CONFIRMED", "CANCELED"},
    "CONFIRMED": {"FINISHED"},
    "FINISHED": set(),
    "CANCELED": set(),
}


def check_status_transition(current: str, target: str) -> Optional[str]:
    """
    Validate status transition. Returns None if allowed, else a clear error message for HTTP 409.
    """
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        allowed_str = ", ".join(sorted(allowed)) if allowed else "none"
        return (
            f"Transition from {current} to {target} is not allowed. "
            f"From {current} only allowed: {allowed_str}."
        )
    return None
