FROM node:10-alpine
WORKDIR /usr/src/app
ADD package.json /usr/src/app
ADD yarn.lock /usr/src/app
ADD src /usr/src/app/src
RUN yarn install
ENV PORT 80
EXPOSE 80

CMD npm start