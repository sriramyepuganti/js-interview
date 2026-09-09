// Part of the redux-toolkit-example/ folder. Requires "@reduxjs/toolkit"
// (npm install @reduxjs/toolkit react-redux).
//
// Old way (from his old redux.jsx era) required manually importing
// `createStore` and `combineReducers` from "redux" directly:
//
//   import { createStore } from "redux";
//   import rootReducer from "../reducers/index"; // combineReducers({...})
//   const store = createStore(rootReducer);
//
// New way: configureStore does all of this automatically, PLUS:
// - wires up redux-thunk middleware out of the box (no manual middleware setup)
// - enables Redux DevTools automatically in development
// - combines multiple slice reducers into one root reducer for you

import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer, // if you add more slices, just add more keys here
  },
});

// In your app's entry point (e.g. main.jsx / index.js):
//
//   import { Provider } from 'react-redux';
//   import { store } from './redux-toolkit-example/store';
//
//   <Provider store={store}>
//     <App />
//   </Provider>
