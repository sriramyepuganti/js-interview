/**
 * mongoose-crud-example.js
 *
 * Requires: `npm install mongoose` AND a running MongoDB instance
 * (e.g., `mongod` locally on the default port, or a connection string to Atlas/remote Mongo).
 * Run with: node mongoose-crud-example.js
 *
 * Demonstrates a Mongoose schema definition, full CRUD operations, and one aggregation
 * pipeline example, all well commented. The code is complete and correct against a real
 * MongoDB instance -- it just won't run without one available.
 */

const mongoose = require('mongoose');

// -----------------------------------------------------------------------
// CONNECTION
// mongoose.connect() returns a Promise in modern Mongoose versions -- no more callback
// or ignoring the returned promise like older code often did.
// -----------------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/interview_prep_demo';

// -----------------------------------------------------------------------
// SCHEMA DEFINITION
// Even though MongoDB itself is schema-less, Mongoose lets us define structure,
// validation, and defaults at the application layer -- catching bad data before
// it ever reaches the database.
// -----------------------------------------------------------------------
const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  item: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Index on customerName since we expect to query/filter by it often (see file 08 on
// why indexing speeds up reads at a small write-time cost).
orderSchema.index({ customerName: 1 });

const Order = mongoose.model('Order', orderSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB at', MONGO_URI);

  // -----------------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------------
  const order1 = await Order.create({ customerName: 'Sriram', item: 'Laptop', amount: 1200, status: 'completed' });
  const order2 = await Order.create({ customerName: 'Sriram', item: 'Mouse', amount: 25, status: 'completed' });
  const order3 = await Order.create({ customerName: 'Asha', item: 'Keyboard', amount: 75, status: 'pending' });
  console.log('Created orders:', order1.id, order2.id, order3.id);

  // -----------------------------------------------------------------------
  // READ
  // -----------------------------------------------------------------------
  const completedOrders = await Order.find({ status: 'completed' });
  console.log('Completed orders:', completedOrders.length);

  const oneOrder = await Order.findById(order1._id);
  console.log('Fetched by id:', oneOrder.item);

  // -----------------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------------
  await Order.updateOne({ _id: order3._id }, { $set: { status: 'completed' } });
  console.log('Order 3 marked completed');

  // -----------------------------------------------------------------------
  // DELETE
  // -----------------------------------------------------------------------
  await Order.deleteOne({ _id: order2._id });
  console.log('Order 2 deleted');

  // -----------------------------------------------------------------------
  // AGGREGATION PIPELINE EXAMPLE
  // Goal: total spend per customer, only counting completed orders, sorted highest first.
  // Stages:
  //   $match  -> filter to only 'completed' orders (like SQL WHERE)
  //   $group  -> group remaining docs by customerName, summing 'amount' (like SQL GROUP BY + SUM)
  //   $sort   -> order results by totalSpent descending (like SQL ORDER BY)
  // -----------------------------------------------------------------------
  const spendByCustomer = await Order.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$customerName',
        totalSpent: { $sum: '$amount' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { totalSpent: -1 } },
  ]);
  console.log('Spend by customer (completed orders only):', spendByCustomer);

  // -----------------------------------------------------------------------
  // CLEANUP (so re-running this script doesn't accumulate demo data forever)
  // -----------------------------------------------------------------------
  await Order.deleteMany({ customerName: { $in: ['Sriram', 'Asha'] } });
  console.log('Cleaned up demo data');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

main().catch((err) => {
  console.error('Error running Mongoose CRUD example:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
