# Meetup State (Status) – Verification

## 1. Apply migration 006

```bash
# In container or host (with DB reachable)
alembic upgrade head
```

## 2. GET /meetups/{id} – response shape

After 006, a single meetup response includes `status`, `current_count`, `midpoint`, and `confirmed_poi`:

```bash
curl -s http://localhost:8000/meetups/1 | jq
```

Expected (example):

```json
{
  "id": 1,
  "status": "RECRUITING",
  "title": "Coffee",
  "description": null,
  "capacity": 10,
  "current_count": 0,
  "lat": 37.5,
  "lng": 127.0,
  "midpoint": null,
  "confirmed_poi": null,
  "distance_km": null
}
```

After confirm-poi:

```json
{
  "id": 1,
  "status": "CONFIRMED",
  "title": "Coffee",
  "capacity": 10,
  "current_count": 2,
  "lat": 37.5,
  "lng": 127.0,
  "midpoint": { "lat": 37.501, "lng": 127.001 },
  "confirmed_poi": {
    "name": "Starbucks",
    "lat": 37.502,
    "lng": 127.002,
    "address": "Seoul",
    "confirmed_at": "2025-02-11T12:00:00+00:00"
  },
  "distance_km": null
}
```

## 3. Confirm-POI → status CONFIRMED + SSE event

1. Create meetup, then confirm POI:

```bash
# Create
MEETUP_ID=$(curl -s -X POST http://localhost:8000/meetups \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","capacity":5,"lat":37.5,"lng":127.0}' | jq -r .id)

# Confirm POI
curl -s -X POST "http://localhost:8000/meetups/$MEETUP_ID/confirm-poi" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cafe A","lat":37.51,"lng":127.01,"address":"Seoul"}' | jq
```

Expected response includes `"status": "CONFIRMED"`.

2. In another terminal, open SSE stream then trigger confirm-poi:

```bash
# Terminal 1 – stream (replace 1 with your meetup id)
curl -s -N http://localhost:8000/meetups/1/midpoint/stream
```

Then in Terminal 2 call `POST .../confirm-poi`. In the stream you should see:

```
event: poi_confirmed
data: {"type":"poi_confirmed","meetup_id":1,"poi":{...},"ts":"..."}

event: meetup_status_changed
data: {"type":"meetup_status_changed","meetup_id":1,"status":"CONFIRMED","ts":"..."}
```

## 4. 409 when join/leave after CONFIRMED

1. Confirm a meetup (so `status` becomes `CONFIRMED`).
2. Call join:

```bash
curl -s -w "\n%{http_code}" -X POST "http://localhost:8000/meetups/$MEETUP_ID/join" \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"lat":37.5,"lng":127.0}'
```

Expected: HTTP **409**, body e.g. `{"detail":"Meetup already confirmed; joining/leaving is not allowed"}`.

3. Same for leave:

```bash
curl -s -w "\n%{http_code}" -X DELETE "http://localhost:8000/meetups/$MEETUP_ID/leave" \
  -H "Content-Type: application/json" \
  -d '{"user_id":1}'
```

Expected: HTTP **409** with the same message.

## 5. 409 when confirm-poi again (already CONFIRMED)

```bash
# Second confirm on same meetup
curl -s -w "\n%{http_code}" -X POST "http://localhost:8000/meetups/$MEETUP_ID/confirm-poi" \
  -H "Content-Type: application/json" \
  -d '{"name":"Other","lat":37.52,"lng":127.02,"address":"Elsewhere"}'
```

Expected: HTTP **409**, body e.g. `{"detail":"Transition from CONFIRMED to CONFIRMED is not allowed. From CONFIRMED only allowed: FINISHED."}` (or similar transition message).

## 6. Status state machine: finish & cancel

Allowed transitions:

- **RECRUITING** → CONFIRMED (via confirm-poi), CANCELED (via cancel)
- **CONFIRMED** → FINISHED (via finish)
- **FINISHED** / **CANCELED** → no further transitions

### POST /meetups/{id}/finish (CONFIRMED → FINISHED)

```bash
# 1) Create and confirm a meetup so status=CONFIRMED
MEETUP_ID=$(curl -s -X POST http://localhost:8000/meetups \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish test","capacity":5,"lat":37.5,"lng":127.0}' | jq -r .id)
curl -s -X POST "http://localhost:8000/meetups/$MEETUP_ID/confirm-poi" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cafe","lat":37.51,"lng":127.01,"address":"Seoul"}' > /dev/null

# 2) Finish (allowed when CONFIRMED)
curl -s -X POST "http://localhost:8000/meetups/$MEETUP_ID/finish" | jq
# Expected: {"message":"Meetup finished.","status":"FINISHED"}

# 3) Finish again → 409 (no transition from FINISHED)
curl -s -w "\n%{http_code}" -X POST "http://localhost:8000/meetups/$MEETUP_ID/finish"
# Expected: 409, detail like "Transition from FINISHED to FINISHED is not allowed. From FINISHED only allowed: none."
```

### POST /meetups/{id}/cancel (RECRUITING → CANCELED)

```bash
# 1) Create a new meetup (status=RECRUITING)
CANCEL_ID=$(curl -s -X POST http://localhost:8000/meetups \
  -H "Content-Type: application/json" \
  -d '{"title":"Cancel test","capacity":5,"lat":37.5,"lng":127.0}' | jq -r .id)

# 2) Cancel (allowed when RECRUITING)
curl -s -X POST "http://localhost:8000/meetups/$CANCEL_ID/cancel" | jq
# Expected: {"message":"Meetup canceled.","status":"CANCELED"}

# 3) Cancel again → 409
curl -s -w "\n%{http_code}" -X POST "http://localhost:8000/meetups/$CANCEL_ID/cancel"
# Expected: 409, detail like "Transition from CANCELED to CANCELED is not allowed. From CANCELED only allowed: none."
```

### Invalid transitions (409)

- **Cancel when CONFIRMED**: `POST /meetups/{id}/cancel` on a confirmed meetup → 409 ("From CONFIRMED only allowed: FINISHED").
- **Finish when RECRUITING**: `POST /meetups/{id}/finish` on a recruiting meetup → 409 ("From RECRUITING only allowed: CONFIRMED, CANCELED").

### SSE after finish or cancel

With a client subscribed to `GET /meetups/{id}/midpoint/stream`, after calling finish or cancel you should see:

```
event: meetup_status_changed
data: {"type":"meetup_status_changed","meetup_id":<id>,"status":"FINISHED","ts":"..."}
```
or `"status":"CANCELED"` for cancel.

## 7. Swagger (OpenAPI)

- **GET /meetups/{meetup_id}**: Response schema includes `status`, `current_count`, `midpoint`, `confirmed_poi`.
- **POST confirm-poi**: First call (RECRUITING→CONFIRMED) → 200 and `status: CONFIRMED`; second call → 409 (transition not allowed).
- **POST join** / **DELETE leave**: After confirm → 409 "Meetup already confirmed; joining/leaving is not allowed".
- **POST /meetups/{id}/finish**: Allowed only when status=CONFIRMED → 200 and `status: FINISHED`; otherwise 409.
- **POST /meetups/{id}/cancel**: Allowed only when status=RECRUITING → 200 and `status: CANCELED`; otherwise 409.
