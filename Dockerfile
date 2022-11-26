FROM node:18
ENV NODE_ENV=production
WORKDIR /
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 80
CMD ["npm", "run", "start"]