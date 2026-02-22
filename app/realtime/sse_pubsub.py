# SSE + Redis Pub/Sub: 실시간 midpoint 갱신
# SSE: 폴링 없이 서버→클라이언트 푸시로 실시간 UX (long-lived connection → 예외 처리 필수)
# Redis Pub/Sub: 멀티 워커 환경에서도 확장 가능, 발행/구독 분리

import asyncio
import json
import os
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Optional

import redis.asyncio as redis

# Docker 환경에서는 localhost가 아니라 서비스명(redis)을 사용해야 함
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CHANNEL_PREFIX = "meetup:"
CHANNEL_SUFFIX = ":midpoint"
HEARTBEAT_INTERVAL = 15.0

# 모듈 단일 클라이언트 재사용 (매 루프마다 새 연결 생성 방지)
redis_client = redis.from_url(REDIS_URL, decode_responses=True)


def _channel(meetup_id: int) -> str:
    return f"{CHANNEL_PREFIX}{meetup_id}{CHANNEL_SUFFIX}"


async def publish_midpoint_update(meetup_id: int, midpoint: Optional[Dict[str, float]]) -> None:
    """join/leave commit 후 라우터에서 호출. Redis에 midpoint 이벤트 발행 (구독자와 동일 async 클라이언트 사용)."""
    payload = {
        "type": "midpoint_updated",
        "meetup_id": meetup_id,
        "midpoint": midpoint,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await redis_client.publish(_channel(meetup_id), json.dumps(payload))
    except Exception:
        pass  # Redis 미기동 시 스트림만 실패, join/leave는 유지


async def stream_midpoint_events(meetup_id: int) -> AsyncGenerator[str, None]:
    """
    GET /meetups/{id}/midpoint/stream 용.
    Redis 채널 구독 → SSE 형식으로 yield. 약 15초마다 heartbeat.
    SSE는 long-lived connection이므로 예외·연결 해제 처리 필수.
    """
    channel = _channel(meetup_id)
    pubsub = redis_client.pubsub()
    try:
        await pubsub.subscribe(channel)
        last_heartbeat = datetime.now(timezone.utc).timestamp()

        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            now = datetime.now(timezone.utc).timestamp()
            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                yield ": ping\n\n"
                last_heartbeat = now
            if message and message.get("type") == "message":
                data = message.get("data") or ""
                yield f"event: midpoint_updated\ndata: {data}\n\n"
    except asyncio.CancelledError:
        # 클라이언트 연결 끊김 등으로 태스크 취소 시 정리
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
