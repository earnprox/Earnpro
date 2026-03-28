const admin = require('firebase-admin');

// 1. Firebase se Secure Connection
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

// 2. Main API Handler
module.exports = async (req, res) => {
    // CORS bypass (taaki browser block na kare)
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { userPhone, reward, secret } = req.query;

    // Security Check
    if (secret !== process.env.POSTBACK_SECRET) {
        return res.status(401).json({ error: "Access Denied! Secret key match nahi hui." });
    }

    if (!userPhone || !reward) {
        return res.status(400).json({ error: "User Phone ya Reward URL mein missing hai." });
    }

    try {
        // Database mein User dhundo
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', userPhone).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "Ye user database mein nahi mila." });
        }

        const userDoc = snapshot.docs[0];
        const currentBalance = userDoc.data().balance || 0;
        const numReward = parseInt(reward);

        // 1. Balance Update
        await userDoc.ref.update({
            balance: currentBalance + numReward
        });

        // 2. Ledger/History Update
        await db.collection('task_submissions').add({
            userPhone: userPhone,
            gigName: "Auto-Verified Partner Task",
            gigReward: numReward,
            status: "Completed",
            timestamp: new Date(),
            remark: "Auto Approved by Server ✅"
        });

        // Success Response
        return res.status(200).json({ success: true, message: `₹${numReward} added to user ${userPhone} successfully!` });

    } catch (error) {
        return res.status(500).json({ error: "Database Server Error", details: error.message });
    }
};
