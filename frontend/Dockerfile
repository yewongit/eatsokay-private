FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm install

COPY . .

EXPOSE 3001

# --hostname 0.0.0.0: 컨테이너 밖(호스트)에서 접속하려면 next dev가 모든 인터페이스에 바인딩되어야 함
CMD ["sh", "-c", "cd apps/web && npx next dev --port 3001 --hostname 0.0.0.0"]
