FROM node:18-slim
WORKDIR /usr/src/app

# Copy package files first to install deps
COPY package.json package-lock.json* ./

RUN npm install --production

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy app
COPY . .

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=2s --start-period=5s --retries=3 \
	CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "app.js"]
