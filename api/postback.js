import admin from 'firebase-admin';

// 1. Vercel aur Firebase ka Connection
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Ye replace function \n ko asli naye line mein badalta hai
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

// 2. Auto-Verify Logic
export default async function handler(req, res) {
    // API Link format: your-app.vercel.app/api/postback?userPhone=9876543210&reward=50&secret=Akash_Master_Key_99
    const { userPhone, reward, secret } = req.query;

    // Security Check: Agar password match nahi hua, toh reject kardo
    if (secret !== process.env.POSTBACK_SECRET) {
        return res.status(401).json({ error: "Access Denied! Secret key galat hai." });
    }

    if (!userPhone || !reward) {
        return res.status(400).json({ error: "Missing userPhone ya reward." });
    }

    try {
        // Database mein User ka phone number dhundho
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', userPhone).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "User nahi mila database mein." });
        }

        const userDoc = snapshot.docs[0];
        const currentBalance = userDoc.data().balance || 0;
        const numReward = parseInt(reward);

        // 1. User ke account mein Paise Add karo
        await userDoc.ref.update({
            balance: currentBalance + numReward
        });

        // 2. Ledger (History) mein entry daal do
        await db.collection('task_submissions').add({
            userPhone: userPhone,
            gigName: "Auto-Verified Partner Task",
            gigReward: numReward,
            status: "Completed",
            timestamp: new Date(),
            remark: "Auto Approved by Server ✅"
        });

        return res.status(200).json({ success: true, message: `₹${numReward} added to user ${userPhone} successfully!` });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
