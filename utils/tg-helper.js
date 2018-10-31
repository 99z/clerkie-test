const Transaction = require('../models/transaction');
const TransactionGroup = require('../models/transaction-group');

// Sorts Transactions into their corresponding groups
// Creates a new Transaction group if one does not exist for a particular Transaction
async function createTransactionGroups() {
  // Clear the transactions for all existing groups
  // Prevents pushing the same transaction to a group
  await clearTransactionGroups();
  let transactions = await Transaction.find();

  for (let i = 0; i < transactions.length; i++) {
    // Remove numbers & trim whitespace from transaction name
    let normalizedName = transactions[i].name.replace(/[0-9]/g, '').trim();

    // See if the current transaction has an existing group
    let matchedGroup = await TransactionGroup.findOne({
      name: normalizedName,
      user_id: transactions[i].user_id
    });

    // If not, create a group for this transaction
    if (!matchedGroup) {
      let tg = await TransactionGroup.create({
        name: normalizedName,
        user_id: transactions[i].user_id,
        next_amt: transactions[i].amount,
        next_date: transactions[i].date,
        recurring: false,
        transactions: []
      });

      await tg.transactions.push(transactions[i]);
      await tg.save();
    } else {
      // Otherwise, add it to its matched group
      await matchedGroup.transactions.push(transactions[i]);
      await matchedGroup.save();
    }
  }

  return transactions;
}

async function clearTransactionGroups() {
  let tgs = await TransactionGroup.find();

  for (let i = 0; i < tgs.length; i++) {
    tgs[i].transactions = [];
    tgs[i].save();
  }
}

// For each Transaction Group, determines if it is a recurring transaction
// Updates the recurring field on each TransactionGroup accordingly
// Calculates and updates the next_amt and next_date fields
async function calculateRecurring() {
  // Get all transaction groups
  let tg = await TransactionGroup.find();

  for (let i = 0; i < tg.length; i++) {
    // Ignore groups with less than 2 transactions
    if (tg[i].transactions.length < 2) {
      continue;
    }

    // Sort transactions by date descending, since no guaranteed order for the input
    tg[i].transactions.sort(function(a, b) {
      return b.date - a.date;
    });

    // baseInterval is the difference in ms between the first and second transactions
    // in a group
    // Since a group of transactions should only be considered recurring if they
    // happen at regular intervals, we can use this when comparing other transactions
    // in the same group
    let baseInterval = tg[i].transactions[0].date - tg[i].transactions[1].date;

    // The predicted next_date for an upcoming transaction is the date of the last
    // transaction + the baseInterval
    let nextDate = new Date(tg[i].transactions[0].date.getTime() + baseInterval);
    let totalAmt = tg[i].transactions[0].amount;

    for (let j = 0; j < tg[i].transactions.length-1; j++) {
      let curTransaction = tg[i].transactions[j];
      let nextTransaction = tg[i].transactions[j+1];

      // Normalize names when doing comparison check
      curTransaction.name = curTransaction.name.replace(/[0-9]/g, '').trim();
      nextTransaction.name = nextTransaction.name.replace(/[0-9]/g, '').trim();

      // currentInterval is the difference in ms between the two transactions
      // we're currently examining
      let currentInterval = curTransaction.date - nextTransaction.date;
      totalAmt += nextTransaction.amount;

      // If transaction names are equal
      // AND
      // If the difference in ms of the current 2 transactions is within a week prior
      // of the baseInterval
      // AND
      // If the difference in ms of the current 2 transactions is within a week after
      // the baseInterval
      if (
        curTransaction.name === nextTransaction.name &&
        currentInterval >= (baseInterval - 6.04e8) &&
        currentInterval <= (baseInterval + 6.04e8)
      ) {
        // Set recurring property for this group to true, but continue the loop
        // If ANY 2 transactions have a discrepancy, we know the group is not recurring
        tg[i].recurring = true;
      } else {
        // We reached a pair of transactions that did not occur within the accepted
        // interval, we can stop examining this group
        tg[i].recurring = false;
        break;
      }
    }

    // next_amt is set to the average of all transactions in the group
    tg[i].next_amt = (totalAmt / tg[i].transactions.length);
    tg[i].next_date = nextDate;
    await tg[i].save();
  }
}

module.exports.createTransactionGroups = createTransactionGroups;
module.exports.calculateRecurring = calculateRecurring;