FROM node:lts
WORKDIR /app
COPY package*.json ./
RUN npm install
ENV WS_PORT=5000
EXPOSE ${WS_PORT}
COPY . .
RUN npm run build
CMD [ "npm", "run", "start" ]
