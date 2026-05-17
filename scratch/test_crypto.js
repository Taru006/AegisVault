
const crypto = require('crypto');

// Mocking btoa and atob for Node.js
const btoa = (str) => Buffer.from(str, 'binary').toString('base64');
const atob = (base64) => Buffer.from(base64, 'base64').toString('binary');

async function test() {
    const rawKey = crypto.randomBytes(32);
    const exportedKey = rawKey.toString('base64');
    
    console.log("Raw Key (base64):", exportedKey);
    
    // wrapDEK equivalent
    const wrappedDEK = btoa(`DUMMY_KEK_WRAPPED_${exportedKey}`);
    console.log("Wrapped DEK:", wrappedDEK);
    
    // unwrapDEK equivalent
    const decoded = atob(wrappedDEK);
    console.log("Decoded wrapped DEK:", decoded);
    const unwrappedKey = decoded.replace('DUMMY_KEK_WRAPPED_', '');
    console.log("Unwrapped Key:", unwrappedKey);
    
    if (exportedKey === unwrappedKey) {
        console.log("SUCCESS: Keys match!");
    } else {
        console.log("FAILURE: Keys do not match!");
    }
}

test();
