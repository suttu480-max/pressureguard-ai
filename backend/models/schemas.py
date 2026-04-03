from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


# ── Enums ──────────────────────────────────────────────

class UserRole(str, Enum):
    DOCTOR = "doctor"
    NURSE = "nurse"
    CAREGIVER = "caregiver"


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class PatientStatus(str, Enum):
    ACTIVE = "active"
    DISCHARGED = "discharged"
    TRANSFERRED = "transferred"


class AlertType(str, Enum):
    RISK_INCREASE = "risk_increase"
    CRITICAL_RISK = "critical_risk"
    REASSESSMENT_DUE = "reassessment_due"
    POSITION_CHANGE = "position_change"
    NEW_PATIENT = "new_patient"


class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ── Auth Schemas ───────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole = UserRole.CAREGIVER


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    full_name: str
    role: str


# ── Profile Schemas ────────────────────────────────────

class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    created_at: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Patient Schemas ────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    age: int = Field(ge=1, le=150)
    gender: Gender
    admission_date: Optional[date] = None
    ward: str
    bed_number: str
    diagnosis: Optional[str] = None
    medical_history: Optional[str] = None
    sensory_score: int = Field(ge=1, le=4, default=3)
    moisture_score: int = Field(ge=1, le=4, default=3)
    activity_score: int = Field(ge=1, le=4, default=3)
    mobility_score: int = Field(ge=1, le=4, default=3)
    nutrition_score: int = Field(ge=1, le=4, default=3)
    friction_score: int = Field(ge=1, le=3, default=3)
    notes: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=1, le=150)
    gender: Optional[Gender] = None
    ward: Optional[str] = None
    bed_number: Optional[str] = None
    diagnosis: Optional[str] = None
    medical_history: Optional[str] = None
    sensory_score: Optional[int] = Field(default=None, ge=1, le=4)
    moisture_score: Optional[int] = Field(default=None, ge=1, le=4)
    activity_score: Optional[int] = Field(default=None, ge=1, le=4)
    mobility_score: Optional[int] = Field(default=None, ge=1, le=4)
    nutrition_score: Optional[int] = Field(default=None, ge=1, le=4)
    friction_score: Optional[int] = Field(default=None, ge=1, le=3)
    status: Optional[PatientStatus] = None
    notes: Optional[str] = None


class PatientResponse(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    admission_date: Optional[str] = None
    ward: str
    bed_number: str
    diagnosis: Optional[str] = None
    medical_history: Optional[str] = None
    sensory_score: int
    moisture_score: int
    activity_score: int
    mobility_score: int
    nutrition_score: int
    friction_score: int
    overall_risk_score: int
    risk_level: str
    status: Optional[str] = "active"
    added_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ── Risk Schemas ───────────────────────────────────────

class RiskAssessmentRequest(BaseModel):
    sensory_score: int = Field(ge=1, le=4)
    moisture_score: int = Field(ge=1, le=4)
    activity_score: int = Field(ge=1, le=4)
    mobility_score: int = Field(ge=1, le=4)
    nutrition_score: int = Field(ge=1, le=4)
    friction_score: int = Field(ge=1, le=3)
    patient_age: Optional[int] = None


class RiskAssessmentResponse(BaseModel):
    risk_score: int
    risk_level: str
    contributing_factors: List[str]
    recommendations: List[str]
    subscale_details: dict


class RiskHistoryResponse(BaseModel):
    id: str
    patient_id: str
    risk_score: int
    risk_level: str
    contributing_factors: Optional[list] = []
    recommendations: Optional[list] = []
    assessed_by: Optional[str] = None
    assessed_at: Optional[str] = None


# ── Alert Schemas ──────────────────────────────────────

class AlertResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    message: str
    is_read: bool
    is_acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    created_at: Optional[str] = None


class AlertAcknowledge(BaseModel):
    user_id: str


# ── Dashboard Schemas ─────────────────────────────────

class DashboardStats(BaseModel):
    total_patients: int
    critical_count: int
    high_risk_count: int
    moderate_count: int
    low_risk_count: int
    active_alerts: int
    assessments_today: int


class RiskTrend(BaseModel):
    date: str
    critical: int
    high: int
    moderate: int
    low: int
