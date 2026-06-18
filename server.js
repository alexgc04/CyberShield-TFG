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
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');
const crypto = require('crypto');

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

// ── CONFIGURACIÓN DE CORREO ──
const SMTP_CONFIGURED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
let transporter = null;
if (SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });
  console.log('[MAIL] SMTP configurado correctamente.');
} else {
  console.warn('[MAIL] SMTP no configurado. Los correos se omiten y las cuentas se activan directamente.');
}

// ── MIDDLEWARE ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:8090", "http://127.0.0.1:8080"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// 1. Sanitización NoSQL (elimina $, . de todos los inputs)
app.use(mongoSanitize());

// 2. Rate limiting global (todas las rutas /api)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,                   // máx 200 req por IP en 15min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas peticiones. Espera 15 minutos.' }
});
app.use('/api', globalLimiter);

// 3. Rate limiting estricto SOLO para auth (anti fuerza bruta HTTP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                    // máx 10 intentos de login/register por IP en 15min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos. Espera 15 minutos.' }
});

// 4. express-session (SOLO para el flujo OAuth de Google)
app.use(session({
  secret: process.env.SESSION_SECRET || JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { secure: false, maxAge: 5 * 60 * 1000 } // 5min, solo para OAuth callback
}));

// 5. Passport (SOLO Google OAuth)
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch(e) { done(e); }
});

// ── MONGOOSE SCHEMA ──
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: false },
  role: { type: String, default: "analyst" },
  active: { type: Boolean, default: false }, // Se cambia a false por defecto para requerir confirmación
  failed_attempts: { type: Number, default: 0 },
  locked_until: { type: Date, default: null },
  last_login: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  google_id: { type: String, sparse: true, unique: true },
  auth_provider: { type: String, enum: ['local','google'], default: 'local' },
  reset_password_token: { type: String, default: null },
  reset_password_expires: { type: Date, default: null },
  verify_email_token: { type: String, default: null }
});
const User = mongoose.model("User", userSchema, "users");

// ── GOOGLE STRATEGY ──
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ google_id: profile.id });
      if (!user) {
        // Buscar por email por si ya tiene cuenta local
        const email = profile.emails?.[0]?.value;
        user = email ? await User.findOne({ email }) : null;
        if (user) {
          // Vincular cuenta local con Google
          user.google_id = profile.id;
          user.auth_provider = 'google';
          await user.save();
        } else {
          // Crear usuario nuevo desde Google
          user = await User.create({
            username: profile.displayName.replace(/\s+/g,'').toLowerCase().slice(0,20) + '' + profile.id.slice(-4),
            email: email || `google_${profile.id}@cybershield.local`,
            auth_provider: 'google',
            google_id: profile.id,
            role: 'analyst',
            active: true,
            failed_attempts: 0,
          });
        }
      }
      return done(null, user);
    } catch(e) { return done(e); }
  }));
} else {
  console.warn('[AUTH] Google OAuth desactivado: GOOGLE_CLIENT_ID no definido en .env');
}

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
  .then(async () => {
    console.log("✅ Conectado a MongoDB Atlas (Mongoose)");
    // Limpiar índices obsoletos que causan errores E11000
    try {
      const db = mongoose.connection.db;
      const atCol = db.collection('attack_templates');
      const indexes = await atCol.indexes();
      for (const idx of indexes) {
        if (idx.name === 'attack_id_1') {
          await atCol.dropIndex('attack_id_1');
          console.log('🧹 Índice obsoleto attack_id_1 eliminado de attack_templates');
        }
      }
    } catch (e) { /* índice no existe, ok */ }
  })
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
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const email    = (req.body.email    || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const confirmPassword = (req.body.confirmPassword || '').trim();

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
    if (!/^[a-zA-Z0-9_\-]{3,20}$/.test(username)) {
      return res.status(400).json({ success: false, error: "Usuario: 3-20 caracteres, solo letras, números, _ o -." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Email no válido." });
    }

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      return res.status(409).json({ success: false, error: "Usuario o email ya registrado." });
    }

    const password_hash = await bcrypt.hash(password, 12);

    if (SMTP_CONFIGURED) {
      // Con SMTP: cuenta inactiva hasta verificar por correo
      const verify_email_token = crypto.randomBytes(32).toString('hex');
      await User.create({ 
        username, email, password_hash, 
        auth_provider: 'local', role: 'analyst', 
        active: false, failed_attempts: 0,
        verify_email_token
      });

      const verifyLink = `http://localhost:8080/verify-email?token=${verify_email_token}`;
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'cybershield@local.dev',
          to: email,
          subject: 'CyberShield - Verifica tu cuenta',
          html: `<h2>Bienvenido a CyberShield</h2>
                 <p>Por favor, haz clic en el siguiente enlace para verificar tu cuenta y poder acceder:</p>
                 <a href="${verifyLink}">${verifyLink}</a>`
        });
      } catch(err) {
        console.warn('[MAIL] No se pudo enviar el email de verificación:', err.message);
      }
      console.log(`[AUTH] Nuevo usuario: ${username} (Pendiente verificación)`);
      res.status(201).json({ success: true, message: "Cuenta creada. Revisa tu correo para verificarla." });
    } else {
      // Sin SMTP: activar cuenta directamente
      await User.create({ 
        username, email, password_hash, 
        auth_provider: 'local', role: 'analyst', 
        active: true, failed_attempts: 0
      });
      console.log(`[AUTH] Nuevo usuario: ${username} (Activo — SMTP no configurado)`);
      res.status(201).json({ success: true, message: "Cuenta creada correctamente. Ya puedes iniciar sesión." });
    }
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// LOGIN
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 15 * 60 * 1000; // 15 min

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const identifier = (req.body.username || req.body.identifier || '').trim().toLowerCase();
    const password   = (req.body.password || '').trim();

    if (!identifier || !password)
      return res.status(400).json({ success: false, error: 'Credenciales incompletas.' });

    const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });

    // Mensaje genérico (no revela si falla el user o la pass)
    const FAIL = { success: false, error: 'Credenciales incorrectas.' };

    if (!user) return res.status(401).json(FAIL);

    // Comprobar bloqueo por intentos
    if (user.locked_until && new Date() < user.locked_until) {
      const mins = Math.ceil((user.locked_until - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        error: `Cuenta bloqueada. Inténtalo en ${mins} minutos.`
      });
    }

    // Verificar contraseña (usuarios Google no tienen password_hash)
    if (!user.password_hash)
      return res.status(401).json({ success: false, error: 'Esta cuenta usa Google Sign-In.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_attempts || 0) + 1;
      const update = { failed_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        update.locked_until = new Date(Date.now() + LOCKOUT_MS);
        console.warn(`[AUTH] Cuenta bloqueada: ${user.username} (${attempts} intentos)`);
      }
      await User.findByIdAndUpdate(user._id, { $set: update });
      return res.status(401).json(FAIL);
    }

    if (!user.active) {
      return res.status(403).json({ success: false, error: 'Cuenta inactiva. Por favor verifica tu correo electrónico.' });
    }

    // Login correcto: resetear contadores
    await User.findByIdAndUpdate(user._id, {
      $set: { failed_attempts: 0, locked_until: null, last_login: new Date() }
    });

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('cybershield_token', token, {
      httpOnly: true, secure: false, sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, path: '/'
    });
    res.json({ success: true, user: { username: user.username, role: user.role } });
  } catch(err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
});

// GOOGLE OAUTH
app.get('/api/auth/google/available', (req, res) => {
  res.json({
    available: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  });
});

app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile','email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_failed', session: true }),
  (req, res) => {
    // Generar JWT igual que el login local
    const token = jwt.sign(
      { userId: req.user._id, username: req.user.username, role: req.user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('cybershield_token', token, {
      httpOnly: true, secure: false, sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, path: '/'
    });
    res.redirect('/dashboard');
  }
);

// ── EMAIL VERIFICATION ──
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: "Token faltante." });

    const user = await User.findOne({ verify_email_token: token });
    if (!user) return res.status(400).json({ success: false, error: "Token inválido o expirado." });

    user.active = true;
    user.verify_email_token = null;
    await user.save();

    res.json({ success: true, message: "Cuenta verificada con éxito." });
  } catch (err) {
    console.error("Verify Email Error:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// ── FORGOT PASSWORD ──
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    // Siempre devolvemos success aunque no exista para no revelar cuentas
    if (!user || user.auth_provider === 'google') {
      return res.json({ success: true, message: "Si el correo existe, se ha enviado un enlace de recuperación." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.reset_password_token = resetToken;
    user.reset_password_expires = Date.now() + 3600000; // 1 hora
    await user.save();

    const resetLink = `http://localhost:8080/reset-password?token=${resetToken}`;

    if (SMTP_CONFIGURED) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'cybershield@local.dev',
          to: user.email,
          subject: 'CyberShield - Recuperación de contraseña',
          html: `<p>Has solicitado restablecer tu contraseña.</p>
                 <p>Haz clic en el siguiente enlace, o pégalo en tu navegador para completar el proceso:</p>
                 <a href="${resetLink}">${resetLink}</a>
                 <p>Si no solicitaste esto, ignora este correo y tu contraseña se mantendrá sin cambios.</p>`
        });
      } catch(err) {
        console.warn('[MAIL] No se pudo enviar el email de recuperación:', err.message);
      }
      res.json({ success: true, message: "Si el correo existe, se ha enviado un enlace de recuperación." });
    } else {
      // Sin SMTP: devolver el enlace directamente en la respuesta
      console.log(`[AUTH] Reset link (SMTP no configurado): ${resetLink}`);
      res.json({ success: true, message: "SMTP no configurado. Usa este enlace para restablecer tu contraseña:", resetLink });
    }
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// ── RESET PASSWORD ──
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, error: "Datos incompletos." });
    if (password.length < 8) return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 8 caracteres." });

    const user = await User.findOne({
      reset_password_token: token,
      reset_password_expires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, error: "El enlace es inválido o ha expirado." });

    user.password_hash = await bcrypt.hash(password, 12);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    user.failed_attempts = 0; // Opcional, desbloquear si estaba bloqueado
    user.locked_until = null;
    await user.save();

    res.json({ success: true, message: "Contraseña actualizada correctamente." });
  } catch (err) {
    console.error("Reset Password Error:", err);
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
    if (!process.env.SSH_HOST) {
      results.kali = false;
      console.warn('[HEALTH] SSH_HOST no definido en .env');
    } else {
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
    }
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

// Rate limit para ejecución de ataques (máx 20 por IP en 10min)
const attackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Demasiados ataques en poco tiempo.' }
});

app.post("/api/attacks/execute", attackLimiter, async (req, res) => {
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
