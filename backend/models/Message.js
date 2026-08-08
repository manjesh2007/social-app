const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true }, // sorted pair of user ids joined by "_"
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

function conversationIdFor(userIdA, userIdB) {
  return [userIdA.toString(), userIdB.toString()].sort().join('_');
}

MessageSchema.statics.conversationIdFor = conversationIdFor;

module.exports = mongoose.model('Message', MessageSchema);
