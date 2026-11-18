FROM node:22-alpine AS build
WORKDIR /repo
# 构建上下文为仓库根目录
COPY site/package*.json ./site/
RUN cd site && npm ci
COPY packages ./packages
COPY site ./site
RUN cd site && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY site/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /repo/site/.next ./.next
COPY --from=build /repo/site/public ./public
COPY --from=build /repo/site/next.config.mjs ./
EXPOSE 3001
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3001"]
