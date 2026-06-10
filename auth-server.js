/**
 * CyberShield — Auth Server
 * Servidor de autenticación con JWT (httpOnly cookies) + MongoDB
 * Puerto: 3020
 */

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

// ── Config ──
const PORT = process.env.AUTH_PORT || 3020;
const MONGO_URI = process.env.MONGODB_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "cybershield-tfg-2026-secret-key";
const JWT_EXPIRY = "24h";
const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

if (!MONGO_URI) {
  console.error("❌ MONGODB_URI no definida. Usa: $env:MONGODB_URI=\"...\" node auth-server.js");
  process.exit(1);
}

// ── Express App ──
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:8081", "http://localhost:8090", "http://127.0.0.1:8080", "http://127.0.0.1:8090"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── MongoDB ──
let db;
const client = new MongoClient(MONGO_URI);

async function connectDB() {
  try {
    await client.connect();
    db = client.db("CyberShield");
    console.log("✅ Conectado a MongoDB Atlas (CyberShield)");

    // Crear índices únicos
    const users = db.collection("users");
    await users.createIndex({ username: 1 }, { unique: true });
    await users.createIndex({ email: 1 }, { unique: true });
    console.log("✅ Índices de usuarios creados");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err.message);
    process.exit(1);
  }
}

// ── Middleware: Verificar JWT ──
function verifyToken(req, res, next) {
  const token = req.cookies?.cybershield_token;
  if (!token) {
    return res.status(401).json({ success: false, error: "No autorizado. Inicia sesión." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie("cybershield_token");
    return res.status(401).json({ success: false, error: "Sesión expirada. Inicia sesión de nuevo." });
  }
}

// ══════════════════════════════════════════
// RUTAS DE AUTENTICACIÓN
// ══════════════════════════════════════════

// ── POST /api/auth/register ──
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validaciones
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, error: "Todos los campos son obligatorios." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: "Las contraseñas no coinciden." });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 8 caracteres." });
    }
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({ success: false, error: "Email no válido." });
    }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return res.status(400).json({ success: false, error: "El usuario debe tener entre 3-20 caracteres (letras, números, _ -)." });
    }

    const users = db.collection("users");

    // Verificar duplicados
    const existing = await users.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });
    if (existing) {
      return res.status(409).json({ success: false, error: "El usuario o email ya existe." });
    }

    // Hashear contraseña y crear usuario
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await users.insertOne({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password_hash,
      role: "analyst",
      created_at: new Date(),
      last_login: null,
      active: true,
      failed_attempts: 0,
      locked_until: null,
    });

    console.log(`[AUTH] Nuevo usuario registrado: ${username}`);
    res.status(201).json({ success: true, message: "Cuenta creada correctamente." });
  } catch (err) {
    console.error("[AUTH] Error en register:", err.message);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// ── POST /api/auth/login ──
app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: "Usuario/email y contraseña son obligatorios." });
    }

    const users = db.collection("users");
    const user = await users.findOne({
      $or: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() }
      ]
    });

    // Mensaje genérico para no revelar si falla user o password
    const GENERIC_ERROR = "Credenciales incorrectas.";

    if (!user) {
      return res.status(401).json({ success: false, error: GENERIC_ERROR });
    }

    // Comprobar bloqueo
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        error: `Cuenta bloqueada. Inténtalo de nuevo en ${remaining} minutos.`
      });
    }

    // Verificar contraseña
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_attempts || 0) + 1;
      const update = { $set: { failed_attempts: attempts } };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        update.$set.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
        console.log(`[AUTH] Cuenta bloqueada: ${user.username} (${attempts} intentos fallidos)`);
      }

      await users.updateOne({ _id: user._id }, update);
      return res.status(401).json({ success: false, error: GENERIC_ERROR });
    }

    // Login exitoso: resetear intentos y actualizar last_login
    await users.updateOne({ _id: user._id }, {
      $set: {
        failed_attempts: 0,
        locked_until: null,
        last_login: new Date(),
      }
    });

    // Generar JWT
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Enviar como httpOnly cookie
    res.cookie("cybershield_token", token, {
      httpOnly: true,
      secure: false, // true en producción con HTTPS
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24h
      path: "/",
    });

    console.log(`[AUTH] Login exitoso: ${user.username} (${user.role})`);
    res.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });
  } catch (err) {
    console.error("[AUTH] Error en login:", err.message);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// ── POST /api/auth/logout ──
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("cybershield_token", { path: "/" });
  res.json({ success: true, message: "Sesión cerrada." });
});

// ── GET /api/auth/me (ruta protegida) ──
app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const users = db.collection("users");
    const user = await users.findOne(
      { username: req.user.username },
      { projection: { password_hash: 0 } }
    );
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado." });
    }
    res.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        last_login: user.last_login,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// ── Health check ──
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth-server", timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════
// RUTAS DEL DASHBOARD (Módulo 4)
// ══════════════════════════════════════════

// ── GET /api/stats (ruta protegida) ──
app.get("/api/stats", verifyToken, async (req, res) => {
  try {
    // Aquí consultaríamos Wazuh o la colección de alertas en MongoDB
    // Por ahora, simulamos datos dinámicos basados en la BD de MongoDB
    const usersCount = await db.collection("users").countDocuments();
    
    // Calculamos el score basado en la hora para que varíe un poco
    const hour = new Date().getHours();
    const baseScore = 80;
    const currentScore = baseScore + (hour % 15);
    
    // Actividad reciente simulada/dinámica
    const recentActivity = [
      { id: 1, type: "scan", target: "192.168.1.0/24", status: "Completado", severity: "info", time: "Hace 1h" },
      { id: 2, type: "alert", target: "Posible XSS detectado", status: "Mitigado", severity: "warning", time: "Hace 2h" },
      { id: 3, type: "scan", target: "web-production.local", status: "Completado", severity: "info", time: "Hace 5h" },
      { id: 4, type: "alert", target: "Intentos fallidos SSH", status: "Bloqueado", severity: "high", time: "Hace 8h" }
    ];

    res.json({
      success: true,
      stats: {
        score: currentScore,
        vulnerabilities: { total: 12, critical: 2, high: 4 },
        firewalls: { active: 3, status: "Operativos" },
        lastScan: "Hace 1h",
        improvement: "+5%",
        usersCount
      },
      activity: recentActivity
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Error obteniendo estadísticas." });
  }
});

// ══════════════════════════════════════════
// ARRANQUE
// ══════════════════════════════════════════
async function start() {
  await connectDB();

  // En desarrollo usamos HTTP. En producción con certificados reales
  // se activaría HTTPS con: https.createServer({key, cert}, app)
  // Los certificados autofirmados provocan ERR_SSL_PROTOCOL_ERROR
  // en los navegadores y bloquean las peticiones fetch() del frontend.
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🔐 CyberShield Auth Server → http://0.0.0.0:${PORT}`);
  });
}

start();
