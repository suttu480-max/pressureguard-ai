"""
AI Risk Prediction Engine for Pressure Ulcer Assessment
Uses a modified Braden Scale algorithm with dynamic weighting.

Braden Scale Subscales:
- Sensory Perception (1-4): ability to respond to pressure-related discomfort
- Moisture (1-4): degree to which skin is exposed to moisture
- Activity (1-4): degree of physical activity
- Mobility (1-4): ability to change and control body position
- Nutrition (1-4): usual food intake pattern
- Friction & Shear (1-3): degree of friction and shear

Total Score Range: 6-23
- ≤9: Critical Risk
- 10-12: High Risk
- 13-14: Moderate Risk
- 15-18: Low Risk
- ≥19: Minimal Risk (treated as Low in our system)
"""

from typing import Dict, List, Tuple


# ── Subscale Descriptors ──────────────────────────────

SENSORY_LABELS = {
    1: "Completely Limited",
    2: "Very Limited",
    3: "Slightly Limited",
    4: "No Impairment"
}

MOISTURE_LABELS = {
    1: "Constantly Moist",
    2: "Very Moist",
    3: "Occasionally Moist",
    4: "Rarely Moist"
}

ACTIVITY_LABELS = {
    1: "Bedfast",
    2: "Chairfast",
    3: "Walks Occasionally",
    4: "Walks Frequently"
}

MOBILITY_LABELS = {
    1: "Completely Immobile",
    2: "Very Limited",
    3: "Slightly Limited",
    4: "No Limitations"
}

NUTRITION_LABELS = {
    1: "Very Poor",
    2: "Probably Inadequate",
    3: "Adequate",
    4: "Excellent"
}

FRICTION_LABELS = {
    1: "Problem",
    2: "Potential Problem",
    3: "No Apparent Problem"
}


# ── Risk Engine ───────────────────────────────────────

def calculate_risk_score(
    sensory_score: int,
    moisture_score: int,
    activity_score: int,
    mobility_score: int,
    nutrition_score: int,
    friction_score: int,
    patient_age: int = None
) -> Dict:
    """
    Calculate the overall pressure ulcer risk score and return
    detailed assessment including contributing factors and recommendations.
    """

    # Calculate base Braden score
    base_score = (
        sensory_score +
        moisture_score +
        activity_score +
        mobility_score +
        nutrition_score +
        friction_score
    )

    # Age adjustment: elderly patients have higher risk
    age_penalty = 0
    if patient_age:
        if patient_age >= 80:
            age_penalty = 2
        elif patient_age >= 70:
            age_penalty = 1

    adjusted_score = max(6, base_score - age_penalty)

    # Determine risk level
    risk_level = _get_risk_level(adjusted_score)

    # Identify contributing factors
    contributing_factors = _get_contributing_factors(
        sensory_score, moisture_score, activity_score,
        mobility_score, nutrition_score, friction_score,
        patient_age
    )

    # Generate recommendations
    recommendations = _get_recommendations(
        sensory_score, moisture_score, activity_score,
        mobility_score, nutrition_score, friction_score,
        risk_level
    )

    # Build subscale details
    subscale_details = {
        "sensory_perception": {
            "score": sensory_score,
            "max": 4,
            "label": SENSORY_LABELS.get(sensory_score, "Unknown"),
            "status": _score_status(sensory_score, 4)
        },
        "moisture": {
            "score": moisture_score,
            "max": 4,
            "label": MOISTURE_LABELS.get(moisture_score, "Unknown"),
            "status": _score_status(moisture_score, 4)
        },
        "activity": {
            "score": activity_score,
            "max": 4,
            "label": ACTIVITY_LABELS.get(activity_score, "Unknown"),
            "status": _score_status(activity_score, 4)
        },
        "mobility": {
            "score": mobility_score,
            "max": 4,
            "label": MOBILITY_LABELS.get(mobility_score, "Unknown"),
            "status": _score_status(mobility_score, 4)
        },
        "nutrition": {
            "score": nutrition_score,
            "max": 4,
            "label": NUTRITION_LABELS.get(nutrition_score, "Unknown"),
            "status": _score_status(nutrition_score, 4)
        },
        "friction_shear": {
            "score": friction_score,
            "max": 3,
            "label": FRICTION_LABELS.get(friction_score, "Unknown"),
            "status": _score_status(friction_score, 3)
        }
    }

    return {
        "risk_score": adjusted_score,
        "risk_level": risk_level,
        "base_score": base_score,
        "age_penalty": age_penalty,
        "contributing_factors": contributing_factors,
        "recommendations": recommendations,
        "subscale_details": subscale_details
    }


def _get_risk_level(score: int) -> str:
    """Map Braden score to risk level."""
    if score <= 9:
        return "critical"
    elif score <= 12:
        return "high"
    elif score <= 14:
        return "moderate"
    else:
        return "low"


def _score_status(score: int, max_score: int) -> str:
    """Get status label for a subscale score."""
    ratio = score / max_score
    if ratio <= 0.25:
        return "critical"
    elif ratio <= 0.5:
        return "warning"
    elif ratio <= 0.75:
        return "caution"
    else:
        return "good"


def _get_contributing_factors(
    sensory: int, moisture: int, activity: int,
    mobility: int, nutrition: int, friction: int,
    age: int = None
) -> List[str]:
    """Identify the key contributing factors to risk."""
    factors = []

    if sensory <= 2:
        factors.append(f"Sensory perception is {SENSORY_LABELS[sensory].lower()} — patient cannot adequately feel pressure discomfort")
    if moisture <= 2:
        factors.append(f"Skin moisture level is {MOISTURE_LABELS[moisture].lower()} — increased maceration risk")
    if activity <= 2:
        factors.append(f"Activity level is {ACTIVITY_LABELS[activity].lower()} — prolonged pressure on tissues")
    if mobility <= 2:
        factors.append(f"Mobility is {MOBILITY_LABELS[mobility].lower()} — unable to reposition independently")
    if nutrition <= 2:
        factors.append(f"Nutritional intake is {NUTRITION_LABELS[nutrition].lower()} — impaired tissue repair capacity")
    if friction <= 1:
        factors.append(f"Friction/shear is a {FRICTION_LABELS[friction].lower()} — skin damage from sliding")
    if age and age >= 70:
        factors.append(f"Advanced age ({age} years) — reduced skin elasticity and healing capacity")

    if not factors:
        factors.append("No significant contributing factors identified — maintain current care plan")

    return factors


def _get_recommendations(
    sensory: int, moisture: int, activity: int,
    mobility: int, nutrition: int, friction: int,
    risk_level: str
) -> List[str]:
    """Generate care recommendations based on assessment."""
    recs = []

    # Universal recommendations based on risk level
    if risk_level == "critical":
        recs.append("⚠️ IMMEDIATE: Place patient on high-specification reactive support surface")
        recs.append("⚠️ IMMEDIATE: Implement 1-2 hour repositioning schedule with documentation")
        recs.append("Request wound care specialist consultation within 24 hours")
    elif risk_level == "high":
        recs.append("Place patient on pressure-redistribution mattress")
        recs.append("Implement 2-hour repositioning schedule")
        recs.append("Schedule skin assessment every shift")
    elif risk_level == "moderate":
        recs.append("Use pressure-reducing mattress overlay")
        recs.append("Reposition every 2-4 hours")
        recs.append("Perform daily comprehensive skin assessment")

    # Specific recommendations
    if sensory <= 2:
        recs.append("Inspect skin at pressure points during every repositioning")
        recs.append("Use protective padding at bony prominences")
    if moisture <= 2:
        recs.append("Apply moisture barrier cream to at-risk areas")
        recs.append("Implement incontinence management plan")
        recs.append("Change linens immediately when soiled")
    if activity <= 2:
        recs.append("Develop progressive mobilization plan if clinically appropriate")
        recs.append("Use heel elevation devices to offload pressure")
    if mobility <= 2:
        recs.append("Assist with repositioning using proper technique to minimize shear")
        recs.append("Consider physical therapy consultation for mobility improvement")
    if nutrition <= 2:
        recs.append("Request dietary/nutrition consultation")
        recs.append("Monitor daily protein and caloric intake")
        recs.append("Consider nutritional supplements (protein, vitamins C and zinc)")
    if friction <= 1:
        recs.append("Keep head of bed at lowest safe elevation (≤30°)")
        recs.append("Use lifting devices for repositioning — do not drag patient")
        recs.append("Apply skin protectant to friction-prone areas")

    if not recs:
        recs.append("Maintain current prevention strategies")
        recs.append("Reassess risk weekly or with any change in condition")

    return recs


def should_generate_alert(risk_level: str, previous_risk_level: str = None) -> Tuple[bool, str, str]:
    """
    Determine if an alert should be generated based on risk assessment.
    Returns: (should_alert, alert_type, severity)
    """
    severity_order = {"low": 0, "moderate": 1, "high": 2, "critical": 3}

    if risk_level == "critical":
        return True, "critical_risk", "critical"

    if previous_risk_level:
        current = severity_order.get(risk_level, 0)
        previous = severity_order.get(previous_risk_level, 0)
        if current > previous:
            return True, "risk_increase", risk_level

    if risk_level == "high":
        return True, "risk_increase", "high"

    return False, "", ""
