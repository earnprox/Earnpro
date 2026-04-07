const { db, admin } = require('./_firebase'); // 🔥 FIX 1: 'Const' को 'const' कर दिया है
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 🔥 FIX 2: Frontend अब 'pin' भेज रहा है, 'pinHash' नहीं
    const { sessionId, otpEntered, phone, pin, isNewUser, isForgotPin, name, referCode } = req.body;
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    if (!sessionId || !otpEntered || !phone || !pin) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Verify OTP with 2Factor.in
        const url = `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otpEntered}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.Status !== 'Success' || data.Details !== 'OTP Matched') {
            return res.status(400).json({ error: 'Invalid or Expired OTP' });
        }

        // 🔥 FIX 3: BACKEND HASHING (सिक्योरिटी)
        // जो PIN फ्रंटएंड से आया है, उसे हैश करके सिक्योर कर रहे हैं
        const pinString = String(pin);
        const SECRET_SALT = process.env.PIN_SECRET_KEY || "EarnproX_Super_Secret_Salt_2026"; 
        const secureHashedPin = crypto.createHash('sha256').update(pinString + SECRET_SALT).digest('hex');

        // 2. Process Firebase Logic
        const token = crypto.randomUUID(); 

        if (isNewUser) {
            const checkSnap = await db.collection('users').where('phone', '==', phone).get();
            if (!checkSnap.empty) {
                return res.status(400).json({ error: 'Account already exists!' });
            }

            const myOwnCode = (name.substring(0, 3) + phone.substring(6)).toUpperCase();
            const batch = db.batch();
            const newUserRef = db.collection('users').doc();
            
            batch.set(newUserRef, {
                phone: phone,
                name: name,
                pin: secureHashedPin, // 🔥 हैश किया हुआ PIN डेटाबेस में सेव होगा
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
                    batch.update(referrerRef, { 
                        balance: admin.firestore.FieldValue.increment(5) 
                    });
                }
            }
            await batch.commit();

        } else if (isForgotPin) {
            const snap = await db.collection('users').where('phone', '==', phone).get();
            if (!snap.empty) {
                await db.collection('users').doc(snap.docs[0].id).update({ 
                    pin: secureHashedPin, // 🔥 नया हैश किया हुआ PIN डेटाबेस में अपडेट होगा
                    sessionToken: token 
                });
            } else {
                return res.status(404).json({ error: 'User not found' });
            }
        }

        return res.status(200).json({ 
            message: 'Setup Successful!',
            token: token 
        });

    } catch (error) {
        console.error("Verification Error:", error);
        return res.status(500).json({ error: 'Server Error' });
    }
};
