SHELL := /bin/bash

commit:
	@git add .
	@git status
	@read -p "Commit message: " msg; \
	git commit -m "$$msg"

run-fe:
	cd frontend && npm run dev

run-be:
	cd backend && go run main.go

run-all:
	@make run-be & make run-fe

db-reset:
	cd backend && go run cmd/reset/main.go

db-seed:
	cd backend && go run cmd/seed/main.go

register-schema:
	cd backend && go run cmd/register-schema/main.go

setup-agent:
	cd agent && pip install -r requirements.txt

run-agent:
	cd agent && python main.py
