from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = BASE_DIR / "trained_models"


# ============================================================
# LOAD FINAL MODELS
# ============================================================

waste_model = joblib.load(
    MODEL_DIR / "waste_model.pkl"
)

pollution_model = joblib.load(
    MODEL_DIR / "pollution_model.pkl"
)

worker_model = joblib.load(
    MODEL_DIR / "worker_model.pkl"
)


# ============================================================
# CATEGORY MAPPINGS
# ============================================================

EVENT_MAPPING = {
    "Kanwar Yatra": 0,
    "Magh Mela": 1,
    "Maha Kumbh Mela": 2,
}

LOCATION_MAPPING = {
    "Prayagraj": 0,
    "UP Route": 1,
}

SEASON_MAPPING = {
    "Monsoon": 0,
    "Winter": 1,
}

DAY_TYPE_MAPPING = {
    "Normal": 0,
    "Peak": 1,
}


# ============================================================
# POLLUTION LABEL MAPPING
# Original LabelEncoder classes:
# ['High', 'Low', 'Moderate', 'Severe']
# ============================================================

POLLUTION_LABELS = {
    0: "High",
    1: "Low",
    2: "Moderate",
    3: "Severe",
}


# ============================================================
# GET DROPDOWN OPTIONS
# ============================================================

def get_prediction_options():

    return {
        "events": list(EVENT_MAPPING.keys()),
        "locations": list(LOCATION_MAPPING.keys()),
        "seasons": list(SEASON_MAPPING.keys()),
        "day_types": list(DAY_TYPE_MAPPING.keys()),
    }


# ============================================================
# GENERATE RECOMMENDATIONS
# ============================================================

def generate_recommendations(
    predicted_waste,
    pollution_label,
    predicted_workers,
):

    recommendations = []

    # Waste recommendations
    if predicted_waste > 500:
        recommendations.append(
            "Deploy additional waste collection vehicles."
        )

    elif predicted_waste > 300:
        recommendations.append(
            "Increase temporary dustbins and collection points."
        )

    else:
        recommendations.append(
            "Current waste management capacity is sufficient."
        )


    # Pollution recommendations
    if pollution_label == "Severe":
        recommendations.append(
            "Immediate pollution control measures are required."
        )

    elif pollution_label == "High":
        recommendations.append(
            "Increase monitoring of pollution and waste hotspots."
        )

    elif pollution_label == "Moderate":
        recommendations.append(
            "Regular environmental monitoring is recommended."
        )

    else:
        recommendations.append(
            "Pollution level is currently under control."
        )


    # Worker recommendations
    if predicted_workers > 5000:
        recommendations.append(
            "Deploy emergency sanitation workforce."
        )

    elif predicted_workers > 3000:
        recommendations.append(
            "Increase cleanup workforce deployment."
        )

    else:
        recommendations.append(
            "Existing workforce capacity is sufficient."
        )


    return recommendations


# ============================================================
# RUN COMPLETE PREDICTION PIPELINE
# ============================================================

def run_prediction(request):

    # ========================================================
    # READ USER INPUTS
    # ========================================================

    event_name = request.event
    location_name = request.location
    season_name = request.season
    day_type_name = request.day_type

    crowd = float(request.crowd)
    temperature = float(request.temperature)


    # ========================================================
    # VALIDATE AND ENCODE CATEGORICAL INPUTS
    # ========================================================

    event = EVENT_MAPPING.get(event_name)

    location = LOCATION_MAPPING.get(
        location_name
    )

    season = SEASON_MAPPING.get(
        season_name
    )

    day_type = DAY_TYPE_MAPPING.get(
        day_type_name
    )


    if event is None:
        raise ValueError(
            "Invalid event selected."
        )

    if location is None:
        raise ValueError(
            "Invalid location selected."
        )

    if season is None:
        raise ValueError(
            "Invalid season selected."
        )

    if day_type is None:
        raise ValueError(
            "Invalid day type selected."
        )


    # ========================================================
    # DATE FEATURES
    # ========================================================

    today = datetime.today()

    month = today.month
    day = today.day
    weekday = today.weekday()


    # ========================================================
    # COMMON MODEL INPUT
    # ========================================================

    basic_data = {
        "Event_Name": event,
        "Location": location,
        "Season": season,
        "Day_Type": day_type,
        "Crowd_Lakh": crowd,
        "Temperature_C": temperature,
        "Month": month,
        "Day": day,
        "Weekday": weekday,
    }


    # ========================================================
    # 1. WASTE PREDICTION
    # ========================================================

    waste_data = pd.DataFrame(
        [basic_data]
    )

    predicted_waste = float(
        waste_model.predict(
            waste_data
        )[0]
    )

    predicted_waste = max(
        predicted_waste,
        0.0,
    )


    # ========================================================
    # 2. POLLUTION PREDICTION
    # ========================================================

    pollution_input = {
        **basic_data,
        "Total_Waste_Tons":
            predicted_waste,
    }

    pollution_data = pd.DataFrame(
        [pollution_input]
    )

    pollution_prediction = int(
        pollution_model.predict(
            pollution_data
        )[0]
    )

    pollution_label = (
        POLLUTION_LABELS.get(
            pollution_prediction,
            "Unknown",
        )
    )


    # ========================================================
    # 3. WORKER PREDICTION
    # ========================================================

    worker_data = pd.DataFrame(
        [basic_data]
    )

    predicted_workers = int(
        round(
            float(
                worker_model.predict(
                    worker_data
                )[0]
            )
        )
    )

    predicted_workers = max(
        predicted_workers,
        0,
    )


    # ========================================================
    # RECOMMENDATIONS
    # ========================================================

    recommendations = (
        generate_recommendations(
            predicted_waste,
            pollution_label,
            predicted_workers,
        )
    )


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {
        "predicted_waste": round(
            predicted_waste,
            2,
        ),

        "pollution_risk":
            pollution_label,

        "workers_required":
            predicted_workers,

        "recommendations":
            recommendations,
    }