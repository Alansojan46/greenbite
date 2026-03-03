from datetime import datetime
from pydantic import BaseModel


class SpoilageInput(BaseModel):
    prepared_at: datetime
    expiry_estimate: datetime | None = None
    food_type: str | None = None
    temperature_c: float | None = None


class SpoilageOutput(BaseModel):
    spoilage_risk: int
    freshness_prediction: str


def estimate_spoilage(payload: SpoilageInput) -> SpoilageOutput:
    """
    Very simple spoilage heuristic.
    Replace with ML or CV model for production.
    """
    now = datetime.utcnow()
    hours_since_prepared = (now - payload.prepared_at).total_seconds() / 3600

    risk = min(100, max(0, (hours_since_prepared / 24) * 100))

    if payload.expiry_estimate and now > payload.expiry_estimate:
        risk = 100

    if payload.food_type:
        lower_risk = {"bread", "rice", "dry", "packaged"}
        if payload.food_type.lower() in lower_risk:
            risk *= 0.7

    if payload.temperature_c is not None:
        if payload.temperature_c > 30:
            risk *= 1.2
        elif payload.temperature_c < 10:
            risk *= 0.8

    if risk < 30:
        freshness = "High"
    elif risk < 70:
        freshness = "Medium"
    else:
        freshness = "Low"

    return SpoilageOutput(spoilage_risk=int(risk), freshness_prediction=freshness)

