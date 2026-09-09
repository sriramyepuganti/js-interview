// Drop this file into any React sandbox / CRA / Vite app (e.g. src/FramerMotionExample.jsx)
// and render <FramerMotionExample /> somewhere.
// Requires: npm install framer-motion

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Toast — demonstrates `initial` / `animate` / `exit`.
// `exit` ONLY runs if this component is rendered inside <AnimatePresence>
// (see ToastList below) — without it, React would remove the DOM node
// immediately on unmount, with no time for an exit animation to play.
// ---------------------------------------------------------------------------
function Toast({ message, onDismiss }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.25 }}
      style={{
        background: '#333',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: 6,
        marginBottom: 8,
        cursor: 'pointer',
      }}
      onClick={onDismiss}
      // whileHover / whileTap — declarative "animate while this gesture is
      // active" states, reverting automatically when the gesture ends.
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {message} (click to dismiss)
    </motion.div>
  );
}

// AnimatePresence delays a child's REMOVAL from the DOM just long enough for
// its `exit` animation to finish — this is the specific problem plain CSS
// and React alone can't solve (React normally removes the DOM node the
// instant a component unmounts).
function ToastList({ toasts, onDismiss }) {
  return (
    <div style={{ width: 260 }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} onDismiss={() => onDismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function FramerMotionExample() {
  const [toasts, setToasts] = useState([]);
  const nextId = React.useRef(0);

  function addToast() {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message: `Toast #${id}` }]);
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div>
      <button onClick={addToast}>Add toast</button>
      <p>
        Add a few toasts, then click one to dismiss it — notice it animates
        out (and the remaining toasts smoothly slide up thanks to the
        `layout` prop) instead of instantly disappearing.
      </p>
      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
