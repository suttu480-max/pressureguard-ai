"""
PressureGuard AI — Backend API
FastAPI application for pressure ulcer risk prediction and smart alert system.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import FRONTEND_URL, APP_PORT, APP_ENV
from routers import auth, patients, alerts, dashboard
from services.alert_scheduler import alert_scheduler_loop

# ── App Lifespan (startup/shutdown) ───────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on startup, clean up on shutdown."""
    # Start the alert scheduler as a background task
    scheduler_task = asyncio.create_task(alert_scheduler_loop())
    print("[App] Alert scheduler started")
    yield
    # Cancel the scheduler on shutdown
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        print("[App] Alert scheduler stopped")

# ── App Initialization ────────────────────────────────

app = FastAPI(
    title="PressureGuard AI API",
    description="AI-Based Dynamic Pressure Ulcer Risk Prediction & Smart Alert System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# ── CORS Middleware ───────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "*",  # Allow all origins for deployment
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ─────────────────────────────────

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)


# ── Root Endpoint ─────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "PressureGuard AI API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "environment": APP_ENV
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ── Run Server ────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=APP_PORT,
        reload=True if APP_ENV == "development" else False
    )

