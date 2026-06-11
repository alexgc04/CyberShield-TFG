// infrastructure/mongodb/seed-templates.js
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const jsonPath = path.join(__dirname, 'attack_templates.json');
const templates = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

async function seed() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const col = db.collection('attack_templates');

    // Limpiar índices obsoletos
    try {
        await col.dropIndex('attack_id_1');
        console.log('✅ Índice obsoleto attack_id_1 eliminado.');
    } catch (e) {
        // Índice ya eliminado o no existe
    }

    for (const t of templates) {
        await col.updateOne({ id: t.id }, { $set: t }, { upsert: true });
        console.log(`✅ ${t.id} - ${t.name}`);
    }
    await client.close();
    console.log(`\nSeeding completado: ${templates.length} plantillas procesadas.`);
}

seed().catch(console.error);
