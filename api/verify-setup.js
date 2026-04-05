const { db, admin } = require('./_firebase');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    // 1. Check Method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Frontend से आया सारा Data निकालो
    const { sessionId, otpEntered, phone, pinHash, isNewUser, isForgotPin, name, referCode } = req.body;
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    if (!sessionId || !otpEntered || !phone) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // ==========================================
        // 🟢 PART 1: 2Factor.in API से OTP Verify करो
        // ==========================================
        const url = `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otpEntered}`;
        const response = await fetch(url);
        const data = await response.json();

        // अगर OTP गलत निकला, तो यहीं से Error वापस भेज दो (DB में कुछ सेव नहीं होगा)
        if (data.Status !== 'Success' || data.Details !== 'OTP Matched') {
            return res.status(400).json({ error: 'Invalid or Expired OTP' });
        }

        // ==========================================
        // 🟢 PART 2: OTP सही है! अब Securely Database (Firestore) में Save करो
        // ==========================================
        
        // एक नया, 100% Secure Session Token बनाओ
        const token = crypto.randomUUID(); 

        if (isNewUser) {
            // Check: कहीं ये Phone Number पहले से तो नहीं है? (Hacker Protection)
            const checkSnap = await db.collection('users').where('phone', '==', phone).get();
            if (!checkSnap.empty) {
                return res.status(400).json({ error: 'Account already exists!' });
            }

            // Referral Code बनाओ (Name के 3 अक्षर + Phone के आखिरी 4 नंबर)
            const myOwnCode = (name.substring(0, 3) + phone.substring(6)).toUpperCase();

            // Firestore 'Batch' इस्तेमाल करो ताकि User creation और Referral bonus एक साथ हो
            const batch = db.batch();
            const newUserRef = db.collection('users').doc();
            
            // नया User Save करो
            batch.set(newUserRef, {
                phone: phone,
                name: name,
                pin: pinHash, // Frontend से आया Hashed PIN
                sessionToken: token,
                balance: 0,
                ownReferCode: myOwnCode,
                referCodeUsed: referCode || "None",
                status: "active",
                timestamp: new Date()
            });

            // Referral Bonus का लॉजिक (Agar kisi ne code use kiya hai)
            if (referCode && referCode !== "None") {
                const refSnap = await db.collection('users').where('ownReferCode', '==', referCode).get();
                if (!refSnap.empty) {
                    const referrerRef = db.collection('users').doc(refSnap.docs[0].id);
                    // Refer करने वाले को 5 Rs दो (Securely Database level par increment)
                    batch.update(referrerRef, { 
                        balance: admin.firestore.FieldValue.increment(5) 
                    });
                }
            }

            // सारा Data एक साथ Firestore में Commit (Save) कर दो
            await batch.commit();

        } else if (isForgotPin) {
            // Forgot PIN का लॉजिक: Existing user का PIN और Token Update करो
            const snap = await db.collection('users').where('phone', '==', phone).get();
            if (!snap.empty) {
                await db.collection('users').doc(snap.docs[0].id).update({ 
                    pin: pinHash, 
                    sessionToken: token 
                });
            } else {
                return res.status(404).json({ error: 'User not found' });
            }
        }

        // ==========================================
        // 🟢 PART 3: Frontend को Success Token भेजो
        // ==========================================
        return res.status(200).json({ 
            message: 'Setup Successful!',
            token: token 
        });

    } catch (error) {
        console.error("Verification & Setup Error:", error);
        return res.status(500).json({ error: 'Server Error. Please try again.' });
    }
};
