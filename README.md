# SWE4213-Aquacharge

Aquacharge is a full-stack class project for managing electric vessel charging and V2G (vehicle-to-grid) workflows.

The system supports two primary roles:
- Vessel owners: find chargers, book sessions, view booking status, and track V2G earnings.
- Port operators: manage pricing and monitor/verify booking activity.

## Repository Structure

This repository is organized into a frontend app and backend microservices.

```text
SWE4213-Aquacharge/
	aquacharge/                # Frontend (React + Vite)
		src/                     # UI pages/components
		public/                  # Static assets
		package.json

	microservices/             # Backend services + docker compose
		docker-compose.yaml

		auth-service/            # Authentication and token issuance (3002)
		booking-service/         # Booking lifecycle, V2G pricing/verification (3003)
		fleet-mgmt-service/      # Vessel management (3004)
		notification-service/    # Booking email notifications (3005)
		port-mgmt-service/       # Port and charger management (3006)
		user-mgmt-service/       # User profile/seed users (3007)
		analytics-dashboard-service/ # Analytics endpoint(s) (3001)
		gateway/                 # API gateway routing (3000)
```

## Technologies Used

Frontend:
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Radix UI + custom UI components

Backend:
- Node.js + Express
- PostgreSQL (service-specific databases)
- Docker + Docker Compose
- Nodemailer (notification service)

Tooling:
- ESLint
- Prettier
- TypeScript compiler

## Local Development Setup

### Prerequisites

Install the following:
- Node.js 18+ and npm
- Docker Desktop (or Docker Engine) with Docker Compose

### 1) Start backend microservices

From the repository root:

```bash
cd microservices
docker compose up --build
```

This starts the services on:
- Gateway: http://localhost:3000
- Analytics service: http://localhost:3001
- Auth service: http://localhost:3002
- Booking service: http://localhost:3003
- Fleet service: http://localhost:3004
- Notification service: http://localhost:3005
- Port service: http://localhost:3006
- User service: http://localhost:3007

Optional SMTP setup for real email delivery:
- Create a `microservices/.env` file
- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`

If SMTP values are not provided, notifications run in JSON preview mode.

### 2) Start frontend app

Open a new terminal at the repository root:

```bash
cd aquacharge
npm install
npm run dev
```

Frontend runs at:
- http://localhost:5173

### 3) Stop services

Backend:

```bash
cd microservices
docker compose down
```

To also remove persistent database volumes:

```bash
cd microservices
docker compose down -v
```

## Notes

- Backend services seed sample data in their own startup flows.
- If you changed schema logic and need a clean state, bring services down with `-v` and restart.
