export type FrameExif = {
  make: string;
  model: string;
  datetimeOriginal: string | null;
  exposureBias: number | null;
  gpsAltitudeM: number | null;
};

function u16(view: DataView, off: number, le: boolean) {
  return view.getUint16(off, le);
}
function u32(view: DataView, off: number, le: boolean) {
  return view.getUint32(off, le);
}
function i32(view: DataView, off: number, le: boolean) {
  return view.getInt32(off, le);
}

function readIfd(
  view: DataView,
  tiffStart: number,
  offset: number,
  le: boolean,
): Map<number, number | string> {
  const out = new Map<number, number | string>();
  if (offset <= 0 || tiffStart + offset + 2 > view.byteLength) return out;
  const n = u16(view, tiffStart + offset, le);
  let p = tiffStart + offset + 2;
  for (let i = 0; i < n; i++) {
    if (p + 12 > view.byteLength) break;
    const tag = u16(view, p, le);
    const typ = u16(view, p + 2, le);
    const count = u32(view, p + 4, le);
    const unit = typ === 3 ? 2 : typ === 4 || typ === 9 ? 4 : typ === 5 || typ === 10 ? 8 : 1;
    const size = unit * count;
    const inline = p + 8;
    const dataOff = size > 4 ? tiffStart + u32(view, inline, le) : inline;
    if (typ === 2) {
      const bytes = new Uint8Array(view.buffer, view.byteOffset + dataOff, Math.min(size, 64));
      let s = "";
      for (const b of bytes) {
        if (b === 0) break;
        s += String.fromCharCode(b);
      }
      out.set(tag, s);
    } else if (typ === 3 && count === 1) {
      out.set(tag, u16(view, inline, le));
    } else if (typ === 4 && count === 1) {
      out.set(tag, size > 4 ? u32(view, dataOff, le) : u32(view, inline, le));
    } else if (typ === 5 && count >= 1 && dataOff + 8 <= view.byteLength) {
      const num = u32(view, dataOff, le);
      const den = u32(view, dataOff + 4, le);
      if (den) out.set(tag, num / den);
    } else if (typ === 10 && count >= 1 && dataOff + 8 <= view.byteLength) {
      const num = i32(view, dataOff, le);
      const den = i32(view, dataOff + 4, le);
      if (den) out.set(tag, num / den);
    } else if (typ === 1 && count === 1) {
      out.set(tag, view.getUint8(inline));
    }
    p += 12;
  }
  return out;
}

export function parseJpegExif(buf: ArrayBuffer): FrameExif {
  const bytes = new Uint8Array(buf);
  const info: FrameExif = {
    make: "",
    model: "",
    datetimeOriginal: null,
    exposureBias: null,
    gpsAltitudeM: null,
  };
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return info;
  let pos = 2;
  let app1: Uint8Array | null = null;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) break;
    const marker = bytes[pos + 1]!;
    if (marker === 0xda || marker === 0xd9) break;
    const seglen = (bytes[pos + 2]! << 8) | bytes[pos + 3]!;
    const start = pos + 4;
    const end = pos + 2 + seglen;
    if (marker === 0xe1 && bytes[start] === 0x45 && bytes[start + 1] === 0x78) {
      app1 = bytes.subarray(start + 6, end);
    }
    pos = end;
  }
  if (!app1 || app1.length < 8) return info;
  const view = new DataView(app1.buffer, app1.byteOffset, app1.byteLength);
  const endian = app1[0] === 0x49 ? true : app1[0] === 0x4d ? false : null;
  if (endian == null) return info;
  const ifd0off = u32(view, 4, endian);
  const ifd0 = readIfd(view, 0, ifd0off, endian);
  info.make = String(ifd0.get(0x010f) ?? "").trim();
  info.model = String(ifd0.get(0x0110) ?? "").trim();
  const exifPtr = ifd0.get(0x8769);
  if (typeof exifPtr === "number") {
    const exif = readIfd(view, 0, exifPtr, endian);
    const dt = exif.get(0x9003);
    if (typeof dt === "string") info.datetimeOriginal = dt;
    const bias = exif.get(0x9204);
    if (typeof bias === "number") info.exposureBias = bias;
  }
  const gpsPtr = ifd0.get(0x8825);
  if (typeof gpsPtr === "number") {
    const gps = readIfd(view, 0, gpsPtr, endian);
    const alt = gps.get(6);
    if (typeof alt === "number") {
      const ref = gps.get(5);
      info.gpsAltitudeM = ref === 1 ? -alt : alt;
    }
  }
  return info;
}

export async function readFileExif(file: Blob): Promise<FrameExif> {
  const buf = await file.arrayBuffer();
  return parseJpegExif(buf);
}
