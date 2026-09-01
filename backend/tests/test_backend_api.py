"""Backend API tests for Nearby Friends app."""
import asyncio
import json
import pytest
import requests
import websockets


# ------- Auth -------
class TestAuth:
    def test_login_success(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/auth/login",
                            json={"email": "alex@example.com", "password": "Password123!"})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and data["access_token"]
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "alex@example.com"
        assert data["user"]["id"] == "usr_alex_001"
        assert "password_hash" not in data["user"]
        assert "_id" not in data["user"]

    def test_login_wrong_password(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/auth/login",
                            json={"email": "alex@example.com", "password": "wrong"})
        assert r.status_code == 401

    def test_register_underage_403(self, api_client, base_url):
        # DOB indicating age 10
        payload = {
            "name": "Kid User",
            "email": f"TEST_kid_{__import__('uuid').uuid4().hex[:6]}@example.com",
            "password": "Password123!",
            "dob": "2016-01-01",
        }
        r = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert r.status_code == 403
        assert "18" in r.json().get("detail", "")

    def test_register_adult_success(self, api_client, base_url):
        payload = {
            "name": "TEST Adult",
            "email": f"TEST_adult_{__import__('uuid').uuid4().hex[:6]}@example.com",
            "password": "Password123!",
            "dob": "1995-01-01",
        }
        r = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert r.status_code == 200, r.text
        assert "access_token" in r.json()


# ------- Presence -------
class TestPresence:
    def test_heartbeat_updates_online(self, api_client, base_url, alex_auth, alex_token):
        r = api_client.post(f"{base_url}/api/presence/heartbeat", headers=alex_auth)
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "last_active" in body
        # Verify user is now marked online via /api/auth/me
        me = api_client.get(f"{base_url}/api/auth/me", headers=alex_auth)
        assert me.status_code == 200
        assert me.json().get("is_online") is True

    def test_heartbeat_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/presence/heartbeat")
        assert r.status_code == 401


# ------- Nearby -------
class TestNearby:
    def test_nearby_online_first_sort(self, api_client, base_url, alex_auth):
        # Ensure alex online
        api_client.post(f"{base_url}/api/presence/heartbeat", headers=alex_auth)
        r = api_client.get(f"{base_url}/api/nearby?radius_km=50", headers=alex_auth)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) > 0
        for u in users:
            assert "is_online" in u
            assert "distance_km" in u
            assert isinstance(u["distance_km"], (int, float))
        # Online-first ordering
        seen_offline = False
        for u in users:
            if not u["is_online"]:
                seen_offline = True
            else:
                assert not seen_offline, "Online user appeared after an offline user"
        # Within online group sorted by distance
        online = [u["distance_km"] for u in users if u["is_online"]]
        assert online == sorted(online)


# ------- Friends -------
class TestFriends:
    def test_friends_online_and_distance(self, api_client, base_url, alex_auth):
        # Ensure priya is online too
        r_priya_login = api_client.post(f"{base_url}/api/auth/login",
                                         json={"email": "priya@example.com", "password": "Password123!"})
        p_token = r_priya_login.json()["access_token"]
        api_client.post(f"{base_url}/api/presence/heartbeat",
                        headers={"Authorization": f"Bearer {p_token}"})
        r = api_client.get(f"{base_url}/api/friends", headers=alex_auth)
        assert r.status_code == 200
        friends = r.json()
        assert isinstance(friends, list)
        assert any(f["id"] == "usr_priya_002" for f in friends)
        for f in friends:
            assert "is_online" in f and "distance_km" in f
        online = [f["distance_km"] for f in friends if f["is_online"]]
        assert online == sorted(online)

    def test_friend_request_flow(self, api_client, base_url, alex_auth):
        # Register a temp target user
        temp_email = f"TEST_tgt_{__import__('uuid').uuid4().hex[:6]}@example.com"
        reg = api_client.post(f"{base_url}/api/auth/register", json={
            "name": "TEST Target", "email": temp_email,
            "password": "Password123!", "dob": "1995-01-01"
        })
        assert reg.status_code == 200
        tgt_user_id = reg.json()["user"]["id"]
        tgt_token = reg.json()["access_token"]

        # Alex sends request
        send = api_client.post(f"{base_url}/api/friends/request/send",
                               headers=alex_auth,
                               json={"target_user_id": tgt_user_id})
        assert send.status_code == 200
        assert send.json()["status"] == "sent"
        req_id = send.json()["request_id"]

        # Target fetches requests, accepts
        tgt_headers = {"Authorization": f"Bearer {tgt_token}", "Content-Type": "application/json"}
        reqs = api_client.get(f"{base_url}/api/friends/requests", headers=tgt_headers)
        assert reqs.status_code == 200
        assert any(x["request_id"] == req_id for x in reqs.json())

        resp = api_client.post(f"{base_url}/api/friends/request/respond",
                               headers=tgt_headers,
                               json={"request_id": req_id, "action": "accept"})
        assert resp.status_code == 200 and resp.json()["status"] == "accepted"

    def test_friend_request_reject(self, api_client, base_url, alex_auth):
        temp_email = f"TEST_rej_{__import__('uuid').uuid4().hex[:6]}@example.com"
        reg = api_client.post(f"{base_url}/api/auth/register", json={
            "name": "TEST Reject", "email": temp_email,
            "password": "Password123!", "dob": "1995-01-01"
        })
        tgt_user_id = reg.json()["user"]["id"]
        tgt_token = reg.json()["access_token"]

        send = api_client.post(f"{base_url}/api/friends/request/send",
                               headers=alex_auth, json={"target_user_id": tgt_user_id})
        req_id = send.json()["request_id"]

        tgt_headers = {"Authorization": f"Bearer {tgt_token}", "Content-Type": "application/json"}
        resp = api_client.post(f"{base_url}/api/friends/request/respond",
                               headers=tgt_headers,
                               json={"request_id": req_id, "action": "reject"})
        assert resp.status_code == 200 and resp.json()["status"] == "rejected"


# ------- Feed / Notifications / Chats -------
class TestBasicReads:
    def test_feed(self, api_client, base_url, alex_auth):
        r = api_client.get(f"{base_url}/api/feed", headers=alex_auth)
        assert r.status_code == 200
        body = r.json()
        assert "stories" in body and "posts" in body
        assert isinstance(body["posts"], list) and len(body["posts"]) > 0

    def test_notifications(self, api_client, base_url, alex_auth):
        r = api_client.get(f"{base_url}/api/notifications", headers=alex_auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_chats(self, api_client, base_url, alex_auth):
        r = api_client.get(f"{base_url}/api/chats", headers=alex_auth)
        assert r.status_code == 200
        chats = r.json()
        assert isinstance(chats, list)
        assert any(c["partner_id"] == "usr_priya_002" for c in chats)


# ------- Live Connect Report -------
class TestLiveReport:
    def test_report(self, api_client, base_url, alex_auth):
        r = api_client.post(f"{base_url}/api/live/report", headers=alex_auth,
                            json={"reported_user_id": "usr_sam_003",
                                  "reason": "Inappropriate content",
                                  "details": "TEST report"})
        assert r.status_code == 200
        assert r.json()["status"] == "reported"


# ------- Live Connect WebSocket Matchmaking -------
class TestLiveWebSocket:
    def _ws_url(self, base_url, user_id):
        # Convert https:// to wss:// and http:// to ws://
        if base_url.startswith("https://"):
            return "wss://" + base_url[len("https://"):] + f"/api/live/ws/{user_id}"
        return "ws://" + base_url[len("http://"):] + f"/api/live/ws/{user_id}"

    def test_matchmaking_and_signal(self, base_url):
        async def run():
            url_a = self._ws_url(base_url, "usr_alex_001")
            url_p = self._ws_url(base_url, "usr_priya_002")
            async with websockets.connect(url_a) as ws_a, websockets.connect(url_p) as ws_p:
                # Alex joins queue first (will be waiting)
                await ws_a.send(json.dumps({"type": "join_queue"}))
                resp_a = json.loads(await asyncio.wait_for(ws_a.recv(), timeout=5))
                assert resp_a.get("status") == "queued", f"Expected queued, got {resp_a}"

                # Priya joins queue -> should get matched status
                await ws_p.send(json.dumps({"type": "join_queue"}))
                resp_p = json.loads(await asyncio.wait_for(ws_p.recv(), timeout=5))
                assert resp_p.get("status") == "matched", f"Priya expected matched, got {resp_p}"
                assert "session_id" in resp_p
                assert resp_p.get("is_initiator") is False
                assert resp_p["peer"]["id"] == "usr_alex_001"
                session_id = resp_p["session_id"]

                # Alex should now receive match_found push
                push_a = json.loads(await asyncio.wait_for(ws_a.recv(), timeout=5))
                assert push_a.get("type") == "match_found"
                assert push_a["session_id"] == session_id
                assert push_a["is_initiator"] is True
                assert push_a["peer"]["id"] == "usr_priya_002"

                # Priya sends an offer signal, alex should receive webrtc_signal
                await ws_p.send(json.dumps({
                    "type": "signal",
                    "session_id": session_id,
                    "target_user_id": "usr_alex_001",
                    "signal_type": "offer",
                    "data": {"sdp": "TEST_SDP"}
                }))
                sig = json.loads(await asyncio.wait_for(ws_a.recv(), timeout=5))
                assert sig.get("type") == "webrtc_signal"
                assert sig.get("signal_type") == "offer"
                assert sig.get("data", {}).get("sdp") == "TEST_SDP"
                assert sig.get("sender_id") == "usr_priya_002"

                # cleanup queues
                await ws_a.send(json.dumps({"type": "leave_queue"}))
                await ws_p.send(json.dumps({"type": "leave_queue"}))

        asyncio.get_event_loop().run_until_complete(run())
