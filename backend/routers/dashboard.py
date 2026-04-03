"""
Dashboard router — aggregated stats, risk distribution, trends.
"""

from fastapi import APIRouter, HTTPException, Header, Query
from config import get_supabase_admin
from models.schemas import DashboardStats
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(authorization: str = Header(...)):
    """Get aggregated dashboard statistics."""
    try:
        supabase = get_supabase_admin()

        # Total active patients
        all_patients = (
            supabase.table("patients")
            .select("id, risk_level")
            .eq("status", "active")
            .execute()
        )
        patients = all_patients.data or []
        total = len(patients)

        # Count by risk level
        critical = sum(1 for p in patients if p.get("risk_level") == "critical")
        high = sum(1 for p in patients if p.get("risk_level") == "high")
        moderate = sum(1 for p in patients if p.get("risk_level") == "moderate")
        low = sum(1 for p in patients if p.get("risk_level") == "low")

        # Active (unacknowledged) alerts
        alerts_result = (
            supabase.table("alerts")
            .select("id", count="exact")
            .eq("is_acknowledged", False)
            .execute()
        )
        active_alerts = alerts_result.count or 0

        # Assessments today
        today_start = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()
        assessments_result = (
            supabase.table("risk_history")
            .select("id", count="exact")
            .gte("assessed_at", today_start)
            .execute()
        )
        assessments_today = assessments_result.count or 0

        return DashboardStats(
            total_patients=total,
            critical_count=critical,
            high_risk_count=high,
            moderate_count=moderate,
            low_risk_count=low,
            active_alerts=active_alerts,
            assessments_today=assessments_today
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load stats: {str(e)}")


@router.get("/trends")
async def get_risk_trends(
    days: int = Query(7, ge=1, le=30),
    authorization: str = Header(...)
):
    """Get risk distribution trends over recent days."""
    try:
        supabase = get_supabase_admin()
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        result = (
            supabase.table("risk_history")
            .select("risk_level, assessed_at")
            .gte("assessed_at", start_date)
            .order("assessed_at")
            .execute()
        )

        # Aggregate by date
        trends = {}
        for record in result.data:
            date_str = record["assessed_at"][:10]  # YYYY-MM-DD
            if date_str not in trends:
                trends[date_str] = {"date": date_str, "critical": 0, "high": 0, "moderate": 0, "low": 0}
            level = record.get("risk_level", "low")
            if level in trends[date_str]:
                trends[date_str][level] += 1

        # Fill missing days
        trend_list = []
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
            if date in trends:
                trend_list.append(trends[date])
            else:
                trend_list.append({"date": date, "critical": 0, "high": 0, "moderate": 0, "low": 0})

        return trend_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load trends: {str(e)}")


@router.get("/recent-patients")
async def get_recent_patients(
    limit: int = Query(5, ge=1, le=20),
    authorization: str = Header(...)
):
    """Get most recently added or updated patients."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("patients")
            .select("id, name, age, ward, bed_number, risk_level, overall_risk_score, updated_at")
            .eq("status", "active")
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load: {str(e)}")


@router.get("/recent-alerts")
async def get_recent_alerts(
    limit: int = Query(5, ge=1, le=20),
    authorization: str = Header(...)
):
    """Get most recent alerts."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("alerts")
            .select("*, patients(name)")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        alerts = []
        for a in result.data:
            patient_info = a.pop("patients", None)
            a["patient_name"] = patient_info.get("name") if patient_info else None
            alerts.append(a)

        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load: {str(e)}")
