"""
Patient management router — CRUD operations with automatic risk scoring.
"""

from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional, List
from config import get_supabase_admin
from models.schemas import (
    PatientCreate, PatientUpdate, PatientResponse,
    RiskAssessmentRequest, RiskAssessmentResponse,
    RiskHistoryResponse
)
from services.risk_engine import calculate_risk_score
from services.alert_service import generate_alerts_for_patient, create_alert
from routers.auth import get_current_user_id, get_current_user_role

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("/", response_model=List[PatientResponse])
async def list_patients(
    search: Optional[str] = Query(None, description="Search by name"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    ward: Optional[str] = Query(None, description="Filter by ward"),
    status: Optional[str] = Query("active"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    authorization: str = Header(...)
):
    """List all patients with optional filters."""
    try:
        supabase = get_supabase_admin()
        query = supabase.table("patients").select("*")

        if status:
            query = query.eq("status", status)
        if risk_level:
            query = query.eq("risk_level", risk_level)
        if ward:
            query = query.eq("ward", ward)
        if search:
            query = query.ilike("name", f"%{search}%")

        result = (
            query
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        return [PatientResponse(**p) for p in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch patients: {str(e)}")


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, authorization: str = Header(...)):
    """Get a single patient's details."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("patients")
            .select("*")
            .eq("id", patient_id)
            .single()
            .execute()
        )
        return PatientResponse(**result.data)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Patient not found: {str(e)}")


@router.post("/", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, authorization: str = Header(...)):
    """Add a new patient with automatic risk assessment."""
    # Verify role
    role = get_current_user_role(authorization)
    if role not in ("doctor", "nurse"):
        raise HTTPException(status_code=403, detail="Only doctors and nurses can add patients")

    user_id = get_current_user_id(authorization)

    try:
        # Calculate risk score
        risk = calculate_risk_score(
            sensory_score=patient.sensory_score,
            moisture_score=patient.moisture_score,
            activity_score=patient.activity_score,
            mobility_score=patient.mobility_score,
            nutrition_score=patient.nutrition_score,
            friction_score=patient.friction_score,
            patient_age=patient.age
        )

        # Build patient data
        patient_data = patient.model_dump()
        if patient_data.get("admission_date"):
            patient_data["admission_date"] = str(patient_data["admission_date"])
        patient_data["overall_risk_score"] = risk["risk_score"]
        patient_data["risk_level"] = risk["risk_level"]
        patient_data["added_by"] = user_id

        # Insert patient
        supabase = get_supabase_admin()
        result = supabase.table("patients").insert(patient_data).execute()
        new_patient = result.data[0]

        # Save initial risk history
        risk_history_data = {
            "patient_id": new_patient["id"],
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "sensory_score": patient.sensory_score,
            "moisture_score": patient.moisture_score,
            "activity_score": patient.activity_score,
            "mobility_score": patient.mobility_score,
            "nutrition_score": patient.nutrition_score,
            "friction_score": patient.friction_score,
            "contributing_factors": risk["contributing_factors"],
            "recommendations": risk["recommendations"],
            "assessed_by": user_id
        }
        supabase.table("risk_history").insert(risk_history_data).execute()

        # Generate new patient alert
        create_alert(
            patient_id=new_patient["id"],
            patient_name=patient.name,
            alert_type="new_patient",
            severity=risk["risk_level"] if risk["risk_level"] in ("critical", "high") else "medium",
            risk_score=risk["risk_score"],
            risk_level=risk["risk_level"]
        )

        # Generate risk alerts if needed
        generate_alerts_for_patient(
            patient_id=new_patient["id"],
            patient_name=patient.name,
            risk_score=risk["risk_score"],
            risk_level=risk["risk_level"]
        )

        return PatientResponse(**new_patient)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create patient: {str(e)}")


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    update_data: PatientUpdate,
    authorization: str = Header(...)
):
    """Update patient details and recompute risk if scores changed."""
    role = get_current_user_role(authorization)
    if role not in ("doctor", "nurse"):
        raise HTTPException(status_code=403, detail="Only doctors and nurses can update patients")

    user_id = get_current_user_id(authorization)

    try:
        supabase = get_supabase_admin()

        # Get current patient data
        current = (
            supabase.table("patients")
            .select("*")
            .eq("id", patient_id)
            .single()
            .execute()
        )
        current_data = current.data
        previous_risk_level = current_data.get("risk_level", "low")

        update_dict = update_data.model_dump(exclude_none=True)
        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Check if any Braden scores changed → recompute risk
        score_fields = ["sensory_score", "moisture_score", "activity_score",
                        "mobility_score", "nutrition_score", "friction_score"]
        scores_changed = any(f in update_dict for f in score_fields)

        if scores_changed:
            # Merge current scores with updates
            merged = {**current_data, **update_dict}
            risk = calculate_risk_score(
                sensory_score=merged["sensory_score"],
                moisture_score=merged["moisture_score"],
                activity_score=merged["activity_score"],
                mobility_score=merged["mobility_score"],
                nutrition_score=merged["nutrition_score"],
                friction_score=merged["friction_score"],
                patient_age=merged.get("age")
            )
            update_dict["overall_risk_score"] = risk["risk_score"]
            update_dict["risk_level"] = risk["risk_level"]

            # Save to risk history
            risk_history_data = {
                "patient_id": patient_id,
                "risk_score": risk["risk_score"],
                "risk_level": risk["risk_level"],
                "sensory_score": merged["sensory_score"],
                "moisture_score": merged["moisture_score"],
                "activity_score": merged["activity_score"],
                "mobility_score": merged["mobility_score"],
                "nutrition_score": merged["nutrition_score"],
                "friction_score": merged["friction_score"],
                "contributing_factors": risk["contributing_factors"],
                "recommendations": risk["recommendations"],
                "assessed_by": user_id
            }
            supabase.table("risk_history").insert(risk_history_data).execute()

            # Generate alerts if risk increased
            generate_alerts_for_patient(
                patient_id=patient_id,
                patient_name=merged.get("name", current_data.get("name", "Unknown")),
                risk_score=risk["risk_score"],
                risk_level=risk["risk_level"],
                previous_risk_level=previous_risk_level
            )

        # Update patient
        result = (
            supabase.table("patients")
            .update(update_dict)
            .eq("id", patient_id)
            .execute()
        )

        return PatientResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update patient: {str(e)}")


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, authorization: str = Header(...)):
    """Delete a patient (doctor/nurse only)."""
    role = get_current_user_role(authorization)
    if role not in ("doctor", "nurse"):
        raise HTTPException(status_code=403, detail="Only doctors and nurses can delete patients")

    try:
        supabase = get_supabase_admin()
        supabase.table("patients").delete().eq("id", patient_id).execute()
        return {"message": "Patient deleted successfully", "patient_id": patient_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete patient: {str(e)}")


@router.get("/{patient_id}/risk-history", response_model=List[RiskHistoryResponse])
async def get_risk_history(
    patient_id: str,
    limit: int = Query(20, ge=1, le=100),
    authorization: str = Header(...)
):
    """Get risk assessment history for a patient."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("risk_history")
            .select("*")
            .eq("patient_id", patient_id)
            .order("assessed_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [RiskHistoryResponse(**r) for r in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch risk history: {str(e)}")


@router.post("/assess-risk", response_model=RiskAssessmentResponse)
async def assess_risk(request: RiskAssessmentRequest):
    """Run a standalone risk assessment (preview without saving)."""
    risk = calculate_risk_score(
        sensory_score=request.sensory_score,
        moisture_score=request.moisture_score,
        activity_score=request.activity_score,
        mobility_score=request.mobility_score,
        nutrition_score=request.nutrition_score,
        friction_score=request.friction_score,
        patient_age=request.patient_age
    )

    return RiskAssessmentResponse(
        risk_score=risk["risk_score"],
        risk_level=risk["risk_level"],
        contributing_factors=risk["contributing_factors"],
        recommendations=risk["recommendations"],
        subscale_details=risk["subscale_details"]
    )
