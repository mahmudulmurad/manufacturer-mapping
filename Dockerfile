FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install && yarn cache clean
COPY . .
RUN yarn build

RUN chmod -R 777 /app/node_modules && chmod -R 777 /app/dist

EXPOSE 3111

CMD ["yarn", "start:dev"]
