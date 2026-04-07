const { db, admin } = require('./_firebase');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { sessionId, otpEntered, phone, pin, isNewUser, isForgotPin, name, referCode } = req.body;
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    if (!sessionId || !otpEntered || !phone || !pin) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const url = `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otpEntered}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.Status !== 'Success' || data.Details !== 'OTP Matched') {
            return res.status(400).json({ error: 'Invalid or Expired OTP' });
        }

        // Hashing setup PIN
        const SECRET_SALT = process.env.PIN_SECRET_KEY || "EarnproX_Super_Secret_Salt_2026";
        const secureHashedPin = crypto.createHash('sha256').update(String(pin) + SECRET_SALT).digest('hex');
        const token = crypto.randomUUID();

        if (isNewUser) {
            const checkSnap = await db.collection('users').where('phone', '==', phone).get();
            if (!checkSnap.empty) return res.status(400).json({ error: 'Account already exists!' });

            const safeName = name || "User";
            const myOwnCode = (safeName.substring(0, 3) + phone.substring(6)).toUpperCase();

            const batch = db.batch();
            const newUserRef = db.collection('users').doc();

            batch.set(newUserRef, {
                phone: phone,
                name: safeName,
                pin: secureHashedPin,
                sessionToken: token,
                balance: 0,
                ownReferCode: myOwnCode,
                referCodeUsed: referCode || "None",
                status: "active",
                timestamp: new Date()
            });

            if (referCode && referCode !== "None") {
                const refSnap = await db.collection('users').where('ownReferCode', '==', referCode).get();
                if (!refSnap.empty) {
                    const referrerRef = db.collection('users').doc(refSnap.docs[0].id);
                    batch.update(referrerRef, { balance: admin.firestore.FieldValue.increment(5) });
                }
            }
            await batch.commit();

        } else if (isForgotPin) {
            const snap = await db.collection('users').where('phone', '==', phone).get();
            if (!snap.empty) {
                await db.collection('users').doc(snap.docs[0].id).update({
                    pin: secureHashedPin,
                    sessionToken: token
                });
            } else {
                return res.status(404).json({ error: 'User not found' });
            }
        }

        return res.status(200).json({ message: 'Setup Successful!', token: token });

    } catch (error) {
        return res.status(500).json({ error: 'Server Error' });
    }
};
