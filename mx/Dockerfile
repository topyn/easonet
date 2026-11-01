FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Listen on unprivileged ports inside the container; docker-compose maps host :25 → :2525.
ENV SMTP_PORT=2525 HEALTH_PORT=8025
EXPOSE 2525 8025

USER node
CMD ["node", "src/index.mjs"]
