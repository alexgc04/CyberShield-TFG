require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const { Client } = require("ssh2");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGODB_URI = process.env.MONGODB_URI;

// ── SEGURIDAD: Constantes de bloqueo por fuerza bruta ──
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI no definida en el archivo .env");
  process.exit(1);
}

// ── MIDDLEWARE ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:8090", "http://127.0.0.1:8080"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── MONGOOSE SCHEMA ──
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, default: "analyst" },
  active: { type: Boolean, default: true },
  failed_attempts: { type: Number, default: 0 },
  locked_until: { type: Date, default: null },
  last_login: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema, "users");

const attackTemplateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  module: { type: String, required: true },
  mitre_id: { type: String, required: true },
  risk_level: { type: String },
  wazuh_rule_id: { type: Number },
  description: { type: String, required: true },
  command: { type: String, required: true },
  command_alt: { type: String },
  parameters: { type: Array, required: true },
  logger_command: { type: String, required: true }
});
const AttackTemplate = mongoose.model("AttackTemplate", attackTemplateSchema, "attack_templates");

// ── CONEXIÓN BD ──
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas (Mongoose)"))
  .catch(err => {
    console.error("❌ Error conectando a MongoDB:", err);
    process.exit(1);
  });

// ── MIDDLEWARE: Verificar JWT ──
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

// ── RUTAS API ──

// REGISTER
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

    // Verificar duplicados (username O email)
    const exists = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });
    if (exists) {
      return res.status(409).json({ success: false, error: "El usuario o email ya existe." });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const newUser = new User({ 
      username: username.toLowerCase(), 
      email: email.toLowerCase(), 
      password_hash,
      role: "analyst",
      created_at: new Date(),
      active: true,
      failed_attempts: 0,
      locked_until: null,
      last_login: null
    });
    await newUser.save();

    console.log(`[AUTH] Nuevo usuario registrado: ${username}`);
    res.status(201).json({ success: true, message: "Cuenta creada correctamente." });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    // Aceptar 'identifier' o 'username' para compatibilidad
    const identifier = req.body.identifier || req.body.username;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: "Usuario/email y contraseña son obligatorios." });
    }

    const user = await User.findOne({ 
      $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }] 
    });

    // Mensaje genérico para no revelar si falla user o password
    const GENERIC_ERROR = "Credenciales incorrectas.";

    if (!user) {
      return res.status(401).json({ success: false, error: GENERIC_ERROR });
    }

    // Comprobar bloqueo por fuerza bruta
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        error: `Cuenta bloqueada. Inténtalo de nuevo en ${remaining} minutos.`
      });
    }

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      // Incrementar intentos fallidos
      const attempts = (user.failed_attempts || 0) + 1;
      const update = { failed_attempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        update.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
        console.log(`[AUTH] Cuenta bloqueada: ${user.username} (${attempts} intentos fallidos)`);
      }

      await User.updateOne({ _id: user._id }, { $set: update });
      return res.status(401).json({ success: false, error: GENERIC_ERROR });
    }

    // Login exitoso: resetear intentos y actualizar last_login
    await User.updateOne({ _id: user._id }, {
      $set: {
        failed_attempts: 0,
        locked_until: null,
        last_login: new Date(),
      }
    });

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("cybershield_token", token, {
      httpOnly: true,
      secure: false, // En desarrollo local sobre HTTP
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    console.log(`[AUTH] Login exitoso: ${user.username} (${user.role})`);
    res.json({
      success: true,
      user: { username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("cybershield_token", { path: "/" });
  res.json({ success: true });
});

// ME (ruta protegida con middleware)
app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado." });

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

// STATS (Dashboard — datos reales de MongoDB)
app.get("/api/stats", async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalTemplates = await AttackTemplate.countDocuments();

    // attack_logs collection (raw mongoose)
    const db = mongoose.connection.db;
    const logsCol = db.collection('attack_logs');
    const totalAttacks = await logsCol.countDocuments();
    const todayAttacks = await logsCol.countDocuments({ timestamp: { $gte: today } });
    const lastAttack = await logsCol.findOne({}, { sort: { timestamp: -1 } });

    // Ataques por módulo (últimos 7 días)
    const attacksByModule = await logsCol.aggregate([
      { $match: { timestamp: { $gte: weekAgo } } },
      { $group: { _id: "$module", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Últimas 5 operaciones
    const recentOps = await logsCol.find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    res.json({
      success: true,
      stats: {
        totalTemplates,
        totalAttacks,
        todayAttacks,
        lastAttack: lastAttack ? {
          name: lastAttack.attack_name || lastAttack.attack_id,
          timestamp: lastAttack.timestamp
        } : null,
        attacksByModule,
        recentOps
      }
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ success: false, error: "Error cargando estadísticas" });
  }
});

// HEALTH CHECK — ping a servicios
app.get("/api/health", async (req, res) => {
  const results = { mongodb: false, n8n: false, kali: false, wazuh: false };

  // MongoDB — ya estamos conectados si llegamos aquí
  results.mongodb = mongoose.connection.readyState === 1;

  // n8n
  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
    const r = await fetch(n8nUrl + '/healthz', { signal: AbortSignal.timeout(3000) });
    results.n8n = r.ok;
  } catch { results.n8n = false; }

  // Kali SSH — intento de conexión rápida
  try {
    const conn = new Client();
    results.kali = await new Promise((resolve) => {
      const timer = setTimeout(() => { conn.end(); resolve(false); }, 3000);
      conn.on('ready', () => { clearTimeout(timer); conn.end(); resolve(true); })
          .on('error', () => { clearTimeout(timer); resolve(false); })
          .connect({
            host: process.env.SSH_HOST,
            port: process.env.SSH_PORT || 22,
            username: process.env.SSH_USER,
            password: process.env.SSH_PASS,
            readyTimeout: 3000
          });
    });
  } catch { results.kali = false; }

  // Wazuh
  try {
    const wazuhHost = process.env.WAZUH_HOST || '10.10.10.49';
    const r = await fetch(`https://${wazuhHost}:9200`, {
      signal: AbortSignal.timeout(3000),
      headers: { 'Authorization': 'Basic ' + Buffer.from((process.env.WAZUH_USER || 'admin') + ':' + (process.env.WAZUH_PASS || 'admin')).toString('base64') }
    });
    results.wazuh = r.ok;
  } catch { results.wazuh = false; }

  res.json({ success: true, services: results });
});

// WAZUH ALERTS PROXY — para el dashboard defensivo
app.post("/api/wazuh/alerts", async (req, res) => {
  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
    const response = await fetch(n8nUrl + '/webhook/wazuh-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) throw new Error('n8n error');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ alerts: [], error: "No se pudo conectar con n8n/Wazuh" });
  }
});

// REPORTS GENERATE
app.post("/api/reports/generate", (req, res) => {
  // El flujo de n8n envía los datos del ataque aquí para generar el PDF
  const data = req.body;
  const reportId = data.report_id || 'CS-RPT-unknown';

  const PDFDoc = new PDFDocument();
  const chunks = [];
  PDFDoc.on('data', c => chunks.push(c));
  PDFDoc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    // En producción guardaríamos el archivo; por ahora devolvemos la URL
    res.json({
      success: true,
      report_id: reportId,
      pdf_url: `/api/reports/${reportId}.pdf`,
      size: pdfBuffer.length
    });
  });

  PDFDoc.fontSize(18).text(`CyberShield — Informe de Ataque`, { align: 'center' });
  PDFDoc.moveDown();
  PDFDoc.fontSize(12).text(`Empresa: ${data.company_name || 'N/A'}`);
  PDFDoc.text(`Ataque: ${data.attack_name || data.attack_id}`);
  PDFDoc.text(`MITRE: ${data.mitre_id || 'N/A'}`);
  PDFDoc.text(`Riesgo: ${data.risk_level || 'N/A'}`);
  PDFDoc.text(`Fecha: ${new Date().toLocaleString()}`);
  PDFDoc.moveDown();
  PDFDoc.text(`Comando: ${data.command_executed || 'N/A'}`);
  PDFDoc.moveDown();
  PDFDoc.fontSize(10).font('Courier').text(`SSH Output:\n${data.ssh_output || '(sin output)'}`);
  PDFDoc.end();
});

// ATTACK LOGS — registrar resultado de ataques
app.post("/api/attacks/log", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const logsCol = db.collection('attack_logs');
    const logEntry = {
      ...req.body,
      timestamp: new Date()
    };
    await logsCol.insertOne(logEntry);
    res.json({ success: true });
  } catch (err) {
    console.error("Log Error:", err);
    res.status(500).json({ success: false, error: "Error guardando log" });
  }
});

// ── ATTACK MODULE ROUTES ──
app.get("/api/attacks/templates", async (req, res) => {
  try {
    const templates = await AttackTemplate.find({});
    res.json({ success: true, templates });
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

app.post("/api/attacks/execute", async (req, res) => {
  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
    const n8nResponse = await fetch(n8nUrl + '/webhook/attack-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attack_id: req.body.attack_id || req.body.id,
        parameters: req.body.parameters || req.body.params,
        company_name: req.body.company_name || 'Empresa Auditada'
      })
    });

    if (!n8nResponse.ok) {
      return res.status(500).json({ success: false, error: "Error al comunicar con n8n webhook" });
    }

    const data = await n8nResponse.json();

    // Guardar log del ataque en MongoDB
    try {
      const db = mongoose.connection.db;
      const logsCol = db.collection('attack_logs');
      await logsCol.insertOne({
        attack_id: req.body.attack_id || req.body.id,
        attack_name: data.attack_name || req.body.attack_id,
        module: data.module || 'UNKNOWN',
        parameters: req.body.parameters || req.body.params,
        company_name: req.body.company_name || 'Empresa Auditada',
        ssh_exit_code: data.ssh_exit_code || 0,
        report_id: data.report_id,
        pdf_url: data.pdf_url,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error("Error saving attack log:", logErr);
    }

    res.json(data);

  } catch (err) {
    console.error("Execute Attack Error:", err);
    res.status(500).json({ success: false, error: "Error en el servidor al enviar el ataque" });
  }
});

// ── SERVIR FRONTEND EN PRODUCCIÓN ──
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "lovable/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "lovable/dist", "index.html"));
  });
}

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`🚀 CyberShield Server Unified running on port ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
