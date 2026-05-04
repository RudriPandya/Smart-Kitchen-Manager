# Smart Kitchen Manager

A full-stack AI-powered kitchen management app called **Sous-Chef**.

## Architecture

- **Frontend**: React + Vite (`artifacts/smart-kitchen`) at `/` — earthy sage-green theme
- **Backend**: Express API (`artifacts/api-server`) at `/api`
- **Database**: PostgreSQL via Drizzle ORM (`lib/db`)
- **API Contract**: OpenAPI spec in `lib/api-spec`, codegen → `lib/api-zod` + `lib/api-client-react`
- **AI**: Anthropic Claude via Replit AI Integrations proxy (`lib/integrations-anthropic-ai`)

## Features

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Overview stats, low stock alerts, recent activity |
| Pantry | `/stock` | Kitchen inventory with +/- quantity controls, search |
| Recipes | `/recipes` | Recipe grid with cuisine/dietary badges; detail view |
| Ideas | `/suggestions` | AI-ranked meal suggestions by pantry match %; AI Chef prompt |
| Shopping | `/shopping` | Shopping list with manual add, check-off, restock pantry |
| Chef Chat | `/chat` | Conversational AI with Claude, persistent history |

## DB Schema (`lib/db/src/schema/`)

- `ingredients` — ingredient catalog
- `kitchen_stock` — pantry inventory (quantity, unit, low threshold)
- `recipes` — recipe catalog with instructions
- `recipe_ingredients` — recipe↔ingredient join (quantity, optional flag)
- `shopping_list` — shopping list items
- `activity_log` — audit log for pantry changes
- `conversations` + `messages` — AI chat history

## Seed Data

- 52 ingredients in catalog
- 29 kitchen stock items (Indian pantry: rice, dal, spices, vegetables, etc.)
- 10 recipes: Dal Tadka, Aloo Gobi, Rajma, Egg Bhurji, Palak Paneer, Masoor Dal Soup, Jeera Rice, Aloo Matar, Chana Masala, Vegetable Fried Rice
- Recipe ingredients seeded for all 10 recipes

## Key Files

- `artifacts/api-server/src/routes/` — all backend routes
- `artifacts/smart-kitchen/src/pages/` — all frontend pages
- `lib/api-spec/openapi.yaml` — OpenAPI contract
- `lib/db/drizzle.config.ts` — DB config (uses `DATABASE_URL`)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (auto-set by Replit DB)
- `SESSION_SECRET` — Express session secret
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Anthropic proxy base URL
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Anthropic proxy API key
