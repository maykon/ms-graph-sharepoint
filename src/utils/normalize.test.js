import { describe, it } from 'node:test';
import { strictEqual, match } from 'node:assert';
import { normalize } from './normalize.js';

describe('Normalize Unit Tests', () => {
  it('I should normalize the test removing all the invalid chars', () => {
    strictEqual(1, 1);
    strictEqual(normalize('~test'), 'test');
    strictEqual(normalize('.test'), 'test');
    strictEqual(normalize('test.'), 'test');
    strictEqual(normalize('te...st'), 'te.st');
    strictEqual(normalize('~Tilde'), 'Tilde');
    strictEqual(normalize('Number sign (#)'), 'Number sign (#)');
    strictEqual(normalize('Percent (%)'), 'Percent ()');
    strictEqual(normalize('Ampersand (&)'), 'Ampersand (and)');
    strictEqual(normalize('Asterisk (*)'), 'Asterisk ()');
    strictEqual(normalize('Braces ({ })'), 'Braces ( )');
    strictEqual(normalize('Backslash (\)'), 'Backslash ()');
    strictEqual(normalize('Colon (:)'), 'Colon ()');
    strictEqual(normalize('Angle brackets (< >)'), 'Angle brackets ( )');
    strictEqual(normalize('Question mark (?)'), 'Question mark ()');
    strictEqual(normalize('Slash (/)'), 'Slash ()');
    strictEqual(normalize('Plus sign (+)'), 'Plus sign ()');
    strictEqual(normalize('Plus sign (+)'), 'Plus sign ()');
    strictEqual(normalize('Pipe (|)'), 'Pipe ()');
    strictEqual(normalize('Quotation mark (")'), 'Quotation mark ()');
  });

  it('Should change the invalid words', () => {
    strictEqual(normalize('.lock'), 'lock');
    match(normalize('CON'), /CON[0-9]+/);
    match(normalize('PRN'), /PRN[0-9]+/);
    match(normalize('AUX'), /AUX[0-9]+/);
    match(normalize('NUL'), /NUL[0-9]+/);
    match(normalize('_vti_'), /vti[0-9]+/);
    match(normalize('desktop.ini'), /desktop.ini[0-9]+/);
    match(normalize('COM0'), /COM0[0-9]+/);
    match(normalize('COM9'), /COM9[0-9]+/);
    match(normalize('LPT0'), /LPT0[0-9]+/);
  });

});