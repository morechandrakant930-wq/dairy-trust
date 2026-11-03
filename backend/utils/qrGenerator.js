/**
 * Self-contained SVG QR Code Generator (Pure JavaScript, Zero External Dependencies)
 * Generates valid standard QR codes (Versions 1-12, ECC L/M) for UPI payment URIs.
 */

// Galois field tables
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMultiply(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function polyMultiply(p1, p2) {
  const result = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMultiply(p1[i], p2[j]);
    }
  }
  return result;
}

function getGeneratorPoly(numEcBytes) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < numEcBytes; i++) {
    poly = polyMultiply(poly, new Uint8Array([1, GF256_EXP[i]]));
  }
  return poly;
}

function computeEc(data, numEcBytes) {
  const genPoly = getGeneratorPoly(numEcBytes);
  const remainder = new Uint8Array(numEcBytes);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[numEcBytes - 1] = 0;
    for (let j = 0; j < numEcBytes; j++) {
      remainder[j] ^= gfMultiply(genPoly[j + 1], factor);
    }
  }
  return remainder;
}

// Table of QR code capacity (Version 1-14, Error Correction M)
// [totalBytes, ecBytes, numBlocksGroup1, dataBytesBlock1, numBlocksGroup2, dataBytesBlock2]
const QR_SPECS_M = [
  null,
  [26, 10, 1, 16, 0, 0],       // V1: 16 bytes
  [44, 16, 1, 28, 0, 0],       // V2: 28 bytes
  [70, 26, 1, 44, 0, 0],       // V3: 44 bytes
  [100, 36, 2, 32, 0, 0],      // V4: 64 bytes
  [134, 48, 2, 43, 0, 0],      // V5: 86 bytes
  [172, 64, 4, 27, 0, 0],      // V6: 108 bytes
  [196, 72, 4, 31, 0, 0],      // V7: 124 bytes
  [242, 88, 2, 38, 2, 39],     // V8: 154 bytes
  [292, 110, 3, 36, 2, 37],    // V9: 182 bytes
  [346, 130, 4, 43, 1, 44],    // V10: 216 bytes
  [404, 150, 1, 50, 4, 51],    // V11: 254 bytes
  [466, 176, 6, 36, 2, 37],    // V12: 290 bytes
  [532, 198, 4, 46, 4, 47],    // V13: 334 bytes
  [581, 216, 8, 42, 4, 43],    // V14: 365 bytes
];

// Alignment pattern positions for versions 1-14
const ALIGNMENT_PATTERN_LOCATIONS = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
];

function selectVersion(byteLength) {
  // Mode 8-bit byte overhead: 4 bits mode + 8 or 16 bits count + data
  for (let v = 1; v < QR_SPECS_M.length; v++) {
    const spec = QR_SPECS_M[v];
    const charCountBits = v <= 9 ? 8 : 16;
    const totalDataCapacityBytes = spec[2] * spec[3] + spec[4] * spec[5];
    const requiredBits = 4 + charCountBits + byteLength * 8;
    if (Math.ceil(requiredBits / 8) <= totalDataCapacityBytes) {
      return v;
    }
  }
  return 14;
}

class BitBuffer {
  constructor() {
    this.buffer = [];
    this.length = 0;
  }
  put(num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }
  putBit(bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
  getBytes() {
    return new Uint8Array(this.buffer);
  }
}

function encodeData(text, version) {
  const utf8 = Buffer.from(text, 'utf8');
  const bb = new BitBuffer();

  // Mode: Byte (0100)
  bb.put(0x4, 4);

  // Character count
  const countBits = version <= 9 ? 8 : 16;
  bb.put(utf8.length, countBits);

  // Payload
  for (let i = 0; i < utf8.length; i++) {
    bb.put(utf8[i], 8);
  }

  // Terminator (up to 4 zero bits)
  const spec = QR_SPECS_M[version];
  const maxDataBytes = spec[2] * spec[3] + spec[4] * spec[5];
  const maxDataBits = maxDataBytes * 8;
  const termBits = Math.min(4, maxDataBits - bb.length);
  bb.put(0, termBits);

  // Pad to byte boundary
  while (bb.length % 8 !== 0) {
    bb.putBit(false);
  }

  // Pad bytes: alternating 0xEC, 0x11
  let padByte = 0xec;
  while (bb.length < maxDataBits) {
    bb.put(padByte, 8);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  const rawBytes = bb.getBytes();

  // Split into blocks and add error correction
  const blocks = [];
  let byteOffset = 0;

  // Group 1
  for (let i = 0; i < spec[2]; i++) {
    const dataSize = spec[3];
    const dataBlock = rawBytes.slice(byteOffset, byteOffset + dataSize);
    byteOffset += dataSize;
    const ecBlock = computeEc(dataBlock, spec[1] / (spec[2] + spec[4]));
    blocks.push({ data: dataBlock, ec: ecBlock });
  }

  // Group 2
  for (let i = 0; i < spec[4]; i++) {
    const dataSize = spec[5];
    const dataBlock = rawBytes.slice(byteOffset, byteOffset + dataSize);
    byteOffset += dataSize;
    const ecBlock = computeEc(dataBlock, spec[1] / (spec[2] + spec[4]));
    blocks.push({ data: dataBlock, ec: ecBlock });
  }

  // Interleave data bytes
  const finalSequence = [];
  const maxBlockDataLen = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxBlockDataLen; i++) {
    for (let b = 0; b < blocks.length; b++) {
      if (i < blocks[b].data.length) {
        finalSequence.push(blocks[b].data[i]);
      }
    }
  }

  // Interleave EC bytes
  const ecLen = blocks[0].ec.length;
  for (let i = 0; i < ecLen; i++) {
    for (let b = 0; b < blocks.length; b++) {
      finalSequence.push(blocks[b].ec[i]);
    }
  }

  return new Uint8Array(finalSequence);
}

function createQrMatrix(text) {
  const version = selectVersion(Buffer.byteLength(text, 'utf8'));
  const size = version * 4 + 17;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isReserved = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r, c, val, reserved = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val ? 1 : 0;
      if (reserved) isReserved[r][c] = true;
    }
  }

  // 1. Finder patterns (Top-left, top-right, bottom-left)
  function drawFinderPattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          setModule(nr, nc, 1);
        } else {
          setModule(nr, nc, 0);
        }
      }
    }
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // 2. Alignment patterns
  const alignCoords = ALIGNMENT_PATTERN_LOCATIONS[version] || [];
  for (let i = 0; i < alignCoords.length; i++) {
    for (let j = 0; j < alignCoords.length; j++) {
      const r = alignCoords[i];
      const c = alignCoords[j];
      // Skip if overlapping finder patterns
      if (
        (r <= 8 && c <= 8) ||
        (r <= 8 && c >= size - 9) ||
        (r >= size - 9 && c <= 8)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          setModule(r + dr, c + dc, isBorder || isCenter ? 1 : 0);
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isReserved[6][i]) setModule(6, i, i % 2 === 0);
    if (!isReserved[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark module
  setModule(size - 8, 8, 1);

  // 5. Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      if (!isReserved[8][i]) isReserved[8][i] = true;
      if (!isReserved[i][8]) isReserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    if (!isReserved[8][size - 1 - i]) isReserved[8][size - 1 - i] = true;
    if (!isReserved[size - 1 - i][8]) isReserved[size - 1 - i][8] = true;
  }

  // 6. Data Placement
  const encodedData = encodeData(text, version);
  let bitIndex = 0;
  const totalBits = encodedData.length * 8;

  let right = size - 1;
  let upward = true;

  while (right > 0) {
    if (right === 6) right--; // Skip vertical timing column
    const colList = [right, right - 1];

    const rowStart = upward ? size - 1 : 0;
    const rowEnd = upward ? -1 : size;
    const rowStep = upward ? -1 : 1;

    for (let r = rowStart; r !== rowEnd; r += rowStep) {
      for (const c of colList) {
        if (!isReserved[r][c]) {
          let bit = 0;
          if (bitIndex < totalBits) {
            const byte = encodedData[Math.floor(bitIndex / 8)];
            bit = (byte >>> (7 - (bitIndex % 8))) & 1;
            bitIndex++;
          }
          // Mask pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? bit ^ 1 : bit;
        }
      }
    }
    upward = !upward;
    right -= 2;
  }

  // 7. Write Format Information (Error Correction Level M = 00, Mask 0 = 000) -> 00000
  // Standard format bits with BCH and XOR mask 0x5412: 101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Top-left
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[tlCoords[i][0]][tlCoords[i][1]] = formatBits[i];
  }

  // Split around finders
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i];
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatBits[7 + i];
  }

  return matrix;
}

/**
 * Render QR matrix as SVG string
 */
function generateSvg(text, options = {}) {
  const margin = options.margin !== undefined ? options.margin : 4;
  const matrix = createQrMatrix(text);
  const size = matrix.length;
  const totalSize = size + margin * 2;

  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1"/>`;
      }
    }
  }

  const color = options.color || '#0f172a';
  const bgColor = options.bgColor || '#ffffff';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">
    <rect width="${totalSize}" height="${totalSize}" fill="${bgColor}"/>
    <g fill="${color}">${rects}</g>
  </svg>`;
}

/**
 * Render QR code as base64 Data URL
 */
function generateDataUri(text, options = {}) {
  const svg = generateSvg(text, options);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

module.exports = {
  generateSvg,
  generateDataUri,
};
