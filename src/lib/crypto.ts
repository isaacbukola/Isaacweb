/**
 * encryption/decryption utilities using Web Crypto API
 */

const ITERATIONS = 100000;
const KEY_LENGTH = 256;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptMessage(message: string, password: string) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API not available. Protocol requires a secure (HTTPS) environment.");
  }
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt']
  );

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(message)
  );

  return {
    encryptedData: uint8ArrayToBase64(new Uint8Array(encryptedContent)),
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt),
  };
}

export async function decryptMessage(
  encryptedDataB64: string,
  ivB64: string,
  saltB64: string,
  password: string
) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API not available. Protocol requires a secure (HTTPS) environment.");
  }
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const encryptedData = base64ToUint8Array(encryptedDataB64);
  const iv = base64ToUint8Array(ivB64);
  const salt = base64ToUint8Array(saltB64);

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['decrypt']
  );

  try {
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedData
    );
    return dec.decode(decryptedContent);
  } catch (e) {
    throw new Error('Invalid password or corrupted data');
  }
}
