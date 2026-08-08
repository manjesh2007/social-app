# Nearby Friends — Social Networking App (18+)

A friendship-focused social app: React Native (Expo) client + Node/Express + MongoDB backend, with real-time chat via Socket.io.

## Structure

```
social-app/
├── backend/     Express + MongoDB API (see backend/README.md)
└── mobile/      Expo React Native app
```

## Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env    # set MONGO_URI (local or Atlas) and a strong JWT_SECRET
npm install
npm run dev              # http://localhost:5000
```

### 2. Mobile app
```bash
cd mobile
npm install
```
Edit `src/api/api.js` and set `API_BASE_URL` / `SOCKET_URL` to your machine's LAN IP
(e.g. `http://192.168.1.20:5000/api`) if testing on a physical device with Expo Go —
`localhost` only works in the iOS simulator.

```bash
npx expo start
```
Scan the QR code with Expo Go (iOS/Android) or press `i` / `a` for a simulator.

## Feature Map

| Feature | Where |
|---|---|
| Email login/signup (18+ gate) | `backend/routes/auth.js`, `mobile/src/screens/LoginScreen.js`, `SignupScreen.js` |
| Profile: photo, bio, interests | `backend/models/User.js`, `mobile/src/screens/ProfileScreen.js`, `EditProfileScreen.js` |
| Nearby users, approximate distance | `backend/routes/users.js` (`/nearby`, geospatial `$geoNear`, distance rounded to 250m for privacy), `mobile/src/screens/NearbyScreen.js` |
| Friend requests (send/accept/decline) | `backend/routes/friends.js`, `mobile/src/screens/FriendRequestsScreen.js` |
| One-to-one chat (realtime) | `backend/routes/chat.js` + Socket.io in `server.js`, `mobile/src/screens/ChatListScreen.js`, `ChatScreen.js` |
| Dark / light mode | `mobile/src/context/ThemeContext.js`, `src/theme/colors.js` (light/dark/system, persisted) |
| Responsive layout | Flexbox-based styles throughout, safe-area handling via `react-native-safe-area-context` |

## Notes on privacy & safety

- Exact GPS coordinates are **never** sent to the client — the `/nearby` endpoint only returns a rounded, human-readable distance ("1.2 km away").
- Signup rejects anyone under 18 based on date of birth.
- Chat is restricted to confirmed friends only (`backend/routes/chat.js` checks the friends list before allowing a message).
- Profile photo picking currently stores the local device URI as a placeholder — wire up real image upload (e.g. S3, Cloudinary) before shipping to production.

## Next steps you may want to add

- Image upload to cloud storage instead of local URIs
- Push notifications for new messages/friend requests (Expo Notifications)
- Report/block user flows and moderation tooling
- Refresh tokens / token expiry handling
- Pagination for nearby users and chat history
