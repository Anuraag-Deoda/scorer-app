# 1. Deps Stage: Install dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# 2. Builder Stage: Build the application
FROM node:20-slim AS builder
WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build the Next.js application
RUN pnpm build

# 3. Runner Stage: Final, minimal image for production
FROM node:20-slim AS runner
WORKDIR /app

# Set the NODE_ENV to 'production'
ENV NODE_ENV production

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./.prisma

# Expose the port the app runs on
EXPOSE 3000

# Set the user to 'nextjs'
USER nextjs

# Start the application
CMD ["node", "server.js"]
