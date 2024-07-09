FROM denoland/deno:alpine

EXPOSE 1993

COPY ./templates .

WORKDIR /app

USER deno

COPY ./build-table.ts .

COPY ./deno.* .

RUN deno cache ./build-table.ts

ENTRYPOINT ["./build-table.ts"]
