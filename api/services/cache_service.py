import os
import json
import logging
import redis
from typing import Any, Optional

logger = logging.getLogger("cygnal.cache_service")
REDIS_URL = os.getenv("REDIS_URL")

redis_client = None
_redis_disabled = False

if REDIS_URL:
    try:
        # Pass socket_timeout and socket_connect_timeout to fail fast (500ms max timeout)
        redis_client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=0.5
        )
        logger.info("[CACHE] Initialized Redis connection successfully.")
    except Exception as e:
        logger.warning(f"[CACHE] Failed to initialize Redis client: {str(e)}")
        _redis_disabled = True

def get_cache_key(tenant_id: int, cache_type: str, key: str) -> str:
    """Generates a standardized tenant-aware cache key namespace."""
    return f"cygnal:tenant:{tenant_id}:{cache_type}:{key}"

def get_cached(tenant_id: int, cache_type: str, key: str) -> Optional[Any]:
    """Retrieve value from cache. Returns None on cache miss or errors."""
    global _redis_disabled
    if _redis_disabled or not redis_client:
        return None
    cache_key = get_cache_key(tenant_id, cache_type, key)
    try:
        val = redis_client.get(cache_key)
        if val is not None:
            return json.loads(val)
    except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
        logger.warning("[CACHE] Redis connection lost. Bypassing Redis cache.")
        _redis_disabled = True
    except Exception as e:
        logger.debug(f"[CACHE ERROR] Failed to fetch key {cache_key}: {str(e)}")
    return None

def set_cached(tenant_id: int, cache_type: str, key: str, value: Any, ttl: int = 3600) -> bool:
    """Write value to cache with a TTL (seconds). Returns True on success."""
    global _redis_disabled
    if _redis_disabled or not redis_client:
        return False
    cache_key = get_cache_key(tenant_id, cache_type, key)
    try:
        redis_client.set(cache_key, json.dumps(value), ex=ttl)
        return True
    except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
        logger.warning("[CACHE] Redis connection lost. Bypassing Redis cache.")
        _redis_disabled = True
    except Exception as e:
        logger.debug(f"[CACHE ERROR] Failed to set key {cache_key}: {str(e)}")
    return False

def invalidate_cache(tenant_id: int, cache_type: str, key: Optional[str] = None) -> bool:
    """Invalidate cache keys. If key is None, invalidates the entire cache_type namespace."""
    global _redis_disabled
    if _redis_disabled or not redis_client:
        return False
    try:
        if key:
            cache_key = get_cache_key(tenant_id, cache_type, key)
            redis_client.delete(cache_key)
        else:
            # Pattern search and bulk delete
            pattern = f"cygnal:tenant:{tenant_id}:{cache_type}:*"
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
        return True
    except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
        logger.warning("[CACHE] Redis connection lost. Bypassing Redis cache.")
        _redis_disabled = True
    except Exception as e:
        logger.debug(f"[CACHE ERROR] Failed to invalidate pattern/key: {str(e)}")
    return False

def ping_redis() -> bool:
    """Pings Redis to check health status."""
    global _redis_disabled
    if _redis_disabled or not redis_client:
        return False
    try:
        return bool(redis_client.ping())
    except Exception:
        _redis_disabled = True
        return False
