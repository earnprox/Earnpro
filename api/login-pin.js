const { db } = require('./_firebase');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { phone, pin } = req.body;

    if (!phone || !pin) return res.status(400).json({ error: 'Phone and PIN are required' });

    try {
        const snapshot = await db.collection('users').where('phone', '==', phone).get();
        if (snapshot.empty) return res.status(404).json({ error: 'User not found' });

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Backend Hashing
        const SECRET_SALT = process.env.PIN_SECRET_KEY || "EarnproX_Super_Secret_Salt_2026";
        const hashedInputPin = crypto.createHash('sha256').update(String(pin) + SECRET_SALT).digest('hex');

        // Check if DB matches Hashed PIN (or fallback for older plain text pins)
        let isValid = false;
        let needsUpgrade = false;

        if (userData.pin === hashedInputPin) {
            isValid = true;
        } else if (String(userData.pin) === String(pin)) {
            isValid = true;
            needsUpgrade = true; // DB me ab hash karke save kar denge
        }

        if (isValid) {
            const token = crypto.randomUUID();
            const updatePayload = { sessionToken: token, lastLogin: new Date() };
            if (needsUpgrade) updatePayload.pin = hashedInputPin;

            await db.collection('users').doc(userDoc.id).update(updatePayload);
            return res.status(200).json({ token });
        } else {
            return res.status(401).json({ error: 'Incorrect PIN' });
        }
    } catch (e) {
        return res.status(500).json({ error: 'Login Server Error' });
    }
}
