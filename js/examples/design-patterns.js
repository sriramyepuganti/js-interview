/**
 * design-patterns.js
 * Run with: node design-patterns.js
 *
 * Demonstrates: Singleton, Factory, and a simple Pub-Sub (Observer)
 * implementation from scratch — the pub-sub ties back to the RxJS
 * Observable/Subject concepts covered in ../10-design-patterns.md.
 */

// ---------------------------------------------------------------------------
// 1. SINGLETON — ensure only ONE instance ever exists
// ---------------------------------------------------------------------------
console.log("=== Singleton ===");

class Logger {
  static #instance; // private static field holds the one-and-only instance

  constructor() {
    if (Logger.#instance) {
      // if an instance already exists, just hand back that SAME one instead of creating a new one
      return Logger.#instance;
    }
    this.logs = [];
    Logger.#instance = this;
  }

  log(message) {
    this.logs.push(message);
    console.log(`[LOG]: ${message}`);
  }
}

const loggerA = new Logger();
const loggerB = new Logger();
loggerA.log("First message");
loggerB.log("Second message");
console.log("loggerA === loggerB:", loggerA === loggerB); // true — same instance
console.log("Both share the same logs array:", loggerA.logs); // both messages, since it's the same object


// ---------------------------------------------------------------------------
// 2. FACTORY — hides "which class to create" behind one creation function
// ---------------------------------------------------------------------------
console.log("\n=== Factory ===");

class EmailNotification {
  constructor(to, message) { this.to = to; this.message = message; }
  send() { return `Emailing "${this.message}" to ${this.to}`; }
}
class SmsNotification {
  constructor(to, message) { this.to = to; this.message = message; }
  send() { return `Texting "${this.message}" to ${this.to}`; }
}
class PushNotification {
  constructor(to, message) { this.to = to; this.message = message; }
  send() { return `Pushing "${this.message}" to device ${this.to}`; }
}

// The factory function — callers just say WHAT they want, not HOW to build it
function createNotification(type, to, message) {
  switch (type) {
    case "email": return new EmailNotification(to, message);
    case "sms": return new SmsNotification(to, message);
    case "push": return new PushNotification(to, message);
    default: throw new Error(`Unknown notification type: ${type}`);
  }
}

["email", "sms", "push"].forEach((type) => {
  const notification = createNotification(type, "user@example.com", "Your order shipped!");
  console.log(notification.send());
});


// ---------------------------------------------------------------------------
// 3. PUB-SUB / OBSERVER — from scratch, then compared conceptually to RxJS Subject
// ---------------------------------------------------------------------------
console.log("\n=== Pub-Sub (Observer pattern) ===");

class PubSub {
  #listeners = {}; // private map of event name -> array of callback functions

  // Subscribe to an event; returns an unsubscribe function (just like RxJS's Subscription.unsubscribe)
  on(eventName, callback) {
    if (!this.#listeners[eventName]) this.#listeners[eventName] = [];
    this.#listeners[eventName].push(callback);

    return () => {
      this.#listeners[eventName] = this.#listeners[eventName].filter((cb) => cb !== callback);
    };
  }

  // Publish/emit an event — every subscriber gets the SAME value (multicast, like RxJS's Subject)
  emit(eventName, data) {
    (this.#listeners[eventName] || []).forEach((callback) => callback(data));
  }
}

const eventBus = new PubSub();

const unsubscribeA = eventBus.on("userLoggedIn", (user) => console.log(`Subscriber A: Welcome, ${user.name}!`));
const unsubscribeB = eventBus.on("userLoggedIn", (user) => console.log(`Subscriber B: Logging analytics for ${user.name}`));

eventBus.emit("userLoggedIn", { name: "Sriram" });
// Both A and B receive the SAME emitted value — this is exactly what an RxJS Subject does:
// subject.next(value) multicasts to every current subscriber.

unsubscribeA(); // Subscriber A stops listening
eventBus.emit("userLoggedIn", { name: "Second User" });
console.log("(Only Subscriber B should log for the second emit, since A unsubscribed)");


// ---------------------------------------------------------------------------
// 3b. A tiny "BehaviorSubject-like" version — remembers the LAST value
//     for any NEW subscriber that joins late (this is what makes RxJS's
//     BehaviorSubject different from a plain Subject).
// ---------------------------------------------------------------------------
console.log("\n=== BehaviorSubject-like pub-sub (remembers last value) ===");

class BehaviorLikeSubject {
  #listeners = [];
  #currentValue;

  constructor(initialValue) {
    this.#currentValue = initialValue;
  }

  subscribe(callback) {
    callback(this.#currentValue); // NEW subscribers immediately get the CURRENT value — like BehaviorSubject
    this.#listeners.push(callback);
    return () => { this.#listeners = this.#listeners.filter((cb) => cb !== callback); };
  }

  next(value) {
    this.#currentValue = value;
    this.#listeners.forEach((cb) => cb(value));
  }

  get value() {
    return this.#currentValue;
  }
}

const behaviorLike = new BehaviorLikeSubject(0);
behaviorLike.subscribe((v) => console.log("Early subscriber sees:", v)); // sees 0 immediately
behaviorLike.next(1);
behaviorLike.next(2);
behaviorLike.subscribe((v) => console.log("Late subscriber sees CURRENT value immediately:", v)); // sees 2, not 0 or 1
behaviorLike.next(3);
console.log("Current value via .value getter:", behaviorLike.value); // 3
