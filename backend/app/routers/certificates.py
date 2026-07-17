from fastapi import APIRouter


router = APIRouter(
    prefix="/api/certificates",
    tags=["Certificates"],
)


@router.get("/health")
def certificates_health():

    return {
        "success": True,
        "message": "Certificates router is running.",
    }