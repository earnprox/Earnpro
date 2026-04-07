const { db } = require('./_firebase'); // 🔥 'Const' की जगह 'const' (छोटा c) कर दिया है
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { phone, pin } = req.body;

    // अगर फोन या पिन खाली है तो एरर दो
    if (!phone || pin === undefined || pin === null) {
        return res.status(400).json({ error: 'Phone and PIN are required' });
    }

    try {
        const snapshot = await db.collection('users').where('phone', '==', phone).get();
        if (snapshot.empty) return res.status(404).json({ error: 'User not found' });
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // 🔥 क्रैश रोकने के लिए PIN को पक्का String में बदलें
        const pinString = String(pin);
        const SECRET_SALT = process.env.PIN_SECRET_KEY || "EarnproX_Super_Secret_Salt_2026"; 
        const hashedInputPin = crypto.createHash('sha256').update(pinString + SECRET_SALT).digest('hex');

        // 🔥 पुराने (Plain Text) और नए (Hashed) दोनों PIN को सपोर्ट करना
        let isPinValid = false;
        let needsHashUpgrade = false;

        if (userData.pin === hashedInputPin) {
            isPinValid = true; // नया सिक्योर हैश पिन मैच हो गया
        } else if (String(userData.pin) === pinString) {
            isPinValid = true; // पुराना सिंपल पिन मैच हो गया
            needsHashUpgrade = true; // इसे डेटाबेस में हैश करना है
        }

        // पिन सही होने पर लॉगिन करें
        if (isPinValid) {
            const token = crypto.randomBytes(32).toString('hex');
            
            const updateData = { 
                sessionToken: token,
                lastLogin: new Date() 
            };

            // अगर यूज़र का पुराना पिन था, तो उसे डेटाबेस में हमेशा के लिए सिक्योर (Hashed) कर दो
            if (needsHashUpgrade) {
                updateData.pin = hashedInputPin;
            }

            await db.collection('users').doc(userDoc.id).update(updateData);
            
            return res.status(200).json({ token });
        } else {
            return res.status(401).json({ error: 'Incorrect PIN' });
        }
    } catch (e) {
        console.error("Login Error Details:", e); // Vercel Logs में देखने के लिए
        // Frontend पर असली एरर भेजें ताकि पता चले अगर कोई और दिक्कत हो
        return res.status(500).json({ error: 'Login Server Error', details: e.message });
    }
};
