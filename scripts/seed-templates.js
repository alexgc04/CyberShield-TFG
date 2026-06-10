require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI no definida en el archivo .env");
  process.exit(1);
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

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB Atlas.");

    const jsonPath = path.join(__dirname, "..", "infrastructure", "mongodb", "attack_templates.json");
    const templates = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    for (const template of templates) {
      await AttackTemplate.findOneAndUpdate(
        { id: template.id },
        template,
        { upsert: true, new: true }
      );
      console.log(`✅ Plantilla ${template.id} (${template.name}) insertada/actualizada con éxito.`);
    }

  } catch (error) {
    console.error("❌ Error insertando la plantilla:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

seed();
