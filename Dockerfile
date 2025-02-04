FROM node:23-alpine

WORKDIR /usr/app
COPY ./ /usr/app

RUN npm install

CMD ["node", "./main.js"]