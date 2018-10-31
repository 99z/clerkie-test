const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
    trans_id: String,
    user_id: String,
    name: String,
    amount: Number,
    date: Date
});

module.exports = mongoose.model('transaction', TransactionSchema);