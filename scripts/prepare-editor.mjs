import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(path.resolve('apps/dashboard/package.json'));
const monaco=path.dirname(require.resolve('monaco-editor/package.json'));
fs.mkdirSync('apps/dashboard/public/monaco',{recursive:true});
fs.cpSync(path.join(monaco,'min/vs'),'apps/dashboard/public/monaco/vs',{recursive:true});
console.log('Monaco editor copied locally; no CDN required');
