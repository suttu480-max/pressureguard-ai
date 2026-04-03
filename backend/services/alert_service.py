"""
Smart Alert Service — generates and manages alerts for at-risk patients.
"""

from config import get_supabase_admin
from services.risk_engine import should_generate_alert


def create_alert(
    patient_id: str,
    patient_name: str,
    alert_type: str,
    severity: str,
    risk_score: int,
    risk_level: str
) -> dict:
    """Create a new alert in the database."""
    supabase = get_supabase_admin()

    title, message = _build_alert_content(
        patient_name, alert_type, severity, risk_score, risk_level
    )

    alert_data = {
        "patient_id": patient_id,
        "alert_type": alert_type,
        "severity": severity,
        "title": title,
        "message": message,
        "is_read": False,
        "is_acknowledged": False
    }

    result = supabase.table("alerts").insert(alert_data).execute()
    return result.data[0] if result.data else {}


def generate_alerts_for_patient(
    patient_id: str,
    patient_name: str,
    risk_score: int,
    risk_level: str,
    previous_risk_level: str = None
) -> list:
    """Check if alerts should be generated and create them."""
    alerts = []

    should_alert, alert_type, severity = should_generate_alert(
        risk_level, previous_risk_level
    )

    if should_alert:
        alert = create_alert(
            patient_id=patient_id,
            patient_name=patient_name,
            alert_type=alert_type,
            severity=severity,
            risk_score=risk_score,
            risk_level=risk_level
        )
        alerts.append(alert)

    return alerts


def _build_alert_content(
    patient_name: str,
    alert_type: str,
    severity: str,
    risk_score: int,
    risk_level: str
) -> tuple:
    """Generate alert title and message based on type."""

    if alert_type == "critical_risk":
        title = f"🚨 CRITICAL: {patient_name} at Critical Risk"
        message = (
            f"Patient {patient_name} has a Braden Score of {risk_score} "
            f"(Critical Risk). Immediate intervention required. "
            f"Place on high-specification support surface and implement "
            f"1-2 hour repositioning schedule immediately."
        )
    elif alert_type == "risk_increase":
        title = f"⚠️ Risk Increased: {patient_name}"
        message = (
            f"Patient {patient_name}'s risk level has increased to "
            f"{risk_level.upper()} (Braden Score: {risk_score}). "
            f"Review care plan and adjust interventions accordingly."
        )
    elif alert_type == "reassessment_due":
        title = f"🔄 Reassessment Due: {patient_name}"
        message = (
            f"Patient {patient_name} is due for pressure ulcer risk "
            f"reassessment. Last score: {risk_score} ({risk_level.capitalize()} Risk)."
        )
    elif alert_type == "new_patient":
        title = f"🆕 New Patient: {patient_name}"
        message = (
            f"New patient {patient_name} admitted with initial "
            f"Braden Score of {risk_score} ({risk_level.capitalize()} Risk). "
            f"Complete initial skin assessment and implement care plan."
        )
    else:
        title = f"ℹ️ Alert: {patient_name}"
        message = f"Patient {patient_name} — Braden Score: {risk_score} ({risk_level.capitalize()} Risk)."

    return title, message


def get_active_alerts(limit: int = 50) -> list:
    """Get active (unacknowledged) alerts."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("alerts")
        .select("*, patients(name)")
        .eq("is_acknowledged", False)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


def acknowledge_alert(alert_id: str, user_id: str) -> dict:
    """Mark an alert as acknowledged."""
    supabase = get_supabase_admin()
    from datetime import datetime

    result = (
        supabase.table("alerts")
        .update({
            "is_acknowledged": True,
            "is_read": True,
            "acknowledged_by": user_id,
            "acknowledged_at": datetime.utcnow().isoformat()
        })
        .eq("id", alert_id)
        .execute()
    )
    return result.data[0] if result.data else {}
