const { db } = require('./_firebase');

module.exports = async function handler(req, res) {
    // सिर्फ POST रिक्वेस्ट अलाउ करेंगे
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { phone, token, bankName, upi } = req.body;

    if (!phone || !token || !bankName || !upi) {
        return res.status(400).json({ error: 'Missing Required Fields' });
    }

    try {
        // 1. यूज़र को ढूँढो
        const userSnap = await db.collection('users').where('phone', '==', phone).get();
        if (userSnap.empty) return res.status(404).json({ error: 'User not found' });

        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();

        // 2. सिक्योरिटी चेक: टोकन मैच करो
        if (userData.sessionToken !== token) {
            return res.status(401).json({ error: 'Invalid Session. Please login again.' });
        }

        // 3. ANTI-THEFT LOCK: चेक करो कि क्या UPI पहले से सेव है?
        // अगर पहले से सेव है, तो दोबारा बदलने से मना कर दो।
        if (userData.upi && userData.upi.length > 0) {
            return res.status(400).json({ error: 'Payout details are already locked. Contact Admin to change.' });
        }

        // 4. डेटाबेस में KYC डिटेल्स सेव (Update) करो
        await db.collection('users').doc(userDoc.id).update({
            bankName: bankName,
            upi: upi
        });

        return res.status(200).json({ message: 'KYC Details Saved & Locked Successfully!' });

    } catch (e) {
        console.error("KYC Update API Error:", e);
        return res.status(500).json({ error: 'Server Error. Please try again.' });
    }
};
