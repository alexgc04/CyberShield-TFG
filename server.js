require("dotenv").config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
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
const fs = require('fs');

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
app.use("/api/reports", express.static(path.join(__dirname, "reports")));

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
    const lastAttackArray = await logsCol.find({}).sort({ timestamp: -1 }).limit(1).toArray();
    const lastAttack = lastAttackArray.length > 0 ? lastAttackArray[0] : null;

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

// GET REPORTS LOGS
app.get("/api/reports", verifyToken, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const logsCol = db.collection('attack_logs');
    const logs = await logsCol.find({}).sort({ timestamp: -1 }).toArray();
    res.json({ success: true, reports: logs });
  } catch (err) {
    console.error("Error fetching report logs:", err);
    res.status(500).json({ success: false, error: "Error cargando reportes" });
  }
});

// DELETE REPORT
app.delete("/api/reports/:id", verifyToken, async (req, res) => {
  try {
    const reportLogId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(reportLogId)) {
      return res.status(400).json({ success: false, error: "ID de reporte inválido." });
    }
    const db = mongoose.connection.db;
    const logsCol = db.collection('attack_logs');
    
    const log = await logsCol.findOne({ _id: new mongoose.Types.ObjectId(reportLogId) });
    if (!log) {
      return res.status(404).json({ success: false, error: "Reporte no encontrado en base de datos." });
    }

    // Eliminar documento de MongoDB
    await logsCol.deleteOne({ _id: new mongoose.Types.ObjectId(reportLogId) });

    // Eliminar archivo físico si existe
    if (log.report_id) {
      const pdfPath = path.join(__dirname, "reports", `${log.report_id}.pdf`);
      if (fs.existsSync(pdfPath)) {
        try {
          fs.unlinkSync(pdfPath);
        } catch (fsErr) {
          console.error(`Error deleting physical file ${pdfPath}:`, fsErr);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting report log:", err);
    res.status(500).json({ success: false, error: "Error interno al eliminar el reporte" });
  }
});

// HEALTH CHECK — ping a servicios
app.get("/api/health", async (req, res) => {
  const results = { mongodb: false, n8n: false, kali: false, wazuh: false };

  results.mongodb = mongoose.connection.readyState === 1;

  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_URL || 'http://localhost:5678';
    let baseN8nUrl = n8nUrl;
    if (baseN8nUrl.includes('/webhook')) {
      baseN8nUrl = baseN8nUrl.split('/webhook')[0];
    }
    const r = await fetch(baseN8nUrl + '/healthz', { signal: AbortSignal.timeout(3000) });
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

  res.json({ 
    success: true, 
    services: results,
    kali_ip: process.env.SSH_HOST || '10.10.10.21',
    wazuh_ip: process.env.WAZUH_HOST || '10.10.10.49'
  });
});

// WAZUH ALERTS PROXY
app.get("/api/wazuh/alerts", verifyToken, async (req, res) => {
  try {
    const isMock = process.env.WAZUH_MOCK === 'true';
    if (isMock) {
      return res.json({
        success: true,
        alerts: [
          {
            id: "mock-alert-1",
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            rule_id: "100500",
            rule_description: "ALERTA CYBERSHIELD: Ataque MAC Flooding detectado (MOCK)",
            agent_name: "kali-agent",
            mitre_id: "T1557",
            level: 12
          },
          {
            id: "mock-alert-2",
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            rule_id: "100504",
            rule_description: "ALERTA CYBERSHIELD: Envenenamiento de caché ARP (Man-in-the-Middle) detectado (MOCK)",
            agent_name: "debian-agent",
            mitre_id: "T1557",
            level: 12
          },
          {
            id: "mock-alert-3",
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            rule_id: "100510",
            rule_description: "ALERTA CYBERSHIELD: Ataque de fuerza bruta SSH detectado (MOCK)",
            agent_name: "kali-agent",
            mitre_id: "T1110",
            level: 12
          }
        ]
      });
    }

    const indexerUrl = req.query.indexerUrl || `https://${process.env.WAZUH_HOST || '10.10.10.49'}:${process.env.WAZUH_PORT || '9200'}`;
    const wazuhUser = process.env.WAZUH_USER || 'admin';
    const wazuhPass = process.env.WAZUH_PASS || 'KuimoKrn5E8V*xZtj8efr3TipwIcH.3U';
    const authHeader = 'Basic ' + Buffer.from(`${wazuhUser}:${wazuhPass}`).toString('base64');

    const searchRes = await fetch(`${indexerUrl}/wazuh-alerts-*/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { match: { "rule.groups": "cybershield" } }
            ],
            filter: [
              { range: { "@timestamp": { gte: "now-24h" } } }
            ]
          }
        },
        sort: [{ "@timestamp": { order: "desc" } }],
        size: 50
      })
    });

    if (!searchRes.ok) {
      throw new Error(`Wazuh Indexer returned ${searchRes.status}`);
    }

    const data = await searchRes.json();
    const hits = data.hits?.hits || [];
    const alerts = hits.map(hit => {
      const src = hit._source || {};
      const rule = src.rule || {};
      const agent = src.agent || {};
      
      let mitre_id = null;
      if (rule.mitre) {
        if (Array.isArray(rule.mitre.id)) {
          mitre_id = rule.mitre.id[0];
        } else if (typeof rule.mitre.id === 'string') {
          mitre_id = rule.mitre.id;
        }
      }

      return {
        id: hit._id,
        timestamp: src['@timestamp'] || src.timestamp,
        rule_id: rule.id,
        rule_description: rule.description,
        agent_name: agent.name,
        mitre_id: mitre_id,
        level: rule.level,
        _id: hit._id,
        _index: hit._index || '',
        rule: {
          id: rule.id || '',
          level: rule.level || 0,
          description: rule.description || '',
          groups: rule.groups || [],
          mitre: rule.mitre || { id: mitre_id ? [mitre_id] : [] },
          firedtimes: rule.firedtimes || 0
        },
        agent: {
          id: agent.id || '',
          name: agent.name || '',
          ip: agent.ip || ''
        },
        manager: src.manager || { name: 'wazuh-manager' },
        decoder: src.decoder || { name: 'syslog' },
        full_log: src.full_log || '',
        location: src.location || '',
        data: src.data || {}
      };
    });

    res.json({ success: true, alerts });
  } catch (err) {
    console.error("Wazuh Alerts Proxy Error:", err.message);
    res.json({ success: false, alerts: [], error: "Wazuh no disponible" });
  }
});

// WAZUH AGENTS PROXY
app.get("/api/wazuh/agents", verifyToken, async (req, res) => {
  try {
    const isMock = process.env.WAZUH_MOCK === 'true';
    if (isMock) {
      return res.json({
        success: true,
        agents: [
          { id: "000", name: "wazuh-manager", status: "active", ip: "127.0.0.1", lastKeepAlive: new Date().toISOString() },
          { id: "001", name: "kali-agent", status: "active", ip: "10.10.10.142", lastKeepAlive: new Date().toISOString() },
          { id: "002", name: "debian-agent", status: "disconnected", ip: "10.10.10.70", lastKeepAlive: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() }
        ]
      });
    }

    const managerUrl = req.query.managerUrl || `https://${process.env.WAZUH_HOST || '10.10.10.49'}:55000`;
    const apiUser = process.env.WAZUH_API_USER || 'wazuh';
    const apiPass = process.env.WAZUH_API_PASS || 'FV5hrtKBtJRPA8lu51tvDZOP*i1n8UGH';
    const authHeader = 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64');

    // 1. Authenticate to get Token
    const authRes = await fetch(`${managerUrl}/security/user/authenticate`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!authRes.ok) {
      throw new Error(`Wazuh API auth failed: ${authRes.status}`);
    }

    const authData = await authRes.json();
    const token = authData.data?.token || authData.token;
    if (!token) {
      throw new Error("Wazuh API auth token not returned");
    }

    // 2. Fetch Agents
    const agentsRes = await fetch(`${managerUrl}/agents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!agentsRes.ok) {
      throw new Error(`Wazuh API agents failed: ${agentsRes.status}`);
    }

    const agentsData = await agentsRes.json();
    const items = agentsData.data?.affected_items || [];
    const agents = items.map(item => ({
      id: item.id,
      name: item.name,
      status: item.status,
      ip: item.ip,
      lastKeepAlive: item.lastKeepAlive || item.last_keepactive || item.dateAdd
    }));

    res.json({ success: true, agents });
  } catch (err) {
    console.error("Wazuh Agents Proxy Error:", err.message);
    res.json({ success: false, agents: [], error: "No se puede conectar con Wazuh Manager" });
  }
});

// WAZUH CORRELATION
app.post("/api/wazuh/correlation", verifyToken, async (req, res) => {
  try {
    const isMock = process.env.WAZUH_MOCK === 'true';
    if (isMock) {
      return res.json({
        success: true,
        detected: true,
        alerts: [
          {
            id: "mock-corr-1",
            timestamp: new Date().toISOString(),
            rule_id: "100500",
            rule_description: "ALERTA CYBERSHIELD: Detección mockeada de ataque",
            agent_name: "kali-agent",
            mitre_id: "T1557",
            level: 12
          }
        ],
        count: 1
      });
    }

    const { timestamp_start, timestamp_end } = req.body;
    const indexerUrl = req.body.indexerUrl || `https://${process.env.WAZUH_HOST || '10.10.10.49'}:${process.env.WAZUH_PORT || '9200'}`;
    const wazuhUser = process.env.WAZUH_USER || 'admin';
    const wazuhPass = process.env.WAZUH_PASS || 'KuimoKrn5E8V*xZtj8efr3TipwIcH.3U';
    const authHeader = 'Basic ' + Buffer.from(`${wazuhUser}:${wazuhPass}`).toString('base64');

    const searchRes = await fetch(`${indexerUrl}/wazuh-alerts-*/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { match: { "rule.groups": "cybershield" } }
            ],
            filter: [
              { range: { "@timestamp": { gte: timestamp_start, lte: timestamp_end } } }
            ]
          }
        },
        sort: [{ "@timestamp": { order: "desc" } }],
        size: 50
      })
    });

    if (!searchRes.ok) {
      throw new Error(`Wazuh Indexer correlation failed: ${searchRes.status}`);
    }

    const data = await searchRes.json();
    const hits = data.hits?.hits || [];
    const alerts = hits.map(hit => {
      const src = hit._source || {};
      const rule = src.rule || {};
      const agent = src.agent || {};
      
      let mitre_id = null;
      if (rule.mitre) {
        if (Array.isArray(rule.mitre.id)) {
          mitre_id = rule.mitre.id[0];
        } else if (typeof rule.mitre.id === 'string') {
          mitre_id = rule.mitre.id;
        }
      }

      return {
        id: hit._id,
        timestamp: src['@timestamp'] || src.timestamp,
        rule_id: rule.id,
        rule_description: rule.description,
        agent_name: agent.name,
        mitre_id: mitre_id,
        level: rule.level,
        _id: hit._id,
        _index: hit._index || '',
        rule: {
          id: rule.id || '',
          level: rule.level || 0,
          description: rule.description || '',
          groups: rule.groups || [],
          mitre: rule.mitre || { id: mitre_id ? [mitre_id] : [] },
          firedtimes: rule.firedtimes || 0
        },
        agent: {
          id: agent.id || '',
          name: agent.name || '',
          ip: agent.ip || ''
        },
        manager: src.manager || { name: 'wazuh-manager' },
        decoder: src.decoder || { name: 'syslog' },
        full_log: src.full_log || '',
        location: src.location || '',
        data: src.data || {}
      };
    });

    res.json({
      success: true,
      detected: alerts.length > 0,
      alerts,
      count: alerts.length
    });
  } catch (err) {
    console.error("Wazuh Correlation Error:", err.message);
    res.json({ success: false, detected: false, error: "Wazuh no responde", alerts: [], count: 0 });
  }
});

// REPORTS GENERATE
app.post("/api/reports/generate", (req, res) => {
  const data = req.body;
  const reportId = data.report_id || 'CS-RPT-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, `${reportId}.pdf`);
  const writeStream = fs.createWriteStream(reportPath);

  const PDFDoc = new PDFDocument({ margin: 40 });
  PDFDoc.pipe(writeStream);

  const chunks = [];
  PDFDoc.on('data', c => chunks.push(c));

  writeStream.on('finish', () => {
    const pdfBuffer = Buffer.concat(chunks);
    res.json({
      success: true,
      report_id: reportId,
      pdf_url: `/api/reports/${reportId}.pdf`,
      size: pdfBuffer.length
    });
  });

  // Estilo Premium CyberShield
  // Banner de cabecera oscuro
  PDFDoc.rect(30, 30, 550, 50).fill('#070708');
  PDFDoc.fillColor('#00ff41').fontSize(14).font('Helvetica-Bold').text('🛡️ CYBERSHIELD ASV — INFORME DE SEGURIDAD', 45, 48);

  // Tabla de Metadatos
  let currentY = 100;
  PDFDoc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('ORGANIZACIÓN:', 40, currentY);
  PDFDoc.fillColor('#ffffff').font('Helvetica').text(data.company_name || 'N/A', 150, currentY);

  PDFDoc.fillColor('#334155').font('Helvetica-Bold').text('ATAQUE SIMULADO:', 40, currentY + 18);
  PDFDoc.fillColor('#ffffff').font('Helvetica').text(`${data.attack_name || 'N/A'} (${data.attack_id || 'N/A'})`, 150, currentY + 18);

  // Extraer IP objetivo
  let targetIp = 'N/A';
  if (data.parameters) {
    targetIp = data.parameters.target_ip || data.parameters.target || data.parameters.ip || data.parameters.host || data.parameters.dc_ip || data.parameters.target_subnet || 'N/A';
  } else if (data.target) {
    targetIp = data.target;
  }
  PDFDoc.fillColor('#334155').font('Helvetica-Bold').text('IP OBJETIVO (HOST):', 40, currentY + 36);
  PDFDoc.fillColor('#00ff41').font('Helvetica-Bold').text(targetIp, 150, currentY + 36);

  // Columna Derecha de Metadatos
  PDFDoc.fillColor('#334155').font('Helvetica-Bold').text('FECHA/HORA:', 340, currentY);
  PDFDoc.fillColor('#ffffff').font('Helvetica').text(new Date().toLocaleString('es-ES'), 430, currentY);

  PDFDoc.fillColor('#334155').font('Helvetica-Bold').text('TÉCNICA MITRE:', 340, currentY + 18);
  PDFDoc.fillColor('#ffffff').font('Helvetica').text(data.mitre_id || 'N/A', 430, currentY + 18);

  PDFDoc.fillColor('#334155').font('Helvetica-Bold').text('RIESGO EVALUADO:', 340, currentY + 36);
  let riskColor = '#3b82f6';
  const risk = (data.risk_level || 'LOW').toUpperCase();
  if (risk === 'CRITICAL') riskColor = '#ef4444';
  else if (risk === 'HIGH') riskColor = '#f97316';
  else if (risk === 'MEDIUM') riskColor = '#eab308';
  PDFDoc.fillColor(riskColor).font('Helvetica-Bold').text(risk, 460, currentY + 36);

  // Línea divisoria
  PDFDoc.moveTo(30, 160).lineTo(580, 160).stroke('#1e293b');

  // Resumen Ejecutivo
  currentY = 175;
  PDFDoc.rect(30, currentY, 4, 15).fill('#00ff41');
  PDFDoc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('RESUMEN EJECUTIVO', 42, currentY + 2);
  
  PDFDoc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(
    `Se ha llevado a cabo una simulación de intrusión ofensiva controlada sobre el host ${targetIp} bajo la infraestructura autorizada de ${data.company_name || 'la organización'}. El vector de ataque evaluó las vulnerabilidades locales de la red o del sistema y comprobó la capacidad de detección del agente Wazuh local.`,
    40, currentY + 22, { width: 530, align: 'justify' }
  );

  // Detalles Técnicos (Comando)
  currentY = 245;
  PDFDoc.rect(30, currentY, 4, 15).fill('#00ff41');
  PDFDoc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('DETALLES DE INTRUSIÓN (EJECUCIÓN SSH)', 42, currentY + 2);
  
  PDFDoc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('Comando Lanzado:', 40, currentY + 22);
  PDFDoc.rect(40, currentY + 35, 530, 25).fill('#0f172a');
  PDFDoc.fillColor('#00ff41').fontSize(8).font('Courier-Bold').text(data.command_executed || '(Ejecución directa/API)', 48, currentY + 43);

  // Recomendaciones según tipo de ataque
  currentY = 320;
  PDFDoc.rect(30, currentY, 4, 15).fill('#00ff41');
  PDFDoc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('RECOMENDACIONES DE MITIGACIÓN', 42, currentY + 2);

  let recs = "Mantener el sistema de detección y el firewall local activos.";
  const aid = (data.attack_id || '').toUpperCase();
  if (aid.startsWith("LAN-")) {
    recs = "1. Implementar Port Security en los switches para limitar las direcciones MAC registradas.\n" +
           "2. Habilitar Dynamic ARP Inspection (DAI) y DHCP Snooping para contrarrestar ataques MitM.\n" +
           "3. Forzar el uso exclusivo de protocolos de comunicación cifrados (HTTPS/SSH/TLS) en la red local.";
  } else if (aid.startsWith("SCAPY-")) {
    recs = "1. Bloquear y auditar escaneos de red anómalos mediante reglas de iptables/firewalld.\n" +
           "2. Implementar Rate Limiting para conexiones entrantes y mitigar ataques de inundación (Flooding).\n" +
           "3. Mantener desactivados los puertos no críticos y deshabilitar respuestas ICMP innecesarias.";
  } else if (aid.startsWith("BF-")) {
    recs = "1. Configurar bloqueos automáticos temporales de IP mediante herramientas como Fail2ban.\n" +
           "2. Deshabilitar la autenticación de SSH basada en contraseña y forzar el uso de llaves criptográficas.\n" +
           "3. Establecer directivas de contraseñas robustas con una longitud mínima de 12 caracteres y caracteres especiales.";
  } else if (aid.startsWith("LIN-") || aid.startsWith("PRIV-")) {
    recs = "1. Auditar periódicamente binarios con bits SUID/SGID y revocar permisos innecesarios.\n" +
           "2. Restringir permisos de escritura sobre tareas programadas del sistema (cron) y scripts compartidos.\n" +
           "3. Configurar Directivas de Grupo (GPOs) seguras en Active Directory para mitigar delegación de Kerberos.";
  }

  PDFDoc.fillColor('#e2e8f0').fontSize(9).font('Helvetica').text(recs, 40, currentY + 22, { lineGap: 4 });

  // Consola de Salida SSH
  currentY = 415;
  PDFDoc.rect(30, currentY, 4, 15).fill('#00ff41');
  PDFDoc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('OUTPUT DE CONSOLA KALI LINUX', 42, currentY + 2);

  PDFDoc.rect(40, currentY + 22, 530, 240).fill('#070708');
  
  let rawOutput = data.ssh_output || '(Sin salida estándar)';
  if (rawOutput.length > 800) {
    rawOutput = rawOutput.slice(0, 800) + "\n\n[... TRUNCATED DUE TO SIZE LIMITS ...]";
  }
  
  PDFDoc.fillColor('#00ff41').fontSize(7.5).font('Courier').text(rawOutput, 45, currentY + 28, {
    width: 520,
    height: 228,
    ellipsis: true
  });

  // Pie de Página
  PDFDoc.fillColor('#475569').fontSize(8).font('Helvetica-Oblique').text('CyberShield ASV Platform — Escuela Superior de Informática, UCLM 2025/26', 40, 755, { align: 'center' });

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

// GET ALL ATTACK TEMPLATES
app.get("/api/attacks/templates", verifyToken, async (req, res) => {
  try {
    const templates = await AttackTemplate.find({});
    res.json({ success: true, templates });
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// GET ATTACK TEMPLATE BY ID
app.get("/api/attacks/templates/:id", verifyToken, async (req, res) => {
  try {
    const template = await AttackTemplate.findOne({ id: req.params.id });
    if (!template) {
      return res.status(404).json({ success: false, error: "Plantilla no encontrada" });
    }
    res.json({ success: true, template });
  } catch (err) {
    console.error("Error fetching template:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// Rate limit para ejecución de ataques
const attackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Demasiados ataques en poco tiempo. Espera 10 minutos.' }
});

function buildCommand(templateStr, params) {
  if (!templateStr) return "";
  return Object.entries(params).reduce((cmd, [key, val]) => {
    return cmd.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), val || '');
  }, templateStr);
}

app.post("/api/attacks/execute", verifyToken, attackLimiter, async (req, res) => {
  try {
    const { attack_id, parameters, company_name } = req.body;
    if (!attack_id) {
      return res.status(400).json({ success: false, error: "Falta el ID del ataque." });
    }

    const template = await AttackTemplate.findOne({ id: attack_id });
    if (!template) {
      return res.status(404).json({ success: false, error: "Plantilla de ataque no encontrada." });
    }

    const params = parameters || {};
    const finalCommand = buildCommand(template.command, params);
    const finalLoggerCommand = buildCommand(template.logger_command, params);
    const reportId = 'CS-RPT-' + Date.now();

    const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_URL || 'http://localhost:5678';
    
    let n8nResponse;
    try {
      n8nResponse = await fetch(n8nUrl + '/webhook/attack-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attack_id,
          attack_name: template.name,
          mitre_id: template.mitre_id,
          command: finalCommand,
          logger_command: finalLoggerCommand,
          parameters: params,
          company_name: company_name || 'Empresa Auditada',
          company_name_val: company_name || 'Empresa Auditada',
          report_id: reportId,
          risk_level: template.risk_level,
          wazuh_rule_id: template.wazuh_rule_id,
          description: template.description
        })
      });
    } catch (fetchErr) {
      console.error("n8n connection error:", fetchErr);
      if (fetchErr.code === 'ECONNREFUSED' || fetchErr.message.includes('fetch failed')) {
        return res.status(503).json({
          success: false,
          error: "n8n no está disponible. Verifica que el servicio está corriendo."
        });
      }
      throw fetchErr;
    }

    if (!n8nResponse.ok) {
      return res.status(500).json({ success: false, error: "Error al comunicar con n8n webhook" });
    }

    const text = await n8nResponse.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { success: true };
    } catch (e) {
      data = { ssh_output: text, success: true };
    }

    // Guardar log del ataque en MongoDB
    try {
      const db = mongoose.connection.db;
      const logsCol = db.collection('attack_logs');
      await logsCol.insertOne({
        attack_id,
        attack_name: template.name,
        module: template.module,
        parameters: params,
        company_name: company_name || 'Empresa Auditada',
        ssh_exit_code: data.ssh_exit_code !== undefined ? data.ssh_exit_code : (data.exit_code !== undefined ? data.exit_code : 0),
        report_id: data.report_id || reportId,
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
