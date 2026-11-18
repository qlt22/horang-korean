# Seoul Works — city-factory gamification

**The loop:** study → materials → build → automate → scale → prestige → a bigger city.

This is the "Satisfactory" layer for Horang. It is deliberately a *builder*, not a shop: the reward for studying is **stuff you place on a map**, and the map produces more while you are away.

---

## 1. Why this fits studying

| Study action | Delivers | Why |
|---|---|---|
| Finishing a lesson | **Bricks** (+ bonus for 3★) | The core unit of progress becomes the core building material |
| Reviewing sentences | **Timber** | Maintenance work builds the frame |
| Practising words | **Glass** | Vocabulary is what makes the city legible |
| Passing a checkpoint | **Steel + a blueprint** | Milestones unlock the skyline |
| Hitting the daily goal / streak | **Energy** | Consistency powers the unique buildings |

The player never buys materials with money. Every brick is a sentence they met.

## 2. The city

- **6×6 grid** at the start, expandable to 9×9.
- Each building occupies one tile and has levels 1–10.
- Income is **Won/second**; it is the same Won used by the shop, so the city funds cosmetics and chests.
- Industry buildings produce **materials/minute**, so the city keeps working while you study (and offline, capped at 8 h).
- **Parks** boost adjacent tiles; **Subway** and **N Seoul Tower** are unique global multipliers.
- **Eras**: prestige resets the city but grants a permanent multiplier and a new palette. Hanok era → Modern → Future.

### Catalogue

| Building | Income | Produces | Unlock |
|---|---|---|---|
| Hanok 한옥 | 0.40/s | — | start |
| Café 카페 | 1.5/s | — | 3 buildings |
| Shop 상점 | 3/s | — | 6 buildings |
| Apartment 아파트 | 7/s | — | 10 buildings |
| Office 오피스 | 15/s | — | 16 buildings |
| Park 공원 | — | +12 % to 8 neighbours | 2 buildings |
| Brickworks 벽돌공장 | — | 2 bricks/min | 4 buildings |
| Sawmill 제재소 | — | 2 timber/min | 6 buildings |
| Glassworks 유리공장 | — | 1.5 glass/min | 8 buildings |
| Steelworks 제철소 | — | 1 steel/min | 12 buildings |
| Subway 지하철 | +10 % global | — | 18 buildings |
| N Seoul Tower | +25 % global | — | 24 buildings + 12 badges |

Upgrades: cost ×1.7 per level, income ×1.45, production ×1.3.
Prestige at **25,000 Won generated per era**, +50 % permanent income per era.

## 3. Achievements (examples)

First brick · 10 buildings · 25 buildings · full grid · level-5 building · level-10 building · 10/s · 100/s · 1,000/s · first factory · all four factories · subway · tower · era 2 · era 3 · 12 A1 badges. Rewards are coins, gems, materials or blueprints.

## 4. Screens

`#/city` — the builder. HUD (Won, materials, income), grid, build/inspect sheets, achievements, prestige. Also a City card on Home and a materials summary on the session receipt.

## 5. Economy guardrails

- No real-money purchases, no paid resources, no timers that block building.
- Offline production is capped and shown honestly.
- Prestige is optional and always confirmed; it never removes badges, achievements, cosmetics or course progress.
- Materials are awarded only for learning actions, never for idling alone (idle produces Won/materials from what you already built).
