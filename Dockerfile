FROM node:alpine

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# pnpm 전역 설치
RUN npm install -g pnpm

# 의존성 파일 복사 후 설치
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# 나머지 소스 코드 복사
COPY . .

CMD ["pnpm", "start:dev"]