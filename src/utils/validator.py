"""Input validation utilities."""

def validate_email(email: str) -> bool:
    """Validate an email address format."""
    if not email or "@" not in email:
        return False
    local, domain = email.split("@", 1)
    return len(local) > 0 and len(domain) > 0 and "." in domain


def validate_age(age: int) -> bool:
    """Validate that age is a reasonable positive number."""
    return isinstance(age, int) and 0 <= age <= 150


def validate_username(username: str) -> bool:
    """Validate username format: alphanumeric, 3-20 chars."""
    if not username or len(username) < 3 or len(username) > 20:
        return False
    return username.isalnum()


def sanitize_input(text: str) -> str:
    """Sanitize user input by stripping whitespace."""
    return text.strip() if text else ""
