"""Authentication, authorisation and rate limiting.

The central design decision: citizen and admin tokens are signed with DIFFERENT
secrets and carry DIFFERENT audiences. A citizen token presented to an admin route is
not merely unauthorised — its signature cannot be verified at all. Token confusion
between the two planes is impossible by construction rather than by a role check
somebody might forget. See SECURITY.md §2.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

Plane = Literal["citizen", "admin"]

_bearer = HTTPBearer(auto_error=False)


@dataclass
class Principal:
    subject: str
    plane: Plane
    role: str
    name: str
    district: str | None = None


# ─── Tokens ──────────────────────────────────────────────────────────────────


def _secret_for(plane: Plane) -> str:
    return settings.JWT_CITIZEN_SECRET if plane == "citizen" else settings.JWT_ADMIN_SECRET


def _audience_for(plane: Plane) -> str:
    return settings.AUDIENCE_CITIZEN if plane == "citizen" else settings.AUDIENCE_ADMIN


def create_access_token(
    subject: str, plane: Plane, role: str, name: str, district: str | None = None
) -> tuple[str, int]:
    expires_in = settings.JWT_ACCESS_TTL_MINUTES * 60
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "aud": _audience_for(plane),
        "role": role,
        "name": name,
        "district": district,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    token = jwt.encode(payload, _secret_for(plane), algorithm=settings.JWT_ALGORITHM)
    return token, expires_in


def decode_token(token: str, plane: Plane) -> Principal:
    try:
        payload = jwt.decode(
            token,
            _secret_for(plane),
            algorithms=[settings.JWT_ALGORITHM],
            audience=_audience_for(plane),
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Your session has expired. Please sign in again."},
        )
    except jwt.InvalidTokenError:
        # Deliberately identical for a bad signature, a wrong audience and a malformed
        # token. Distinguishing them tells an attacker which plane they hit.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "NOT_AUTHENTICATED", "message": "Authentication is required."},
        )

    return Principal(
        subject=payload["sub"],
        plane=plane,
        role=payload.get("role", ""),
        name=payload.get("name", ""),
        district=payload.get("district"),
    )


# ─── Password hashing ────────────────────────────────────────────────────────
#
# Argon2id is the production choice (see SECURITY.md). The prototype uses PBKDF2 from
# the standard library so the backend runs with no native build step — the interface is
# identical, so swapping it is a one-function change.


def hash_password(password: str, *, salt: bytes | None = None) -> str:
    salt = salt or b"mitra-prototype-salt"
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return digest.hex()


def verify_password(password: str, expected_hash: str) -> bool:
    # Constant-time comparison: a timing difference here leaks the hash byte by byte.
    return hmac.compare_digest(hash_password(password), expected_hash)


# ─── Rate limiting ───────────────────────────────────────────────────────────
#
# In-memory sliding window. Redis-backed in production so limits hold across
# horizontally scaled instances — an in-memory limiter on three replicas is a limit of
# 3x what you configured.

_buckets: dict[str, list[float]] = defaultdict(list)


def rate_limit(key: str, limit: int, window_seconds: int) -> bool:
    now = time.time()
    cutoff = now - window_seconds
    bucket = [t for t in _buckets[key] if t > cutoff]
    if len(bucket) >= limit:
        _buckets[key] = bucket
        return False
    bucket.append(now)
    _buckets[key] = bucket
    return True


def enforce_rate_limit(request: Request, name: str, limit: int, window_seconds: int) -> None:
    client = request.client.host if request.client else "unknown"
    if not rate_limit(f"{name}:{client}", limit, window_seconds):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "RATE_LIMITED", "message": "Too many requests. Please wait and try again."},
        )


# ─── Dependencies ────────────────────────────────────────────────────────────


def _extract(creds: HTTPAuthorizationCredentials | None) -> str:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "NOT_AUTHENTICATED", "message": "Authentication is required."},
        )
    return creds.credentials


def require_citizen(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> Principal:
    return decode_token(_extract(creds), "citizen")


def require_admin(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> Principal:
    return decode_token(_extract(creds), "admin")


def require_role(*allowed: str):
    """RBAC on top of admin authentication.

    Authorisation is enforced here, server-side, on every request — never inferred from
    what the UI chose to render. A hidden button is not a permission.
    """

    def dependency(principal: Principal = Depends(require_admin)) -> Principal:
        if principal.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "You do not have access to this resource."},
            )
        return principal

    return dependency
