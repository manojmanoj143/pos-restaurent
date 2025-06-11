const { MongoClient } = require('mongodb'); // Explicitly destructure MongoClient
const fs = require('fs'); // Use synchronous fs for existsSync
const fsp = require('fs').promises; // Use promises for async operations
const path = require('path');

const mongoUrl = 'mongodb://localhost:27017/restaurant';
const dataDir = path.join(__dirname, 'data');

async function migrate() {
  // Check if data directory exists, create it if not
  if (!fs.existsSync(dataDir)) {
    await fsp.mkdir(dataDir);
  }

  const client = await MongoClient.connect(mongoUrl);
  const db = client.db('restaurant');

  const collections = [
    'items', 'customers', 'sales', 'tables', 'users',
    'picked_up_items', 'pos_opening_entries', 'pos_closing_entries'
  ];

  for (const collName of collections) {
    const data = await db.collection(collName).find({}).toArray();
    await fsp.writeFile(
      path.join(dataDir, `${collName}.json`),
      JSON.stringify(data, null, 2)
    );
    console.log(`Exported ${data.length} records from ${collName}`);
  }

  client.close();
  console.log('Migration completed');
}

migrate().catch(console.error);