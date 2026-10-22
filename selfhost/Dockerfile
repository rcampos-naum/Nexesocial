FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4080 DATA_DIR=/app/selfhost/data
WORKDIR /app
COPY --chown=node:node selfhost/ ./selfhost/
COPY --chown=node:node public/import-persones-core.mjs ./public/import-persones-core.mjs
COPY --chown=node:node public/img/NexeSocial-logo.png ./public/img/NexeSocial-logo.png
COPY --chown=node:node public/img/fondo-login.png ./public/img/fondo-login.png
RUN mkdir -p /app/selfhost/data && chown node:node /app/selfhost/data
USER node
EXPOSE 4080
CMD ["node", "selfhost/server.mjs"]
