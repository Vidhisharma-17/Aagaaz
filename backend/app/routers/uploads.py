from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Header, HTTPException, UploadFile

from app.core.supabase_client import supabase
from app.routers.jobs import get_current_user


router = APIRouter(
    prefix="/api/uploads",
    tags=["Uploads"],
)


ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/cleanup-image")
async def upload_cleanup_image(
    application_id: str,
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    user = get_current_user(authorization)

    try:
        application_response = (
            supabase
            .table("job_applications")
            .select("*")
            .eq("id", application_id)
            .eq("user_id", user.id)
            .limit(1)
            .execute()
        )

        if not application_response.data:
            raise HTTPException(
                status_code=404,
                detail="Job application not found.",
            )

        application = application_response.data[0]

        if application["status"] != "accepted":
            raise HTTPException(
                status_code=409,
                detail="This job is not available for submission.",
            )

        deadline = datetime.fromisoformat(
            application["submission_deadline"].replace(
                "Z",
                "+00:00",
            )
        )

        if datetime.now(timezone.utc) > deadline:
            raise HTTPException(
                status_code=410,
                detail="The 24-hour submission deadline has expired.",
            )

        extension = Path(
            file.filename or ""
        ).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, JPEG, PNG and WEBP images are allowed.",
            )

        file_content = await file.read()

        if not file_content:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty.",
            )

        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image size must not exceed 10 MB.",
            )

        file_path = (
            f"{user.id}/"
            f"{application_id}/"
            f"{uuid4().hex}{extension}"
        )

        supabase.storage.from_(
            "cleanup-images"
        ).upload(
            path=file_path,
            file=file_content,
            file_options={
                "content-type": (
                    file.content_type
                    or "application/octet-stream"
                ),
                "upsert": "false",
            },
        )

        image_url = (
            supabase
            .storage
            .from_("cleanup-images")
            .get_public_url(file_path)
        )

        submission_data = {
            "application_id": application_id,
            "user_id": user.id,
            "image_path": file_path,
            "image_url": image_url,
            "status": "submitted",
            "submitted_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        submission_response = (
            supabase
            .table("work_submissions")
            .insert(submission_data)
            .execute()
        )

        if not submission_response.data:
            supabase.storage.from_(
                "cleanup-images"
            ).remove([file_path])

            raise HTTPException(
                status_code=500,
                detail="Work submission could not be saved.",
            )

        return {
            "success": True,
            "message": "Cleanup image uploaded successfully.",
            "submission": submission_response.data[0],
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to upload cleanup image: {str(error)}",
        )