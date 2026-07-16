from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException

from app.core.supabase_client import (
    supabase,
    supabase_admin,
)

from app.schemas.job import (
    JobAcceptRequest,
    JobCreateRequest,
)


router = APIRouter(
    prefix="/api/jobs",
    tags=["Jobs"],
)


# ============================================================
# GET CURRENT USER FROM SUPABASE ACCESS TOKEN
# ============================================================

def get_current_user(
    authorization: str | None,
):

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

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Access token is missing.",
        )

    try:

        # Use normal Supabase client for authentication
        response = supabase.auth.get_user(
            access_token
        )

        user = response.user

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token.",
            )

        return user

    except HTTPException:
        raise

    except Exception as error:

        print(
            "Authentication error:",
            error,
        )

        raise HTTPException(
            status_code=401,
            detail="Unable to authenticate user.",
        )


# ============================================================
# CREATE CLEANUP JOB
# ============================================================

@router.post("")
def create_job(
    request: JobCreateRequest,
    authorization: str | None = Header(default=None),
):

    user = get_current_user(
        authorization
    )

    now = datetime.now(
        timezone.utc
    )

    job_data = {

        "prediction_id":
            request.prediction_id,

        "created_by":
            user.id,

        "event_name":
            request.event_name,

        "location":
            request.location,

        "address":
            request.address,

        "predicted_waste":
            request.predicted_waste,

        "pollution_risk":
            request.pollution_risk,

        "workers_required":
            request.workers_required,

        "accepted_workers":
            0,

        "reward_per_worker":
            request.reward_per_worker,

        "latitude":
            request.latitude,

        "longitude":
            request.longitude,

        "status":
            "open",

        "deadline":
            (
                now + timedelta(hours=24)
            ).isoformat(),
    }

    try:

        response = (
            supabase_admin
            .table("jobs")
            .insert(job_data)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Job could not be created.",
            )

        return {
            "success": True,
            "message":
                "Cleanup job created successfully.",
            "job":
                response.data[0],
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=
                f"Unable to create job: {str(error)}",
        )


# ============================================================
# GET AVAILABLE JOBS
# ============================================================

@router.get("/available")
def get_available_jobs(
    authorization: str | None = Header(default=None),
):

    # Make sure user is logged in
    get_current_user(
        authorization
    )

    try:

        response = (
            supabase_admin
            .table("jobs")
            .select("*")
            .eq(
                "status",
                "open",
            )
            .order(
                "created_at",
                desc=True,
            )
            .execute()
        )

        jobs = response.data or []

        # Only show jobs where positions are available
        available_jobs = []

        for job in jobs:

            workers_required = int(
                job.get(
                    "workers_required",
                    0,
                )
            )

            accepted_workers = int(
                job.get(
                    "accepted_workers",
                    0,
                )
            )

            if (
                accepted_workers
                <
                workers_required
            ):
                available_jobs.append(
                    job
                )

        return {
            "success": True,
            "count":
                len(available_jobs),
            "jobs":
                available_jobs,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=
                f"Unable to load jobs: {str(error)}",
        )


# ============================================================
# GET USER ACCEPTED JOBS
# ============================================================

@router.get("/my-jobs")
def get_my_jobs(
    authorization: str | None = Header(default=None),
):

    user = get_current_user(
        authorization
    )

    try:

        response = (
            supabase_admin
            .table("job_applications")
            .select(
                "*, jobs(*)"
            )
            .eq(
                "user_id",
                user.id,
            )
            .order(
                "accepted_at",
                desc=True,
            )
            .execute()
        )

        return {
            "success": True,
            "count":
                len(response.data or []),
            "jobs":
                response.data or [],
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=
                f"Unable to load accepted jobs: {str(error)}",
        )


# ============================================================
# ACCEPT CLEANUP JOB
# ============================================================

@router.post("/accept")
def accept_job(
    request: JobAcceptRequest,
    authorization: str | None = Header(default=None),
):

    user = get_current_user(
        authorization
    )

    now = datetime.now(
        timezone.utc
    )

    try:

        # ----------------------------------------------------
        # CHECK JOB EXISTS
        # ----------------------------------------------------

        job_response = (
            supabase_admin
            .table("jobs")
            .select("*")
            .eq(
                "id",
                request.job_id,
            )
            .limit(1)
            .execute()
        )

        if not job_response.data:
            raise HTTPException(
                status_code=404,
                detail="Job not found.",
            )

        job = job_response.data[0]


        # ----------------------------------------------------
        # CHECK JOB IS OPEN
        # ----------------------------------------------------

        if job.get("status") != "open":

            raise HTTPException(
                status_code=400,
                detail=
                    "This cleanup job is no longer available.",
            )


        # ----------------------------------------------------
        # CHECK AVAILABLE WORKER POSITIONS
        # ----------------------------------------------------

        workers_required = int(
            job.get(
                "workers_required",
                0,
            )
        )

        accepted_workers = int(
            job.get(
                "accepted_workers",
                0,
            )
        )

        if accepted_workers >= workers_required:

            raise HTTPException(
                status_code=400,
                detail=
                    "All worker positions have already been filled.",
            )


        # ----------------------------------------------------
        # CHECK USER HAS NOT ALREADY ACCEPTED THIS JOB
        # ----------------------------------------------------

        existing_application = (
            supabase_admin
            .table("job_applications")
            .select("id")
            .eq(
                "job_id",
                request.job_id,
            )
            .eq(
                "user_id",
                user.id,
            )
            .execute()
        )

        if existing_application.data:

            raise HTTPException(
                status_code=400,
                detail=
                    "You have already accepted this job.",
            )


        # ----------------------------------------------------
        # CHECK ONE JOB PER DAY
        # ----------------------------------------------------

        start_of_day = (
            now
            .replace(
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )
        )

        accepted_today = (
            supabase_admin
            .table("job_applications")
            .select("id")
            .eq(
                "user_id",
                user.id,
            )
            .gte(
                "accepted_at",
                start_of_day.isoformat(),
            )
            .execute()
        )

        if accepted_today.data:

            raise HTTPException(
                status_code=400,
                detail=
                    "You can accept only one cleanup job per day.",
            )


        # ----------------------------------------------------
        # CREATE JOB APPLICATION
        # ----------------------------------------------------

        submission_deadline = (
            now + timedelta(
                hours=24
            )
        )

        application_data = {

            "job_id":
                request.job_id,

            "user_id":
                user.id,

            "status":
                "accepted",

            "accepted_at":
                now.isoformat(),

            "submission_deadline":
                submission_deadline.isoformat(),
        }


        application_response = (
            supabase_admin
            .table("job_applications")
            .insert(
                application_data
            )
            .execute()
        )


        if not application_response.data:

            raise HTTPException(
                status_code=500,
                detail=
                    "Unable to accept cleanup job.",
            )


        application = (
            application_response.data[0]
        )


        # ----------------------------------------------------
        # UPDATE ACCEPTED WORKER COUNT
        # ----------------------------------------------------

        new_accepted_workers = (
            accepted_workers + 1
        )

        update_data = {
            "accepted_workers":
                new_accepted_workers,
        }


        # Close job automatically when all positions fill
        if (
            new_accepted_workers
            >=
            workers_required
        ):

            update_data[
                "status"
            ] = "filled"


        (
            supabase_admin
            .table("jobs")
            .update(
                update_data
            )
            .eq(
                "id",
                request.job_id,
            )
            .execute()
        )


        # ----------------------------------------------------
        # FINAL RESPONSE
        # ----------------------------------------------------

        return {
            "success": True,

            "message":
                "Cleanup job accepted successfully.",

            "application_id":
                application["id"],

            "job_id":
                request.job_id,

            "accepted_at":
                application.get(
                    "accepted_at",
                    now.isoformat(),
                ),

            "submission_deadline":
                application.get(
                    "submission_deadline",
                    submission_deadline.isoformat(),
                ),
        }


    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=
                f"Unable to accept job: {str(error)}",
        )