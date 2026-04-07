const { db } = require('./_firebase'); // 'C' छोटा कर दिया गया है
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { phone, pin } = req.body; 

    // 🔥 FIX 1: Input Validation (अगर फोन या पिन खाली है तो एरर दो)
    if (!phone || !pin) {
        return res.status(400).json({ error: 'Phone and PIN are required' });
    }

    try {
        const snapshot = await db.collection('users').where('phone', '==', phone).get();
        if (snapshot.empty) return res.status(404).json({ error: 'User not found' });
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // 🔥 FIX 2: Salted Hashing (4-digit PIN को हैक होने से बचाने के लिए Secret Salt जोड़ा गया है)
        // नोट: आप इस secret को Vercel के Environment Variables में भी रख सकते हैं
        const SECRET_SALT = process.env.PIN_SECRET_KEY || "EarnproX_Super_Secret_Salt_2026"; 
        const hashedInputPin = crypto.createHash('sha256').update(pin + SECRET_SALT).digest('hex');

        // पिन चेक करना
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
        console.error("Login Error:", e); // Vercel logs में एरर देखने के लिए
        return res.status(500).json({ error: 'Login Server Error' });
    }
};
