# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
#silent to reduce log size
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: serve with "serve"
FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm i -g serve
#serve is a lightweight static file server
COPY --from=build /app/dist /app/dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
#-s means single page application
#-l means port number
