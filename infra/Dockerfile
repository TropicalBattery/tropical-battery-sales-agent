FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev || npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["node", "dist/server.js"]
