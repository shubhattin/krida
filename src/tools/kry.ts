import { Buffer } from 'buffer';

export const search_with_key = <T, K extends keyof T>(key: K, value: T[K], data_list: T[]) => {
  // this function can also be used in frontend despite of this file using node modules (using treeshaking)
  for (let i = 0; i < data_list.length; i++) if (data_list[i][key] === value) return i;
  return -1;
};

export const get_val_with_key = <T, K extends keyof T>(key: K, value: T[K], data_list: T[]) => {
  const index = search_with_key(key, value, data_list);
  if (index !== -1) return data_list[index];
};

export const str_to_array_buffer = (str: string) => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};
export const array_buffer_to_str = (buff: ArrayBuffer) => {
  return Array.from(new Uint8Array(buff))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
export const str_to_bin_str = (value: string) => {
  const codeUnits = new Uint16Array(value.length);
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = value.charCodeAt(i);
  }
  return String.fromCharCode(...new Uint8Array(codeUnits.buffer));
};
export const bin_str_to_str = (binary: string) => {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return String.fromCharCode(...new Uint16Array(bytes.buffer));
};
/** `encode=false` by default */
export const to_base64 = (str: string, encode = false) => {
  if (encode) str = str_to_bin_str(str);
  str = Buffer.from(str, 'utf-8').toString('base64');
  return str;
};
/** `decode=false` by default */
export const from_base64 = (str: string, decode = false) => {
  str = Buffer.from(str, 'base64').toString('utf-8');
  try {
    if (decode) str = bin_str_to_str(str);
  } catch {}
  return str;
};

export const copy_text_to_clipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

export function dataURLToBlob(dataURL: string) {
  const byteString = atob(dataURL.split(',')[1]);
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  const buffer = new ArrayBuffer(byteString.length);
  const intArray = new Uint8Array(buffer);

  for (let i = 0; i < byteString.length; i++) {
    intArray[i] = byteString.charCodeAt(i);
  }

  return new Blob([buffer], { type: mimeString });
}

export function copy_plain_object<T>(obj: T) {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function get_permutations(range: [number, number], count: number = 1): number[][] {
  const [start, end] = range;
  const numbers: number[] = Array.from({ length: end - start + 1 }, (_, i) => i + start);
  function shuffle(array: number[]): number[] {
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  const permutations: number[][] = [];
  for (let i = 0; i < count; i++) {
    permutations.push(shuffle(numbers));
  }
  return permutations;
}

/**
 * This replaces `{key}` with the corresponding value in `options`
 */
export function format_string_text(text: string, options: Record<string, any>) {
  return text.replace(/{(\w+)}/g, (match, key) => options[key] ?? `{${key}}`);
}

export function cleanUpWhitespace(input: string, replace_multiple_white_spaces = true): string {
  input = input.trim();
  if (replace_multiple_white_spaces) input = input.replace(/\s+/g, ' ');
  return input;
}

export function get_randon_number(start: number, end: number) {
  return Math.floor(Math.random() * (end - start + 1) + start);
}

export function mask_email(
  email: string,
  options: {
    startChars?: number;
    endChars?: number;
  } = { startChars: 3, endChars: 2 }
): string {
  if (!email || !email.includes('@')) return email;

  const mask_part = (text: string, startChars: number, endChars: number) => {
    if (text.length <= startChars + endChars) return text;
    const start = text.slice(0, startChars);
    const end = text.slice(-endChars);
    const maskLength = text.length - startChars - endChars;
    return `${start}${'*'.repeat(maskLength)}${end}`;
  };

  const { startChars = 1, endChars = 1 } = options;
  const [localPart, domain] = email.split('@');
  const maskedLocalPart = mask_part(localPart, startChars, endChars);
  const [domainName, tld] = domain.split('.');
  const maskedDomain = mask_part(domainName, 1, 2);

  return `${maskedLocalPart}@${maskedDomain}.${tld}`;
}

/**
 * Deeply clones a value of type T.
 * - Primitives are returned as-is.
 * - Arrays and plain objects are recursively cloned.
 * - Date, Map, Set are specially handled.
 * - Other objects (e.g. functions, class instances) are returned by reference.
 */
export function deepCopy<T>(value: T): T {
  // Primitives (and functions) are returned directly
  if (value === null || typeof value !== 'object') {
    return value;
  }
  // Date
  if (value instanceof Date) {
    return new Date(value.getTime()) as any;
  }
  // Array
  if (Array.isArray(value)) {
    const arrCopy = [] as unknown[];
    for (const item of value) {
      arrCopy.push(deepCopy(item));
    }
    return arrCopy as any;
  }
  // Map
  if (value instanceof Map) {
    const mapCopy = new Map();
    for (const [k, v] of value.entries()) {
      mapCopy.set(deepCopy(k), deepCopy(v));
    }
    return mapCopy as any;
  }
  // Set
  if (value instanceof Set) {
    const setCopy = new Set();
    for (const v of value.values()) {
      setCopy.add(deepCopy(v));
    }
    return setCopy as any;
  }
  // Plain Object
  if (Object.getPrototypeOf(value) === Object.prototype) {
    const objCopy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      objCopy[k] = deepCopy(v);
    }
    return objCopy as T;
  }
  // Fallback: other object types (class instances, functions, etc.)
  return value;
}

export const get_rand_num = (a: number, b: number) => {
  return Math.trunc(Math.random() * (b - a + 1)) + a;
};
