import os
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environmental configs
load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "default_cygnal_security_token_handshake_secret_key_2026")
JWT_EXPIRY = os.getenv("JWT_EXPIRY", "3d")

def get_expiry_delta():
    try:
        if JWT_EXPIRY.endswith("d"):
            days = int(JWT_EXPIRY[:-1])
            return timedelta(days=days)
        elif JWT_EXPIRY.endswith("h"):
            hours = int(JWT_EXPIRY[:-1])
            return timedelta(hours=hours)
    except:
        return timedelta(days=3)

def create_token(payload: dict) -> str:
    expiry = datetime.utcnow() + get_expiry_delta()
    payload["exp"] = expiry
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
