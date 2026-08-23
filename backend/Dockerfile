# Multi-stage build: an install/build stage with devDependencies, then a
# minimal final stage — the official Lambda Node.js base image — with only
# what's needed to run (best-practices.md §Docker).

FROM node:22-slim AS builder
WORKDIR /app

# Lets Prisma correctly detect libssl for the "native" binaryTarget (used by
# local dev/tests) instead of guessing — the Lambda-bound engine
# (rhel-openssl-3.0.x) is unaffected either way since it's a fixed target.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

RUN npm prune --omit=dev

FROM public.ecr.aws/lambda/nodejs:22 AS runtime

COPY --from=builder /app/dist ${LAMBDA_TASK_ROOT}
COPY --from=builder /app/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=builder /app/package.json ${LAMBDA_TASK_ROOT}/package.json

CMD ["lambda.handler"]
