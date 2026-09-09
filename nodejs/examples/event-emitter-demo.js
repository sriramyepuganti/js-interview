/**
 * event-emitter-demo.js
 *
 * No npm install needed — uses only Node's built-in 'events' module.
 * Run with: node event-emitter-demo.js
 *
 * Demonstrates a mini pub/sub system using EventEmitter: one publisher (OrderService)
 * emits events, and multiple independent subscribers react to the same event without
 * knowing about each other. This is the classic use case where EventEmitter fits better
 * than a Promise (which only ever represents ONE eventual result, not a repeatable,
 * multi-listener occurrence).
 */

const EventEmitter = require('events');

// A small "service" class extending EventEmitter -- a very common Node pattern.
class OrderService extends EventEmitter {
  placeOrder(order) {
    console.log(`\n[OrderService] Placing order #${order.id} for ${order.item}`);

    // ... imagine real business logic / DB writes happening here ...

    // emit() synchronously calls every listener registered for 'order:placed', in the
    // order they were registered. Each listener runs independently -- if one throws,
    // by default it does NOT stop the others from being notified (though an uncaught
    // throw inside a listener will still crash the process unless caught).
    this.emit('order:placed', order);
  }

  cancelOrder(orderId) {
    console.log(`\n[OrderService] Cancelling order #${orderId}`);
    this.emit('order:cancelled', { id: orderId });
  }
}

const orderService = new OrderService();

// --- Subscriber 1: sends a confirmation email ---
orderService.on('order:placed', (order) => {
  console.log(`  [EmailService] Sending confirmation email for order #${order.id}`);
});

// --- Subscriber 2: updates inventory ---
orderService.on('order:placed', (order) => {
  console.log(`  [InventoryService] Reducing stock for "${order.item}"`);
});

// --- Subscriber 3: only cares about cancellations ---
orderService.on('order:cancelled', (order) => {
  console.log(`  [RefundService] Issuing refund for order #${order.id}`);
});

// --- Subscriber 4: a ONE-TIME listener using .once() ---
// .once() automatically removes itself after firing a single time -- useful for things
// like "log only the very first order placed since server start."
orderService.once('order:placed', (order) => {
  console.log(`  [Analytics] First order this session was #${order.id} -- won't log again`);
});

// Always listen for 'error' events on EventEmitters that might emit them --
// an emitted 'error' event with no listener will throw and crash the process.
orderService.on('error', (err) => {
  console.error('  [OrderService] Error:', err.message);
});

// --- Simulate activity ---
orderService.placeOrder({ id: 1, item: 'Keyboard' });
orderService.placeOrder({ id: 2, item: 'Mouse' }); // notice [Analytics] does NOT log this time
orderService.cancelOrder(1);

console.log(`\nListener count for 'order:placed': ${orderService.listenerCount('order:placed')}`);
