import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";

// ✅ Railway-safe session setup (keeps DB sessions)
export function getSession() {
  const pgStore = connectPg(session);

  return session({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "default-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,       // ✅ Railway allows HTTP during preview
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  });
}

// ✅ Setup auth (no login/out needed – app still works)
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.get("/api/login", (_req, res) => {
    res.status(200).json({
      message: "Authentication is currently disabled for production deployment.",
    });
  });

  app.get("/api/logout", (_req, res) => {
    res.status(200).json({ message: "Logged out (no-auth mode)." });
  });
}

// ✅ Protect routes (temporarily disabled)
export const isAuthenticated: RequestHandler = async (_req, res, _next) => {
  return res.status(401).json({ message: "Login system disabled — enable a new auth provider to secure this route." });
};
