import { readFileSync } from 'fs';
import computeMunkres from 'munkres-js';

const buff = readFileSync('vault/test_output.json');
const cost = JSON.parse(buff.toString());

console.time('compute');

computeMunkres(cost);

console.timeEnd('compute');
