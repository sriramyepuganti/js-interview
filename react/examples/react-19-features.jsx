// Requires React 19+ (and react-dom 19+ for useFormStatus). Drop this into a
// React 19 sandbox / Vite app (e.g. src/React19Features.jsx) and render
// <React19Features /> somewhere. No extra dependencies needed.
//
// Demonstrates useActionState + useFormStatus + useOptimistic together in one
// small "optimistic add-a-comment" form — the classic React 19 combo.

import React, { useActionState, useOptimistic, useState } from 'react';
import { useFormStatus } from 'react-dom';

// ---------------------------------------------------------------------------
// Fake "server call" — pretend this hits a real API. It sometimes fails on
// purpose (comments containing "fail") so you can see useOptimistic's
// automatic rollback behavior.
// ---------------------------------------------------------------------------
function fakeSaveCommentToServer(text) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (text.toLowerCase().includes('fail')) {
        reject(new Error('Server rejected the comment (simulated failure).'));
      } else {
        resolve({ id: Date.now(), text });
      }
    }, 1200); // simulated network latency
  });
}

// ---------------------------------------------------------------------------
// SubmitButton — a reusable button that lives INSIDE the <form> below.
//
// PRE-REACT-19: this component would need an `isPending` PROP passed down
// from the parent form component, e.g. <SubmitButton isPending={isPending} />,
// and the parent would need its own useState(false) + manual true/false
// toggling around the async call. That's prop drilling for something that's
// purely "is my enclosing form busy?" — information the button shouldn't
// need threaded to it manually.
//
// REACT 19: useFormStatus() reads the nearest ENCLOSING <form>'s pending
// state directly, with zero props. This button could be dropped into any
// form in the app and just work.
// ---------------------------------------------------------------------------
function SubmitButton() {
  const { pending } = useFormStatus(); // works ONLY because this renders inside a <form>
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Posting...' : 'Post comment'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function React19Features() {
  // Real, confirmed comments — this is the actual source of truth, only
  // updated once the server call truly resolves.
  const [comments, setComments] = useState([
    { id: 1, text: 'First comment (seeded)' },
  ]);

  // -------------------------------------------------------------------------
  // useOptimistic: shows a temporary, "optimistic" version of `comments`
  // immediately, before the network request finishes.
  //
  // PRE-REACT-19: you'd manually do something like:
  //   const [optimisticComments, setOptimisticComments] = useState(comments);
  //   // ...then manually keep it in sync with `comments`, manually push a
  //   // temp item on submit, and manually pop/revert it in a catch block if
  //   // the request failed. Easy to get subtly wrong (duplicate entries,
  //   // stuck "sending" items after a failed request).
  //
  // REACT 19: useOptimistic handles the merge-and-revert bookkeeping for you.
  // If the async action (submitComment below) throws, React automatically
  // discards the optimistic entry and falls back to the last real `comments`
  // value — no manual rollback code needed.
  // -------------------------------------------------------------------------
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (currentComments, newText) => [
      ...currentComments,
      { id: 'optimistic-temp', text: newText, sending: true }, // marked so we can style it as "in flight"
    ]
  );

  // -------------------------------------------------------------------------
  // The "action" function passed to useActionState. Its signature is
  // (previousState, formData) => newState — React calls it for us when the
  // form is submitted, and gives it the submitted FormData directly (no
  // manual e.preventDefault() / e.target.elements wrangling needed).
  //
  // PRE-REACT-19: a form submit handler would look like:
  //   const [isPending, setIsPending] = useState(false);
  //   const [error, setError] = useState(null);
  //   async function handleSubmit(e) {
  //     e.preventDefault();
  //     setIsPending(true);
  //     setError(null);
  //     try {
  //       const text = e.target.elements.comment.value;
  //       const saved = await fakeSaveCommentToServer(text);
  //       setComments((prev) => [...prev, saved]);
  //     } catch (err) {
  //       setError(err.message);
  //     } finally {
  //       setIsPending(false);
  //     }
  //   }
  //   ...and SubmitButton would need `isPending` passed down as a prop.
  //
  // REACT 19: useActionState tracks pending/error/result state for us
  // automatically — we just return whatever "state" we want available after
  // the action runs (here, an error message or null).
  // -------------------------------------------------------------------------
  async function submitComment(previousState, formData) {
    const text = formData.get('comment');
    if (!text || !text.trim()) {
      return { error: 'Comment cannot be empty.' };
    }

    // Show the optimistic version INSTANTLY, before the network call resolves.
    addOptimisticComment(text);

    try {
      const saved = await fakeSaveCommentToServer(text);
      // Real data updates here — once this resolves, `optimisticComments`
      // (which is derived from `comments`) will show the CONFIRMED comment,
      // and the temporary "sending" one automatically disappears.
      setComments((prev) => [...prev, saved]);
      return { error: null };
    } catch (err) {
      // No manual rollback needed for the optimistic list — React reverts
      // `optimisticComments` back to the real `comments` automatically as
      // soon as this action finishes without confirming the optimistic entry.
      return { error: err.message };
    }
  }

  // [state, formAction, isPending] — `state` is whatever submitComment
  // returned last ({ error } here), `formAction` plugs into <form action={}>,
  // and `isPending` is tracked by React automatically (we don't use it here
  // directly since SubmitButton reads its own pending state via
  // useFormStatus, but it's available if the parent needs it too).
  const [state, formAction, isPending] = useActionState(submitComment, { error: null });

  return (
    <div style={{ padding: 16, maxWidth: 420 }}>
      <h2>React 19: useActionState + useFormStatus + useOptimistic</h2>

      <ul>
        {optimisticComments.map((c) => (
          <li key={c.id} style={{ opacity: c.sending ? 0.5 : 1 }}>
            {c.text} {c.sending && <em>(sending...)</em>}
          </li>
        ))}
      </ul>

      {/*
        `action={formAction}` — React 19 calls submitComment(previousState, formData)
        for us on submit. No onSubmit, no e.preventDefault(), no manual FormData
        construction.
      */}
      <form action={formAction}>
        <input name="comment" placeholder="Type a comment (try 'fail' to see rollback)" />
        {/* SubmitButton has NO props — it reads this form's pending state itself via useFormStatus */}
        <SubmitButton />
      </form>

      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}

      <p style={{ fontSize: 12, color: '#666' }}>
        Type a comment containing the word "fail" and submit — watch the optimistic
        entry appear instantly, then get automatically rolled back when the
        simulated server call rejects, with the error message shown below the form.
      </p>
    </div>
  );
}
