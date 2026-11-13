import assert from 'assert';
import fs from 'fs';
import {runInNewContext} from 'vm';
import * as fontkit from '@kittl/fontkit';

describe('shared TTF/OTF source buffers', function () {
  let decode = TextDecoder.prototype.decode;

  beforeEach(function () {
    // Patch the prototype so this also covers the cached format-signature decoder.
    TextDecoder.prototype.decode = function (input, ...args) {
      if (input && Object.prototype.toString.call(input.buffer) === '[object SharedArrayBuffer]') {
        throw new TypeError('TextDecoder does not accept shared views');
      }

      return decode.call(this, input, ...args);
    };
  });

  afterEach(function () {
    TextDecoder.prototype.decode = decode;
  });

  for (let file of ['OpenSans/OpenSans-Regular.ttf', 'SourceSansPro/SourceSansPro-Regular.otf']) {
    for (let foreignRealm of [false, true]) {
      it(`keeps ${file} shared while decoding names and shaping glyphs (${foreignRealm ? 'foreign' : 'local'} realm)`, function () {
        let original = fs.readFileSync(new URL(`data/${file}`, import.meta.url));
        let shared = foreignRealm
          ? runInNewContext(`new SharedArrayBuffer(${original.byteLength})`)
          : new SharedArrayBuffer(original.byteLength);
        assert.strictEqual(shared instanceof SharedArrayBuffer, !foreignRealm);
        new Uint8Array(shared).set(original);
        let font = fontkit.create(Buffer.from(shared));
        let expected = fontkit.create(original);

        assert.strictEqual(font.stream.buffer.buffer, shared);
        assert.strictEqual(font.familyName, expected.familyName);
        assert.strictEqual(font.postscriptName, expected.postscriptName);
        assert.deepEqual(
          font.layout('Office ffi').glyphs.map(glyph => glyph.id),
          expected.layout('Office ffi').glyphs.map(glyph => glyph.id)
        );
        assert.strictEqual(font.stream.buffer.buffer, shared);
      });
    }
  }
});
