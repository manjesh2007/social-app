from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date, timezone, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path
from bson import ObjectId
import os
import uuid
import jwt
import bcrypt
import logging
import json
import asyncio
import math

ROOT_DIR = Path(__file__).parent
from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'nearby_friends_db')
JWT_SECRET = os.environ.get('JWT_SECRET', 'nearby-friends-super-secure-jwt-secret-key-2026')
JWT_ALGORITHM = "HS256"
TOKEN_MINUTES = 60 * 24 * 7 # 7 days
MINIMUM_AGE = 18

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Nearby Friends API")
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)

# ----------------- Helper Functions -----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def make_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def calculate_age(dob_date: date) -> int:
    today = date.today()
    return today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))

PRESENCE_WINDOW_SECONDS = 90

def compute_is_online(user: Dict[str, Any]) -> bool:
    last = user.get("last_active")
    if not last:
        return bool(user.get("is_online", False))
    try:
        dt = datetime.fromisoformat(last)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - dt).total_seconds() <= PRESENCE_WINDOW_SECONDS
    except Exception:
        return bool(user.get("is_online", False))

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Haversine formula in KM
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Dict[str, Any]:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or credentials.scheme.lower() != "bearer":
        raise unauthorized
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
        user_id = payload.get("sub")
        if not user_id:
            raise unauthorized
    except Exception:
        raise unauthorized

    user = await db.users.find_one({"id": user_id, "deleted_at": None})
    if not user:
        # Fallback search by string id
        user = await db.users.find_one({"_id": user_id, "deleted_at": None})
    if not user:
        raise unauthorized
    return user

# ----------------- Models -----------------
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    dob: str # YYYY-MM-DD
    gender: Optional[str] = "Other"
    city: Optional[str] = "Mumbai"
    bio: Optional[str] = "Excited to meet nearby friends and connect live!"
    avatar: Optional[str] = None
    interests: Optional[List[str]] = ["Music", "Travel", "Coding", "Coffee"]
    latitude: Optional[float] = 19.0760
    longitude: Optional[float] = 72.8777

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[str] = None
    avatar: Optional[str] = None
    interests: Optional[List[str]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PostCreateRequest(BaseModel):
    caption: str
    image_url: Optional[str] = None
    location_name: Optional[str] = None
    tags: Optional[List[str]] = []
    visibility: Optional[str] = "public"

class CommentCreateRequest(BaseModel):
    text: str

class FriendActionRequest(BaseModel):
    target_user_id: str

class FriendRespondRequest(BaseModel):
    request_id: str
    action: str # "accept" or "reject"

class SendMessageRequest(BaseModel):
    chat_id: Optional[str] = None
    recipient_id: str
    text: str
    image_url: Optional[str] = None

class LiveMatchRequest(BaseModel):
    interests: Optional[List[str]] = []
    gender_preference: Optional[str] = "Any"
    max_distance_km: Optional[float] = None

class LiveSignalRequest(BaseModel):
    session_id: str
    target_user_id: str
    signal_type: str # "offer", "answer", "ice-candidate", "disconnect", "next"
    data: Dict[str, Any]

class LiveReportRequest(BaseModel):
    session_id: Optional[str] = None
    reported_user_id: str
    reason: str
    details: Optional[str] = None

# ----------------- In-Memory Matchmaking Queue & WebSockets -----------------
class MatchmakingManager:
    def __init__(self):
        # queue: list of {"user_id": str, "user_info": dict, "joined_at": datetime, "ws": WebSocket}
        self.queue: List[Dict[str, Any]] = []
        # active_sessions: session_id -> {"user1_id": str, "user2_id": str, "created_at": datetime}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        # user_ws: user_id -> WebSocket
        self.user_ws: Dict[str, WebSocket] = {}
        # user_active_session: user_id -> session_id
        self.user_session: Dict[str, str] = {}
        self.lock = asyncio.Lock()

    async def connect_user(self, user_id: str, ws: WebSocket):
        self.user_ws[user_id] = ws

    async def disconnect_user(self, user_id: str):
        async with self.lock:
            if user_id in self.user_ws:
                del self.user_ws[user_id]
            # Remove from queue if present
            self.queue = [item for item in self.queue if item["user_id"] != user_id]
            # Notify peer if currently in a live session
            session_id = self.user_session.get(user_id)
            if session_id and session_id in self.active_sessions:
                sess = self.active_sessions.pop(session_id, None)
                if sess:
                    peer_id = sess["user2_id"] if sess["user1_id"] == user_id else sess["user1_id"]
                    if peer_id in self.user_session:
                        del self.user_session[peer_id]
                    if peer_id in self.user_ws:
                        try:
                            await self.user_ws[peer_id].send_text(json.dumps({
                                "type": "peer_disconnected",
                                "message": "Partner left the live connect session."
                            }))
                        except Exception:
                            pass
                if user_id in self.user_session:
                    del self.user_session[user_id]

    async def join_queue(self, user: Dict[str, Any], preferences: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        async with self.lock:
            user_id = user["id"]
            # If user is already in a session, clean it up
            old_session_id = self.user_session.get(user_id)
            if old_session_id and old_session_id in self.active_sessions:
                sess = self.active_sessions.pop(old_session_id, None)
                if sess:
                    peer_id = sess["user2_id"] if sess["user1_id"] == user_id else sess["user1_id"]
                    if peer_id in self.user_session:
                        del self.user_session[peer_id]
                    if peer_id in self.user_ws:
                        try:
                            await self.user_ws[peer_id].send_text(json.dumps({
                                "type": "peer_disconnected",
                                "message": "Partner requested next match."
                            }))
                        except Exception:
                            pass
            
            # Remove self from queue if already waiting
            self.queue = [item for item in self.queue if item["user_id"] != user_id]

            # Look for a match in queue
            if len(self.queue) > 0:
                # Pop the first waiting user who is NOT self
                matched_item = None
                for idx, candidate in enumerate(self.queue):
                    if candidate["user_id"] != user_id:
                        matched_item = self.queue.pop(idx)
                        break

                if matched_item:
                    peer_id = matched_item["user_id"]
                    peer_info = matched_item["user_info"]
                    session_id = f"sess_{uuid.uuid4().hex[:12]}"

                    self.active_sessions[session_id] = {
                        "session_id": session_id,
                        "user1_id": user_id,
                        "user2_id": peer_id,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    self.user_session[user_id] = session_id
                    self.user_session[peer_id] = session_id

                    # Notify waiting peer (peer is initiator/offerer)
                    if peer_id in self.user_ws:
                        try:
                            await self.user_ws[peer_id].send_text(json.dumps({
                                "type": "match_found",
                                "session_id": session_id,
                                "is_initiator": True,
                                "peer": {
                                    "id": user["id"],
                                    "name": user["name"],
                                    "avatar": user.get("avatar"),
                                    "city": user.get("city", "Nearby"),
                                    "age": user.get("age", 22),
                                    "interests": user.get("interests", [])
                                }
                            }))
                        except Exception as e:
                            logger.error(f"Failed to notify matched peer {peer_id}: {e}")

                    # Return match result for the current requester (receiver/answerer)
                    return {
                        "status": "matched",
                        "session_id": session_id,
                        "is_initiator": False,
                        "peer": {
                            "id": peer_info["id"],
                            "name": peer_info["name"],
                            "avatar": peer_info.get("avatar"),
                            "city": peer_info.get("city", "Nearby"),
                            "age": peer_info.get("age", 22),
                            "interests": peer_info.get("interests", [])
                        }
                    }

            # If no match found yet, enqueue user
            self.queue.append({
                "user_id": user_id,
                "user_info": {
                    "id": user["id"],
                    "name": user["name"],
                    "avatar": user.get("avatar"),
                    "city": user.get("city", "Nearby"),
                    "age": user.get("age", 22),
                    "interests": user.get("interests", [])
                },
                "joined_at": datetime.now(timezone.utc)
            })
            return {"status": "queued", "message": "Looking for a match..."}

    async def leave_queue(self, user_id: str):
        async with self.lock:
            self.queue = [item for item in self.queue if item["user_id"] != user_id]
            session_id = self.user_session.pop(user_id, None)
            if session_id and session_id in self.active_sessions:
                sess = self.active_sessions.pop(session_id, None)
                if sess:
                    peer_id = sess["user2_id"] if sess["user1_id"] == user_id else sess["user1_id"]
                    if peer_id in self.user_session:
                        del self.user_session[peer_id]
                    if peer_id in self.user_ws:
                        try:
                            await self.user_ws[peer_id].send_text(json.dumps({
                                "type": "peer_disconnected",
                                "message": "Partner left the live session."
                            }))
                        except Exception:
                            pass

    async def forward_signal(self, sender_id: str, payload: Dict[str, Any]):
        session_id = payload.get("session_id")
        target_user_id = payload.get("target_user_id")
        signal_type = payload.get("signal_type")
        data = payload.get("data", {})

        if not target_user_id and session_id in self.active_sessions:
            sess = self.active_sessions[session_id]
            target_user_id = sess["user2_id"] if sess["user1_id"] == sender_id else sess["user1_id"]

        if target_user_id and target_user_id in self.user_ws:
            try:
                await self.user_ws[target_user_id].send_text(json.dumps({
                    "type": "webrtc_signal",
                    "session_id": session_id,
                    "sender_id": sender_id,
                    "signal_type": signal_type,
                    "data": data
                }))
            except Exception as e:
                logger.error(f"Error forwarding WebRTC signal to {target_user_id}: {e}")

matchmaker = MatchmakingManager()

# ----------------- DB Seeder Function -----------------
async def seed_initial_database():
    try:
        user_count = await db.users.count_documents({"deleted_at": None})
        if user_count > 0:
            logger.info("Database already populated with users.")
            return

        logger.info("Seeding initial demo users, stories, posts, and nearby friends...")
        dummy_password_hash = hash_password("Password123!")

        sample_users = [
            {
                "id": "usr_alex_001",
                "name": "Alex Rivera",
                "email": "alex@example.com",
                "password_hash": dummy_password_hash,
                "dob": "2001-05-15",
                "age": 23,
                "gender": "Non-binary",
                "city": "Mumbai",
                "bio": "Photographer, street foodie & music enthusiast 🎧 Let's connect live!",
                "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
                "interests": ["Photography", "Music", "Travel", "Indie Pop"],
                "latitude": 19.0760,
                "longitude": 72.8777,
                "is_online": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None
            },
            {
                "id": "usr_priya_002",
                "name": "Priya Sharma",
                "email": "priya@example.com",
                "password_hash": dummy_password_hash,
                "dob": "2000-08-20",
                "age": 24,
                "gender": "Female",
                "city": "Pune",
                "bio": "UX designer & coffee lover ☕ Always up for spontaneous video chats!",
                "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
                "interests": ["Design", "Coffee", "Yoga", "Books"],
                "latitude": 18.5204,
                "longitude": 73.8567,
                "is_online": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None
            },
            {
                "id": "usr_sam_003",
                "name": "Sam Taylor",
                "email": "sam@example.com",
                "password_hash": dummy_password_hash,
                "dob": "2002-11-10",
                "age": 22,
                "gender": "Male",
                "city": "Bangalore",
                "bio": "Full-stack dev building cool stuff 🚀 Hit me up for jam sessions.",
                "avatar": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
                "interests": ["Coding", "Gaming", "Guitar", "Fitness"],
                "latitude": 12.9716,
                "longitude": 77.5946,
                "is_online": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None
            },
            {
                "id": "usr_rohit_004",
                "name": "Rohit Verma",
                "email": "rohit@example.com",
                "password_hash": dummy_password_hash,
                "dob": "1999-03-25",
                "age": 25,
                "gender": "Male",
                "city": "Mumbai",
                "bio": "Filmmaker & wanderer 🎥 Exploring the best cafes in Bandra.",
                "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
                "interests": ["Cinema", "Street Food", "Cycling", "Art"],
                "latitude": 19.0596,
                "longitude": 72.8295,
                "is_online": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None
            },
            {
                "id": "usr_maya_005",
                "name": "Maya Patel",
                "email": "maya@example.com",
                "password_hash": dummy_password_hash,
                "dob": "2001-09-12",
                "age": 23,
                "gender": "Female",
                "city": "Mumbai",
                "bio": "Dance choreographer & sunset chaser 🌅 Live Connect enthusiast!",
                "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80",
                "interests": ["Dance", "Travel", "Photography", "Music"],
                "latitude": 19.0820,
                "longitude": 72.8890,
                "is_online": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None
            }
        ]

        await db.users.insert_many(sample_users)

        # Seed Stories
        sample_stories = [
            {
                "id": "sty_1",
                "user_id": "usr_priya_002",
                "user_name": "Priya Sharma",
                "user_avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
                "media_url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80",
                "caption": "Morning espresso bliss ☕",
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            },
            {
                "id": "sty_2",
                "user_id": "usr_rohit_004",
                "user_name": "Rohit Verma",
                "user_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
                "media_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
                "caption": "Golden hour by the bay 🌅",
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat()
            },
            {
                "id": "sty_3",
                "user_id": "usr_maya_005",
                "user_name": "Maya Patel",
                "user_avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80",
                "media_url": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80",
                "caption": "Studio rehearsal vibes ✨",
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
            }
        ]
        await db.stories.insert_many(sample_stories)

        # Seed Posts
        sample_posts = [
            {
                "id": "pst_1",
                "user_id": "usr_priya_002",
                "user_name": "Priya Sharma",
                "user_avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
                "user_city": "Pune",
                "caption": "Just had an amazing Live Connect chat with someone across town discussing typography and lo-fi beats! Love this feature so much ✨🚀",
                "image_url": "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=80",
                "location_name": "Koregaon Park, Pune",
                "tags": ["LiveConnect", "Design", "Vibes"],
                "likes": ["usr_alex_001", "usr_sam_003"],
                "likes_count": 24,
                "comments": [
                    {
                        "id": "cmt_1",
                        "user_id": "usr_alex_001",
                        "user_name": "Alex Rivera",
                        "user_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
                        "text": "Live Connect is honestly super addictive! Met some awesome musicians yesterday 🙌",
                        "created_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
                    }
                ],
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
                "deleted_at": None
            },
            {
                "id": "pst_2",
                "user_id": "usr_sam_003",
                "user_name": "Sam Taylor",
                "user_avatar": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
                "user_city": "Bangalore",
                "caption": "Weekend jam session in Indiranagar! If anyone's nearby and plays drums or bass, ping me or jump on Live Connect!",
                "image_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
                "location_name": "Indiranagar, Bangalore",
                "tags": ["Music", "JamSession", "NearbyFriends"],
                "likes": ["usr_alex_001", "usr_priya_002", "usr_maya_005"],
                "likes_count": 42,
                "comments": [],
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat(),
                "deleted_at": None
            },
            {
                "id": "pst_3",
                "user_id": "usr_rohit_004",
                "user_name": "Rohit Verma",
                "user_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
                "user_city": "Mumbai",
                "caption": "Testing out the new radar distance filter — found 5 creators within 2 km of Bandra! Stoked to collaborate 🎬",
                "image_url": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80",
                "location_name": "Bandra West, Mumbai",
                "tags": ["Filmmaking", "Bandra", "CreatorCommunity"],
                "likes": ["usr_alex_001"],
                "likes_count": 18,
                "comments": [],
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=14)).isoformat(),
                "deleted_at": None
            }
        ]
        await db.posts.insert_many(sample_posts)

        # Seed Friend Connections and Requests
        sample_friendships = [
            {
                "id": "frnd_1",
                "user_id_1": "usr_alex_001",
                "user_id_2": "usr_priya_002",
                "status": "accepted",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
            },
            {
                "id": "frnd_2",
                "user_id_1": "usr_sam_003",
                "user_id_2": "usr_alex_001",
                "status": "pending",
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
            },
            {
                "id": "frnd_3",
                "user_id_1": "usr_rohit_004",
                "user_id_2": "usr_alex_001",
                "status": "pending",
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
            }
        ]
        await db.friendships.insert_many(sample_friendships)

        # Seed Direct Chat
        chat_id = "chat_alex_priya"
        await db.chats.insert_one({
            "id": chat_id,
            "participants": ["usr_alex_001", "usr_priya_002"],
            "last_message": "Hey Alex! Loved your recent photo feed post 🙌",
            "last_message_at": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat(),
            "unread_count": {"usr_alex_001": 1, "usr_priya_002": 0}
        })

        sample_messages = [
            {
                "id": "msg_1",
                "chat_id": chat_id,
                "sender_id": "usr_alex_001",
                "recipient_id": "usr_priya_002",
                "text": "Hey Priya! Great connecting on Nearby Friends 😄",
                "created_at": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat()
            },
            {
                "id": "msg_2",
                "chat_id": chat_id,
                "sender_id": "usr_priya_002",
                "recipient_id": "usr_alex_001",
                "text": "Hey Alex! Loved your recent photo feed post 🙌 Are you free for a quick Live Connect call later?",
                "created_at": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
            }
        ]
        await db.messages.insert_many(sample_messages)

        # Seed Notifications
        sample_notifications = [
            {
                "id": "notif_1",
                "user_id": "usr_alex_001",
                "type": "friend_request",
                "sender_id": "usr_sam_003",
                "sender_name": "Sam Taylor",
                "sender_avatar": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
                "message": "sent you a friend request",
                "is_read": False,
                "request_id": "frnd_2",
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
            },
            {
                "id": "notif_2",
                "user_id": "usr_alex_001",
                "type": "like",
                "sender_id": "usr_priya_002",
                "sender_name": "Priya Sharma",
                "sender_avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
                "message": "liked your comment on her post",
                "is_read": True,
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            },
            {
                "id": "notif_3",
                "user_id": "usr_alex_001",
                "type": "radar_alert",
                "sender_id": "usr_rohit_004",
                "sender_name": "Rohit Verma",
                "sender_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
                "message": "is 1.2 km away from you in Bandra",
                "is_read": False,
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
            }
        ]
        await db.notifications.insert_many(sample_notifications)

        logger.info("Database seeding complete!")
    except Exception as e:
        logger.error(f"Error during database seed: {e}")

@app.on_event("startup")
async def on_startup():
    await seed_initial_database()

# ----------------- Auth Routes -----------------
@api_router.post("/auth/register")
async def register_user(payload: RegisterRequest):
    # 1. Check DOB and age requirement (>= 18)
    try:
        dob_date = datetime.strptime(payload.dob, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid DOB format. Please use YYYY-MM-DD")
    
    age = calculate_age(dob_date)
    if age < MINIMUM_AGE:
        raise HTTPException(
            status_code=403, 
            detail=f"Age restriction: You must be at least {MINIMUM_AGE} years old to register on Nearby Friends."
        )

    # 2. Check if email already exists
    existing = await db.users.find_one({"email": payload.email.lower(), "deleted_at": None})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # 3. Create user doc
    user_id = f"usr_{uuid.uuid4().hex[:10]}"
    user_doc = {
        "id": user_id,
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "dob": payload.dob,
        "age": age,
        "gender": payload.gender or "Other",
        "city": payload.city or "Mumbai",
        "bio": payload.bio or "Hey there! Connecting on Nearby Friends.",
        "avatar": payload.avatar or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop&q=80",
        "interests": payload.interests or ["Music", "Travel"],
        "latitude": payload.latitude or 19.0760,
        "longitude": payload.longitude or 72.8777,
        "is_online": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }

    await db.users.insert_one(user_doc)
    token = make_token(user_id)

    # Return safe public user object (strip password_hash and _id)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_doc
    }

@api_router.post("/auth/login")
async def login_user(payload: LoginRequest):
    user = await db.users.find_one({"email": payload.email.lower(), "deleted_at": None})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update online status
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_online": True, "last_active": datetime.now(timezone.utc).isoformat()}})

    token = make_token(user["id"])
    user.pop("password_hash", None)
    user.pop("_id", None)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/presence/heartbeat")
async def presence_heartbeat(current_user: Dict[str, Any] = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"is_online": True, "last_active": now}})
    return {"status": "ok", "last_active": now}

@api_router.get("/auth/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    user = dict(current_user)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user

@api_router.put("/auth/update-profile")
async def update_my_profile(payload: UserProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": current_user["id"]})
    updated_user.pop("password_hash", None)
    updated_user.pop("_id", None)
    return updated_user

# ----------------- Posts & Stories -----------------
@api_router.get("/feed")
async def get_feed(current_user: Dict[str, Any] = Depends(get_current_user)):
    # Get all posts ordered by date
    posts = await db.posts.find({"deleted_at": None}).sort("created_at", -1).to_list(100)
    # Get active stories
    stories = await db.stories.find().sort("created_at", -1).to_list(30)

    for p in posts:
        p.pop("_id", None)
        p["is_liked"] = current_user["id"] in p.get("likes", [])
    for s in stories:
        s.pop("_id", None)

    return {
        "stories": stories,
        "posts": posts
    }

@api_router.post("/posts/create")
async def create_post(payload: PostCreateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    post_id = f"pst_{uuid.uuid4().hex[:10]}"
    post_doc = {
        "id": post_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_avatar": current_user.get("avatar"),
        "user_city": current_user.get("city", "Nearby"),
        "caption": payload.caption,
        "image_url": payload.image_url,
        "location_name": payload.location_name or current_user.get("city", "Nearby"),
        "tags": payload.tags or [],
        "visibility": payload.visibility or "public",
        "likes": [],
        "likes_count": 0,
        "comments": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    await db.posts.insert_one(post_doc)
    post_doc.pop("_id", None)
    post_doc["is_liked"] = False
    return post_doc

@api_router.post("/posts/{post_id}/like")
async def toggle_like_post(post_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id, "deleted_at": None})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = current_user["id"]
    likes = post.get("likes", [])
    if user_id in likes:
        likes.remove(user_id)
        is_liked = False
    else:
        likes.append(user_id)
        is_liked = True
        # Create notification if liked by someone else
        if post["user_id"] != user_id:
            await db.notifications.insert_one({
                "id": f"notif_{uuid.uuid4().hex[:10]}",
                "user_id": post["user_id"],
                "type": "like",
                "sender_id": user_id,
                "sender_name": current_user["name"],
                "sender_avatar": current_user.get("avatar"),
                "message": f"liked your post '{post['caption'][:30]}...'",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    await db.posts.update_one({"id": post_id}, {"$set": {"likes": likes, "likes_count": len(likes)}})
    return {"is_liked": is_liked, "likes_count": len(likes)}

@api_router.post("/posts/{post_id}/comment")
async def add_post_comment(post_id: str, payload: CommentCreateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id, "deleted_at": None})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = {
        "id": f"cmt_{uuid.uuid4().hex[:10]}",
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_avatar": current_user.get("avatar"),
        "text": payload.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.posts.update_one({"id": post_id}, {"$push": {"comments": comment}})

    if post["user_id"] != current_user["id"]:
        await db.notifications.insert_one({
            "id": f"notif_{uuid.uuid4().hex[:10]}",
            "user_id": post["user_id"],
            "type": "comment",
            "sender_id": current_user["id"],
            "sender_name": current_user["name"],
            "sender_avatar": current_user.get("avatar"),
            "message": f"commented: '{payload.text[:30]}'",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    return comment

# ----------------- Friends & Connections -----------------
@api_router.get("/friends")
async def get_friends_list(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    friendships = await db.friendships.find({
        "$or": [{"user_id_1": user_id}, {"user_id_2": user_id}],
        "status": "accepted"
    }).to_list(200)

    friend_ids = []
    for f in friendships:
        fid = f["user_id_2"] if f["user_id_1"] == user_id else f["user_id_1"]
        friend_ids.append(fid)

    friends = await db.users.find({"id": {"$in": friend_ids}, "deleted_at": None}).to_list(200)
    my_lat = current_user.get("latitude", 19.0760)
    my_lon = current_user.get("longitude", 72.8777)
    for fr in friends:
        fr.pop("password_hash", None)
        fr.pop("_id", None)
        fr["is_online"] = compute_is_online(fr)
        fr["distance_km"] = calculate_distance(my_lat, my_lon, fr.get("latitude", my_lat), fr.get("longitude", my_lon))

    # Online friends first, then nearest by distance
    friends.sort(key=lambda x: (not x["is_online"], x["distance_km"]))
    return friends

@api_router.get("/friends/requests")
async def get_friend_requests(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    # Incoming requests: user_id_2 is current_user and status is pending
    pending_reqs = await db.friendships.find({
        "user_id_2": user_id,
        "status": "pending"
    }).to_list(100)

    sender_ids = [r["user_id_1"] for r in pending_reqs]
    senders = await db.users.find({"id": {"$in": sender_ids}, "deleted_at": None}).to_list(100)
    sender_map = {s["id"]: s for s in senders}

    result = []
    for r in pending_reqs:
        s = sender_map.get(r["user_id_1"])
        if s:
            result.append({
                "request_id": r["id"],
                "sender_id": s["id"],
                "sender_name": s["name"],
                "sender_avatar": s.get("avatar"),
                "sender_city": s.get("city", "Nearby"),
                "sender_age": s.get("age", 22),
                "created_at": r["created_at"]
            })
    return result

@api_router.post("/friends/request/send")
async def send_friend_request(payload: FriendActionRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    target_id = payload.target_user_id

    if user_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")

    existing = await db.friendships.find_one({
        "$or": [
            {"user_id_1": user_id, "user_id_2": target_id},
            {"user_id_1": target_id, "user_id_2": user_id}
        ]
    })

    if existing:
        if existing["status"] == "accepted":
            return {"status": "already_friends", "message": "You are already friends"}
        elif existing["status"] == "pending":
            return {"status": "already_pending", "message": "Friend request is already pending"}

    req_id = f"frnd_{uuid.uuid4().hex[:10]}"
    new_req = {
        "id": req_id,
        "user_id_1": user_id,
        "user_id_2": target_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.friendships.insert_one(new_req)

    # Add notification for target user
    await db.notifications.insert_one({
        "id": f"notif_{uuid.uuid4().hex[:10]}",
        "user_id": target_id,
        "type": "friend_request",
        "sender_id": user_id,
        "sender_name": current_user["name"],
        "sender_avatar": current_user.get("avatar"),
        "message": "sent you a friend request",
        "is_read": False,
        "request_id": req_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"status": "sent", "request_id": req_id}

@api_router.post("/friends/request/respond")
async def respond_friend_request(payload: FriendRespondRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    req = await db.friendships.find_one({"id": payload.request_id, "user_id_2": current_user["id"]})
    if not req:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if payload.action == "accept":
        await db.friendships.update_one({"id": payload.request_id}, {"$set": {"status": "accepted"}})
        # Create mutual chat if not exists
        chat_id = f"chat_{min(req['user_id_1'], req['user_id_2'])}_{max(req['user_id_1'], req['user_id_2'])}"
        existing_chat = await db.chats.find_one({"id": chat_id})
        if not existing_chat:
            await db.chats.insert_one({
                "id": chat_id,
                "participants": [req["user_id_1"], req["user_id_2"]],
                "last_message": "You are now connected! Say hi 👋",
                "last_message_at": datetime.now(timezone.utc).isoformat(),
                "unread_count": {}
            })
        return {"status": "accepted"}
    else:
        await db.friendships.delete_one({"id": payload.request_id})
        return {"status": "rejected"}

# ----------------- Direct Chats & Messaging -----------------
@api_router.get("/chats")
async def get_user_chats(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    chats = await db.chats.find({"participants": user_id}).sort("last_message_at", -1).to_list(100)

    # Fetch partner user details
    all_partner_ids = set()
    for c in chats:
        for p in c.get("participants", []):
            if p != user_id:
                all_partner_ids.add(p)

    partners = await db.users.find({"id": {"$in": list(all_partner_ids)}, "deleted_at": None}).to_list(100)
    partner_map = {p["id"]: p for p in partners}

    result = []
    for c in chats:
        c.pop("_id", None)
        partner_id = next((p for p in c.get("participants", []) if p != user_id), None)
        partner = partner_map.get(partner_id)
        if partner:
            result.append({
                "id": c["id"],
                "partner_id": partner["id"],
                "partner_name": partner["name"],
                "partner_avatar": partner.get("avatar"),
                "partner_city": partner.get("city", "Nearby"),
                "is_online": compute_is_online(partner),
                "last_message": c.get("last_message", ""),
                "last_message_at": c.get("last_message_at", ""),
                "unread_count": c.get("unread_count", {}).get(user_id, 0)
            })
    return result

@api_router.get("/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    messages = await db.messages.find({"chat_id": chat_id}).sort("created_at", 1).to_list(500)
    for m in messages:
        m.pop("_id", None)
    # Clear unread count for current user
    await db.chats.update_one({"id": chat_id}, {"$set": {f"unread_count.{current_user['id']}": 0}})
    return messages

@api_router.post("/chats/{chat_id}/send")
async def send_chat_message(chat_id: str, payload: SendMessageRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    msg_id = f"msg_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    message_doc = {
        "id": msg_id,
        "chat_id": chat_id,
        "sender_id": user_id,
        "recipient_id": payload.recipient_id,
        "text": payload.text,
        "image_url": payload.image_url,
        "created_at": now_iso
    }

    await db.messages.insert_one(message_doc)
    await db.chats.update_one(
        {"id": chat_id},
        {
            "$set": {
                "last_message": payload.text,
                "last_message_at": now_iso
            },
            "$inc": {
                f"unread_count.{payload.recipient_id}": 1
            }
        },
        upsert=True
    )

    message_doc.pop("_id", None)
    return message_doc

# ----------------- Nearby Radar Discovery -----------------
@api_router.get("/nearby")
async def get_nearby_users(
    radius_km: float = 25.0, 
    gender: Optional[str] = "All",
    interest: Optional[str] = "All",
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    my_lat = current_user.get("latitude", 19.0760)
    my_lon = current_user.get("longitude", 72.8777)
    my_id = current_user["id"]

    query: Dict[str, Any] = {"id": {"$ne": my_id}, "deleted_at": None}
    if gender and gender != "All":
        query["gender"] = gender
    if interest and interest != "All":
        query["interests"] = interest

    users = await db.users.find(query).to_list(200)

    # Check friendship status for each user
    friendships = await db.friendships.find({
        "$or": [{"user_id_1": my_id}, {"user_id_2": my_id}]
    }).to_list(200)
    
    friendship_status_map = {}
    for f in friendships:
        peer = f["user_id_2"] if f["user_id_1"] == my_id else f["user_id_1"]
        friendship_status_map[peer] = f["status"]

    nearby_list = []
    for u in users:
        u_lat = u.get("latitude", my_lat + 0.01)
        u_lon = u.get("longitude", my_lon + 0.01)
        dist = calculate_distance(my_lat, my_lon, u_lat, u_lon)
        
        # Check within requested radius (allow slight tolerance for demo)
        if dist <= radius_km or len(users) <= 5:
            u.pop("password_hash", None)
            u.pop("_id", None)
            u["distance_km"] = dist
            u["is_online"] = compute_is_online(u)
            u["friend_status"] = friendship_status_map.get(u["id"], "none")
            nearby_list.append(u)

    # Online users first, then nearest by distance
    nearby_list.sort(key=lambda x: (not x["is_online"], x["distance_km"]))
    return nearby_list

# ----------------- Notifications -----------------
@api_router.get("/notifications")
async def get_notifications(current_user: Dict[str, Any] = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    for n in notifs:
        n.pop("_id", None)
    return notifs

@api_router.post("/notifications/read-all")
async def mark_notifications_read(current_user: Dict[str, Any] = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": current_user["id"]}, {"$set": {"is_read": True}})
    return {"status": "success"}

# ----------------- Live Connect (Omegle-Style Matchmaking & WebSockets) -----------------
@api_router.post("/live/queue/join")
async def join_live_queue(payload: LiveMatchRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    result = await matchmaker.join_queue(current_user, payload.dict())
    return result

@api_router.post("/live/queue/leave")
async def leave_live_queue(current_user: Dict[str, Any] = Depends(get_current_user)):
    await matchmaker.leave_queue(current_user["id"])
    return {"status": "left"}

@api_router.post("/live/signal")
async def post_live_signal(payload: LiveSignalRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    await matchmaker.forward_signal(current_user["id"], payload.dict())
    return {"status": "sent"}

@api_router.post("/live/report")
async def report_live_user(payload: LiveReportRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    report_doc = {
        "id": f"rep_{uuid.uuid4().hex[:10]}",
        "reporter_id": current_user["id"],
        "reported_user_id": payload.reported_user_id,
        "session_id": payload.session_id,
        "reason": payload.reason,
        "details": payload.details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reports.insert_one(report_doc)
    # Immediately disconnect the live session
    await matchmaker.leave_queue(current_user["id"])
    return {"status": "reported", "message": "User reported and disconnected successfully"}

# Real-time WebSocket endpoint for Live Connect signaling and matching
@app.websocket("/api/live/ws/{user_id}")
async def live_websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    await matchmaker.connect_user(user_id, websocket)
    try:
        while True:
            text_data = await websocket.receive_text()
            try:
                data = json.loads(text_data)
                msg_type = data.get("type")
                if msg_type == "join_queue":
                    user = await db.users.find_one({"id": user_id, "deleted_at": None})
                    if user:
                        match_res = await matchmaker.join_queue(user, data.get("preferences"))
                        await websocket.send_text(json.dumps(match_res))
                elif msg_type == "next_match":
                    user = await db.users.find_one({"id": user_id, "deleted_at": None})
                    if user:
                        match_res = await matchmaker.join_queue(user, data.get("preferences"))
                        await websocket.send_text(json.dumps(match_res))
                elif msg_type == "leave_queue":
                    await matchmaker.leave_queue(user_id)
                    await websocket.send_text(json.dumps({"type": "left_queue"}))
                elif msg_type == "signal":
                    await matchmaker.forward_signal(user_id, data)
                elif msg_type == "chat_message":
                    session_id = data.get("session_id")
                    if session_id in matchmaker.active_sessions:
                        sess = matchmaker.active_sessions[session_id]
                        peer_id = sess["user2_id"] if sess["user1_id"] == user_id else sess["user1_id"]
                        if peer_id in matchmaker.user_ws:
                            await matchmaker.user_ws[peer_id].send_text(json.dumps({
                                "type": "live_chat_message",
                                "sender_id": user_id,
                                "text": data.get("text"),
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            }))
            except Exception as e:
                logger.error(f"Error handling live ws message: {e}")
    except WebSocketDisconnect:
        await matchmaker.disconnect_user(user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await matchmaker.disconnect_user(user_id)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
