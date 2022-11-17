FROM node:18
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["npm", "run", "start"]