from fastapi import APIRouter, Header, HTTPException

from app.core.supabase_client import supabase_admin
from app.routers.jobs import get_current_user


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


@router.get("/me")
def get_user_dashboard(
    authorization: str | None = Header(default=None),
):

    user = get_current_user(authorization)

    try:

        profile_response = (
            supabase_admin
            .table("profiles")
            .select("*")
            .eq("id", user.id)
            .limit(1)
            .execute()
        )

        profile = (
            profile_response.data[0]
            if profile_response.data
            else None
        )

        predictions_response = (
            supabase_admin
            .table("predictions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )

        predictions = predictions_response.data or []

        applications_response = (
            supabase_admin
            .table("job_applications")
            .select("*, jobs(*)")
            .eq("user_id", user.id)
            .order("accepted_at", desc=True)
            .execute()
        )

        applications = applications_response.data or []

        submissions_response = (
            supabase_admin
            .table("work_submissions")
            .select("*")
            .eq("user_id", user.id)
            .order("submitted_at", desc=True)
            .execute()
        )

        submissions = submissions_response.data or []

        rewards_response = (
            supabase_admin
            .table("rewards")
            .select("*")
            .eq("user_id", user.id)
            .execute()
        )

        rewards = rewards_response.data or []

        certificates_response = (
            supabase_admin
            .table("certificates")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )

        certificates = certificates_response.data or []

        total_predictions = len(predictions)
        total_jobs_accepted = len(applications)

        completed_jobs = sum(
            1
            for application in applications
            if application.get("status") == "completed"
        )

        active_jobs = sum(
            1
            for application in applications
            if application.get("status") == "accepted"
        )

        total_rewards = round(
            sum(
                float(reward.get("amount", 0) or 0)
                for reward in rewards
            ),
            2,
        )

        total_waste_collected = round(
            sum(
                float(
                    certificate.get(
                        "waste_collected_kg",
                        0,
                    ) or 0
                )
                for certificate in certificates
            ),
            2,
        )

        return {
            "success": True,

            "user": {
                "id": user.id,
                "email": user.email,
                "profile": profile,
            },

            "statistics": {
                "total_predictions": total_predictions,
                "total_jobs_accepted": total_jobs_accepted,
                "active_jobs": active_jobs,
                "completed_jobs": completed_jobs,
                "total_submissions": len(submissions),
                "total_certificates": len(certificates),
                "total_rewards": total_rewards,
                "total_waste_collected_kg":
                    total_waste_collected,
            },

            "prediction_history": predictions,
            "work_history": applications,
            "submissions": submissions,
            "rewards": rewards,
            "certificates": certificates,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load dashboard: {error}",
        )