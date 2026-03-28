import admin from 'firebase-admin';

// 1. Firebase Admin Connect Karna (Securely)
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

// 2. Main API Logic
export default async function handler(req, res) {
    // API URL kaisa dikhega: your-app.vercel.app/api/postback?userPhone=9876543210&reward=10&secret=MY_APP_PASS

    const { userPhone, reward, secret } = req.query;

    // Security Check: Taaki koi aur fake URL hit karke paise na badha le
    if (secret !== process.env.POSTBACK_SECRET) {
        return res.status(401).json({ error: "Access Denied! Galat Secret Key." });
    }

    if (!userPhone || !reward) {
        return res.status(400).json({ error: "Phone number ya reward missing hai." });
    }

    try {
        // Firebase mein user dhundho
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', userPhone).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "User nahi mila database mein." });
        }

        const userDoc = snapshot.docs[0];
        const currentBalance = userDoc.data().balance || 0;
        const numReward = parseInt(reward);

        // 1. User ka balance Auto-update karo
        await userDoc.ref.update({
            balance: currentBalance + numReward
        });

        // 2. Ledger / History mein entry daal do
        await db.collection('task_submissions').add({
            userPhone: userPhone,
            gigName: "Auto-Verified Partner Task",
            gigReward: numReward,
            status: "Completed",
            timestamp: new Date(),
            remark: "Auto Approved by Server ✅"
        });

        return res.status(200).json({ success: true, message: "Paise add ho gaye automatically!" });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
