const admin = require('firebase-admin');

module.exports = async (req, res) => {
    // CORS bypass
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // 1. Firebase Initialize (Inside Try-Catch taaki error pakad sakein)
        if (!admin.apps.length) {
            
            // Check if environment variables exist
            if (!process.env.FIREBASE_PRIVATE_KEY) {
                throw new Error("Vercel mein FIREBASE_PRIVATE_KEY missing hai!");
            }

            // Key formatting fix (Vercel ke nakhre theek karne ke liye)
            let formattedKey = process.env.FIREBASE_PRIVATE_KEY;
            formattedKey = formattedKey.replace(/\\n/g, '\n').replace(/"/g, '');

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: formattedKey,
                }),
            });
        }

        const db = admin.firestore();

        // 2. Variables lena
        const { userPhone, reward, secret } = req.query;

        // Security Check
        if (secret !== process.env.POSTBACK_SECRET) {
            return res.status(401).json({ error: "Access Denied! Secret key match nahi hui." });
        }

        if (!userPhone || !reward) {
            return res.status(400).json({ error: "User Phone ya Reward URL mein missing hai." });
        }

        // 3. Database operation
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', userPhone).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: `Ye user (${userPhone}) database mein nahi mila.` });
        }

        const userDoc = snapshot.docs[0];
        const currentBalance = userDoc.data().balance || 0;
        const numReward = parseInt(reward);

        // Balance Update
        await userDoc.ref.update({
            balance: currentBalance + numReward
        });

        // Ledger Update
        await db.collection('task_submissions').add({
            userPhone: userPhone,
            gigName: "Auto-Verified Partner Task",
            gigReward: numReward,
            status: "Completed",
            timestamp: new Date(),
            remark: "System Auto Approved ✅"
        });

        return res.status(200).json({ success: true, message: `₹${numReward} added to user ${userPhone} successfully!` });

    } catch (error) {
        // 🔥 Asli error yahan screen par dikhega!
        return res.status(500).json({ 
            error: "Server Crash Ho Gaya!", 
            asli_wajah: error.message 
        });
    }
};
