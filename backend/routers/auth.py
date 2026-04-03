"""
Authentication router — login, register, profile management via Supabase Auth.
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from config import get_supabase_client, get_supabase_admin
from models.schemas import (
    LoginRequest, RegisterRequest, AuthResponse,
    ProfileResponse, ProfileUpdate
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login with email and password."""
    try:
        supabase = get_supabase_client()
        result = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        user = result.user
        session = result.session

        # Fetch profile for role info
        profile = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
            .execute()
        )

        return AuthResponse(
            access_token=session.access_token,
            user_id=str(user.id),
            email=user.email,
            full_name=profile.data.get("full_name", "User"),
            role=profile.data.get("role", "caregiver")
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user with role."""
    try:
        supabase = get_supabase_client()

        result = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name,
                    "role": request.role.value
                }
            }
        })

        user = result.user
        session = result.session

        if not session:
            # Email confirmation may be required
            return AuthResponse(
                access_token="pending_confirmation",
                user_id=str(user.id),
                email=request.email,
                full_name=request.full_name,
                role=request.role.value
            )

        return AuthResponse(
            access_token=session.access_token,
            user_id=str(user.id),
            email=user.email,
            full_name=request.full_name,
            role=request.role.value
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(authorization: str = Header(...)):
    """Get current user's profile."""
    try:
        supabase = get_supabase_client()
        token = authorization.replace("Bearer ", "")

        # Verify token and get user
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        profile = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
            .execute()
        )

        return ProfileResponse(**profile.data)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(e)}")


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    update_data: ProfileUpdate,
    authorization: str = Header(...)
):
    """Update current user's profile."""
    try:
        supabase = get_supabase_client()
        token = authorization.replace("Bearer ", "")

        user_response = supabase.auth.get_user(token)
        user = user_response.user

        update_dict = update_data.model_dump(exclude_none=True)
        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = (
            supabase.table("profiles")
            .update(update_dict)
            .eq("id", user.id)
            .execute()
        )

        return ProfileResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Update failed: {str(e)}")


def get_current_user_id(authorization: str) -> str:
    """Helper to extract user ID from auth token."""
    try:
        supabase = get_supabase_client()
        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        return str(user_response.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user_role(authorization: str) -> str:
    """Helper to extract user role from auth token."""
    try:
        supabase = get_supabase_client()
        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        user_id = str(user_response.user.id)

        profile = (
            supabase.table("profiles")
            .select("role")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return profile.data.get("role", "caregiver")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
