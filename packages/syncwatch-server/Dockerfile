FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY ./build ./build
EXPOSE 8080
CMD ["npm", "run", "start:production"]