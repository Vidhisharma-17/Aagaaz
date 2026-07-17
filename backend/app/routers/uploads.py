from fastapi import APIRouter


router = APIRouter(
    prefix="/api/uploads",
    tags=["Uploads"],
)


@router.get("/health")
def uploads_health():

    return {
        "success": True,
        "message": "Uploads router is running.",
    }