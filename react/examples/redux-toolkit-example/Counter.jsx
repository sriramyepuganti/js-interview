// Part of the redux-toolkit-example/ folder. Requires "@reduxjs/toolkit" and
// "react-redux" (npm install @reduxjs/toolkit react-redux), and the app must
// be wrapped in <Provider store={store}> (see store.js for the snippet).
//
// This is the direct modern replacement for the old redux.jsx component,
// which used connect(mapStateToProps, mapDispatchToProps)(Redux) — a class-era
// pattern. useSelector/useDispatch are the modern, hook-based equivalent.

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { increment, decrement, reset } from './counterSlice';

export default function Counter() {
  // OLD WAY:
  //   const mapStateToProps = (state) => ({ counter: state });
  //   export default connect(mapStateToProps, mapDispatchToProps)(Redux);
  //
  // NEW WAY: useSelector reads directly from the store with a selector
  // function — no connect() wrapper, no extra component in the tree.
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();

  const [apiData, setApiData] = useState([]);
  const [status, setStatus] = useState('idle');

  // OLD WAY (from actions/action.js) used redux-thunk with a hand-written
  // thunk action creator:
  //   export function fetchData() {
  //     return dispatch => fetch(url).then(...).then(json => dispatch({type:'API_SUCCESS', payload: json}));
  //   }
  //
  // For a real production app, prefer RTK Query (createApi) over hand-rolling
  // this — it gives you caching, loading/error state, and refetching for
  // free. This inline version is kept simple here just to mirror the shape
  // of the original example.
  const fetchPosts = async () => {
    setStatus('loading');
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
      const json = await res.json();
      setApiData(json);
      setStatus('succeeded');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Redux Toolkit Counter (modern replacement for old redux.jsx)</h2>

      <div>
        <button onClick={() => dispatch(decrement())}>-</button>
        <span style={{ margin: '0 12px' }}>{count}</span>
        <button onClick={() => dispatch(increment())}>+</button>
        <button onClick={() => dispatch(reset())}>Reset</button>
      </div>

      <hr />

      <button onClick={fetchPosts}>Fetch posts ({status})</button>
      <ul>
        {apiData.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
