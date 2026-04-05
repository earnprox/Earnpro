const { db } = require('./_firebase');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { phone, pin } = req.body; // अब हम सीधा 4-digit PIN ले रहे हैं

    try {
        const snapshot = await db.collection('users').where('phone', '==', phone).get();
        if (snapshot.empty) return res.status(404).json({ error: 'User not found' });
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // 🔥 Backend Hashing: Frontend से आए PIN को यहाँ हैश कर रहे हैं
        const hashedInputPin = crypto.createHash('sha256').update(pin).digest('hex');

        if (userData.pin === hashedInputPin) {
            // एक नया मज़बूत टोकन जनरेट करें
            const token = crypto.randomBytes(32).toString('hex');
            await db.collection('users').doc(userDoc.id).update({ 
                sessionToken: token,
                lastLogin: new Date() 
            });
            return res.status(200).json({ token });
        } else {
            return res.status(401).json({ error: 'Incorrect PIN' });
        }
    } catch (e) {
        return res.status(500).json({ error: 'Login Server Error' });
    }
};
