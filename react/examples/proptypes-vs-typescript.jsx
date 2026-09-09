// Drop this file into any React sandbox / CRA / Vite app (e.g. src/PropTypesVsTypeScript.jsx)
// and render <PropTypesVsTypeScriptDemo /> somewhere.
// Requires the `prop-types` package for the runtime-checking half of this demo:
//   npm install prop-types
// (No install needed for the TypeScript half conceptually — see the .tsx
// version of UserCard below for how the same component looks typed with
// TypeScript instead, since a single .jsx file can't mix real TS syntax.)

import React from 'react';
import PropTypes from 'prop-types';

// ---------------------------------------------------------------------------
// Approach 1: prop-types — a RUNTIME check.
// If a caller passes the wrong shape, React only logs a console warning in
// development (this file), after the component has already rendered once
// with the bad data. Nothing happens in production builds at all.
// ---------------------------------------------------------------------------
function UserCard({ name, age, onSelect }) {
  return (
    <div onClick={() => onSelect(name)} style={{ border: '1px solid #ccc', padding: 8 }}>
      {name} {age !== undefined ? `(${age})` : ''}
    </div>
  );
}

UserCard.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number, // optional — no `.isRequired`
  onSelect: PropTypes.func.isRequired,
};

UserCard.defaultProps = {
  age: undefined,
};

// ---------------------------------------------------------------------------
// The TypeScript equivalent (this is what UserCard.tsx would look like —
// shown here as a comment since this file is .jsx, not .tsx):
//
//   type UserCardProps = {
//     name: string;
//     age?: number;
//     onSelect: (name: string) => void;
//   };
//
//   function UserCard({ name, age, onSelect }: UserCardProps) {
//     return <div onClick={() => onSelect(name)}>{name} {age}</div>;
//   }
//
//   // Calling it wrong is now a RED SQUIGGLY IN YOUR EDITOR + a failed build,
//   // caught before the code ever runs — not just a console warning after
//   // it already rendered once with bad data:
//   <UserCard name={42} onSelect="nope" />
//   //         ^^ Type 'number' is not assignable to type 'string'.
//   //                       ^^^^ Type 'string' is not assignable to type '(name: string) => void'.
// ---------------------------------------------------------------------------

// This intentionally passes the WRONG types to UserCard (number instead of
// string, no onSelect at all) to demonstrate what prop-types catches at
// runtime (open your browser console — you'll see two warnings) vs. what
// TypeScript would have caught before this code even ran.
function BrokenUsage() {
  return (
    // @ts-expect-error — this line only errors under TypeScript; under
    // plain prop-types it renders fine and just logs a dev warning.
    <UserCard name={42} />
  );
}

export default function PropTypesVsTypeScriptDemo() {
  return (
    <div>
      <h3>Correct usage (no warnings):</h3>
      <UserCard name="Sriramsai" age={30} onSelect={(n) => alert(`Selected ${n}`)} />

      <h3>Broken usage (check the console for prop-types warnings):</h3>
      <BrokenUsage />
    </div>
  );
}
