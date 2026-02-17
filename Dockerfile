FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm install -g serve

CMD ["serve", "-s", "dist", "-l", "3000"]

EXPOSE 3000