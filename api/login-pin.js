const { db } = require('./_firebase');
const crypto = require('crypto');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { phone, pinHash } = req.body;

    try {
        const snapshot = await db.collection('users').where('phone', '==', phone).get();
        if (snapshot.empty) return res.status(404).json({ error: 'User not found' });
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        if (userData.pin === pinHash) {
            const token = crypto.randomUUID();
            await db.collection('users').doc(userDoc.id).update({ sessionToken: token });
            return res.status(200).json({ token });
        } else {
            return res.status(401).json({ error: 'Incorrect PIN' });
        }
    } catch (e) {
        console.error("Login error:", e);
        return res.status(500).json({ error: 'Server error' });
    }
}
