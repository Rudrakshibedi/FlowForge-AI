"""FastAPI application entrypoint.

Run with: uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes_artifacts import router as artifacts_router
from backend.api.routes_chat import router as chat_router
from backend.api.routes_execute import router as execute_router
from backend.api.routes_health import router as health_router
from backend.api.routes_logs import router as logs_router
from backend.api.routes_workflow import router as workflow_router
from backend.config.logging_config import configure_logging, get_logger
from backend.config.settings import get_settings

import os


settings = get_settings()
configure_logging(settings.log_level, buffer_size=settings.log_buffer_size)
logger = get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    description="Phase 1 foundation for a modular multi-agent SDLC platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception", extra={"extra_fields": {"path": str(request.url)}})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(chat_router, prefix=settings.api_prefix)
app.include_router(execute_router, prefix=settings.api_prefix)
app.include_router(workflow_router, prefix=settings.api_prefix)
app.include_router(artifacts_router, prefix=settings.api_prefix)
app.include_router(logs_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict:
    return {"message": f"{settings.app_name} API is running. See /docs for the API reference."}
