import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
APP_ENV: str = os.getenv("APP_ENV", "development")


def get_supabase_client() -> Client:
    """Get a Supabase client using the anon key (respects RLS)."""
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_supabase_admin() -> Client:
    """Get a Supabase client using the service role key (bypasses RLS)."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
