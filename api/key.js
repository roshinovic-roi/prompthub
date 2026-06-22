import crypto from 'crypto';

function getSecretKey() {
  const secret = (process.env.KEY_ENCRYPTION_SECRET || '').trim();
  if (!secret || secret.length < 32) {
    throw new Error('KEY_ENCRYPTION_SECRET not configured');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext) {
  const key = getSecretKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

function decrypt(packed) {
  const key = getSecretKey();
  const buf = Buffer.from(packed, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, value } = req.body || {};
  if (!action || typeof value !== 'string' || !value) {
    return res.status(400).json({ error: 'Missing action or value' });
  }

  try {
    if (action === 'encrypt') {
      return res.status(200).json({ result: encrypt(value) });
    } else if (action === 'decrypt') {
      return res.status(200).json({ result: decrypt(value) });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
