FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY port-mgmt-service/package*.json ./

RUN npm install

COPY port-mgmt-service/ ./
COPY middleware/ ./middleware/

EXPOSE 3006

CMD ["npm", "start"]