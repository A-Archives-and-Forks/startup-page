# Start Page Makefile
# Simplifies common development tasks
#
# Prerequisites for cloud targets:
#   pnpm  │  Vercel CLI (via npx)  │  Stripe CLI (https://stripe.com/docs/stripe-cli)
# Run in Git Bash, WSL, or any Unix shell.

.PHONY: help install setup start build build-local build-vercel preview serve deploy deploy-vercel clean dev \
        dev-cloud env-pull db-generate db-migrate db-studio \
        stripe stripe-secret health stripe-test-checkout stripe-test-sub

# Default target
help:
	@echo ""
	@echo "Frontend"
	@echo "  install        - Install (pnpm) dependencies"
	@echo "  start / dev    - Start Vite dev server (local-only mode, no API)"
	@echo "  build          - Build for production"
	@echo "  build-local    - Build with base '/'"
	@echo "  build-vercel   - Run DB migrations + build for Vercel"
	@echo "  preview        - Preview production build"
	@echo "  serve          - Build + serve on port 8000"
	@echo "  deploy         - Deploy to GitHub Pages (keyless local-only demo)"
	@echo "  deploy-vercel  - Deploy to Vercel production from local machine"
	@echo "  clean          - Remove dist/ and .vite cache"
	@echo ""
	@echo "Cloud (Vercel serverless /api)"
	@echo "  dev-cloud      - Start full stack (frontend + /api) via 'vercel dev' on :3000"
	@echo "  env-pull       - Pull Development env vars from Vercel into .env.local"
	@echo "  health         - Ping the local API health endpoint"
	@echo ""
	@echo "Database (Drizzle / Neon)"
	@echo "  db-generate    - Generate SQL migration from api/_lib/schema.ts"
	@echo "  db-migrate     - Apply migrations (uses DATABASE_URL from .env.local)"
	@echo "  db-studio      - Open Drizzle Studio against the database"
	@echo ""
	@echo "Stripe (local webhook testing)"
	@echo "  stripe         - Forward Stripe test events to localhost:3000"
	@echo "  stripe-secret  - Print the local Stripe webhook signing secret"
	@echo "  stripe-test-checkout - Trigger checkout.session.completed"
	@echo "  stripe-test-sub      - Trigger customer.subscription.created"

# Install frontend dependencies
install:
	@echo "Installing dependencies..."
	pnpm install

# Initial project setup
setup:
	@echo "Running project setup..."
	@$(MAKE) install
	@$(MAKE) build
	@echo "Setup complete. Run 'make dev' to start the development server."

# Start development server (local-only mode: no /api, no Clerk unless .env.local provides keys)
start:
	@echo "Starting development server..."
	pnpm run dev

# Alias for start
dev: start

# Build Tailwind CSS
css:
	@echo "CSS is built by Vite during dev/build; no standalone step is required."

# Build for production
build:
	@echo "Building for production..."
	pnpm run build

# Build for local deployment
build-local:
	@echo "Building for local deployment..."
	pnpm run build:local

# Build for Vercel deployment (runs DB migrations first when DATABASE_URL is set)
build-vercel:
	@echo "Building for Vercel deployment..."
	pnpm run build:vercel

# Preview production build
preview:
	@echo "Starting preview server..."
	pnpm run preview

# Build and serve locally
serve: build-local
	@echo "Building and serving locally on port 8000..."
	pnpm run serve

# Deploy to GitHub Pages
deploy:
	@echo "Deploying to GitHub Pages..."
	pnpm run deploy

# Deploy to Vercel from the local machine
deploy-vercel:
	@echo "Deploying to Vercel..."
	npx vercel@latest --prod

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf node_modules/.vite/
	@echo "Clean complete."

# Development workflow shortcuts
quick-start: install css start
full-setup: setup start

# ─────────────────────────────────────────────────────────────────────────────
# Cloud targets (Vercel serverless /api + Neon + Clerk + Stripe)
# ─────────────────────────────────────────────────────────────────────────────

# Full-stack local dev: serves the Vite app AND the /api functions on :3000.
# Requires 'npx vercel login' + 'npx vercel link' once, and 'make env-pull' for secrets.
dev-cloud:
	npx vercel@latest dev --listen 3000

# Pull env vars from Vercel: .env.local + .env.dev (Development), .env.prd (Production)
env-pull:
	npx vercel@latest env pull .env.local --environment development --yes
	npx vercel@latest env pull .env.dev --environment development --yes
	npx vercel@latest env pull .env.prd --environment production --yes
	@echo "Wrote .env.local, .env.dev, and .env.prd from Vercel."

# ── Database (Drizzle / Neon) ─────────────────────────────────────────────────

db-generate: ## Generate a SQL migration from schema changes
	pnpm run db:generate

db-migrate: ## Apply pending migrations (DATABASE_URL from .env.local or env)
	pnpm run db:migrate

db-studio: ## Browse the database with Drizzle Studio
	pnpm run db:studio

# ── Local servers ─────────────────────────────────────────────────────────────

stripe: ## Forward Stripe test events → localhost:3000/api/webhooks/stripe
	@echo "Copy the whsec_... line below into STRIPE_WEBHOOK_SECRET in .env.local"
	@echo ""
	stripe listen --forward-to localhost:3000/api/webhooks/stripe

stripe-secret: ## Print the local Stripe webhook signing secret (for scripting)
	stripe listen --print-secret

# ── Health check ──────────────────────────────────────────────────────────────

health: ## Ping the local API health endpoint
	@curl -sf http://localhost:3000/api/health \
	  && echo " — API is up" \
	  || echo "API not reachable — run: make dev-cloud"

# ── Stripe test events ────────────────────────────────────────────────────────

stripe-test-checkout: ## Trigger a test checkout.session.completed event
	stripe trigger checkout.session.completed

stripe-test-sub: ## Trigger a test customer.subscription.created event
	stripe trigger customer.subscription.created
