/**
 * Generate PBKDF2 password hashes matching worker/src/auth.ts
 * Usage: node scripts/hash-password.mjs "YourPassword" [optional-fixed-salt-base64]
 */
const encoder = new TextEncoder();

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

async function hashPassword(password, fixedSaltBase64) {
  const salt = fixedSaltBase64
    ? Uint8Array.from(Buffer.from(fixedSaltBase64, 'base64'))
    : crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  );

  return `${bytesToBase64(salt)}.${bytesToBase64(new Uint8Array(bits))}`;
}

const password = process.argv[2];
const fixedSalt = process.argv[3];

if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password> [fixed-salt-base64]');
  process.exit(1);
}

hashPassword(password, fixedSalt).then((hash) => {
  console.log(hash);
});
