from typing import Optional

from pydantic import BaseModel, Field


class JobCreateRequest(BaseModel):
    prediction_id: Optional[str] = None

    event_name: str
    location: str
    address: str

    predicted_waste: float = Field(ge=0)
    pollution_risk: str

    workers_required: int = Field(ge=0)
    reward_per_worker: float = Field(ge=0)

    latitude: Optional[float] = None
    longitude: Optional[float] = None


class JobResponse(BaseModel):
    id: str

    prediction_id: Optional[str] = None

    event_name: str
    location: str
    address: str

    predicted_waste: float
    pollution_risk: str

    workers_required: int
    accepted_workers: int

    reward_per_worker: float
    status: str

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    created_at: str
    deadline: str


class JobAcceptRequest(BaseModel):
    job_id: str


class JobAcceptResponse(BaseModel):
    success: bool
    message: str
    application_id: str
    job_id: str
    accepted_at: str
    submission_deadline: str