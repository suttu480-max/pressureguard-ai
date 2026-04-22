"""
Smart Alert Scheduler — Generates periodic alerts for at-risk patients.

Runs as a background task to create:
- Reassessment Due alerts: based on risk level
  • Critical → every 1 hour
  • High → every 2 hours
  • Moderate → every 4 hours
- Position Change alerts: reminders to reposition
  • Critical → every 1 hour
  • High → every 2 hours
  • Moderate → every 3 hours
"""

import asyncio
from datetime import datetime, timedelta, timezone
from config import get_supabase_admin
from services.alert_service import create_alert

# How often the scheduler checks (in seconds)
CHECK_INTERVAL_SECONDS = 60  # Check every minute

# Reassessment intervals by risk level (in hours)
REASSESSMENT_INTERVALS = {
    "critical": 1,
    "high": 2,
    "moderate": 4,
}

# Position change reminder intervals by risk level (in hours)
POSITION_CHANGE_INTERVALS = {
    "critical": 1,
    "high": 2,
    "moderate": 3,
}


def _get_last_alert_time(patient_id: str, alert_type: str) -> datetime | None:
    """Get the most recent alert of a specific type for a patient."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("alerts")
            .select("created_at")
            .eq("patient_id", patient_id)
            .eq("alert_type", alert_type)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            created = result.data[0]["created_at"]
            # Parse ISO timestamp
            if isinstance(created, str):
                # Handle various ISO formats
                created = created.replace("Z", "+00:00")
                try:
                    return datetime.fromisoformat(created)
                except ValueError:
                    return None
            return created
        return None
    except Exception:
        return None


def _get_last_assessment_time(patient_id: str) -> datetime | None:
    """Get the most recent risk assessment time for a patient."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("risk_history")
            .select("assessed_at")
            .eq("patient_id", patient_id)
            .order("assessed_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            assessed = result.data[0]["assessed_at"]
            if isinstance(assessed, str):
                assessed = assessed.replace("Z", "+00:00")
                try:
                    return datetime.fromisoformat(assessed)
                except ValueError:
                    return None
            return assessed
        return None
    except Exception:
        return None


def check_and_generate_scheduled_alerts():
    """
    Check all active patients and generate time-based alerts
    (reassessment_due, position_change) when intervals have elapsed.
    """
    try:
        supabase = get_supabase_admin()

        # Get all active patients with moderate/high/critical risk
        result = (
            supabase.table("patients")
            .select("id, name, risk_level, risk_score:overall_risk_score")
            .eq("status", "active")
            .in_("risk_level", ["critical", "high", "moderate"])
            .execute()
        )

        if not result.data:
            return []

        now = datetime.now(timezone.utc)
        generated_alerts = []

        for patient in result.data:
            pid = patient["id"]
            name = patient["name"]
            risk_level = patient["risk_level"]
            risk_score = patient.get("risk_score", 0)

            # ── Check Reassessment Due ──
            reassessment_hours = REASSESSMENT_INTERVALS.get(risk_level)
            if reassessment_hours:
                # Check time since last assessment OR last reassessment alert
                last_assessment = _get_last_assessment_time(pid)
                last_reassessment_alert = _get_last_alert_time(pid, "reassessment_due")

                # Use the more recent of assessment or alert as reference
                reference_time = None
                if last_assessment and last_reassessment_alert:
                    reference_time = max(last_assessment, last_reassessment_alert)
                elif last_assessment:
                    reference_time = last_assessment
                elif last_reassessment_alert:
                    reference_time = last_reassessment_alert

                if reference_time:
                    # Make sure reference_time is timezone-aware
                    if reference_time.tzinfo is None:
                        reference_time = reference_time.replace(tzinfo=timezone.utc)

                    elapsed = now - reference_time
                    if elapsed >= timedelta(hours=reassessment_hours):
                        alert = create_alert(
                            patient_id=pid,
                            patient_name=name,
                            alert_type="reassessment_due",
                            severity="high" if risk_level == "critical" else "medium",
                            risk_score=risk_score,
                            risk_level=risk_level
                        )
                        generated_alerts.append(alert)

            # ── Check Position Change Reminder ──
            position_hours = POSITION_CHANGE_INTERVALS.get(risk_level)
            if position_hours:
                last_position_alert = _get_last_alert_time(pid, "position_change")

                if last_position_alert:
                    if last_position_alert.tzinfo is None:
                        last_position_alert = last_position_alert.replace(tzinfo=timezone.utc)

                    elapsed = now - last_position_alert
                    if elapsed >= timedelta(hours=position_hours):
                        alert = create_alert(
                            patient_id=pid,
                            patient_name=name,
                            alert_type="position_change",
                            severity="high" if risk_level == "critical" else "medium",
                            risk_score=risk_score,
                            risk_level=risk_level
                        )
                        generated_alerts.append(alert)
                else:
                    # No position alert exists yet — check time since patient creation
                    patient_detail = (
                        supabase.table("patients")
                        .select("created_at")
                        .eq("id", pid)
                        .single()
                        .execute()
                    )
                    if patient_detail.data:
                        created_str = patient_detail.data["created_at"]
                        if isinstance(created_str, str):
                            created_str = created_str.replace("Z", "+00:00")
                            try:
                                created_at = datetime.fromisoformat(created_str)
                                if created_at.tzinfo is None:
                                    created_at = created_at.replace(tzinfo=timezone.utc)
                                elapsed = now - created_at
                                if elapsed >= timedelta(hours=position_hours):
                                    alert = create_alert(
                                        patient_id=pid,
                                        patient_name=name,
                                        alert_type="position_change",
                                        severity="high" if risk_level == "critical" else "medium",
                                        risk_score=risk_score,
                                        risk_level=risk_level
                                    )
                                    generated_alerts.append(alert)
                            except ValueError:
                                pass

        return generated_alerts

    except Exception as e:
        print(f"[AlertScheduler] Error: {e}")
        return []


async def alert_scheduler_loop():
    """
    Async background loop that periodically checks
    and generates scheduled alerts.
    """
    print("[AlertScheduler] Started — checking every "
          f"{CHECK_INTERVAL_SECONDS}s for time-based alerts")

    while True:
        try:
            alerts = check_and_generate_scheduled_alerts()
            if alerts:
                print(f"[AlertScheduler] Generated {len(alerts)} scheduled alert(s)")
        except Exception as e:
            print(f"[AlertScheduler] Error in loop: {e}")

        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
