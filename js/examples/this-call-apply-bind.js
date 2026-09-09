/**
 * this-call-apply-bind.js
 * Run with: node this-call-apply-bind.js
 *
 * Demonstrates: how `this` behaves in different call styles, plus
 * from-scratch polyfills for call/apply/bind (classic senior interview task).
 * See ../03-this-call-apply-bind.md for the full explanation.
 */

// ---------------------------------------------------------------------------
// 1. How `this` is determined — default / implicit / explicit / new / arrow
// ---------------------------------------------------------------------------
function showThis() {
  console.log(this);
}

console.log("=== this binding rules ===");

// Implicit binding — called as obj.method()
const obj = { id: "obj", showThis };
obj.showThis(); // { id: 'obj', showThis: [Function: showThis] }

// Explicit binding — call/apply/bind override this
showThis.call({ id: "call-context" });   // { id: 'call-context' }
showThis.apply({ id: "apply-context" }); // { id: 'apply-context' }
const bound = showThis.bind({ id: "bind-context" });
bound(); // { id: 'bind-context' }

// new binding — this = the newly created instance
function Person(name) {
  this.name = name;
  console.log("Inside constructor, this.name =", this.name);
}
const p = new Person("Sriram");

// Arrow function — no own `this`, inherits from enclosing scope
const arrowObj = {
  id: "arrowObj",
  regular() {
    console.log("regular method this.id:", this.id); // "arrowObj" — implicit binding
    const arrowFn = () => console.log("arrow inside method, this.id:", this.id); // still "arrowObj" — inherited
    arrowFn();
  },
};
arrowObj.regular();


// ---------------------------------------------------------------------------
// 2. call vs apply vs bind — usage differences
// ---------------------------------------------------------------------------
function introduce(greeting, punctuation) {
  return `${greeting}, I'm ${this.name}${punctuation}`;
}

console.log("\n=== call / apply / bind usage ===");
console.log(introduce.call({ name: "Sri" }, "Hello", "!"));       // args listed individually
console.log(introduce.apply({ name: "Sri" }, ["Hi", "."]));       // args as an array
const introduceAsSri = introduce.bind({ name: "Sri" }, "Hey");    // partially applied — "greeting" locked in
console.log(introduceAsSri("?!"));                                 // only need to supply the rest


// ---------------------------------------------------------------------------
// 3. Polyfills — implementing call, apply, bind from scratch
//    This is one of THE most common senior JS interview coding questions.
// ---------------------------------------------------------------------------

// --- myCall ---
Function.prototype.myCall = function (context = globalThis, ...args) {
  // `this` here refers to the function myCall was invoked on (e.g., introduce.myCall(...))
  context = context === null || context === undefined ? globalThis : Object(context);

  const fnKey = Symbol("fn"); // use a Symbol so we never accidentally overwrite a real property
  context[fnKey] = this;

  const result = context[fnKey](...args); // calling fn AS a method of context makes `this` = context
  delete context[fnKey]; // clean up — don't leave our temp property behind

  return result;
};

// --- myApply ---
Function.prototype.myApply = function (context = globalThis, argsArray = []) {
  context = context === null || context === undefined ? globalThis : Object(context);

  const fnKey = Symbol("fn");
  context[fnKey] = this;

  const result = context[fnKey](...argsArray); // same trick, but args come as an array
  delete context[fnKey];

  return result;
};

// --- myBind ---
Function.prototype.myBind = function (context, ...boundArgs) {
  const originalFn = this; // the function myBind was called on

  return function boundFunction(...callArgs) {
    // Support being called normally OR being used with `new` (rare, but correct implementations handle it)
    if (this instanceof boundFunction) {
      return new originalFn(...boundArgs, ...callArgs);
    }
    return originalFn.myApply(context, [...boundArgs, ...callArgs]);
  };
};

console.log("\n=== Polyfill tests ===");
console.log(introduce.myCall({ name: "Poly-Sri" }, "Hello", "!"));
console.log(introduce.myApply({ name: "Poly-Sri" }, ["Hi", "."]));
const policeBound = introduce.myBind({ name: "Poly-Sri" }, "Hey");
console.log(policeBound("?!"));


// ---------------------------------------------------------------------------
// 4. Real-world usage: borrowing array methods on array-like objects
// ---------------------------------------------------------------------------
function sumAllArguments() {
  // "arguments" is array-LIKE (has length + indices) but not a real array — no .reduce() on it directly
  return Array.prototype.slice.call(arguments).reduce((a, b) => a + b, 0);
}
console.log("\n=== Borrowing array methods via call ===");
console.log(sumAllArguments(1, 2, 3, 4)); // 10
