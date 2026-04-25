/**
 * SECURE CRYPTOGRAPHIC PROTOCOLS
 * END-TO-END ENCRYPTION VIA AES-GCM 256
 */

const DEFAULT_ITERATIONS = 100000;
const KEY_LEN = 256;
const ALGO = 'AES-GCM';

/**
 * Derives a cryptographic key from a password and salt.
 */
async function deriveKey(password: string, salt: Uint8Array, iterations: number = DEFAULT_ITERATIONS) {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a message string using a password.
 * Returns { encryptedData: base64, iv: base64, salt: base64, iterations }
 */
export async function encryptMessage(message: string, password: string, iterations: number = DEFAULT_ITERATIONS) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("SECURE_CONTEXT_REQUIRED: Web Crypto API is unavailable.");
  }

  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(password, salt, iterations);
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(message)
  );

  return {
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...salt)),
    salt: btoa(String.fromCharCode(...salt)),
    ivBase64: btoa(String.fromCharCode(...iv)),
    iterations
  };
}

/**
 * Decrypts a base64 message using a password, salt, and iv.
 */
export async function decryptMessage(
  encryptedDataB64: string,
  ivB64: string,
  saltB64: string,
  password: string,
  iterations: number = DEFAULT_ITERATIONS
) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("SECURE_CONTEXT_REQUIRED: Web Crypto API is unavailable.");
  }

  const salt = new Uint8Array(atob(saltB64).split('').map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivB64).split('').map(c => c.charCodeAt(0)));
  const data = new Uint8Array(atob(encryptedDataB64).split('').map(c => c.charCodeAt(0)));

  const key = await deriveKey(password, salt, iterations);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    throw new Error("DECRYPTION_FAILED: Invalid key or corrupted data shard.");
  }
}
