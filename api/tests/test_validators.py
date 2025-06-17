# api/tests/test_validators.py

from api.backend import is_valid_url, is_valid_domain


def test_valid_url():
    assert is_valid_url("https://example.com")
    assert is_valid_url("http://google.com")
    assert not is_valid_url("ftp://invalid.com")
    assert not is_valid_url("invalid")

def test_valid_domain():
    assert is_valid_domain("example.com")
    assert is_valid_domain("sub.domain.co.in")
    assert not is_valid_domain("localhost")
    assert not is_valid_domain("bad_domain")
