FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p src/uploads

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/server.js"]
