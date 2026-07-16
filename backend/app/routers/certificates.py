from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.core.supabase_client import supabase
from app.routers.jobs import get_current_user
from app.services.certificate_service import create_certificate


router = APIRouter(
    prefix="/api/certificates",
    tags=["Certificates"],
)


class CertificateCreateRequest(BaseModel):
    application_id: str
    waste_collected_kg: float = Field(gt=0)


@router.post("/generate")
def generate_certificate(
    request: CertificateCreateRequest,
    authorization: str | None = Header(default=None),
):
    user = get_current_user(authorization)

    try:
        # Get user's accepted job application
        application_response = (
            supabase
            .table("job_applications")
            .select("*")
            .eq("id", request.application_id)
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

        # Verify cleanup work was submitted
        submission_response = (
            supabase
            .table("work_submissions")
            .select("*")
            .eq("application_id", application["id"])
            .eq("user_id", user.id)
            .order("submitted_at", desc=True)
            .limit(1)
            .execute()
        )

        if not submission_response.data:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Upload cleanup evidence before "
                    "generating a certificate."
                ),
            )

        # Get related cleanup job
        job_response = (
            supabase
            .table("jobs")
            .select("*")
            .eq("id", application["job_id"])
            .limit(1)
            .execute()
        )

        if not job_response.data:
            raise HTTPException(
                status_code=404,
                detail="Related cleanup job not found.",
            )

        job = job_response.data[0]

        # Prevent duplicate certificates
        existing_certificate = (
            supabase
            .table("certificates")
            .select("*")
            .eq("application_id", application["id"])
            .eq("user_id", user.id)
            .limit(1)
            .execute()
        )

        if existing_certificate.data:
            return {
                "success": True,
                "message": "Certificate already generated.",
                "certificate": existing_certificate.data[0],
            }

        reward_amount = round(
            request.waste_collected_kg
            * float(job["reward_per_worker"]),
            2,
        )

        certificate_result = create_certificate(
            user=user,
            application=application,
            job=job,
            waste_collected_kg=request.waste_collected_kg,
            reward_amount=reward_amount,
        )

        certificate_data = {
            "application_id": application["id"],
            "user_id": user.id,
            "certificate_path": certificate_result[
                "certificate_path"
            ],
            "certificate_url": certificate_result[
                "certificate_url"
            ],
            "waste_collected_kg": request.waste_collected_kg,
            "reward_amount": reward_amount,
        }

        certificate_response = (
            supabase
            .table("certificates")
            .insert(certificate_data)
            .execute()
        )

        if not certificate_response.data:
            raise HTTPException(
                status_code=500,
                detail="Certificate record could not be saved.",
            )

        # Record reward
        reward_data = {
            "application_id": application["id"],
            "user_id": user.id,
            "amount": reward_amount,
            "status": "earned",
        }

        supabase.table("rewards").insert(
            reward_data
        ).execute()

        # Mark application completed
        (
            supabase
            .table("job_applications")
            .update({"status": "completed"})
            .eq("id", application["id"])
            .execute()
        )

        return {
            "success": True,
            "message": "Certificate generated successfully.",
            "certificate": certificate_response.data[0],
            "reward_amount": reward_amount,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to generate certificate: {str(error)}"
            ),
        )