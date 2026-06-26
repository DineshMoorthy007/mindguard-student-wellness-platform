from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User's registered email address")
    password: str = Field(..., description="User's login password")

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="Cryptographic refresh token")
    token_type: str = Field("bearer", description="Token type prefix (usually bearer)")
    expires_in: int = Field(900, description="Expiration time of the access token in seconds (15 minutes = 900s)")
