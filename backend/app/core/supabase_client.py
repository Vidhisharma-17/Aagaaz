from supabase import Client, create_client

from app.core.config import (
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
)


# Used for authentication operations
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
)


# Used ONLY by the trusted FastAPI backend
# for database operations.
supabase_admin: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)