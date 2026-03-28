const admin = require('firebase-admin');

module.exports = async (req, res) => {
    // CORS bypass
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // Agar abhi bhi key missing hui toh ye batayega
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            return res.status(500).json({ error: "Keys abhi bhi Vercel ko nahi mil rahi hain. Vercel Settings check karein." });
        }

        // Firebase Setup
        if (!admin.apps.length) {
            let formattedKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: formattedKey,
                }),
            });
        }

        const db = admin.firestore();
        const { userPhone, reward, secret } = req.query;

        // Security Check
        if (secret !== process.env.POSTBACK_SECRET) {
            return res.status(401).json({ error: "Secret key match nahi hui." });
        }

        if (!userPhone || !reward) {
            return res.status(400).json({ error: "URL mein userPhone ya reward nahi hai." });
        }

        // User dhundho
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', userPhone).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: `Ye user (${userPhone}) database mein nahi mila.` });
        }

        // Paise Add Karo
        const userDoc = snapshot.docs[0];
        const currentBalance = userDoc.data().balance || 0;
        const numReward = parseInt(reward);

        await userDoc.ref.update({ balance: currentBalance + numReward });

        // History Setup
        await db.collection('task_submissions').add({
            userPhone: userPhone,
            gigName: "Auto-Verified Partner Task",
            gigReward: numReward,
            status: "Completed",
            timestamp: new Date(),
            remark: "System Auto Approved ✅"
        });

        // SUCCESS! 🎉
        return res.status(200).json({ success: true, message: `₹${numReward} added to user ${userPhone} successfully!` });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
};
