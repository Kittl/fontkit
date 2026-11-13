import {DecodeStream as BaseDecodeStream} from 'restructure';

/** Reads shared font sources without passing shared string views to TextDecoder. */
export default class DecodeStream extends BaseDecodeStream {
  readString(length, encoding) {
    if (Object.prototype.toString.call(this.buffer.buffer) !== '[object SharedArrayBuffer]') {
      return super.readString(length, encoding);
    }

    // Copy the string being decoded while retaining the full shared source buffer.
    let bytes = new Uint8Array(this.readBuffer(length));
    return new BaseDecodeStream(bytes).readString(length, encoding);
  }
}
