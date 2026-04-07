FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY fleet-mgmt-service/package*.json ./

RUN npm ci --no-audit --fund=false || npm install --no-audit --fund=false

COPY fleet-mgmt-service/ ./
COPY middleware/ ./middleware/

EXPOSE 3004

CMD ["npm", "start"]