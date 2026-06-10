require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI no definida en el archivo .env");
  process.exit(1);
}

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

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB Atlas.");

    const mod00 = {
      attack_id: "MOD-00",
      name: "Escaneo Nmap (Reconocimiento)",
      category: "Pentesting Redes",
      command_base: "sudo nmap -sS -sV -O {{target}}",
      description: "Fingerprinting de servicios y versiones (-sV) y detección de Sistema Operativo (-O) mediante un escaneo sigiloso (SYN Scan).",
      mitre_id: "T1046",
      params: {
        target: ""
      }
    };

    // Upsert para no duplicar si se ejecuta varias veces
    await AttackTemplate.findOneAndUpdate(
      { attack_id: mod00.attack_id },
      mod00,
      { upsert: true, new: true }
    );

    console.log("✅ Plantilla MOD-00 insertada/actualizada con éxito.");
  } catch (error) {
    console.error("❌ Error insertando la plantilla:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

seed();
