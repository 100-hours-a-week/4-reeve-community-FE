# Stage 1: Dependencies — 운영 의존성 설치 전용

# NODE_VERSION=26은 현재 로컬 개발 버전 기준 임시값.
# 실제 배포 환경에서 Docker 설치 후 필요하면 버전을 조정한다.
ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-alpine AS deps

WORKDIR /app

# package.json / package-lock.json만 먼저 복사하여 의존성 설치 레이어를 캐시한다.
# app.js나 정적 파일만 수정된 경우 npm ci 레이어는 재사용된다.
COPY package.json package-lock.json ./

# devDependencies는 제외하고 운영 실행에 필요한 dependencies만 설치한다.
# nodemon은 devDependencies로 이동했기 때문에 이 단계에서 설치되지 않는다.
RUN npm ci --omit=dev


# ══════════════════════════════════════════════
# Stage 2: Runtime — 실제 FE 서버 실행 이미지
# ══════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

# Node가 PID 1로 직접 실행될 때 발생할 수 있는 종료 시그널/좀비 프로세스 문제를 완화하기 위해 tini 사용
RUN apk add --no-cache tini

# Express 및 관련 라이브러리가 운영 모드로 동작하도록 명시
ENV NODE_ENV=production

# deps stage에서 설치한 운영 의존성만 복사
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# package.json은 "type": "module" 같은 런타임 해석 정보 때문에 필요
COPY --chown=node:node package.json ./

# 애플리케이션 실행 파일 및 정적 자산 복사
COPY --chown=node:node app.js ./
COPY --chown=node:node apiRequest ./apiRequest
COPY --chown=node:node component ./component
COPY --chown=node:node css ./css
COPY --chown=node:node html ./html
COPY --chown=node:node js ./js
COPY --chown=node:node public ./public
COPY --chown=node:node utils ./utils

# node 공식 이미지에 포함된 non-root node 사용자로 실행
USER node

# 이 컨테이너가 내부적으로 3000번 포트를 사용한다는 문서화
EXPOSE 3000

# tini를 PID 1로 실행
ENTRYPOINT ["/sbin/tini", "--"]

# npm start를 거치지 않고 Node 프로세스를 직접 실행
CMD ["node", "app.js"]