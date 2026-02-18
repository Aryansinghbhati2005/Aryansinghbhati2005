# Kingdom Siege (Clash-of-Clans Inspired Browser Game)

This project is a lightweight full-stack strategy game inspired by the core loop of **Clash of Clans**:

- Build and upgrade your village
- Generate resources over time
- Train troops
- Raid AI enemy villages
- Track trophies, wins, losses, and battle log

## Tech Stack

- **Backend:** Node.js HTTP server (no external dependencies)
- **Frontend:** HTML + CSS + Vanilla JavaScript
- **Data:** In-memory game state (single player)

## Run locally

```bash
node server.js
```

Open: `http://localhost:3000`

## Game APIs

- `GET /api/game` – get current game state
- `POST /api/game/reset` – reset the village
- `POST /api/game/upgrade` body `{ "building": "goldMine" }`
- `POST /api/game/train` body `{ "type": "barbarian", "qty": 5 }`
- `POST /api/game/raid` – run a raid against an AI base

## Notes

- This is intentionally simple and single-player.
- You can extend it with:
  - persistent database storage
  - authentication and multiple villages
  - real-time multiplayer battles
  - build timers and matchmaking
