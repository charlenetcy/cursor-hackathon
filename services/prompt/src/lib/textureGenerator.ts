/**
 * Simple texture generator for solid color textures
 * Creates PNG images without AI generation
 */

/**
 * Creates a solid color PNG texture
 * 
 * @param hexColor - Hex color code (e.g., "#ff0000")
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Buffer containing PNG image data
 */
export function createSolidColorTexture(
  hexColor: string,
  width: number = 64,
  height: number = 64
): Buffer {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Create a minimal PNG manually
  // For simplicity, we'll create a very basic PNG structure
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdr = createChunk('IHDR', Buffer.concat([
    Buffer.from([
      (width >> 24) & 0xff, (width >> 16) & 0xff, (width >> 8) & 0xff, width & 0xff,
      (height >> 24) & 0xff, (height >> 16) & 0xff, (height >> 8) & 0xff, height & 0xff,
      8, // bit depth
      2, // color type (RGB)
      0, // compression
      0, // filter
      0  // interlace
    ])
  ]));

  // Create pixel data (RGB format, no alpha)
  const scanlineSize = width * 3 + 1; // +1 for filter byte
  const rawData = Buffer.alloc(height * scanlineSize);
  
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * scanlineSize;
    rawData[scanlineOffset] = 0; // Filter type: None
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = scanlineOffset + 1 + x * 3;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
    }
  }

  // Compress the raw data using deflate (simplified - just store uncompressed)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData, { level: 0 });

  // IDAT chunk (image data)
  const idat = createChunk('IDAT', compressed);

  // IEND chunk (image end)
  const iend = createChunk('IEND', Buffer.alloc(0));

  // Combine all chunks
  return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Creates a PNG chunk with CRC
 */
function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = calculateCRC(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

/**
 * Calculates CRC32 checksum for PNG chunks
 */
function calculateCRC(data: Buffer): number {
  let crc = 0xffffffff;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc >>>= 1;
      }
    }
  }
  
  return (crc ^ 0xffffffff) >>> 0;
}

