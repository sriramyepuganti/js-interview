// Drop this file into any React 18+ sandbox / Vite app (e.g. src/ReactTopicsYouMightHaveMissed.jsx)
// and render <ReactTopicsYouMightHaveMissed /> somewhere. Requires react-dom for
// createPortal. No extra dependencies needed.
//
// Demonstrates, in one file:
//   1. A Portal-based modal with a basic focus trap (file 16, sections 1 & 8a)
//   2. Keyed Fragments avoiding a wrapper div in a <dl> (file 16, section 2)
//   3. useId + useSyncExternalStore mini demo (file 16, sections 4 & 5)
//
// NOTE on <StrictMode>: it can't be demoed meaningfully INSIDE a single component
// file like this one — it's applied once, around the whole app, in main.jsx /
// index.js:
//
//   <StrictMode>
//     <App />
//   </StrictMode>
//
// In development, wrapping your app in it will cause every component's render
// body, state-initializer functions, and (on mount) effect setup/cleanup to run
// TWICE, specifically to surface impure code before it becomes a real bug. Try
// it by wrapping <ReactTopicsYouMightHaveMissed /> in <StrictMode> in your own
// main.jsx and watching the console.log calls below fire twice on mount.

import React, { useState, useRef, useEffect, useId, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// 1. PORTAL-BASED MODAL WITH A BASIC FOCUS TRAP
// =============================================================================
//
// WHY A PORTAL: `overflow: hidden` on `.app-shell` below (simulating a real
// layout constraint, e.g. a scrollable dashboard card) would visually CLIP a
// normally-nested modal, and a z-index war with sibling elements is a similar
// risk. createPortal renders the modal's actual DOM node into #portal-root
// (a sibling of the whole app, defined further down in this file), completely
// outside `.app-shell`'s overflow/stacking context — while the <Modal>
// component is STILL a normal child of <PortalModalDemo> in React's tree: it
// still gets props, still bubbles its onClick through React's synthetic event
// system to logical (not DOM) ancestors.
function Modal({ onClose, children }) {
  const modalRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  useEffect(() => {
    // Remember whatever had focus before the modal opened (the "Open modal"
    // button), so we can restore it when the modal closes.
    previouslyFocusedElement.current = document.activeElement;
    modalRef.current?.focus(); // move focus INTO the modal immediately on open

    return () => {
      // On unmount (modal closing), send focus back to the trigger element —
      // without this, a keyboard user's focus would be left on a removed node.
      previouslyFocusedElement.current?.focus();
    };
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    // FOCUS TRAP: keep Tab/Shift+Tab cycling only within this modal's own
    // focusable elements, instead of "leaking" focus out to the page behind it.
    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus(); // wrap Shift+Tab from the first element to the last
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus(); // wrap Tab from the last element back to the first
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose} // click on the overlay closes the modal
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1} // makes the container itself focusable via .focus() above
        onClick={(e) => e.stopPropagation()} // don't let inner clicks bubble to the overlay's onClose
        onKeyDown={handleKeyDown}
        style={{ background: 'white', padding: 24, borderRadius: 8, minWidth: 280 }}
      >
        <h2 id="modal-title">Portal Modal</h2>
        <p>
          This modal's real DOM node lives outside <code>.app-shell</code>'s
          <code>overflow: hidden</code>, thanks to <code>createPortal</code>.
          Try Tab / Shift+Tab — focus stays trapped inside this dialog.
        </p>
        <input placeholder="Focusable input #1" style={{ display: 'block', marginBottom: 8, width: '100%' }} />
        <button onClick={onClose}>Close (or press Escape)</button>
      </div>
    </div>,
    document.getElementById('portal-root') // defined at the bottom of this component tree
  );
}

function PortalModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    // `.app-shell` simulates a real layout constraint that would clip a
    // NON-portaled modal — try removing createPortal's target and rendering
    // the modal in place instead, and it would get visually cut off here.
    <div className="app-shell" style={{ overflow: 'hidden', border: '2px dashed #999', padding: 16, position: 'relative' }}>
      <h3>1. Portal-based modal (with focus trap)</h3>
      <button onClick={() => setOpen(true)}>Open modal</button>
      {open && <Modal onClose={() => setOpen(false)}>modal content</Modal>}
    </div>
  );
}

// =============================================================================
// 2. KEYED FRAGMENTS — avoiding a wrapper <div> inside a <dl>
// =============================================================================
//
// WHY NOT A DIV: <dt>/<dd> pairs are only valid direct children of a <dl>.
// Wrapping each pair in a <div> (to satisfy "return one root element") would
// produce INVALID HTML and could break how assistive tech / browsers interpret
// the definition list. The short <>...</> syntax can't take a `key`, so when
// the Fragment itself is a list item (needs a stable identity across renders,
// same reasoning as any other list item), we need the explicit
// <React.Fragment key={...}> form instead.
const GLOSSARY_TERMS = [
  { id: 'jsx', title: 'JSX', description: 'A syntax extension for writing UI markup inside JS.' },
  { id: 'fiber', title: 'Fiber', description: "React's reconciliation engine — interruptible, prioritized rendering." },
  { id: 'portal', title: 'Portal', description: 'Renders a child into a different DOM node than its logical parent.' },
];

function KeyedFragmentDemo() {
  return (
    <div style={{ marginTop: 24 }}>
      <h3>2. Keyed Fragments inside a &lt;dl&gt;</h3>
      <dl>
        {GLOSSARY_TERMS.map((term) => (
          // Each Fragment IS the list item here, so it needs `key` just like any
          // element would — but <>...</> doesn't support props, hence the
          // explicit React.Fragment form.
          <React.Fragment key={term.id}>
            <dt style={{ fontWeight: 'bold' }}>{term.title}</dt>
            <dd style={{ marginBottom: 8 }}>{term.description}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

// =============================================================================
// 3. useId + useSyncExternalStore MINI DEMO
// =============================================================================

// --- useSyncExternalStore: a tiny external store OUTSIDE React entirely ----
// This mimics subscribing to a real browser API (like navigator.onLine) or a
// third-party store library — state that React does not own or control.
const windowWidthStore = {
  getSnapshot() {
    return window.innerWidth;
  },
  subscribe(callback) {
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback); // cleanup
  },
};

function useWindowWidth() {
  // useSyncExternalStore(subscribe, getSnapshot):
  //   - subscribe(callback): registers `callback` to be called whenever the
  //     external store changes, and returns an unsubscribe function.
  //   - getSnapshot(): returns the CURRENT value, synchronously.
  //
  // WHY NOT plain useState + useEffect here? A hand-rolled version (setState
  // inside a resize listener) mostly works too, but under React 18's concurrent
  // rendering, if window.innerWidth changes WHILE a render is paused partway
  // through, different components reading it during that same render could end
  // up showing inconsistent values simultaneously ("tearing"). useSyncExternalStore
  // is React's guaranteed-consistent way to read external, non-React state.
  return useSyncExternalStore(windowWidthStore.subscribe, windowWidthStore.getSnapshot);
}

function LabeledField({ label }) {
  // useId: generates a stable, unique id for THIS component instance — the
  // same id on every render, and (in an SSR app) identical between the
  // server-rendered HTML and the client's hydration pass. Render <LabeledField>
  // twice (as done below) and each instance gets its OWN unique id — no
  // collisions, unlike a hardcoded string id would cause.
  const id = useId();
  return (
    <div style={{ marginBottom: 8 }}>
      <label htmlFor={id}>{label}: </label>
      <input id={id} type="text" aria-describedby={`${id}-hint`} />
      <div id={`${id}-hint`} style={{ fontSize: 11, color: '#666' }}>
        Generated id for this instance: <code>{id}</code>
      </div>
    </div>
  );
}

function UseIdAndSyncExternalStoreDemo() {
  const width = useWindowWidth();
  return (
    <div style={{ marginTop: 24 }}>
      <h3>3. useId + useSyncExternalStore</h3>
      <p>
        Live window width (via <code>useSyncExternalStore</code> subscribed to
        the native <code>resize</code> event): <strong>{width}px</strong>. Try
        resizing the browser window.
      </p>
      {/* Two instances of the SAME component — each gets its own unique,
          collision-free id from useId, unlike a hardcoded "email-input" string
          would if this component were rendered twice on one page. */}
      <LabeledField label="Name" />
      <LabeledField label="Email" />
    </div>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================
export default function ReactTopicsYouMightHaveMissed() {
  return (
    <div style={{ padding: 16, maxWidth: 520, fontFamily: 'sans-serif' }}>
      <h2>React Topics You Might Have Missed</h2>

      <PortalModalDemo />
      <KeyedFragmentDemo />
      <UseIdAndSyncExternalStoreDemo />

      {/*
        The Portal above needs a mount target that's a SIBLING of this whole
        component tree, not a descendant of `.app-shell` (whose overflow:hidden
        is exactly what we're escaping). In a real app this div would normally
        live directly in index.html next to <div id="root">:

          <body>
            <div id="root"></div>
            <div id="portal-root"></div>
          </body>

        For this single-file demo, we render it here at the same level as
        everything else, so `document.getElementById('portal-root')` finds it.
      */}
      <div id="portal-root" />
    </div>
  );
}
