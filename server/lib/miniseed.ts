// Minimal FDSN miniSEED 2.4 encoder.
// Produces 4096-byte fixed-length records with INT32 big-endian encoding (type 3)
// and one Blockette 1000. Suitable for opening in ObsPy / IRIS tools.

export interface MseedChannel {
  network: string;   // up to 2 chars
  station: string;   // up to 5 chars
  location: string;  // up to 2 chars
  channel: string;   // 3 chars (e.g. BHZ, BHN, BHE)
  sampleRate: number; // Hz
  startTime: Date;
  samples: Int32Array;
}

const RECORD_LEN = 4096;
const DATA_OFFSET = 64;
const SAMPLES_PER_RECORD = (RECORD_LEN - DATA_OFFSET) / 4; // 1008

function padField(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  return s + ' '.repeat(n - s.length);
}

function writeAscii(buf: Buffer, offset: number, value: string, len: number) {
  const padded = padField(value, len);
  for (let i = 0; i < len; i++) buf[offset + i] = padded.charCodeAt(i);
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const diff = d.getTime() - start;
  return Math.floor(diff / 86400000) + 1;
}

// Sample rate is encoded as factor + multiplier such that
// rate = factor * multiplier (when both positive),
// or rate = -1 / (factor * multiplier) when negative.
function encodeSampleRate(hz: number): { factor: number; multiplier: number } {
  if (hz >= 1) {
    return { factor: Math.round(hz), multiplier: 1 };
  }
  // Period in seconds
  const period = 1 / hz;
  return { factor: -Math.round(period), multiplier: 1 };
}

function writeFixedHeader(
  buf: Buffer,
  seq: number,
  ch: MseedChannel,
  numSamples: number,
  recordStartMs: number,
) {
  // Sequence number, 6 ASCII digits
  writeAscii(buf, 0, String(seq).padStart(6, '0'), 6);
  buf[6] = 'D'.charCodeAt(0); // data quality
  buf[7] = ' '.charCodeAt(0); // reserved

  writeAscii(buf, 8, ch.station, 5);
  writeAscii(buf, 13, ch.location, 2);
  writeAscii(buf, 15, ch.channel, 3);
  writeAscii(buf, 18, ch.network, 2);

  // BTIME (10 bytes): year(u16), day(u16), hour(u8), min(u8), sec(u8), unused(u8), .0001s(u16)
  const d = new Date(recordStartMs);
  buf.writeUInt16BE(d.getUTCFullYear(), 20);
  buf.writeUInt16BE(dayOfYear(d), 22);
  buf.writeUInt8(d.getUTCHours(), 24);
  buf.writeUInt8(d.getUTCMinutes(), 25);
  buf.writeUInt8(d.getUTCSeconds(), 26);
  buf.writeUInt8(0, 27);
  buf.writeUInt16BE(d.getUTCMilliseconds() * 10, 28); // .0001s units

  buf.writeUInt16BE(numSamples, 30);

  const { factor, multiplier } = encodeSampleRate(ch.sampleRate);
  buf.writeInt16BE(factor, 32);
  buf.writeInt16BE(multiplier, 34);

  buf.writeUInt8(0, 36); // activity flags
  buf.writeUInt8(0, 37); // I/O flags
  buf.writeUInt8(0, 38); // data quality flags
  buf.writeUInt8(1, 39); // number of blockettes that follow
  buf.writeInt32BE(0, 40); // time correction
  buf.writeUInt16BE(DATA_OFFSET, 44); // beginning of data
  buf.writeUInt16BE(48, 46);          // first blockette offset

  // Blockette 1000 — Data Only SEED Blockette (8 bytes at offset 48)
  buf.writeUInt16BE(1000, 48); // blockette type
  buf.writeUInt16BE(0, 50);    // next blockette offset (none)
  buf.writeUInt8(3, 52);       // encoding: 3 = INT32
  buf.writeUInt8(1, 53);       // word order: 1 = big-endian
  buf.writeUInt8(12, 54);      // record length: 2^12 = 4096
  buf.writeUInt8(0, 55);       // reserved
}

export function encodeChannel(ch: MseedChannel, startSeq = 1): { buffer: Buffer; nextSeq: number } {
  const totalSamples = ch.samples.length;
  const numRecords = Math.max(1, Math.ceil(totalSamples / SAMPLES_PER_RECORD));
  const out = Buffer.alloc(numRecords * RECORD_LEN);

  let sampleIdx = 0;
  let seq = startSeq;
  const dtMs = 1000 / ch.sampleRate;
  const startMs = ch.startTime.getTime();

  for (let r = 0; r < numRecords; r++) {
    const recordOffset = r * RECORD_LEN;
    const recordBuf = out.subarray(recordOffset, recordOffset + RECORD_LEN);
    // Pad header area with spaces so unused fields are valid ASCII spaces
    recordBuf.fill(0x20, 0, DATA_OFFSET);

    const samplesThisRec = Math.min(SAMPLES_PER_RECORD, totalSamples - sampleIdx);
    const recStartMs = startMs + sampleIdx * dtMs;
    writeFixedHeader(recordBuf, seq, ch, samplesThisRec, recStartMs);

    for (let i = 0; i < samplesThisRec; i++) {
      recordBuf.writeInt32BE(ch.samples[sampleIdx + i] | 0, DATA_OFFSET + i * 4);
    }
    // Remaining bytes after data are already zero from Buffer.alloc — fine for INT32 (zero samples)
    sampleIdx += samplesThisRec;
    seq++;
  }

  return { buffer: out, nextSeq: seq };
}

export function encodeMiniSEED(channels: MseedChannel[]): Buffer {
  const parts: Buffer[] = [];
  let seq = 1;
  for (const ch of channels) {
    const { buffer, nextSeq } = encodeChannel(ch, seq);
    parts.push(buffer);
    seq = nextSeq;
  }
  return Buffer.concat(parts);
}
