FROM node:22-alpine AS build
WORKDIR /repo
COPY app/package*.json ./app/
RUN cd app && npm ci
COPY packages ./packages
COPY app ./app
RUN cd app && npm run build

FROM nginx:alpine AS runtime
COPY --from=build /repo/app/dist /usr/share/nginx/html
COPY app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
