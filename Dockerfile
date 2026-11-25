FROM oven/bun:1.4.5

WORKDIR /app
COPY package.json server.ts editor.html ./
COPY app ./app

RUN chown -R bun:bun /app

USER bun
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "--hot", "server.ts"]
