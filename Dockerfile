# The UI is built in the first stage; the server needs no node_modules at run time,
# since it uses only Node built-ins and runs its TypeScript directly.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server server
COPY shared shared
COPY --from=build /app/dist dist
# Mount the data directory here. The node user is uid 1000, so files it writes
# into a bind mount stay owned by the host user of the same uid.
ENV RAUTALOKI_DATA=/data
USER node
EXPOSE 8910
CMD ["node", "server/index.ts"]
