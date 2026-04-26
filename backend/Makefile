.DEFAULT_GOAL := help
.PHONY: help install dev build test lint clean migrate seed docker-up docker-down

VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
UVICORN := $(VENV)/bin/uvicorn
PYTEST := $(VENV)/bin/pytest

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies into virtual environment
	python3 -m venv $(VENV)
	$(PIP) install -r requirements.txt

dev: ## Start development server with hot reload
	$(UVICORN) main:app --reload --host 0.0.0.0 --port 8000

build: ## Build Docker image
	docker build -t killswitch-backend .

test: ## Run tests with pytest
	$(PYTEST) tests/ -v

lint: ## Run linter (ruff)
	$(VENV)/bin/ruff check .

clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf .ruff_cache

migrate: ## Run database migrations (Alembic)
	$(VENV)/bin/alembic upgrade head

seed: ## Seed the database with sample data
	$(PYTHON) -m seeds.seed

docker-up: ## Start Docker Compose services
	docker compose up -d

docker-down: ## Stop Docker Compose services
	docker compose down

commit: ## Stage all, show status, and commit with prompt
	@git add .
	@git status
	@read -p "Commit message: " msg; \
	git commit -m "$$msg"

push: ## Push to remote (auto set upstream on first push)
	@BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	if git config --get branch.$$BRANCH.remote > /dev/null 2>&1; then \
		git push; \
	else \
		echo "First push for branch '$$BRANCH', setting upstream..."; \
		git push -u origin $$BRANCH; \
	fi
