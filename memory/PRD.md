# Nearby Friends — PRD

## Original Problem Statement
"Nearby Friends" — a React Native (Expo) social-connecting app. Imported from GitHub. Stack originally Node.js + Express + Socket.IO + MongoDB Atlas + react-native-webrtc. On the Emergent platform the backend runs as **Python FastAPI** (user agreed to keep FastAPI). Flagship feature: **Live Connect** — Omegle-style random 1-on-1 live video/audio matching with next/disconnect. Plus auth (18+ DOB gate), profile, tabs (Home/Friends/Post/Nearby/Notifications), friends system, chat, nearby radar, notifications.

User language: Hinglish (respond in Hinglish/English mix).

## Architecture
- Frontend: Expo Router (SDK 54, RN 0.81), TypeScript. `app/` routes, `src/` components/context/theme/api/live.
- Backend: Python FastAPI (`/app/backend/server.py`), local MongoDB (Atlas URL to be provided by user).
- Realtime: FastAPI WebSocket `/api/live/ws/{user_id}` for Live Connect matchmaking + WebRTC signaling.
- Media: `react-native-webrtc@124.0.6` + `@config-plugins/react-native-webrtc@13.0.0` (dev/prod build only, not Expo Go/web — graceful demo fallback).

## User Personas
- Young adults (18+) discovering nearby people, chatting, and doing spontaneous live video matches.

## Core Requirements (static)
- 18+ DOB-gated auth, profile, friends, chat, nearby radar, notifications.
- Live Connect: matchmaking, WebRTC video/audio, next/disconnect, mute/video/flip, in-call chat, report.
- Online presence + distance everywhere (nearby, friends).

## Implemented (2026-09-01)
- Kept Python FastAPI backend (per user decision); no Node rewrite.
- Live Connect wired to real WebSocket signaling + real react-native-webrtc (offer/answer/ICE, ontrack), with graceful demo fallback on web/Expo Go/single-device (auto demo peer after 6.5s). Mute/video/flip toggle real tracks; in-call chat over WS; report → next.
- Presence heartbeat: `POST /api/presence/heartbeat` (30s interval + on app foreground). `compute_is_online` (90s window).
- Nearby: `is_online` + distance, sorted online-first then nearest; green dot + "Online" label.
- Friends list: `is_online` + `distance_km`, online-first + nearest sort; green dot + distance.
- WebRTC config plugin added to app.json with camera/mic permission strings.

## Backlog / Remaining
- P1: UI loading/empty/error/offline polish across all screens; Profile photo disappearing near search bar bug.
- P1: Security hardening (rate limiting, input validation, socket auth, .env protection).
- P1: Live Connect safety (block, moderation) beyond report.
- P0 (needs 2 real devices + dev build): real two-user WebRTC video validation.
- P2: MongoDB Atlas swap once user provides URL.

## Test Credentials
See `/app/memory/test_credentials.md` (alex/priya/sam/rohit @example.com, `Password123!`).
