/**
 * Builds the launcher assets from `assets/images/logo.png`.
 *
 * Android's adaptive icon crops the foreground to a circle or a squircle
 * depending on the launcher, so the mark has to sit inside the middle two
 * thirds. The logo fills its square, so a padded copy is written for that slot,
 * on the logo's own background colour.
 *
 * PNG is read and written here rather than with an image library: the whole job
 * is nearest-neighbour scaling onto a flat background, and zlib comes with Node.
 *
 * Run with `npm run build:icons`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const IMAGES = new URL('../assets/images/', import.meta.url);
const SOURCE = new URL('logo.png', IMAGES);

/** Side of the images written, in pixels. */
const SIZE = 1024;

/** Share of the foreground the mark is allowed to fill, per Android's guidance. */
const SAFE_ZONE = 0.66;

/** Reads a PNG into `{ width, height, pixels }`, with pixels as RGBA bytes. */
function decodePng(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('El archivo no es un PNG.');

  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const idat = [];

  for (let offset = 8; offset < buffer.length; ) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) throw new Error(`Solo se leen PNG de 8 bits, este es de ${bitDepth}.`);
      if (data[12] !== 0) throw new Error('El PNG entrelazado no se lee.');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Tipo de color ${colorType} no soportado.`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * 4);
  const line = Buffer.alloc(stride);
  const previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    raw.copy(line, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));

    unfilter(filter, line, previous, channels);

    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 4;

      if (channels >= 3) {
        pixels[to] = line[from];
        pixels[to + 1] = line[from + 1];
        pixels[to + 2] = line[from + 2];
        pixels[to + 3] = channels === 4 ? line[from + 3] : 255;
      } else {
        pixels.fill(line[from], to, to + 3);
        pixels[to + 3] = channels === 2 ? line[from + 1] : 255;
      }
    }

    line.copy(previous);
  }

  return { width, height, pixels };
}

/** Undoes one scanline's filter in place, as the PNG specification defines it. */
function unfilter(filter, line, previous, channels) {
  for (let index = 0; index < line.length; index += 1) {
    const left = index >= channels ? line[index - channels] : 0;
    const up = previous[index];
    const upLeft = index >= channels ? previous[index - channels] : 0;

    switch (filter) {
      case 0:
        break;
      case 1:
        line[index] = (line[index] + left) & 0xff;
        break;
      case 2:
        line[index] = (line[index] + up) & 0xff;
        break;
      case 3:
        line[index] = (line[index] + ((left + up) >> 1)) & 0xff;
        break;
      case 4: {
        const estimate = left + up - upLeft;
        const dLeft = Math.abs(estimate - left);
        const dUp = Math.abs(estimate - up);
        const dUpLeft = Math.abs(estimate - upLeft);
        const nearest = dLeft <= dUp && dLeft <= dUpLeft ? left : dUp <= dUpLeft ? up : upLeft;
        line[index] = (line[index] + nearest) & 0xff;
        break;
      }
      default:
        throw new Error(`Filtro ${filter} desconocido.`);
    }
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, checksum]);
}

/** Writes RGBA pixels as a PNG, one filter-zero scanline per row. */
function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Nearest neighbour: the logo is flat colour, so there is nothing to smooth. */
function scale(image, size) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor((y * image.height) / size));

    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x * image.width) / size));
      image.pixels.copy(
        pixels,
        (y * size + x) * 4,
        (sourceY * image.width + sourceX) * 4,
        (sourceY * image.width + sourceX) * 4 + 4
      );
    }
  }

  return { width: size, height: size, pixels };
}

function solid(size, [red, green, blue]) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
    pixels[index + 3] = 255;
  }

  return { width: size, height: size, pixels };
}

/**
 * Draws the dark part of the mark and nothing else.
 *
 * Copying the logo wholesale would paste its background too, and the flat colour
 * underneath never matches it exactly: the source has a faint gradient, and the
 * seam showed as a square. Only pixels darker than half are drawn, which is the
 * mark.
 */
function drawMark(canvas, image, [red, green, blue] = [0, 0, 0]) {
  const left = Math.round((canvas.width - image.width) / 2);
  const top = Math.round((canvas.height - image.height) / 2);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const from = (y * image.width + x) * 4;
      const luma =
        0.299 * image.pixels[from] + 0.587 * image.pixels[from + 1] + 0.114 * image.pixels[from + 2];

      if (luma >= 128) continue;

      const to = ((top + y) * canvas.width + left + x) * 4;
      canvas.pixels[to] = red;
      canvas.pixels[to + 1] = green;
      canvas.pixels[to + 2] = blue;
      canvas.pixels[to + 3] = 255;
    }
  }
}

function transparent(size) {
  return { width: size, height: size, pixels: Buffer.alloc(size * size * 4) };
}

function write(name, image) {
  writeFileSync(new URL(name, IMAGES), encodePng(image.width, image.height, image.pixels));
  return name;
}

const logo = decodePng(readFileSync(SOURCE));
// The corner is the logo's own background, and every icon is built on it.
const brand = [logo.pixels[0], logo.pixels[1], logo.pixels[2]];
const hex = `#${brand.map((value) => value.toString(16).padStart(2, '0')).join('')}`;

const full = scale(logo, Math.round(SIZE * 0.82));
const safe = scale(logo, Math.round(SIZE * SAFE_ZONE));

/** The launcher icon: the mark on the brand colour, with a little air. */
const icon = solid(SIZE, brand);
drawMark(icon, full);

/** The adaptive icon: same mark, inside the area Android never crops. */
const foreground = solid(SIZE, brand);
drawMark(foreground, safe);

/** Themed icons: the shape alone, for the launcher to tint as it pleases. */
const monochrome = transparent(SIZE);
drawMark(monochrome, safe);

/** The splash screen paints the brand colour behind this. */
const splash = transparent(SIZE);
drawMark(splash, full);

const written = [
  write('icon.png', icon),
  write('favicon.png', scale(icon, 196)),
  write('android-icon-foreground.png', foreground),
  write('android-icon-background.png', solid(SIZE, brand)),
  write('android-icon-monochrome.png', monochrome),
  write('splash-icon.png', splash),
];

console.log(`Logo ${logo.width}x${logo.height}, color de marca ${hex}`);
console.log(`Escritos: ${written.join(', ')}`);
