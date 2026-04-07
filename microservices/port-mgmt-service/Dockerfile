FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY port-mgmt-service/package*.json ./

RUN npm ci --no-audit --fund=false || npm install --no-audit --fund=false

COPY port-mgmt-service/ ./
COPY middleware/ ./middleware/

EXPOSE 3006

CMD ["npm", "start"]