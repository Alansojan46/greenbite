from typing import List
from pydantic import BaseModel
from math import radians, sin, cos, atan2, sqrt


class Location(BaseModel):
    lat: float
    lng: float


class DonorOption(BaseModel):
    donor_id: str
    donation_id: str
    location: Location
    available_quantity: float
    spoilage_risk: int
    impact_score: int
    response_speed_score: int = 80


class MatchInput(BaseModel):
    ngo_location: Location
    food_required_quantity: float
    urgency_level: int
    options: List[DonorOption]


class MatchOutput(BaseModel):
    recommended_donor_id: str
    donation_id: str
    distance: float
    confidence_score: int


class MatchSuggestion(BaseModel):
    recommended_donor_id: str
    donation_id: str
    distance: float
    confidence_score: int


def _score_option(opt: DonorOption, urgency_level: int, distance_km: float) -> float:
    return (
        opt.impact_score
        + opt.response_speed_score
        + urgency_level * 10
        - distance_km * 2
        - opt.spoilage_risk
    )


def rank_matches(payload: MatchInput, limit: int = 10) -> List[MatchSuggestion]:
    ranked = []

    for opt in payload.options:
        if opt.available_quantity < payload.food_required_quantity * 0.5:
            continue

        dist = haversine_km(payload.ngo_location, opt.location)
        score = _score_option(opt, payload.urgency_level, dist)
        confidence = max(0, min(100, int(score)))

        ranked.append(
            {
                "option": opt,
                "distance": dist,
                "confidence": confidence,
                "score": score,
            }
        )

    ranked.sort(key=lambda x: x["score"], reverse=True)
    ranked = ranked[: max(1, min(20, int(limit or 10)))]

    return [
        MatchSuggestion(
            recommended_donor_id=r["option"].donor_id,
            donation_id=r["option"].donation_id,
            distance=round(r["distance"], 2),
            confidence_score=r["confidence"],
        )
        for r in ranked
    ]


def haversine_km(a: Location, b: Location) -> float:
    R = 6371
    dlat = radians(b.lat - a.lat)
    dlng = radians(b.lng - a.lng)
    aa = sin(dlat / 2) ** 2 + cos(radians(a.lat)) * cos(radians(b.lat)) * sin(
        dlng / 2
    ) ** 2
    c = 2 * atan2(sqrt(aa), sqrt(1 - aa))
    return R * c


def compute_best_match(payload: MatchInput) -> MatchOutput:
    ranked = rank_matches(payload, limit=1)
    if not ranked:
        raise ValueError("No suitable donor found")

    top = ranked[0]
    return MatchOutput(
        recommended_donor_id=top.recommended_donor_id,
        donation_id=top.donation_id,
        distance=top.distance,
        confidence_score=top.confidence_score,
    )
