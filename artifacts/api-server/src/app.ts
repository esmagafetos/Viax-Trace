import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the first proxy in front of us (Render terminates TLS at its load
// balancer and forwards via HTTP). Without this, `req.secure` is false and
// express-session refuses to set the `Secure` cookie in production.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET ?? "viax-scout-secret-change-in-production";
if (!process.env.SESSION_SECRET) {
  // Aviso defensivo: o fallback é estável, mas se ele mudar entre deploys
  // todas as sessões ficam inválidas. Em produção isso é o sintoma típico
  // de "fui deslogado depois que o servidor dormiu".
  logger.warn(
    "SESSION_SECRET não definido — usando fallback. Defina o secret nas variáveis de ambiente para que sessões sobrevivam a redeploys/cold-starts.",
  );
}

// Persist sessions in PostgreSQL so users stay logged in across API restarts
// (Render redeploys, free-tier cold starts, etc). Reuses the same pg Pool as
// Drizzle to avoid a second connection pool.
//
// We create the `session` table inline instead of using
// `createTableIfMissing: true`, because that option reads `table.sql` from the
// connect-pg-simple package directory at runtime — and our esbuild bundle
// doesn't ship that file. Inlining the DDL keeps the build self-contained.
pool
  .query(
    `CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`,
  )
  .catch((err: Error) => {
    logger.error({ err: err.message }, "failed to ensure session table");
  });

const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  pool,
  tableName: "session",
  createTableIfMissing: false,
  pruneSessionInterval: 60 * 60, // prune expired sessions every hour
});
sessionStore.on("error", (err: Error) => {
  logger.error({ err: err.message }, "session store error");
});

app.use(
  session({
    name: "viax.sid",
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    rolling: true,             // renova o cookie a cada request → usuário ativo nunca é deslogado
    saveUninitialized: false,
    proxy: true,               // honra X-Forwarded-Proto vindo do load balancer (Render/Replit)
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 dias rolantes (era 7 fixos)
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

app.use("/api", router);

export default app;
