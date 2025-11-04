# Process Monitor

AI-powered compliance analysis using HuggingFace's facebook/bart-large-mnli model.

## Quick Start

```bash
# Install dependencies
npm install

# Start database (PostgreSQL + Redis)
docker compose up -d

# Setup environment
cp .env.example .env.local
# Edit .env.local and add your HF_API_TOKEN from https://huggingface.co/settings/tokens

# Initialize database
npm run db:push

# Run dev server
npm run dev
```

Open http://localhost:3000

## Tech Stack

Next.js 16 • TypeScript • PostgreSQL • Redis • Drizzle ORM • Tailwind • Vitest

## API Endpoints

### `POST /api/analyze`

Analyze if an action complies with a guideline.

```json
// Request
{ "action": "...", "guideline": "..." }

// Response
{ "action": "...", "guideline": "...", "result": "COMPLIES", "confidence": 0.94, "timestamp": "..." }
```

### `POST /api/classify`

Classify action against all stored guidelines.

```json
// Request
{ "action": "..." }

// Response
{ "action": "...", "results": [...], "timestamp": "...", "totalGuidelines": 3 }
```

### `GET /api/results`

Get historical results with pagination/filtering.

```
?page=1&limit=15&filter=all&sortBy=timestamp&search=...
```

## Testing

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires HF_API_TOKEN)
npm run test:integration

# Lint
npm run lint
```

### Test Cases

1. **COMPLIES**: Closed ticket with confirmation email
2. **DEVIATES**: Closed ticket without confirmation email
3. **DEVIATES**: Incomplete server maintenance
4. **UNCLEAR**: No matching guideline

## Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm start                # Run production build
npm run db:studio        # Open Drizzle Studio
npm run db:push          # Push schema to database
npm test                 # Run all tests
npm run lint             # Lint code
```

## Environment Variables

```bash
# Required
HF_API_TOKEN=hf_...                    # HuggingFace API token
API_URL=https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli
POSTGRES_URL=postgresql://...          # PostgreSQL connection string

# Optional
REDIS_URL=redis://localhost:6379       # Redis for rate limiting (fallback to memory)
NODE_ENV=development
```
