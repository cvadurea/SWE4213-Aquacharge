# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first for better layer cache reuse
COPY package*.json ./
RUN npm ci --no-audit --fund=false --legacy-peer-deps || npm install --no-audit --fund=false --legacy-peer-deps

# Build static frontend assets with Vite
COPY . .
RUN npx vite build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
