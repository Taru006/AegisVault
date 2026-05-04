/**
 * AegisVault — Client-side AES-256-GCM encryption using the Web Crypto API.
 *
 * The encryption key NEVER leaves the browser. The server only stores
 * encrypted blobs, making this a zero-knowledge architecture.
 */

/**
 * Generate a new AES-256-GCM key.
 * @returns {Promise<CryptoKey>}
 */
export async function generateKey() {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Export a CryptoKey to a base64 string (for local storage / sharing).
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function exportKey(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/**
 * Import a base64 key string back to a CryptoKey.
 * @param {string} base64Key
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(base64Key) {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt an ArrayBuffer with AES-256-GCM.
 * @param {ArrayBuffer} data - Plaintext data
 * @param {CryptoKey} key
 * @returns {Promise<{ciphertext: ArrayBuffer, iv: string}>}
 */
export async function encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return {
    ciphertext,
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt an ArrayBuffer with AES-256-GCM.
 * @param {ArrayBuffer} ciphertext - Encrypted data
 * @param {CryptoKey} key
 * @param {string} ivBase64 - Base64-encoded IV
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptData(ciphertext, key, ivBase64) {
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

/**
 * Hash data with SHA-256 and return hex string.
 * @param {ArrayBuffer} data
 * @returns {Promise<string>}
 */
export async function hashData(data) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert ArrayBuffer to base64 string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Dummy KEK Wrapping Logic (Placeholder)
 * Wraps the DEK so it can be sent to the backend.
 * @param {CryptoKey} dek 
 * @returns {Promise<string>} Base64 encoded encrypted DEK
 */
export async function wrapDEK(dek) {
  // For now, simply export it and encode it. 
  // In a real scenario, this would encrypt `exportedKey` with a derived KEK.
  const exportedKey = await exportKey(dek);
  return btoa(`DUMMY_KEK_WRAPPED_${exportedKey}`);
}

/**
 * Dummy KEK Unwrapping Logic (Placeholder)
 * Unwraps the DEK received from the backend.
 * @param {string} encryptedDEK Base64 encoded encrypted DEK
 * @returns {Promise<CryptoKey>} Unwrapped DEK
 */
export async function unwrapDEK(encryptedDEK) {
  // For now, simply strip the dummy wrapper and import it.
  // In a real scenario, this would decrypt with a derived KEK.
  const decoded = atob(encryptedDEK);
  const exportedKey = decoded.replace('DUMMY_KEK_WRAPPED_', '');
  return await importKey(exportedKey);
}
