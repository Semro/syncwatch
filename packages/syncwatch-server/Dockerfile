FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY build ./
EXPOSE 8080
CMD ["npm", "run", "start:production"]