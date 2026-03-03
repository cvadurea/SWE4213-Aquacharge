FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY fleet-mgmt-service/package*.json ./

RUN npm install

COPY fleet-mgmt-service/ ./
COPY middleware/ ./middleware/

EXPOSE 3004

CMD ["npm", "start"]