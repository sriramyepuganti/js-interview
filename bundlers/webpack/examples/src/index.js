// Tiny reference entry file — this is where Webpack starts building
// the dependency graph (see `entry` in webpack.config.js).

import './styles.css'; // CSS is treated as a dependency too, via css-loader

function greet(name) {
  return `Hello, ${name}! This bundle was built by Webpack.`;
}

const root = document.getElementById('root');
if (root) {
  root.textContent = greet('Sriramsai');
}

// Example of a dynamic import (code-splitting): Webpack will emit this
// as a SEPARATE chunk, only downloaded when this function actually runs.
function loadExtraFeature() {
  import('./extraFeature.js').then((module) => {
    module.runExtraFeature();
  });
}

// Not called here on purpose — this file is a reference example, not a
// runnable app. In a real app, this might be wired to a button click.
void loadExtraFeature;
