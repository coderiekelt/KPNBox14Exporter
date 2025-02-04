FROM node:23-alpine

WORKDIR /usr/app
COPY ./ /usr/app

CMD ["node", "./main.js"]