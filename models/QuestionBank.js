const mongoose = require('mongoose');

const QuestionBankSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }],
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestionBank', QuestionBankSchema);
