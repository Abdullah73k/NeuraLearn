const { MongoClient } = require('mongodb');

async function checkNodes() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('neuralearn');
    
    const nodes = await db.collection('nodes').find({}).sort({ created_at: -1 }).toArray();
    
    console.log('Total nodes:', nodes.length);
    console.log('');
    
    nodes.forEach((node, i) => {
      console.log(`Node ${i + 1}: ${node.title}`);
      console.log('  ID:', node.id);
      console.log('  Parent ID:', node.parent_id || 'null (root)');
      console.log('  Summary:', node.summary);
      console.log('  Has embedding:', !!node.embedding, `(${node.embedding?.length || 0} dims)`);
      console.log('  Created:', node.created_at);
      console.log('');
    });
    
  } finally {
    await client.close();
  }
}

checkNodes().catch(console.error);
