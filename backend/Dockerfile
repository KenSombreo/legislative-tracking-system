# Legislative Tracking API (NestJS, compiled with nest build).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    FILE_STORAGE_PATH=storage
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Uploaded documents. Mounted as a volume in production; created here so the
# volume starts out owned by the non-root user.
RUN mkdir -p storage && chown node:node storage
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
