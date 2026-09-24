from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import jwt
import os

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "adaptiq-development-secret")
JWT_ALGORITHM = "HS256"

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        return payload

    except jwt.ExpiredSignatureError:
        print("JWT ERROR: Token has expired")

        raise HTTPException(
            status_code=401,
            detail="Authentication token has expired"
        )

    except jwt.InvalidTokenError as e:
        print("JWT ERROR TYPE:", type(e).__name__)
        print("JWT ERROR:", str(e))

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )