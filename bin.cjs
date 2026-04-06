#!/usr/bin/env node
'use strict';

var major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 18) {
  console.error('');
  console.error('  ✗  agentskills requires Node.js 18 or higher.');
  console.error('     Your version: v' + process.versions.node);
  console.error('     Upgrade at:   https://nodejs.org');
  console.error('');
  process.exit(1);
}

import('./src/index.mjs').catch(function (err) {
  console.error(err);
  process.exit(1);
});
