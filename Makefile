# Start Page Makefile
# Simplifies common development tasks
#
# Prerequisites for cloud backend targets:
#   Python 3.11+  │  pnpm  │  Stripe CLI (https://stripe.com/docs/stripe-cli)
# Run in Git Bash, WSL, or any Unix shell.

VENV    := backend/.venv
PY      := $(VENV)/bin/python
PIP     := $(VENV)/bin/pip
ALEMBIC := $(VENV)/bin/alembic
UVICORN := $(VENV)/bin/uvicorn

.PHONY: help install setup start build build-local build-vercel preview serve deploy deploy-vercel clean dev \
        server-install server-start all-install \
        backend-env backend-install backend migrate migrate-down migrate-make migrate-history migrate-current \
        stripe stripe-secret health stripe-test-checkout stripe-test-sub backend-clean

# Default target
help:
	@echo ""
	@echo "Frontend"
	@echo "  install        - Install frontend (pnpm) dependencies"
	@echo "  start / dev    - Start Vite dev server"
	@echo "  build          - Build for production"
	@echo "  build-local    - Build with base '/'"
	@echo "  build-vercel   - Build for Vercel"
	@echo "  preview        - Preview production build"
	@echo "  serve          - Build + serve on port 8000"
	@echo "  deploy         - Deploy to GitHub Pages"
	@echo "  deploy-vercel  - Deploy to Vercel from local machine"
	@echo "  clean          - Remove dist/ and .vite cache"
	@echo ""
	@echo "Cloud backend  (run each service in its own terminal)"
	@echo "  backend-env    - Create backend/.env from .env.example"
	@echo "  backend-install- Create Python venv + install deps"
	@echo "  backend        - Start FastAPI on http://localhost:8000"
	@echo "  stripe         - Forward Stripe events to local backend"
	@echo "  stripe-secret  - Print the local Stripe webhook secret"
	@echo "  health         - Ping the local backend health endpoint"
	@echo ""
	@echo "Database (Alembic)"
	@echo "  migrate        - Apply all pending migrations"
	@echo "  migrate-down   - Roll back the last migration"
	@echo "  migrate-make   - Auto-generate a migration  (name=<slug>)"
	@echo "  migrate-history- Show migration history"
	@echo "  migrate-current- Show current DB revision"
	@echo ""
	@echo "Stripe test events"
	@echo "  stripe-test-checkout - Trigger checkout.session.completed"
	@echo "  stripe-test-sub      - Trigger customer.subscription.created"
	@echo ""
	@echo "  backend-clean  - Remove Python venv"
	@echo "  all-install    - Frontend + backend install in one shot"

# Install frontend dependencies
install:
	@echo "Installing frontend dependencies..."
	pnpm install

# Install server dependencies (legacy Express server)
server-install:
	@echo "Installing server dependencies..."
	pnpm install --filter server

# Install all dependencies (frontend + Python backend)
all-install: install backend-install

# Initial project setup
setup:
	@echo "Running project setup..."
	@$(MAKE) install
	@$(MAKE) build
	@echo "Setup complete. Run 'make dev' to start the development server."

# Start development server
start:
	@echo "Starting development server..."
	pnpm run dev

# Alias for start
dev: start

# Start backend server
server-start:
	@echo "Starting backend server..."
	pnpm --dir server exec node index.js

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

# Build for Vercel deployment
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
# Cloud backend targets
# ─────────────────────────────────────────────────────────────────────────────

# ── Setup ─────────────────────────────────────────────────────────────────────

backend-env: ## Create backend/.env from .env.example (skips if already exists)
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env; \
		echo "Created backend/.env — fill in your Clerk, Stripe, and Neon secrets."; \
	else \
		echo "backend/.env already exists — skipping."; \
	fi

backend-install: ## Create Python venv and install backend/requirements.txt
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip -q
	$(PIP) install -r backend/requirements.txt -q
	@echo "Backend deps installed in $(VENV)"

# ── Database (Alembic) ────────────────────────────────────────────────────────

migrate: ## Apply all pending migrations (uses DATABASE_URL in backend/.env)
	cd backend && ../$(ALEMBIC) upgrade head

migrate-down: ## Roll back the last migration
	cd backend && ../$(ALEMBIC) downgrade -1

migrate-make: ## Auto-generate a new migration: make migrate-make name=add_sessions
	@test -n "$(name)" || (echo "Usage: make migrate-make name=<snake_case_name>"; exit 1)
	cd backend && ../$(ALEMBIC) revision --autogenerate -m "$(name)"

migrate-history: ## Show full Alembic migration history
	cd backend && ../$(ALEMBIC) history --verbose

migrate-current: ## Show the current DB revision
	cd backend && ../$(ALEMBIC) current

# ── Local servers (each in its own terminal) ──────────────────────────────────

backend: ## Start FastAPI with hot-reload on http://localhost:8000
	cd backend && ../$(UVICORN) app.main:app --reload --host 127.0.0.1 --port 8000

stripe: ## Forward Stripe test events → localhost:8000/api/webhooks/stripe
	@echo "Copy the whsec_... line below into STRIPE_WEBHOOK_SECRET in backend/.env"
	@echo ""
	stripe listen --forward-to localhost:8000/api/webhooks/stripe

stripe-secret: ## Print the local Stripe webhook signing secret (for scripting)
	stripe listen --print-secret

# ── Health check ──────────────────────────────────────────────────────────────

health: ## Ping the backend health endpoint
	@curl -sf http://localhost:8000/health | python3 -m json.tool \
	  && echo "Backend is up" \
	  || echo "Backend not reachable — run: make backend"

# ── Stripe test events ────────────────────────────────────────────────────────

stripe-test-checkout: ## Trigger a test checkout.session.completed event
	stripe trigger checkout.session.completed

stripe-test-sub: ## Trigger a test customer.subscription.created event
	stripe trigger customer.subscription.created

# ── Cleanup ───────────────────────────────────────────────────────────────────

backend-clean: ## Remove the Python venv
	rm -rf $(VENV)
	@echo "Removed $(VENV)"
