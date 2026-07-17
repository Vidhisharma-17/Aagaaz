from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException

from app.core.supabase_client import (
    supabase,
    supabase_admin,
)


router = APIRouter(
    prefix="/api/jobs",
    tags=["Jobs"],
)


def get_current_user(authorization: str | None):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required.",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header.",
        )

    access_token = authorization.replace(
        "Bearer ",
        "",
        1,
    ).strip()

    try:

        response = supabase.auth.get_user(access_token)

        if response.user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token.",
            )

        return response.user

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {error}",
        )


@router.get("")
def get_available_jobs():

    try:

        response = (
            supabase_admin
            .table("jobs")
            .select("*")
            .eq("status", "open")
            .order("created_at", desc=True)
            .execute()
        )

        jobs = response.data or []

        return {
            "success": True,
            "count": len(jobs),
            "jobs": jobs,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load jobs: {error}",
        )


@router.get("/available")
def get_available_jobs_alias():

    return get_available_jobs()


@router.post("/{job_id}/accept")
def accept_job(
    job_id: str,
    authorization: str | None = Header(default=None),
):

    user = get_current_user(authorization)

    try:

        existing = (
            supabase_admin
            .table("job_applications")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "accepted")
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=400,
                detail=(
                    "You already have an active "
                    "cleanup job."
                ),
            )

        job_response = (
            supabase_admin
            .table("jobs")
            .select("*")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )

        if not job_response.data:
            raise HTTPException(
                status_code=404,
                detail="Cleanup job not found.",
            )

        job = job_response.data[0]

        if job.get("status") != "open":
            raise HTTPException(
                status_code=400,
                detail="This cleanup job is not available.",
            )

        application_data = {
            "job_id": job_id,
            "user_id": user.id,
            "status": "accepted",
            "accepted_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        response = (
            supabase_admin
            .table("job_applications")
            .insert(application_data)
            .execute()
        )

        accepted_workers = (
            int(job.get("accepted_workers") or 0) + 1
        )

        update_data = {
            "accepted_workers": accepted_workers,
        }

        if accepted_workers >= int(
            job.get("workers_required") or 1
        ):
            update_data["status"] = "filled"

        (
            supabase_admin
            .table("jobs")
            .update(update_data)
            .eq("id", job_id)
            .execute()
        )

        return {
            "success": True,
            "message": "Cleanup job accepted successfully.",
            "application": (
                response.data[0]
                if response.data
                else application_data
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to accept job: {error}",
        )


@router.get("/my")
def get_my_jobs(
    authorization: str | None = Header(default=None),
):

    user = get_current_user(authorization)

    try:

        response = (
            supabase_admin
            .table("job_applications")
            .select("*, jobs(*)")
            .eq("user_id", user.id)
            .order("accepted_at", desc=True)
            .execute()
        )

        return {
            "success": True,
            "jobs": response.data or [],
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load accepted jobs: {error}",
        )