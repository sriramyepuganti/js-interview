// Drop this file into any React + TypeScript sandbox / Vite (react-ts template)
// app (e.g. src/PropTypesVsTypeScript.tsx) and render <UserCardTSDemo /> somewhere.
// No extra dependencies needed — this is the TypeScript twin of
// examples/proptypes-vs-typescript.jsx, showing the SAME component typed with
// TypeScript instead of the `prop-types` runtime library.

import React from 'react';

// ---------------------------------------------------------------------------
// Approach 2: TypeScript — a COMPILE-TIME check.
// Wrong usage is a red squiggly in the editor AND a failed `tsc` build,
// caught before this code ever runs — not just a console warning after it
// already rendered once with bad data (compare to the .jsx twin's prop-types
// version, which only warns in dev, at runtime, after the fact).
// ---------------------------------------------------------------------------
type UserCardProps = {
  name: string;
  age?: number; // optional, same as PropTypes.number (no .isRequired)
  onSelect: (name: string) => void;
};

function UserCard({ name, age, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect(name)} style={{ border: '1px solid #ccc', padding: 8 }}>
      {name} {age !== undefined ? `(${age})` : ''}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A discriminated union — a pattern that has NO real prop-types equivalent.
// TypeScript can force every caller to pass the right combination of props
// for a given `variant`, and narrows the type for you inside the component.
// ---------------------------------------------------------------------------
type ButtonProps =
  | { variant: 'link'; href: string }
  | { variant: 'button'; onClick: () => void };

function ActionButton(props: ButtonProps) {
  if (props.variant === 'link') {
    // TypeScript knows `props.href` exists here (and `onClick` does NOT).
    return <a href={props.href}>Go</a>;
  }
  // TypeScript knows `props.onClick` exists here (and `href` does NOT).
  return <button onClick={props.onClick}>Go</button>;
}

// Uncommenting either line below fails `tsc` at BUILD TIME, before the app
// ever runs — this is the core difference from prop-types shown in the .jsx twin:
//
// <UserCard name={42} onSelect={() => {}} />
// //         ^^ Type 'number' is not assignable to type 'string'.
//
// <ActionButton variant="link" onClick={() => {}} />
// //                            ^^ Object literal may only specify known properties,
// //                               and 'onClick' does not exist in type '{ variant: "link"; href: string; }'.

export default function UserCardTSDemo() {
  return (
    <div>
      <UserCard name="Sriramsai" age={30} onSelect={(n) => alert(`Selected ${n}`)} />
      <ActionButton variant="link" href="/profile" />
      <ActionButton variant="button" onClick={() => alert('clicked')} />
    </div>
  );
}
