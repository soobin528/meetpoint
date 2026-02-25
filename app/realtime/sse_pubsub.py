# SSE + Redis Pub/Sub: 실시간 midpoint 갱신
# SSE: 폴링 없이 서버→클라이언트 푸시로 실시간 UX (long-lived connection → 예외 처리 필수)
# Redis Pub/Sub: 멀티 워커 환경에서도 확장 가능, 발행/구독 분리

import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

import redis.asyncio as redis

# Docker 환경에서는 localhost가 아니라 서비스명(redis)을 사용해야 함
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CHANNEL_PREFIX = "meetup:"
CHANNEL_SUFFIX = ":midpoint"
CHANNEL_SUFFIX_POI = ":poi"
HEARTBEAT_INTERVAL = 15.0

# 모듈 단일 클라이언트 재사용 (매 루프마다 새 연결 생성 방지)
redis_client = redis.from_url(REDIS_URL, decode_responses=True)


def _channel(meetup_id: int) -> str:
    return f"{CHANNEL_PREFIX}{meetup_id}{CHANNEL_SUFFIX}"


def _channel_poi(meetup_id: int) -> str:
    return f"{CHANNEL_PREFIX}{meetup_id}{CHANNEL_SUFFIX_POI}"


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


async def publish_poi_update(
    meetup_id: int,
    midpoint: Optional[Dict[str, float]],
    pois: List[Dict[str, Any]],
) -> None:
    """POI 갱신 시 SSE 구독자에게 poi_updated 이벤트 발행."""
    payload = {
        "meetup_id": meetup_id,
        "midpoint": midpoint,
        "pois": pois,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await redis_client.publish(_channel_poi(meetup_id), json.dumps(payload, ensure_ascii=False))
    except Exception:
        pass


async def publish_poi_confirmed(
    meetup_id: int,
    poi: Dict[str, Any],
) -> None:
    """POI 확정 시 meetup:{id}:poi 채널로 발행 → SSE에서 event: poi_confirmed 로 전달."""
    payload = {
        "type": "poi_confirmed",
        "meetup_id": meetup_id,
        "poi": poi,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await redis_client.publish(_channel_poi(meetup_id), json.dumps(payload, ensure_ascii=False))
    except Exception:
        pass


async def publish_meetup_status_changed(meetup_id: int, status: str) -> None:
    """모임 상태 변경 시 meetup:{id}:poi 채널로 발행 → SSE에서 event: meetup_status_changed 로 전달."""
    payload = {
        "type": "meetup_status_changed",
        "meetup_id": meetup_id,
        "status": status,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await redis_client.publish(_channel_poi(meetup_id), json.dumps(payload))
    except Exception:
        pass


async def stream_midpoint_events(meetup_id: int) -> AsyncGenerator[str, None]:
    """
    GET /meetups/{id}/midpoint/stream 용.
    midpoint + poi 채널 구독 → SSE로 전달. midpoint_updated / poi_updated 모두 전송.
    SSE는 long-lived connection이므로 예외·연결 해제 처리 필수.
    """
    channel_mid = _channel(meetup_id)
    channel_poi = _channel_poi(meetup_id)
    pubsub = redis_client.pubsub()
    try:
        await pubsub.subscribe(channel_mid, channel_poi)
        last_heartbeat = datetime.now(timezone.utc).timestamp()

        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            now = datetime.now(timezone.utc).timestamp()
            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                yield ": ping\n\n"
                last_heartbeat = now
            if message and message.get("type") == "message":
                data = message.get("data") or ""
                ch = message.get("channel") or ""
                if ch == channel_poi:
                    # poi 채널: payload의 type에 따라 poi_confirmed / meetup_status_changed / poi_updated 구분
                    try:
                        parsed = json.loads(data)
                        t = parsed.get("type")
                        if t == "meetup_status_changed":
                            event_name = "meetup_status_changed"
                        elif t == "poi_confirmed":
                            event_name = "poi_confirmed"
                        else:
                            event_name = "poi_updated"
                    except Exception:
                        event_name = "poi_updated"
                else:
                    event_name = "midpoint_updated"
                yield f"event: {event_name}\ndata: {data}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe(channel_mid, channel_poi)
        await pubsub.close()
