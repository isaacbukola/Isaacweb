/**
 * encryption/decryption utilities using Web Crypto API
 */

const ITERATIONS = 100000;
const KEY_LENGTH = 256;

export async function encryptMessage(message: string, password: string) {
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
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

export async function decryptMessage(
  encryptedDataB64: string,
  ivB64: string,
  saltB64: string,
  password: string
) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const encryptedData = new Uint8Array(
    atob(encryptedDataB64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
  const iv = new Uint8Array(
    atob(ivB64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
  const salt = new Uint8Array(
    atob(saltB64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

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
