FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn

COPY . .

RUN yarn build

EXPOSE 3111


CMD ["yarn", "start:dev"]
