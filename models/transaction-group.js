const mongoose = require('mongoose');
const Transaction = require('./transaction');
const Schema = mongoose.Schema;

const TransactionGroupSchema = new Schema({
    name: String,
    user_id: String,
    next_amt: Number,
    next_date: Date,
    recurring: Boolean,
    transactions: [Transaction.schema]
});

module.exports = mongoose.model('transactionGroup', TransactionGroupSchema);