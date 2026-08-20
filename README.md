# Couples Connect

A two-person WebRTC video-call PWA with Firebase signalling, built for a long-distance couple.

Generic call apps assume many contacts, group calls and a contact list. This one assumes exactly two
people who have paired once and never change partner. That assumption removes the entire contact and
room-management surface, so the whole app is a login screen, a pairing screen, and one call screen.
Around the call it adds the things that actually matter to the two users: presence, a shared
whiteboard, a partner timezone clock, a days-together counter, and a remote wake-up alarm.

It is a personal build, not a product. It shipped to an audience of two.

## How it works

### Signalling and call setup

There is no signalling server. Firebase Realtime Database is the signalling channel, and the peer
connection is negotiated by writing SDP and ICE candidates into a shared path.

```
users/{uid}/status            "online" | "away" | "offline"   (onDisconnect -> "offline")
users/{uid}/partnerId         the paired uid
users/{uid}/timezone          IANA zone from Intl.DateTimeFormat
users/{uid}/fcmToken          FCM registration token
users/{uid}/history           call log entries
users/{uid}/alarms            remote wake-up pings
calls/{roomId}                caller, status, offer, answer          (onDisconnect -> remove)
calls/{roomId}/callerCandidates
calls/{roomId}/calleeCandidates
rooms/{roomId}/messages       chat
rooms/{roomId}/hearts         heart-burst events
rooms/{roomId}/draw           whiteboard line segments
```

`roomId` is derived, not allocated: `[myUid, partnerUid].sort().join('_')`. Both sides compute the
same string independently, so no room record needs to be created or looked up.

The flow in `src/App.tsx`:

1. Caller runs `initWebRTC(true)`, gets local media, creates an `RTCPeerConnection`, and writes
   `{ caller, status: 'ringing', offer }` to `calls/{roomId}`.
2. Both sides subscribe to `calls/{roomId}` with `onValue`. The callee sees `status === 'ringing'`
   with a different `caller` uid and renders the incoming-call screen.
3. Callee sets the remote description, creates an answer, and flips the record to
   `{ status: 'connected', answer }`.
4. ICE candidates stream through `onicecandidate` into `callerCandidates` / `calleeCandidates`, and
   each side consumes the other's with `onChildAdded`.
5. Hangup removes `calls/{roomId}` entirely. The `onValue` subscriber sees null and calls
   `cleanupCall()`, so teardown is symmetric and a dropped connection cleans up via `onDisconnect`.

ICE uses Google's public STUN servers only (`RTC_CONFIG` in `src/App.tsx`). There is no TURN relay,
so calls fail behind symmetric NAT.

### Presence

`users/{uid}/status` is set to `online` at sign-in with an `onDisconnect().set("offline")` handler
registered on the server, so a closed tab or lost network flips the flag without client cooperation.
A `visibilitychange` listener adds a third state, `away`, for a backgrounded tab.

### In-call features

- **Screen share** swaps tracks in place. `getDisplayMedia` produces a track, the existing video
  `RTCRtpSender` is located with `getSenders()`, and `replaceTrack` substitutes it with no
  renegotiation. The track's `onended` handler restores the camera automatically.
- **Whiteboard** is a `<canvas>` where every mouse or touch move pushes one line segment
  `{x0, y0, x1, y1, color}` to `rooms/{roomId}/draw`. The remote side replays segments through
  `onChildAdded`. Deliberately simple: no vector model, no undo, and coordinates are raw pixels, so
  the two canvases only align when the viewports match.
- **Photo capture** draws the remote `<video>` element into an offscreen canvas and triggers a PNG
  download.
- **Minimum call length.** `handleHangup` refuses to end a connected call before 60 seconds. This is
  an intentional joke constraint between the two users, not a bug. Bedtime mode bypasses it.

### PWA and push

`vite-plugin-pwa` runs in `injectManifest` mode with a hand-written worker at `src/sw.ts`. The worker
precaches the build via Workbox, initialises a second Firebase app instance, and handles
`onBackgroundMessage` so an incoming call raises a system notification when the tab is closed. A
`notificationclick` handler focuses an existing window or opens a new one. `requestForToken` in
`src/firebase.ts` requests notification permission, fetches an FCM token with the VAPID key, and
writes it to the user's record.

### State

`src/store.ts` is a small Zustand store persisted to localStorage for theme, language, sound,
anniversary date and the theme-sync flag. All call, chat and presence state lives in React state fed
by Firebase listeners.

## Tech stack

React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand, Framer Motion, lucide-react, Firebase 10
(Auth, Realtime Database, Cloud Messaging), vite-plugin-pwa, native WebRTC APIs.

Interface strings are bilingual, Traditional Chinese and English, from a translation table at the top
of `src/App.tsx`.

## Getting started

You need your own Firebase project with Google sign-in, Realtime Database and Cloud Messaging
enabled.

```bash
npm install
npm run dev      # vite dev server, service worker enabled in dev
npm run build    # tsc -b && vite build
npm run preview
```

Replace the `firebaseConfig` object and the `vapidKey` in `src/firebase.ts`, and the duplicated
`firebaseConfig` in `src/sw.ts`. Both files need it because the service worker runs in a separate
context and cannot import the app's initialised instance.

The dev server sets `Cross-Origin-Opener-Policy: same-origin-allow-popups` so the Google sign-in
popup can talk back to the opener.

## Status and limitations

Finished enough to use daily, never hardened. 14 commits, one 800-line `App.tsx`, no tests.

Known issues, stated plainly:

- **Pairing is unauthenticated.** Typing any user's Firebase UID writes `partnerId` into both that
  user's record and yours. There is no invitation, acceptance or rejection step. This repository also
  contains no Realtime Database security rules, so whatever rules the deployed project uses are not
  reviewable here.
- The Firebase web config and VAPID public key are committed in source. Both are client identifiers
  rather than secrets, but the correct place to enforce access is database rules, and those are not
  in the repo.
- No TURN server, so calls fail on restrictive NATs.
- Signalling has no glare handling. If both users press call simultaneously, one write clobbers the
  other.
- Whiteboard strokes accumulate in the database forever and are never pruned.
- Several Firebase listeners are attached without their unsubscribe being stored, so a long session
  can accumulate duplicate handlers.
- `package.json` declares a `lint` script but no ESLint config is committed, so it will not run.
- The repository name (`RealTimeAlarm`) predates the app it now holds.

## License

MIT. See [LICENSE](LICENSE).
