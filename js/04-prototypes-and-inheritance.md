# 04 — Prototypes and Inheritance

## What is the prototype chain?

**What is it?**
Every JS object has a hidden internal link to another object, called its **prototype**. When you access a property that doesn't exist directly on an object, JS automatically looks up the prototype chain — object's prototype, then that prototype's prototype, and so on — until it finds the property or reaches `null`.

```js
const arr = [1, 2, 3];
arr.push(4); // push isn't "on" arr directly — JS finds it on Array.prototype
```

**Why was it invented?**
Prototypal inheritance is JS's mechanism for **code reuse without copying**. Instead of every array instance carrying its own copy of `push`, `map`, `filter`, etc. (which would be extremely memory-wasteful), all arrays share ONE set of methods living on `Array.prototype`. This is why it's memory-efficient: a million array instances in your program still only have ONE copy of `.map()` in memory, shared by reference through the chain.

## `__proto__` vs `prototype` — the #1 source of confusion

| | `prototype` | `__proto__` |
|---|---|---|
| Exists on | Functions (specifically, functions meant to be used as constructors) | Every object (including functions) |
| Purpose | The object that will become the prototype of instances created via `new Fn()` | The actual link to an object's own prototype (the "parent" it inherits from) |
| Example | `Person.prototype.greet = function(){}` | `sriram.__proto__ === Person.prototype` |

```js
function Person(name) { this.name = name; }
Person.prototype.greet = function () { return `Hi, I'm ${this.name}`; };

const sriram = new Person("Sriram");
console.log(sriram.__proto__ === Person.prototype); // true
console.log(sriram.greet()); // "Hi, I'm Sriram" — found via the prototype chain

console.log(sriram.__proto__.__proto__ === Object.prototype); // true
console.log(sriram.__proto__.__proto__.__proto__); // null — end of the chain
```

So: `prototype` is a property that lives on **constructor functions** ("what my children will inherit"). `__proto__` is a property that lives on **every object** ("who is my parent"). `Object.getPrototypeOf(obj)` is the modern, recommended way to read `__proto__` (accessing `__proto__` directly is considered legacy/deprecated style).

## Classical Inheritance vs Prototypal Inheritance

**Classical inheritance** (Java, C++, C#) — classes are blueprints; objects are instances copied from a class definition; inheritance is defined at compile time in a rigid hierarchy.

**Prototypal inheritance** (JS) — there are no real "classes" under the hood; objects inherit directly from other *objects* at runtime. It's more flexible: you can change an object's prototype, or an instance's behavior, dynamically, even after creation.

```js
// Prototypal inheritance without "class" syntax, using Object.create
const animal = {
  speak() { return `${this.name} makes a sound`; }
};

const dog = Object.create(animal); // dog's prototype is directly set to "animal"
dog.name = "Rex";
console.log(dog.speak()); // "Rex makes a sound"
```

`Object.create(proto)` creates a brand-new object whose prototype is exactly the object you pass in — the purest, most direct way to demonstrate prototypal inheritance without any class syntax or constructor functions involved.

## ES6 Classes = Syntactic Sugar Over Prototypes

**What is it?**
`class` syntax in ES6 didn't add a new inheritance model to JS — it's syntactic sugar. Under the hood, `class Dog extends Animal` still just wires up the same prototype chain that `Object.create` and constructor functions have always used.

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
class Dog extends Animal {
  speak() { return `${this.name} barks`; }
}

const rex = new Dog("Rex");
console.log(rex.__proto__ === Dog.prototype); // true
console.log(Dog.prototype.__proto__ === Animal.prototype); // true — the "extends" chain IS the prototype chain
```

**Why was `class` introduced if prototypes already worked?**
Constructor-function-based inheritance (`Dog.prototype = Object.create(Animal.prototype)`, manually fixing `constructor`, calling `Animal.call(this, ...)`) was verbose and error-prone. `class`/`extends`/`super` gives the exact same prototypal behavior with much cleaner, more familiar (Java/C++-like) syntax — pure sugar, not a new mechanism.

**Real-world usage:** Every modern JS framework's component classes (React class components, Angular services with `@Injectable`), custom Error subclasses, and any OOP-style modeling in JS use `class`, but understanding it's "just prototypes" is what separates a mid-level from senior-level answer.

## Why prototypal inheritance is memory-efficient

If you define methods on the prototype (as classes automatically do, or as `Constructor.prototype.method = ...` does manually), **every instance shares the exact same function in memory** — they don't each get their own copy.

```js
function Person(name) { this.name = name; } // instance-specific data
Person.prototype.greet = function () { return `Hi ${this.name}`; }; // ONE shared function

const a = new Person("A");
const b = new Person("B");
console.log(a.greet === b.greet); // true — same function reference, shared via prototype
```

Contrast with defining `greet` inside the constructor (`this.greet = function(){...}`) — that would create a brand-new function object for every single instance, wasting memory at scale.

## Mixins

**What is it?**
JS classes only support single inheritance — `class Dog extends Animal` can only extend ONE parent. A mixin is a plain object (or function) holding reusable methods that gets COPIED onto a class's prototype (via `Object.assign`) or applied through a class-returning function, giving that class extra shared behavior without a real second parent in the inheritance chain.

```js
// A mixin is just a plain object of methods, not a class
const SerializableMixin = {
  serialize() { return JSON.stringify(this); },
};
const ComparableMixin = {
  equals(other) { return this.id === other.id; },
};

class Product {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}
// Copy both mixins' methods onto Product's prototype — shared, not duplicated per instance (previous section)
Object.assign(Product.prototype, SerializableMixin, ComparableMixin);

const p1 = new Product(1, "Book");
const p2 = new Product(1, "Different Name");
console.log(p1.serialize());     // '{"id":1,"name":"Book"}'
console.log(p1.equals(p2));      // true — compares by id, from the mixed-in method
console.log(p1 instanceof Product); // true — still only really inherits from Product/Object
```

**Why was it invented / what problem does it solve?**
Real-world designs often need a class to share behavior with MULTIPLE unrelated groups of classes (e.g., both a `Product` and a `User` might need `serialize()`, but they shouldn't share a common parent class just for that). Classical single inheritance can't express "borrow behavior from two unrelated sources," so JS (and OOP languages generally) developed mixins as a way to compose behavior horizontally — by copying/applying it — instead of forcing it through a single vertical inheritance chain.

**Real-time / real-world usage:** Vue 2's `mixins` option merges shared component logic across components; many utility libraries mix event-emitter behavior (`on`/`emit`/`off`) onto arbitrary classes without those classes extending a common `EventEmitter` base; React's older "higher-order component" pattern and even some hook-based composition solve the same "share behavior across unrelated components" problem that mixins solve for classes.

**How to explain in an interview (simple English):**
"A mixin is a way to share reusable methods across classes that aren't related through inheritance, since JS classes can only `extend` one parent. I copy the mixin's methods onto the target class's prototype with `Object.assign`, so every instance gets that behavior without a fake shared parent class. It's a horizontal way to share code, versus inheritance's vertical parent-child sharing."

## Real-world / real-time usage
- Every built-in type (`Array`, `Object`, `Function`, `String`) exposes its methods via its `.prototype` — this is literally how `.map()`, `.filter()`, `.toUpperCase()` exist on every instance without being copied.
- Polyfills (see file 13) work by attaching missing methods directly onto a built-in's `.prototype`, e.g., `Array.prototype.myMap = function(){...}`.
- Mixins and multiple-inheritance-like patterns in JS are done by copying methods onto prototypes or using `Object.assign`.

## How to explain in an interview (simple English)

"Every object in JS has a hidden link to another object called its prototype. When you try to access a property that isn't directly on the object, JS walks up this chain looking for it — that's the prototype chain. `prototype` is a property on constructor functions that says 'this is what instances created from me will inherit.' `__proto__` is the actual link on any object pointing to its parent. Classes in ES6 are just a cleaner syntax for the same prototype system — `extends` wires up the prototype chain for you automatically. It's memory-efficient because methods live once on the prototype and are shared by every instance, instead of being duplicated per object."

## Quick Reference

| Concept | One-liner |
|---|---|
| Prototype chain | The lookup path JS follows to resolve properties/methods not found directly on an object |
| `prototype` | Property on constructor functions defining what instances inherit |
| `__proto__` | Actual link from an object to its parent (use `Object.getPrototypeOf` instead) |
| `Object.create(proto)` | Creates an object with a specific prototype directly, no constructor needed |
| ES6 `class` | Syntactic sugar over the same prototype mechanism |
| Memory efficiency | Shared methods on the prototype = one copy in memory, used by all instances |
