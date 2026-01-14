const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    default: 'Soporte técnico',
  },
  category: {
    type: String,
    enum: ['technical', 'account', 'tournaments', 'other'],
    default: 'technical',
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  },
  subtype: {
    type: String,
    enum: ['general', 'payment_validation', 'payment_report'],
    default: 'general',
  },
  message: {
    type: String,
    required: true,
  },
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
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
  },
  closedAt: {
    type: Date,
  },
  read: {
    type: Boolean,
    default: false,
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
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
