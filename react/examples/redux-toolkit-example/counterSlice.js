// Part of the redux-toolkit-example/ folder. Requires "@reduxjs/toolkit" to
// actually run (npm install @reduxjs/toolkit react-redux). This file is the
// direct modern replacement for the old actions/action.js + reducers/reducer.js
// pair — createSlice generates action types AND action creators for you.

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  value: 0,
  apiData: [], // replaces the old separate "apiCall" reducer from reducers/reducer.js
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
};

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    // Old way required: export function increment() { return { type: 'INCREMENT' } }
    // plus a separate switch-case in a reducer function.
    // New way: write the "mutating-looking" logic directly. Under the hood,
    // Redux Toolkit uses Immer, which safely converts this into an
    // immutable update — you never have to hand-write `{ ...state, value: state.value + 1 }`.
    increment(state) {
      state.value += 1;
    },
    decrement(state) {
      state.value -= 1;
    },
    reset(state) {
      state.value = 0;
    },
  },
  // extraReducers would go here if using createAsyncThunk for the API call;
  // for simplicity this example keeps the async fetch in the component via
  // a plain async function that dispatches synchronous actions (see
  // Counter.jsx). For a bigger app, prefer RTK Query instead of hand-writing
  // this fetch logic at all (see 07-state-management.md).
});

// Action creators are auto-generated with the same names as the reducer
// functions above — this replaces actions/action.js entirely.
export const { increment, decrement, reset } = counterSlice.actions;

// The reducer itself, wired into the store in store.js.
export default counterSlice.reducer;
