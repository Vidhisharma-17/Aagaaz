from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException

from app.core.supabase_client import supabase_admin
from app.routers.jobs import get_current_user
from app.schemas.prediction import PredictionRequest
from app.services.prediction_service import (
    get_prediction_options,
    run_prediction,
)


router = APIRouter(
    prefix="/api/predictions",
    tags=["Predictions"],
)


@router.get("/options")
def prediction_options():

    try:
        return {
            "success": True,
            "data": get_prediction_options(),
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load prediction options: {error}",
        )


@router.post("/predict")
def create_prediction(
    request: PredictionRequest,
    authorization: str | None = Header(default=None),
):

    user = get_current_user(authorization)

    try:

        prediction_result = run_prediction(request)

        predicted_waste = prediction_result["predicted_waste"]
        pollution_risk = prediction_result["pollution_risk"]
        workers_required = prediction_result["workers_required"]

        prediction_data = {
            "user_id": user.id,
            "event_name": request.event,
            "location": request.location,
            "season": request.season,
            "day_type": request.day_type,
            "crowd": request.crowd,
            "temperature": request.temperature,

            "humidity": getattr(request, "humidity", 50),
            "do_mgl": getattr(request, "do_mgl", 7),
            "bod_mgl": getattr(request, "bod_mgl", 3),
            "fecal_coliform": getattr(
                request,
                "fecal_coliform",
                100,
            ),

            "predicted_waste": predicted_waste,
            "pollution_risk": pollution_risk,
            "workers_required": workers_required,
        }

        prediction_response = (
            supabase_admin
            .table("predictions")
            .insert(prediction_data)
            .execute()
        )

        if not prediction_response.data:
            raise HTTPException(
                status_code=500,
                detail="Prediction could not be saved.",
            )

        saved_prediction = prediction_response.data[0]

        if predicted_waste >= 500:
            reward_per_worker = 500
        elif predicted_waste >= 300:
            reward_per_worker = 350
        elif predicted_waste >= 150:
            reward_per_worker = 250
        else:
            reward_per_worker = 150

        address_mapping = {
            "Prayagraj":
                "Prayagraj Event Cleanup Zone, Uttar Pradesh",

            "UP Route":
                "Kanwar Yatra Cleanup Route, Uttar Pradesh",
        }

        address = address_mapping.get(
            request.location,
            request.location,
        )

        now = datetime.now(timezone.utc)

        job_data = {
            "prediction_id": saved_prediction["id"],
            "created_by": user.id,
            "event_name": request.event,
            "location": request.location,
            "address": address,
            "predicted_waste": predicted_waste,
            "pollution_risk": pollution_risk,
            "workers_required": workers_required,
            "accepted_workers": 0,
            "reward_per_worker": reward_per_worker,
            "latitude": None,
            "longitude": None,
            "status": "open",
            "deadline": (
                now + timedelta(hours=24)
            ).isoformat(),
        }

        job_response = (
            supabase_admin
            .table("jobs")
            .insert(job_data)
            .execute()
        )

        if not job_response.data:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Prediction was saved, "
                    "but job creation failed."
                ),
            )

        saved_job = job_response.data[0]

        return {
            "success": True,
            "message": (
                "Prediction generated and cleanup job "
                "created successfully."
            ),
            "prediction_id": saved_prediction["id"],
            "job_created": True,
            "job_id": saved_job["id"],

            "prediction": {
                "predicted_waste": predicted_waste,
                "pollution_risk": pollution_risk,
                "workers_required": workers_required,
                "recommendations": prediction_result[
                    "recommendations"
                ],
            },
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {error}",
        )


@router.get("/history")
def get_prediction_history(
    authorization: str | None = Header(default=None),
):

    user = get_current_user(authorization)

    try:

        response = (
            supabase_admin
            .table("predictions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "success": True,
            "count": len(response.data or []),
            "predictions": response.data or [],
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to load prediction history: {error}"
            ),
        )