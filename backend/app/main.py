from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.predictions import router as predictions_router
from app.routers.jobs import router as jobs_router
from app.routers.uploads import router as uploads_router
from app.routers.certificates import router as certificates_router
from app.routers.dashboard import router as dashboard_router


# ============================================================
# CREATE FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="EcoVisionAI API",
    description="Backend API for EcoVisionAI Platform",
    version="1.0.0",
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REGISTER ROUTERS
# ============================================================

app.include_router(predictions_router)
app.include_router(jobs_router)
app.include_router(uploads_router)
app.include_router(certificates_router)
app.include_router(dashboard_router)


# ============================================================
# ROOT ROUTE
# ============================================================

@app.get("/")
def root():
    return {
        "success": True,
        "message": "EcoVisionAI Backend is running",
        "version": "1.0.0",
    }



# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "healthy",
        "service": "EcoVisionAI API",
    }