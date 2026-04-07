# Aquacharge Kubernetes Deployment (Minikube)

This folder contains Kubernetes manifests to deploy Aquacharge on Minikube.

## 1) Start Minikube

```bash
minikube start
```

## 2) Build all images inside Minikube's Docker daemon

From repo root (`SWE4213-Aquacharge`):

```bash
minikube image build -t aquacharge/analytics-service:latest ./microservices/analytics-dashboard-service
minikube image build -t aquacharge/auth-service:latest ./microservices/auth-service
minikube image build -t aquacharge/booking-service:latest ./microservices/booking-service
minikube image build -t aquacharge/notification-service:latest ./microservices/notification-service
minikube image build -t aquacharge/user-service:latest ./microservices/user-mgmt-service
minikube image build -t aquacharge/gateway:latest ./microservices/gateway
minikube image build -t aquacharge/fleet-service:latest -f fleet-mgmt-service/Dockerfile ./microservices
minikube image build -t aquacharge/port-service:latest -f port-mgmt-service/Dockerfile ./microservices
```

If you are inside the `k8s` folder, use `../microservices` paths instead:

```bash
minikube image build -t aquacharge/fleet-service:latest -f fleet-mgmt-service/Dockerfile ../microservices
minikube image build -t aquacharge/port-service:latest -f port-mgmt-service/Dockerfile ../microservices
```

If you saw this fail:

```bash
minikube image build -t aquacharge/fleet-service:latest -f ./microservices/fleet-mgmt-service
```

It fails because `-f` must point to a Dockerfile path, and you must provide a build context at the end.
For `fleet-service` and `port-service`, the Dockerfile path should be relative to the `microservices` build context.
You will also get `lstat .../microservices: no such file or directory` if your current working directory does not contain `./microservices`.

## Build Speed Tips (Windows + Minikube)

To reduce build times from 5-10 minutes:

1. Use the `.dockerignore` files in this repo so `node_modules` are not sent in build context.
2. Dockerfiles now use `npm ci` for faster deterministic installs.
	If a lockfile is out of sync, builds automatically fall back to `npm install` so image builds do not fail.
3. Keep image tags stable (`:latest`) while iterating to maximize layer cache reuse.
4. Build fleet/port using `./microservices` context exactly as shown above (required for shared `middleware/`).

To verify context transfer is reduced, run with progress output:

```bash
minikube image build -t aquacharge/auth-service:latest ./microservices/auth-service
```

Frontend image is expected as `aquacharge/frontend:latest`.
Build it with the Dockerfile in `aquacharge/`:

```bash
minikube image build -t aquacharge/frontend:latest -f ./aquacharge/Dockerfile ./aquacharge
```

## 3) Deploy manifests

```bash
kubectl apply -k ./k8s
```

## 4) Port-forward the services

Open separate terminals for each command below:

```bash
kubectl port-forward -n aquacharge service/frontend 5173:80
kubectl port-forward -n aquacharge service/auth-service 3002:3002
kubectl port-forward -n aquacharge service/booking-service 3003:3003
kubectl port-forward -n aquacharge service/fleet-service 3004:3004
kubectl port-forward -n aquacharge service/notification-service 3005:3005
kubectl port-forward -n aquacharge service/port-service 3006:3006
kubectl port-forward -n aquacharge service/user-service 3007:3007
kubectl port-forward -n aquacharge service/analytics-service 3001:3001
```

If you want the gateway as well, forward it on another terminal:

```bash
kubectl port-forward -n aquacharge service/gateway 3000:3000
```

## 5) Open the app

```text
http://localhost:5173
```

## 6) Verify

```bash
kubectl get pods -n aquacharge
kubectl get svc -n aquacharge
kubectl get ingress -n aquacharge
```

## Notes

- Namespace: `aquacharge`
- Postgres stateful sets are created for `user-db`, `booking-db`, `fleet-db`, and `port-db`.
- `port-service` is intentionally wired to `port-db` (matching current application behavior where chargers and ports are initialized together).
- Frontend API calls now go directly to localhost ports, so the browser only works after the frontend and backend services are port-forwarded.
- Keep the frontend port-forward on `5173` so the backend CORS headers match the browser origin.
- JWT and DB credentials are in `01-secrets-config.yaml` as `stringData` for local/dev use.
- For production, move secrets to a secure secret manager and use stronger credentials.
