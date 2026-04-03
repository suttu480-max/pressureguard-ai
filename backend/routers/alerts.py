"""
Alerts router — list, read, and acknowledge smart alerts.
"""

from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional, List
from config import get_supabase_admin
from models.schemas import AlertResponse, AlertAcknowledge
from routers.auth import get_current_user_id, get_current_user_role
from datetime import datetime

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    severity: Optional[str] = Query(None),
    is_acknowledged: Optional[bool] = Query(None),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    authorization: str = Header(...)
):
    """List alerts with optional filters."""
    try:
        supabase = get_supabase_admin()
        query = supabase.table("alerts").select("*, patients(name)")

        if severity:
            query = query.eq("severity", severity)
        if is_acknowledged is not None:
            query = query.eq("is_acknowledged", is_acknowledged)
        if patient_id:
            query = query.eq("patient_id", patient_id)

        result = (
            query
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        alerts = []
        for a in result.data:
            patient_info = a.pop("patients", None)
            a["patient_name"] = patient_info.get("name") if patient_info else None
            alerts.append(AlertResponse(**a))

        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")


@router.get("/unread-count")
async def get_unread_count(authorization: str = Header(...)):
    """Get count of unread alerts."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("alerts")
            .select("id", count="exact")
            .eq("is_read", False)
            .execute()
        )
        return {"unread_count": result.count or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get count: {str(e)}")


@router.get("/active-count")
async def get_active_count(authorization: str = Header(...)):
    """Get count of unacknowledged alerts."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("alerts")
            .select("id", count="exact")
            .eq("is_acknowledged", False)
            .execute()
        )
        return {"active_count": result.count or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get count: {str(e)}")


@router.put("/{alert_id}/read")
async def mark_as_read(alert_id: str, authorization: str = Header(...)):
    """Mark an alert as read."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("alerts")
            .update({"is_read": True})
            .eq("id", alert_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"message": "Alert marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update: {str(e)}")


@router.put("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, authorization: str = Header(...)):
    """Acknowledge an alert (doctor/nurse only)."""
    role = get_current_user_role(authorization)
    if role not in ("doctor", "nurse"):
        raise HTTPException(status_code=403, detail="Only doctors and nurses can acknowledge alerts")

    user_id = get_current_user_id(authorization)

    try:
        supabase = get_supabase_admin()
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

        if not result.data:
            raise HTTPException(status_code=404, detail="Alert not found")

        return {"message": "Alert acknowledged", "alert_id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge: {str(e)}")


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, authorization: str = Header(...)):
    """Delete an alert (doctor only)."""
    role = get_current_user_role(authorization)
    if role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can delete alerts")

    try:
        supabase = get_supabase_admin()
        supabase.table("alerts").delete().eq("id", alert_id).execute()
        return {"message": "Alert deleted", "alert_id": alert_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")
