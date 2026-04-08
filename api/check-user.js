const { db } = require('./_firebase');
const jwt = require('jsonwebtoken');

// Secret Key (Ise Vercel environment variables me 'JWT_SECRET' naam se save karna)
const JWT_SECRET = process.env.JWT_SECRET || 'tumhara_koi_bhi_strong_random_secret_123';

module.exports = async function handler(req, res) {
    // 1. Sirf POST allow karo
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { phone } = req.body;

    // 2. Strict Phone Validation
    if (!phone || !/^\d{10}$/.env.test(phone)) {
        return res.status(400).json({ error: 'Invalid 10-digit phone number' });
    }

    try {
        const snapshot = await db.collection('users').where('phone', '==', phone).limit(1).get();
        
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            const userId = userDoc.id;

            // 3. Security: Check if user is Banned
            if (userData.isBanned) {
                return res.status(403).json({ error: 'Your account is suspended' });
            }

            // 4. Generate Secure JWT Token
            // Is token ke bina koi hacker balance nahi badha payega
            const token = jwt.sign(
                { userId: userId, phone: phone }, 
                JWT_SECRET, 
                { expiresIn: '24h' } // Token 24 ghante me expire ho jayega
            );

            return res.status(200).json({ 
                exists: true, 
                status: userData.status || 'active',
                token: token, // Yeh token frontend ko jayega
                message: 'User verified successfully'
            });
        }

        // Agar user nahi hai
        return res.status(200).json({ 
            exists: false, 
            message: 'User not found. Please register.' 
        });

    } catch (e) {
        console.error("Secure Check User Error:", e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
