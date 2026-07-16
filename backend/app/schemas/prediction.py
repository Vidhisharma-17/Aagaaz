from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):

    event: str
    location: str
    season: str
    day_type: str

    crowd: float = Field(gt=0)
    temperature: float


class PredictionResponse(BaseModel):

    predicted_waste: float
    pollution_risk: str
    workers_required: int
    recommendations: list[str]