import { describe, it } from 'node:test';
import { strictEqual, match } from 'node:assert';
import NormalizeUtils from './normalize.js';

describe('Normalize Unit Tests', () => {
  it('I should normalize the test removing all the invalid chars', () => {
    strictEqual(1, 1);
    strictEqual(NormalizeUtils.normalize('~test'), 'test');
    strictEqual(NormalizeUtils.normalize('.test'), 'test');
    strictEqual(NormalizeUtils.normalize('test.'), 'test');
    strictEqual(NormalizeUtils.normalize('te...st'), 'te.st');
    strictEqual(NormalizeUtils.normalize('~Tilde'), 'Tilde');
    strictEqual(NormalizeUtils.normalize('Number sign (#)'), 'Number sign (#)');
    strictEqual(NormalizeUtils.normalize('Percent (%)'), 'Percent ()');
    strictEqual(NormalizeUtils.normalize('Ampersand (&)'), 'Ampersand (and)');
    strictEqual(NormalizeUtils.normalize('Asterisk (*)'), 'Asterisk ()');
    strictEqual(NormalizeUtils.normalize('Braces ({ })'), 'Braces ( )');
    strictEqual(NormalizeUtils.normalize('Backslash (\)'), 'Backslash ()');
    strictEqual(NormalizeUtils.normalize('Colon (:)'), 'Colon ()');
    strictEqual(NormalizeUtils.normalize('Angle brackets (< >)'), 'Angle brackets ( )');
    strictEqual(NormalizeUtils.normalize('Question mark (?)'), 'Question mark ()');
    strictEqual(NormalizeUtils.normalize('Slash (/)'), 'Slash ()');
    strictEqual(NormalizeUtils.normalize('Plus sign (+)'), 'Plus sign ()');
    strictEqual(NormalizeUtils.normalize('Plus sign (+)'), 'Plus sign ()');
    strictEqual(NormalizeUtils.normalize('Pipe (|)'), 'Pipe ()');
    strictEqual(NormalizeUtils.normalize('Quotation mark (")'), 'Quotation mark ()');
  });

  it('Should change the invalid words', () => {
    strictEqual(NormalizeUtils.normalize('.lock'), 'lock');
    match(NormalizeUtils.normalize('CON'), /CON[0-9]+/);
    match(NormalizeUtils.normalize('PRN'), /PRN[0-9]+/);
    match(NormalizeUtils.normalize('AUX'), /AUX[0-9]+/);
    match(NormalizeUtils.normalize('NUL'), /NUL[0-9]+/);
    match(NormalizeUtils.normalize('_vti_'), /vti[0-9]+/);
    match(NormalizeUtils.normalize('desktop.ini'), /desktop.ini[0-9]+/);
    match(NormalizeUtils.normalize('COM0'), /COM0[0-9]+/);
    match(NormalizeUtils.normalize('COM9'), /COM9[0-9]+/);
    match(NormalizeUtils.normalize('LPT0'), /LPT0[0-9]+/);
  });

  it('Should remove links in the text', () => {
    strictEqual(NormalizeUtils.normalize('Manteca  https://data-manteca.opendata.arcgis.com/datasets/437728d82d744e9b91d0c2202ef545dc_28/explore?location=37.812660%2C-121.260275%2C18.95'), 'Manteca');
    strictEqual(NormalizeUtils.normalize('Google http://google.com.br WebSite'), 'Google WebSite');
  });

});