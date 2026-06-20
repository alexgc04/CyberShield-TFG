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
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min
const BCRYPT_ROUNDS = 12;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI no definida en el archivo .env");
  process.exit(1);
}

// ── CONFIGURACIÓN DE CORREO (SMTP) ──
let transporter;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: (parseInt(process.env.SMTP_PORT) || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });
  console.log(`[MAIL] SMTP configurado (${process.env.SMTP_USER})`);
} else {
  console.warn('[MAIL] ⚠️ SMTP no configurado. Modo simulado activo (enlaces en consola).');
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('\n========================================================');
      console.log(`[MAIL SIMULADO] Para: ${mailOptions.to}`);
      console.log(`[MAIL SIMULADO] Asunto: ${mailOptions.subject}`);
      const linkMatch = mailOptions.html && mailOptions.html.match(/href="([^"]+)"/);
      if (linkMatch && linkMatch[1]) {
        console.log(`[MAIL SIMULADO] 👉 ENLACE: ${linkMatch[1]}`);
      }
      console.log('========================================================\n');
      return { messageId: 'simulated-' + Date.now() };
    }
  };
}

// ── MIDDLEWARE ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:8090", "http://127.0.0.1:8080"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting global (todas las rutas /api)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas peticiones. Espera 15 minutos.' }
});
app.use('/api', globalLimiter);

// Rate limiting estricto SOLO para auth (anti fuerza bruta HTTP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos. Espera 15 minutos.' }
});

// express-session (SOLO para el flujo OAuth de Google)
app.use(session({
  secret: process.env.SESSION_SECRET || JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { secure: false, maxAge: 5 * 60 * 1000 }
}));

// Passport (SOLO Google OAuth)
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch(e) { done(e); }
});

// ── MONGOOSE SCHEMAS ──
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String },
  role: { type: String, default: 'analyst' },
  active: { type: Boolean, default: false },
  failed_attempts: { type: Number, default: 0 },
  locked_until: { type: Date, default: null },
  last_login: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  google_id: { type: String, sparse: true },
  auth_provider: { type: String, default: 'local' },
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
        const email = profile.emails?.[0]?.value;
        user = email ? await User.findOne({ email }) : null;
        if (user) {
          user.google_id = profile.id;
          user.auth_provider = 'google';
          await user.save();
        } else {
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

// ══════════════════════════════════════
// ── RUTAS AUTH ──
// ══════════════════════════════════════

// REGISTER
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const email    = (req.body.email    || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const confirmPassword = (req.body.confirmPassword || '').trim();

    // ── Validaciones ──
    if (!username || !email || !password || !confirmPassword)
      return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios.' });
    if (password !== confirmPassword)
      return res.status(400).json({ success: false, error: 'Las contraseñas no coinciden.' });
    if (password.length < 8)
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres.' });
    if (!/^[a-zA-Z0-9_\-]{3,20}$/.test(username))
      return res.status(400).json({ success: false, error: 'Usuario: 3-20 caracteres, solo letras, números, _ o -.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, error: 'Formato de email no válido.' });

    // ── Duplicados (consultas separadas para mensaje específico) ──
    const existsUsername = await User.findOne({ username });
    if (existsUsername)
      return res.status(409).json({ success: false, error: 'Ese nombre de usuario ya está en uso.' });

    const existsEmail = await User.findOne({ email });
    if (existsEmail)
      return res.status(409).json({ success: false, error: 'Ese email ya está registrado.' });

    // ── Crear usuario en MongoDB ── (SIEMPRE antes del email)
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verify_email_token = crypto.randomBytes(32).toString('hex');

    await User.create({
      username, email, password_hash,
      auth_provider: 'local', role: 'analyst',
      active: false,
      failed_attempts: 0,
      verify_email_token,
      locked_until: null
    });

    console.log(`[AUTH] ✅ Usuario creado en MongoDB: ${username} (pendiente verificación)`);

    // ── Enviar correo (operación independiente — si falla, el usuario YA está guardado) ──
    const verifyLink = `http://localhost:8080/verify-email?token=${verify_email_token}`;

    try {
      await transporter.sendMail({
        from: '"CyberShield PRO" <' + (process.env.SMTP_FROM || process.env.SMTP_USER) + '>',
        to: email,
        subject: '🛡️ CyberShield — Verifica tu cuenta',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;
                      padding:24px;background:#0a0a0a;color:#e0e0e0;
                      border:1px solid #00ff41;border-radius:8px">
            <h2 style="color:#00ff41;text-align:center;font-family:monospace;
                       letter-spacing:2px">🛡️ CYBERSHIELD PRO</h2>
            <p>Hola <strong style="color:#00ff41">${username}</strong>,</p>
            <p>Tu cuenta ha sido creada. Haz clic en el botón para activarla:</p>
            <div style="text-align:center;margin:28px 0">
              <a href="${verifyLink}"
                 style="background:#00ff41;color:#0a0a0a;padding:14px 28px;
                        text-decoration:none;border-radius:4px;font-weight:bold;
                        font-family:monospace;letter-spacing:1px">
                ▶ VERIFICAR CUENTA
              </a>
            </div>
            <p style="font-size:12px;color:#666;margin-top:24px">
              Si no creaste esta cuenta, ignora este correo.<br>
              Este enlace caduca en 24 horas.
            </p>
            <hr style="border:1px solid #1a1a1a;margin:20px 0">
            <p style="font-size:11px;color:#444;text-align:center">
              CyberShield ASV — TFG UCLM 2025/26
            </p>
          </div>`
      });
      console.log(`[MAIL] ✅ Correo de verificación enviado a: ${email}`);
    } catch (mailErr) {
      // El usuario ya está en MongoDB — el email falló pero no es crítico
      console.error('[MAIL] ❌ Error enviando correo:', mailErr.message);
      console.log('\n' + '='.repeat(60));
      console.log('📧 ENLACE DE VERIFICACIÓN (falló el envío, úsalo manualmente):');
      console.log(`   Usuario: ${username}`);
      console.log(`   Enlace:  ${verifyLink}`);
      console.log('='.repeat(60) + '\n');

      return res.status(201).json({
        success: true,
        mailFailed: true,
        message: 'Cuenta creada, pero el correo de verificación no se pudo enviar. ' +
                 'Revisa la consola del servidor para el enlace de verificación manual.'
      });
    }

    res.status(201).json({
      success: true,
      mailFailed: false,
      message: 'Cuenta creada. Revisa tu correo para verificarla.'
    });

  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
});

// LOGIN
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const identifier = (req.body.username || req.body.identifier || '').trim().toLowerCase();
    const password   = (req.body.password || '').trim();

    if (!identifier || !password)
      return res.status(400).json({ success: false,
        error: 'Introduce tu usuario/email y contraseña.' });

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!user)
      return res.status(401).json({ success: false,
        error: 'No existe ninguna cuenta con ese usuario o email.' });

    // Comprobar bloqueo
    if (user.locked_until && new Date() < user.locked_until) {
      const mins = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
      return res.status(423).json({ success: false,
        error: `Cuenta bloqueada por demasiados intentos. Espera ${mins} minuto${mins !== 1 ? 's' : ''}.` });
    }

    // Sin password_hash (cuenta Google)
    if (!user.password_hash)
      return res.status(401).json({ success: false,
        error: 'Esta cuenta no tiene contraseña local. Contacta al administrador.' });

    // Verificar contraseña
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_attempts || 0) + 1;
      const remaining = MAX_ATTEMPTS - attempts;
      const update = { failed_attempts: attempts };

      if (attempts >= MAX_ATTEMPTS) {
        update.locked_until = new Date(Date.now() + LOCKOUT_MS);
        await User.findByIdAndUpdate(user._id, { $set: update });
        console.warn(`[AUTH] 🔒 Cuenta bloqueada: ${user.username}`);
        return res.status(423).json({ success: false,
          error: 'Cuenta bloqueada por demasiados intentos. Espera 15 minutos.' });
      }

      await User.findByIdAndUpdate(user._id, { $set: update });
      return res.status(401).json({ success: false,
        error: `Contraseña incorrecta. Te queda${remaining === 1 ? '' : 'n'} ${remaining} intento${remaining !== 1 ? 's' : ''} antes del bloqueo.` });
    }

    // Cuenta sin verificar
    if (!user.active)
      return res.status(403).json({ success: false,
        error: 'Debes verificar tu email antes de entrar. Revisa tu bandeja de entrada.' });

    // Login correcto
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

    console.log(`[AUTH] ✅ Login: ${user.username}`);
    res.json({ success: true, user: { username: user.username, role: user.role } });

  } catch (err) {
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

// VERIFY EMAIL
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: "Token faltante." });

    const user = await User.findOne({ verify_email_token: token });
    if (!user) return res.status(400).json({ success: false, error: "Token inválido o expirado." });

    user.active = true;
    user.verify_email_token = null;
    await user.save();

    res.json({ success: true, message: "Cuenta verificada." });
  } catch (err) {
    console.error("Verify Email Error:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// ── DEV ONLY: verificar cuenta sin email ──
app.get('/api/auth/dev-verify/:username', async (req, res) => {
  if (process.env.NODE_ENV === 'production')
    return res.status(404).json({ success: false, error: 'Not found.' });

  try {
    const username = req.params.username.toLowerCase();
    const user = await User.findOneAndUpdate(
      { username },
      { $set: { active: true, verify_email_token: null } },
      { new: true }
    );
    if (!user)
      return res.status(404).json({ success: false, error: `Usuario '${username}' no encontrado.` });

    console.log(`[DEV] ✅ Usuario activado manualmente: ${username}`);
    res.json({ success: true,
      message: `Usuario '${username}' activado. Ya puede iniciar sesión.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error interno.' });
  }
});

// FORGOT PASSWORD
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Siempre devolvemos success para no revelar cuentas
    if (!user || user.auth_provider === 'google') {
      return res.json({ success: true, message: "Si el correo existe, se ha enviado un enlace de recuperación." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.reset_password_token = resetToken;
    user.reset_password_expires = Date.now() + 3600000; // 1 hora
    await user.save();

    const resetLink = `http://localhost:8080/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: '"CyberShield PRO" <' + (process.env.SMTP_FROM || process.env.SMTP_USER) + '>',
      to: user.email,
      subject: '🛡️ CyberShield — Recuperación de contraseña',
      html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0a0a0a;color:#e0e0e0;border:1px solid #00ff41;border-radius:8px">
        <h2 style="color:#00ff41;text-align:center">🛡️ CyberShield</h2>
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Haz clic en el botón para crear una nueva:</p>
        <div style="text-align:center;margin:20px 0">
          <a href="${resetLink}" style="background:#00ff41;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold">CAMBIAR CONTRASEÑA</a>
        </div>
        <p style="font-size:12px;color:#888">Este enlace caduca en 1 hora. Si no solicitaste esto, ignora este correo.</p>
      </div>`
    });

    res.json({ success: true, message: "Si el correo existe, se ha enviado un enlace de recuperación." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// RESET PASSWORD
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

    user.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    user.failed_attempts = 0;
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

// DELETE ACCOUNT (darse de baja — elimina el usuario de MongoDB)
app.delete("/api/auth/delete-account", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado." });

    await User.findByIdAndDelete(req.user.userId);
    res.clearCookie("cybershield_token", { path: "/" });

    console.log(`[AUTH] 🗑️ Cuenta eliminada: ${user.username} (${user.email})`);
    res.json({ success: true, message: "Cuenta eliminada permanentemente." });
  } catch (err) {
    console.error("Delete Account Error:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// ══════════════════════════════════════
// ── RUTAS OPERATIVAS ──
// ══════════════════════════════════════

// STATS (Dashboard — datos reales de MongoDB)
app.get("/api/stats", async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalTemplates = await AttackTemplate.countDocuments();

    const db = mongoose.connection.db;
    const logsCol = db.collection('attack_logs');
    const totalAttacks = await logsCol.countDocuments();
    const todayAttacks = await logsCol.countDocuments({ timestamp: { $gte: today } });
    const lastAttack = await logsCol.findOne({}, { sort: { timestamp: -1 } });

    const attacksByModule = await logsCol.aggregate([
      { $match: { timestamp: { $gte: weekAgo } } },
      { $group: { _id: "$module", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

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

  results.mongodb = mongoose.connection.readyState === 1;

  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
    const r = await fetch(n8nUrl + '/healthz', { signal: AbortSignal.timeout(3000) });
    results.n8n = r.ok;
  } catch { results.n8n = false; }

  try {
    if (!process.env.SSH_HOST) {
      results.kali = false;
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

// WAZUH ALERTS PROXY
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
  const data = req.body;
  const reportId = data.report_id || 'CS-RPT-unknown';

  const PDFDoc = new PDFDocument();
  const chunks = [];
  PDFDoc.on('data', c => chunks.push(c));
  PDFDoc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
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

// ATTACK LOGS
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

// ATTACK TEMPLATES
app.get("/api/attacks/templates", async (req, res) => {
  try {
    const templates = await AttackTemplate.find({});
    res.json({ success: true, templates });
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// Rate limit para ejecución de ataques
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
  console.log(`🚀 CyberShield Server running on port ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
