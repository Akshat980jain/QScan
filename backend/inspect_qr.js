const mongoose = require('mongoose');

const uri = "mongodb+srv://akshat980jain_db_user:Mm3nsJLOWhYX39zb@cluster0.rokrvbf.mongodb.net/?appName=Cluster0";

const qrCodeSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  type: String,
  content: String,
  isFavorite: Boolean,
  category: String,
  scanCount: Number,
  isDynamic: Boolean,
  targetUrl: String,
  shortId: String,
  customization: Object,
  createdAt: Date
}, { collection: 'qrcodes' });

const QRCode = mongoose.model('QRCode', qrCodeSchema);

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    
    const qrCodes = await QRCode.find({}).sort({ createdAt: -1 }).limit(10);
    const cleaned = qrCodes.map(q => ({
      _id: q._id,
      name: q.name,
      type: q.type,
      content: q.content,
      isDynamic: q.isDynamic,
      targetUrl: q.targetUrl,
      shortId: q.shortId,
      createdAt: q.createdAt
    }));
    console.log("Last 10 QR Codes:", JSON.stringify(cleaned, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
