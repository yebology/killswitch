.DEFAULT_GOAL := help
SHELL := /bin/bash

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Docker (full stack)
# ---------------------------------------------------------------------------
docker-up: ## Start all services (PostgreSQL + Backend + Frontend)
	docker compose up -d --build

docker-down: ## Stop all services
	docker compose down

docker-logs: ## Tail logs from all services
	docker compose logs -f

docker-clean: ## Stop and remove volumes
	docker compose down -v

# ---------------------------------------------------------------------------
# Frontend (Next.js)
# ---------------------------------------------------------------------------
fe-install: ## Install frontend dependencies
	cd frontend && npm ci

fe-dev: ## Start frontend dev server
	cd frontend && npm run dev

fe-build: ## Build frontend for production
	cd frontend && npm run build

fe-test: ## Run frontend tests
	cd frontend && npm test

# ---------------------------------------------------------------------------
# Backend (Python + FastAPI)
# ---------------------------------------------------------------------------
be-install: ## Install backend dependencies
	cd backend && pip install -r requirements.txt

be-dev: ## Start backend dev server
	cd backend && uvicorn main:app --reload --port 8000

be-seed: ## Seed database with sample data
	cd backend && python -m seeds.seed

be-test: ## Run backend tests
	cd backend && pytest tests/ -v

be-attack: ## Run attack simulator for live demo
	cd backend && python scripts/simulate_attack.py

# ---------------------------------------------------------------------------
# Smart Contract (Anchor)
# ---------------------------------------------------------------------------
sc-build: ## Build Guardian Program
	cd contracts/guardian && anchor build

sc-test: ## Run Guardian Program tests
	cd contracts/guardian && anchor test

sc-deploy: ## Deploy Guardian Program to devnet
	cd contracts/guardian && anchor deploy --provider.cluster devnet

# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------
commit: ## Stage all and commit with prompt
	@git add .
	@git status
	@read -p "Commit message: " msg; \
	git commit -m "$$msg"

push: ## Push to remote (auto set upstream)
	@BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	if git config --get branch.$$BRANCH.remote > /dev/null 2>&1; then \
		git push; \
	else \
		echo "First push for branch '$$BRANCH', setting upstream..."; \
		git push -u origin $$BRANCH; \
	fi

.PHONY: help docker-up docker-down docker-logs docker-clean fe-install fe-dev fe-build fe-test be-install be-dev be-seed be-test sc-build sc-test sc-deploy commit push
