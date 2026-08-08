# Social App Backend

Express + MongoDB API for the friendship-focused social app, with Socket.io for realtime chat.

## Setup

```bash
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
npm install
npm run dev             # requires nodemon, or `npm start`
```

## API Overview

### Auth
- `POST /api/auth/signup` — { name, email, password, dateOfBirth } (rejects under-18)
- `POST /api/auth/login` — { email, password }
- `GET /api/auth/me` — current user (requires `Authorization: Bearer <token>`)

### Users
- `GET /api/users/profile`
- `PUT /api/users/profile` — { name, bio, interests, photoUrl }
- `PUT /api/users/location` — { latitude, longitude }
- `GET /api/users/nearby?radiusKm=25` — approximate distances only, no exact coordinates returned
- `GET /api/users/:id`

### Friends
- `POST /api/friends/request/:userId`
- `GET /api/friends/requests` — incoming pending requests
- `GET /api/friends/sent` — outgoing pending requests
- `POST /api/friends/respond/:requestId` — { action: "accept" | "decline" }
- `GET /api/friends` — my friends list
- `DELETE /api/friends/:userId` — unfriend

### Chat
- `GET /api/chat/conversations`
- `GET /api/chat/:userId` — message history (marks incoming as read)
- `POST /api/chat/:userId` — { text } (also emits over Socket.io)

### Realtime (Socket.io)
Connect with `auth: { token }`. Client joins a room named after their own user id automatically.
Listen for `message:new` and `typing` events.
