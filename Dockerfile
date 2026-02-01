# Build stage
FROM oven/bun:alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies with frozen lockfile for reproducible builds
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build binary with bytecode optimization
RUN bun build --compile --bytecode --minify src/index.ts --outfile=dist/server

# Production stage
FROM oven/bun:alpine

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/dist/server ./server

# Start application
CMD ["./server"]
