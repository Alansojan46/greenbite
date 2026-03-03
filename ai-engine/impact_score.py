from pydantic import BaseModel


class ImpactInput(BaseModel):
    people_served: int
    distance_km: float
    spoilage_risk: int
    urgency_weight: float = 1.5
    distance_penalty: float = 0.5
    decay_factor: float = 0.8


class ImpactOutput(BaseModel):
    impact_score: int


def compute_impact_score(payload: ImpactInput) -> ImpactOutput:
    base = payload.people_served * payload.urgency_weight
    distance_pen = payload.distance_km * payload.distance_penalty
    spoilage_pen = payload.spoilage_risk * payload.decay_factor
    score = base - distance_pen - spoilage_pen
    return ImpactOutput(impact_score=max(0, int(score)))

