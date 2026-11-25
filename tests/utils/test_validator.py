"""Tests for input validation utilities."""

from src.utils.validator import validate_email, validate_age, validate_username, sanitize_input


def test_validate_email_valid():
    assert validate_email("user@example.com") is True
    assert validate_email("test@domain.co.uk") is True


def test_validate_email_invalid():
    assert validate_email("") is False
    assert validate_email("no-at-sign") is False
    assert validate_email("@domain.com") is False


def test_validate_age_valid():
    assert validate_age(0) is True
    assert validate_age(25) is True
    assert validate_age(150) is True


def test_validate_age_invalid():
    assert validate_age(-1) is False
    assert validate_age(151) is False
    assert validate_age("twenty") is False


def test_validate_username_valid():
    assert validate_username("user123") is True
    assert validate_username("abc") is True


def test_validate_username_invalid():
    assert validate_username("") is False
    assert validate_username("ab") is False
    assert validate_username("user!name") is False
    assert validate_username("a" * 21) is False


def test_sanitize_input():
    assert sanitize_input("  hello  ") == "hello"
    assert sanitize_input("") == ""
    assert sanitize_input(None) == ""
