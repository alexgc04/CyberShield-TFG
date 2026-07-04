require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cybershield";

const userSchemaValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["username", "email", "auth_provider"],
    properties: {
      username: {
        bsonType: "string",
        description: "Debe ser un string y es obligatorio"
      },
      email: {
        bsonType: "string",
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        description: "Debe ser un formato de email válido y es obligatorio"
      },
      password_hash: {
        bsonType: "string",
        description: "Hash de contraseña bcrypt"
      },
      role: {
        enum: ["admin", "analyst"],
        description: "Rol asignado, solo admin o analyst"
      },
      active: {
        bsonType: "bool",
        description: "Estado de verificación de la cuenta"
      },
      auth_provider: {
        enum: ["local", "google"],
        description: "Proveedor de autenticación"
      }
    }
  }
};

const attackLogSchemaValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["attack_id", "attack_name", "target_ip", "status", "timestamp"],
    properties: {
      attack_id: {
        bsonType: "string",
        description: "ID del ataque orquestado"
      },
      attack_name: {
        bsonType: "string",
        description: "Nombre descriptivo del ataque"
      },
      company_name: {
        bsonType: "string",
        description: "Nombre de la empresa objetivo de la auditoría"
      },
      target_ip: {
        bsonType: "string",
        description: "Dirección IP objetivo del ataque"
      },
      status: {
        enum: ["pending", "completed", "failed"],
        description: "Estado de ejecución del ataque"
      },
      timestamp: {
        bsonType: "date",
        description: "Fecha y hora de registro de la simulación"
      },
      ssh_output: {
        bsonType: "string",
        description: "Salida del terminal Kali Linux vía túnel SSH"
      },
      wazuh_alerts: {
        bsonType: "array",
        items: {
          bsonType: "object"
        },
        description: "Alertas correlacionadas desde el Wazuh Indexer"
      }
    }
  }
};

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  const db = mongoose.connection.db;

  // 1. Modificar colección 'users' para añadir validación
  try {
    await db.command({
      collMod: "users",
      validator: userSchemaValidator,
      validationLevel: "moderate",
      validationAction: "warn"
    });
    console.log("✅ Validación de esquema $jsonSchema aplicada a la colección 'users'");
  } catch (e) {
    console.log("⚠️ Error aplicando validador a 'users' (creándola si no existe):", e);
    try {
      await db.createCollection("users", { validator: userSchemaValidator });
      console.log("✅ Colección 'users' creada con validación $jsonSchema");
    } catch (createErr) {
      console.error("❌ Error creando colección 'users':", createErr);
    }
  }

  // 2. Modificar colección 'attack_logs' para añadir validación
  try {
    await db.command({
      collMod: "attack_logs",
      validator: attackLogSchemaValidator,
      validationLevel: "moderate",
      validationAction: "warn"
    });
    console.log("✅ Validación de esquema $jsonSchema aplicada a la colección 'attack_logs'");
  } catch (e) {
    console.log("⚠️ Error aplicando validador a 'attack_logs' (creándola si no existe):");
    try {
      await db.createCollection("attack_logs", { validator: attackLogSchemaValidator });
      console.log("✅ Colección 'attack_logs' creada con validación $jsonSchema");
    } catch (createErr) {
      console.error("❌ Error creando colección 'attack_logs':", createErr);
    }
  }

  // 3. Crear usuario Administrador inicial si no existe ninguno
  const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String },
    role: { type: String, default: 'analyst' },
    active: { type: Boolean, default: false },
    auth_provider: { type: String, default: 'local' }
  });
  const User = mongoose.model("User", userSchema, "users");
  const count = await User.countDocuments();
  if (count === 0) {
    console.log("No users found in database. Seeding initial admin...");
    const bcrypt = require("bcrypt");
    const adminPasswordHash = await bcrypt.hash("adminPassword123", 12);
    await User.create({
      username: "admin",
      email: "admin@cybershield.io",
      password_hash: adminPasswordHash,
      role: "admin",
      active: true,
      auth_provider: "local"
    });
    console.log("✅ Usuario administrador seeded: admin / adminPassword123");
  } else {
    console.log(`ℹ️ Hay ${count} usuarios existentes en MongoDB. No es necesario seedear.`);
  }

  await mongoose.disconnect();
  console.log("Done!");
}

run().catch(console.error);
