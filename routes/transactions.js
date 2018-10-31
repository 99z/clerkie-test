const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const TransactionGroup = require('../models/transaction-group');
const TGHelper = require('../utils/tg-helper');

router.post('/', async (req, res, next) => {
  let transactions = req.body;
  let newTransactions = false;

  for (let i = 0; i < transactions.length; i++) {
    let newTransaction = {
      trans_id: transactions[i].trans_id,
      user_id: transactions[i].user_id,
      name: transactions[i].name,
      amount: transactions[i].amount,
      date: new Date(transactions[i].date)
    };

    let transactionQuery = {
      trans_id: newTransaction.trans_id
    };

    let transactionExists = await Transaction.find({trans_id: newTransaction.trans_id});
    if (transactionExists.length === 0) {
      newTransactions = true;
    }

    // Upsert
    await Transaction.findOneAndUpdate(transactionQuery, newTransaction, {upsert: true});
  }

  // Save time by not recalculating transaction groups if none of the
  // posted transactions are new
  if (newTransactions) {
    await TGHelper.createTransactionGroups();
  }

  await TGHelper.calculateRecurring();
  let rt = await TransactionGroup.find({recurring: true}).sort('name');
  res.send(rt);
});

router.get('/', async (req, res, next) => {
  let rt = await TransactionGroup.find({recurring: true}).sort('name');
  res.send(rt);
});

module.exports = router;
