# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based voting system for **Urban Terror** game maps. Players vote daily on maps and game modes; the results drive a generated `mapcycle.txt` for the game server.

## Running the Server

```bash
python3 /var/www/html/urban/server.py
# Listens on 0.0.0.0:8085
```

No build step — the frontend is vanilla HTML/CSS/JS served as static files.

## Architecture

```
index.html    — single-page UI shell
script.js     — all client logic (voting, dashboard, mapcycle export)
style.css     — dark/cyberpunk theme
server.py     — Python HTTP server (votes persistence via votes.json)
img/          — 39 map thumbnail images
votes.json    — persistent vote store (managed by server.py)
```

### Backend (`server.py`)

Single-class `VoteServer(SimpleHTTPRequestHandler)` with three endpoints:

| Method | Path    | Purpose                                 |
|--------|---------|-----------------------------------------|
| GET    | /votes  | Returns today's votes from votes.json   |
| POST   | /vote   | Appends a vote; deduplicates by `browserId+map+date` |
| OPTIONS| /       | CORS preflight                          |

Vote records are stored as a JSON array. The server filters by `date == today` on GET.

### Frontend (`script.js`)

Key functions:
- `generateBrowserId()` — creates a stable per-browser ID stored in `localStorage`
- `resetDailyVotes()` — clears localStorage vote tracking when the date changes
- `confirmVote()` — POSTs `{browserId, map, mode, weapon, date}` to the server
- `fetchVotes()` — GETs votes and calls `updateDashboard()`
- `updateDashboard()` — renders live ranking of maps/modes
- `downloadMapcycle()` — generates and downloads `mapcycle.txt` from current rankings
- `resetVotesManual()` — admin reset (credentials hardcoded in frontend)

### Data Schema

```json
{ "browserId": "id-1776941748056-fxnqpt7g", "map": "ut4_abbey", "mode": "4", "weapon": "Todas as armas", "date": "2026-04-23" }
```

Game modes: `1=LMS 2=FFA 3=TDM 4=TS 5=FTL 6=CNH 7=CTF 8=BM 9=JUMP 10=FT 11=GUN`

Weapons: `"Somente Sniper"`, `"Somente Pistola"`, `"Todas as armas"`

## Important Hardcoded Values

- **Server IP**: `http://192.168.128.102:8085` is hardcoded in `script.js` — update this when deploying to a different host.
- **Admin credentials**: hardcoded in `script.js` (frontend-only check, no backend enforcement).
- **Server port**: `8085` in `server.py`.
