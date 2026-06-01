import httpx
import jwt
from functools import lru_cache
from fastapi import HTTPException, status
from app.config import settings


@lru_cache(maxsize=1)
def _fetch_jwks() -> dict:
    resp = httpx.get(settings.CLERK_JWKS_URL, timeout=5)
    resp.raise_for_status()
    return resp.json()


def decode_clerk_jwt(token: str) -> dict:
    """Decode and verify a Clerk-issued JWT. Returns the payload dict."""
    try:
        jwks = _fetch_jwks()
        public_keys = {
            k["kid"]: jwt.algorithms.RSAAlgorithm.from_jwk(k)
            for k in jwks["keys"]
        }
        header = jwt.get_unverified_header(token)
        key = public_keys.get(header.get("kid"))
        if not key:
            _fetch_jwks.cache_clear()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown signing key")
        return jwt.decode(token, key, algorithms=["RS256"], options={"verify_aud": False})
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
