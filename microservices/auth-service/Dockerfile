FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --fund=false || npm install --no-audit --fund=false

COPY . .

EXPOSE 3002

CMD ["npm", "start"]