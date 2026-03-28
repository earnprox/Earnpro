const admin = require('firebase-admin');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // Vercel ko jo keys dikh rahi hain, unki list banate hain
        const envKeys = Object.keys(process.env);
        const hamariKeys = envKeys.filter(k => k.includes('FIREBASE') || k.includes('POSTBACK'));

        // Agar key missing hai, toh screen par dikhao ki Vercel ke paas konsi keys hain
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            return res.status(500).json({
                error: "Key sach mein missing hai ya spelling galat hai!",
                Vercel_Ko_Ye_Keys_Mili_Hain: hamariKeys
            });
        }

        // Agar key mil gayi, toh aage ka normal process
        let formattedKey = process.env.FIREBASE_PRIVATE_KEY;
        formattedKey = formattedKey.replace(/\\n/g, '\n').replace(/"/g, '');

        if (!admin.apps.length) {
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

        if (secret !== process.env.POSTBACK_SECRET) {
            return res.status(401).json({ error: "Secret key match nahi hui." });
        }

        if (!userPhone || !reward) {
            return res.status(400).json({ error: "URL mein userPhone ya reward nahi hai." });
        }

        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', userPhone).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: `Ye user (${userPhone}) database mein nahi mila.` });
        }

        const userDoc = snapshot.docs[0];
        const currentBalance = userDoc.data().balance || 0;
        const numReward = parseInt(reward);

        await userDoc.ref.update({ balance: currentBalance + numReward });

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
        return res.status(500).json({ 
            error: "Server Crash Ho Gaya!", 
            asli_wajah: error.message 
        });
    }
};
