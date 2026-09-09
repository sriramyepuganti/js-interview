/**
 * prototype-inheritance.js
 * Run with: node prototype-inheritance.js
 *
 * Demonstrates: prototype chain, Object.create, and ES6 class vs
 * prototype-based equivalent side by side.
 * See ../04-prototypes-and-inheritance.md for the full explanation.
 */

// ---------------------------------------------------------------------------
// 1. The prototype chain, made visible
// ---------------------------------------------------------------------------
console.log("=== Prototype chain basics ===");

const arr = [1, 2, 3];
console.log(arr.__proto__ === Array.prototype);              // true — arr's prototype IS Array.prototype
console.log(arr.__proto__.__proto__ === Object.prototype);   // true — Array.prototype's prototype is Object.prototype
console.log(arr.__proto__.__proto__.__proto__);               // null — end of the chain

// Adding a method to Array.prototype makes it available on EVERY array instance (shared, not copied)
Array.prototype.penultimate = function () {
  return this[this.length - 2];
};
console.log([10, 20, 30].penultimate()); // 20 — every array now has this method


// ---------------------------------------------------------------------------
// 2. Object.create — the purest form of prototypal inheritance
// ---------------------------------------------------------------------------
console.log("\n=== Object.create ===");

const animal = {
  speak() {
    return `${this.name} makes a sound.`;
  },
  eat() {
    return `${this.name} is eating.`;
  },
};

// dog's prototype is DIRECTLY set to "animal" — no constructor function needed at all
const dog = Object.create(animal);
dog.name = "Rex";
console.log(dog.speak()); // "Rex makes a sound." — found via the prototype chain
console.log(dog.eat());   // "Rex is eating."
console.log(Object.getPrototypeOf(dog) === animal); // true — the recommended way to check, over __proto__


// ---------------------------------------------------------------------------
// 3a. Constructor-function-based inheritance (the "old way", pre-ES6)
// ---------------------------------------------------------------------------
console.log("\n=== Constructor function inheritance (old way) ===");

function AnimalCF(name) {
  this.name = name; // instance-specific data, set per-instance
}
AnimalCF.prototype.speak = function () {
  return `${this.name} makes a sound.`;
};

function DogCF(name, breed) {
  AnimalCF.call(this, name); // manually call the "parent constructor" to set up shared fields
  this.breed = breed;
}
// Manually wire up the prototype chain: DogCF instances should inherit from AnimalCF.prototype
DogCF.prototype = Object.create(AnimalCF.prototype);
DogCF.prototype.constructor = DogCF; // fix the constructor reference (Object.create doesn't set this automatically)
DogCF.prototype.bark = function () {
  return `${this.name} barks!`;
};

const rexCF = new DogCF("Rex", "Labrador");
console.log(rexCF.speak()); // inherited from AnimalCF.prototype
console.log(rexCF.bark());  // defined directly on DogCF.prototype
console.log(rexCF instanceof AnimalCF); // true — prototype chain confirms inheritance


// ---------------------------------------------------------------------------
// 3b. ES6 class-based inheritance — the SAME mechanism, cleaner syntax
// ---------------------------------------------------------------------------
console.log("\n=== ES6 class inheritance (syntactic sugar, same mechanism) ===");

class AnimalES6 {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} makes a sound.`;
  }
}

class DogES6 extends AnimalES6 {
  constructor(name, breed) {
    super(name); // equivalent to AnimalCF.call(this, name) above
    this.breed = breed;
  }
  bark() {
    return `${this.name} barks!`;
  }
}

const rexES6 = new DogES6("Rex", "Labrador");
console.log(rexES6.speak());
console.log(rexES6.bark());
console.log(rexES6 instanceof AnimalES6); // true

// Proof that class syntax IS just prototypes under the hood:
console.log(rexES6.__proto__ === DogES6.prototype);              // true
console.log(DogES6.prototype.__proto__ === AnimalES6.prototype); // true — "extends" wires up the SAME prototype chain


// ---------------------------------------------------------------------------
// 4. Why prototypal inheritance is memory-efficient — proof
// ---------------------------------------------------------------------------
console.log("\n=== Memory efficiency proof ===");

const dog1 = new DogES6("Rex", "Lab");
const dog2 = new DogES6("Fido", "Poodle");
// Both instances share the EXACT SAME "speak" function in memory (defined once, on the prototype)
console.log(dog1.speak === dog2.speak); // true — one function, shared by every instance

// Contrast: if we defined the method INSIDE the constructor instead, every instance gets its OWN copy
function WastefulAnimal(name) {
  this.name = name;
  this.speak = function () { return `${this.name} makes a sound.`; }; // new function per instance!
}
const w1 = new WastefulAnimal("A");
const w2 = new WastefulAnimal("B");
console.log(w1.speak === w2.speak); // false — two separate function objects, wasting memory at scale
