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
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema, "users");

const attackTemplateSchema = new mongoose.Schema({
  attack_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  command_base: { type: String, required: true },
  description: { type: String, required: true },
  mitre_id: { type: String, required: true },
  params: { type: mongoose.Schema.Types.Mixed, required: true },
});
const AttackTemplate = mongoose.model("AttackTemplate", attackTemplateSchema, "attack_templates");

// ── CONEXIÓN BD ──
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas (Mongoose)"))
  .catch(err => {
    console.error("❌ Error conectando a MongoDB:", err);
    process.exit(1);
  });

// ── RUTAS API ──

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: "Faltan campos" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, error: "El email ya está registrado" });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const newUser = new User({ 
      username, 
      email, 
      password_hash,
      role: "analyst",
      created_at: new Date(),
      active: true,
      failed_attempts: 0
    });
    await newUser.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, error: "Error en el servidor" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body; // 'username' puede ser email
    const user = await User.findOne({ 
      $or: [{ username: username }, { email: username }] 
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Credenciales inválidas" });
    }

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(401).json({ success: false, error: "Credenciales inválidas" });
    }

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

    res.json({ success: true, user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, error: "Error en el servidor" });
  }
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("cybershield_token", { path: "/" });
  res.json({ success: true });
});

// ME
app.get("/api/auth/me", async (req, res) => {
  try {
    const token = req.cookies.cybershield_token;
    if (!token) return res.status(401).json({ success: false, error: "No autorizado" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ success: false, error: "No autorizado" });

    res.json({ success: true, username: user.username, role: user.role, email: user.email });
  } catch (err) {
    res.status(401).json({ success: false, error: "No autorizado" });
  }
});

// STATS (Dashboard)
app.get("/api/stats", (req, res) => {
  // Datos simulados/dinámicos para el Dashboard del TFG
  res.json({
    success: true,
    stats: {
      score: 85,
      vulnerabilities: 12,
      firewalls: 4,
      lastScan: new Date().toISOString()
    },
    activity: [
      { id: 1, type: "scan", target: "192.168.1.50", status: "completado", severity: "info", time: new Date().toLocaleTimeString() },
      { id: 2, type: "alert", target: "Web Server", status: "detectado", severity: "critical", time: new Date(Date.now() - 3600000).toLocaleTimeString() },
      { id: 3, type: "alert", target: "DB Cluster", status: "mitigado", severity: "warning", time: new Date(Date.now() - 7200000).toLocaleTimeString() }
    ]
  });
});

// REPORTS GENERATE (Placeholder)
app.post("/api/reports/generate", (req, res) => {
  res.json({ success: true, message: "pendiente" });
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
    const { attack_id, params } = req.body;
    const template = await AttackTemplate.findOne({ attack_id });
    if (!template) {
      return res.status(404).json({ success: false, error: "Plantilla no encontrada" });
    }

    let command = template.command_base;
    for (const [key, value] of Object.entries(params || {})) {
      command = command.replace(`{{${key}}}`, value);
    }

    const loggerCmd = `logger -t CyberShield -p local0.alert "SEC_VIOLATION: Escaneo nmap ${params.target} - MITRE:${template.mitre_id}"`;

    const conn = new Client();
    conn.on('ready', () => {
      // Execute the attack command
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return res.status(500).json({ success: false, error: "Error ejecutando el comando SSH" });
        }
        
        let output = "";
        stream.on('close', (code, signal) => {
          // Execute the logger command for Wazuh
          conn.exec(loggerCmd, (err2, stream2) => {
             if (stream2) {
               stream2.on('close', () => conn.end());
             } else {
               conn.end();
             }
          });

          // Generate PDF
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=CS-RPT-${attack_id}.pdf`);
          
          const doc = new PDFDocument();
          doc.pipe(res);
          doc.fontSize(16).text(`Reporte de Ataque: ${template.name}`, { align: 'center' });
          doc.moveDown();
          doc.fontSize(12).text(`Objetivo: ${params.target}`);
          doc.text(`ID Mitre: ${template.mitre_id}`);
          doc.text(`Fecha: ${new Date().toLocaleString()}`);
          doc.moveDown();
          doc.fontSize(10).font('Courier').text(output);
          doc.end();
        }).on('data', (data) => {
          output += data.toString();
        }).stderr.on('data', (data) => {
          output += data.toString();
        });
      });
    }).on('error', (err) => {
      console.error("SSH Error:", err);
      res.status(500).json({ success: false, error: "Error de conexión SSH con Kali" });
    }).connect({
      host: process.env.SSH_HOST,
      port: process.env.SSH_PORT || 22,
      username: process.env.SSH_USER,
      password: process.env.SSH_PASS,
      readyTimeout: 10000
    });

  } catch (err) {
    console.error("Execute Attack Error:", err);
    res.status(500).json({ success: false, error: "Error en el servidor al ejecutar el ataque" });
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
