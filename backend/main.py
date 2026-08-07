"""MITRA API — application entry point.

Run: uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import router
from app.core.config import settings

# Log format carries a request id and never a citizen identifier or document field.
# See SECURITY.md §5 — PII in logs is a hard prohibition, not a guideline.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("mitra")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "MITRA — Multilingual Intelligent Technology for Responsive Assistance.\n\n"
        "Eligibility reasoning, cross-document verification and the conversational "
        "assistant, exposed as a REST API. All reasoning is deterministic and runs "
        "locally: **no API keys and no external calls are required**.\n\n"
        "The scheme catalogue is generated from `frontend/lib/schemes.ts` into "
        "`shared/schemes.json`, so the app and the API can never disagree about a "
        "citizen's entitlement."
    ),
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Attaches a request id, times the request and sets security headers."""
    request_id = str(uuid.uuid4())[:8]
    started = time.perf_counter()

    response = await call_next(request)

    duration_ms = round((time.perf_counter() - started) * 1000, 1)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Path and status only — query strings can carry personal detail.
    logger.info(
        "%s %s %s %sms [%s]",
        request.method, request.url.path, response.status_code, duration_ms, request_id,
    )
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Consistent envelope for every error: {data, error, meta}."""
    detail = exc.detail
    if isinstance(detail, dict):
        error = {"code": detail.get("code", "ERROR"), "message": detail.get("message", "")}
    else:
        error = {"code": "ERROR", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content={"data": None, "error": error, "meta": {}})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Field-level validation errors, structured so the client can localise them."""
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", []) if p not in ("body",))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": first.get("msg", "The request was not valid."),
                "field": field or None,
            },
            "meta": {"errors": len(exc.errors())},
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Never leak a stack trace to a client. Log it, return a generic message."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "message": "Something went wrong on our side."},
            "meta": {},
        },
    )


app.include_router(router, prefix=settings.API_PREFIX)


@app.get("/", include_in_schema=False)
def root():
    return {
        "data": {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "api": settings.API_PREFIX,
        },
        "error": None,
        "meta": {},
    }
