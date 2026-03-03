from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

from freshness_model import SpoilageInput, SpoilageOutput, estimate_spoilage
from impact_score import ImpactInput, ImpactOutput, compute_impact_score
from matching_algorithm import (
    MatchInput,
    MatchOutput,
    MatchSuggestion,
    compute_best_match,
    rank_matches,
)

app = FastAPI(title="Greenbite AI Engine", version="1.0.0")


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: float


class HeatmapResponse(BaseModel):
    points: List[HeatmapPoint]


class MatchSuggestionsInput(MatchInput):
    limit: int = 10


class MatchSuggestionsOutput(BaseModel):
    suggestions: List[MatchSuggestion]


@app.get("/health")
def health():
    return {"status": "ok", "service": "greenbite-ai"}


@app.post("/spoilage", response_model=SpoilageOutput)
def spoilage_endpoint(payload: SpoilageInput):
    """
    Estimate spoilage risk and freshness level for a donation.
    """
    return estimate_spoilage(payload)


@app.post("/impact", response_model=ImpactOutput)
def impact_endpoint(payload: ImpactInput):
    """
    Compute impact score for a donation.
    """
    return compute_impact_score(payload)


@app.post("/match", response_model=MatchOutput)
def match_endpoint(payload: MatchInput):
    """
    Compute best donor match for an NGO requirement.
    """
    return compute_best_match(payload)


@app.post("/match-suggestions", response_model=MatchSuggestionsOutput)
def match_suggestions_endpoint(payload: MatchSuggestionsInput):
    """
    Rank multiple donor options for an NGO requirement.
    """
    suggestions = rank_matches(payload, limit=payload.limit)
    return MatchSuggestionsOutput(suggestions=suggestions)


@app.get("/heatmap", response_model=HeatmapResponse)
def heatmap_endpoint():
    """
    Placeholder hunger heatmap endpoint.
    In production, this would aggregate data from the main DB or a warehouse.
    """
    demo_points = [
      HeatmapPoint(lat=28.6139, lng=77.2090, weight=0.8),
      HeatmapPoint(lat=19.0760, lng=72.8777, weight=0.6),
    ]
    return HeatmapResponse(points=demo_points)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

