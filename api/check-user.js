const { db } = require('./_firebase');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { phone } = req.body;
    if (!phone || phone.length !== 10) return res.status(400).json({ error: 'Invalid phone' });

    try {
        const snapshot = await db.collection('users').where('phone', '==', phone).get();
        if (!snapshot.empty) {
            const user = snapshot.docs[0].data();
            return res.status(200).json({ exists: true, status: user.status });
        }
        return res.status(200).json({ exists: false });
    } catch (e) {
        console.error("Check user error:", e);
        return res.status(500).json({ error: 'Server error' });
    }
}
