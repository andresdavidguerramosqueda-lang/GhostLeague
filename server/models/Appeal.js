const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['suspended', 'banned'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // Hilo de conversación entre usuario y admin
  conversation: [
    {
      from: {
        type: String,
        enum: ['user', 'admin'],
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  read: {
    type: Boolean,
    default: false
  },
  caseStatus: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
  },
  closedAt: {
    type: Date,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appeal', appealSchema);
