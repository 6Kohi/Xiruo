ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE}

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    XIRUO_DATA_DIR=/data \
    XIRUO_CACHE_SERVICE=http://127.0.0.1:4011

COPY package.json package-lock.json ./
RUN npm ci --include=dev

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium ca-certificates fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

ENV XIRUO_CHROMIUM_PATH=/usr/bin/chromium

COPY . .
RUN npm run build && mkdir -p /data

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "run", "start:fnos"]
