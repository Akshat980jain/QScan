const mongoose = require('mongoose');

const scanHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    content: {
        type: String,
        required: [true, 'Scanned content is required'],
        maxlength: [2000, 'Content cannot exceed 2000 characters']
    },
    type: {
        type: String,
        enum: ['text', 'url', 'wifi', 'contact', 'email', 'phone', 'sms', 'unknown'],
        default: 'unknown'
    },
    scannedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for better query performance
scanHistorySchema.index({ userId: 1, scannedAt: -1 });

// Limit history entries per user (keep last 100)
scanHistorySchema.statics.addScan = async function (userId, content, type) {
    const ScanHistory = this;

    // Add new scan
    const scan = new ScanHistory({ userId, content, type });
    await scan.save();

    // Keep only last 100 entries
    const count = await ScanHistory.countDocuments({ userId });
    if (count > 100) {
        const oldestEntries = await ScanHistory.find({ userId })
            .sort({ scannedAt: 1 })
            .limit(count - 100)
            .select('_id');

        await ScanHistory.deleteMany({
            _id: { $in: oldestEntries.map(e => e._id) }
        });
    }

    return scan;
};

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
