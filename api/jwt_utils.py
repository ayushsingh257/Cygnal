import os
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "default_secret_key")
JWT_EXPIRY = os.getenv("JWT_EXPIRY", "3d")

# Convert expiry string to timedelta
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

# Create a new JWT token
def create_token(payload):
    expiry = datetime.utcnow() + get_expiry_delta()
    payload["exp"] = expiry
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# Decode and verify a JWT token
def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None  # token expired
    except jwt.InvalidTokenError:
        return None  # token invalid
