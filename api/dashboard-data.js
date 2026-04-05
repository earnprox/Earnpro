const { db } = require('./_firebase');

module.exports = async function handler(req, res) {
    // सिर्फ POST रिक्वेस्ट अलाउ करेंगे (Security Layer 1)
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { phone, token } = req.body;

    if (!phone || !token) return res.status(400).json({ error: 'Missing Credentials' });

    try {
        // 1. यूज़र को ढूँढो (Security Layer 2)
        const userSnap = await db.collection('users').where('phone', '==', phone).get();
        if (userSnap.empty) return res.status(404).json({ error: 'User not found' });

        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();

        // 2. टोकन मैच करो (Security Layer 3 - Anti Hacker Check)
        if (userData.sessionToken !== token) {
            return res.status(401).json({ error: 'Invalid Session. Please login again.' });
        }

        // 3. 3-Level Network Calculation (Smart Query - No Full DB Download)
        const myCode = userData.ownReferCode;
        let l1Count = 0, l2Count = 0, l3Count = 0;
        let l1Codes = [];

        if (myCode) {
            // Level 1 ढूँढो
            const l1Snap = await db.collection('users').where('referCodeUsed', '==', myCode).get();
            l1Count = l1Snap.size;
            l1Snap.forEach(doc => {
                const d = doc.data();
                if (d.ownReferCode) l1Codes.push(d.ownReferCode);
            });

            // Level 2 ढूँढो (Firestore में एक बार में 10 ही चेक कर सकते हैं, इसलिए chunk बनाया है)
            let l2Codes = [];
            if (l1Codes.length > 0) {
                for (let i = 0; i < l1Codes.length; i += 10) {
                    const chunk = l1Codes.slice(i, i + 10);
                    const l2Snap = await db.collection('users').where('referCodeUsed', 'in', chunk).get();
                    l2Count += l2Snap.size;
                    l2Snap.forEach(doc => {
                        const d = doc.data();
                        if (d.ownReferCode) l2Codes.push(d.ownReferCode);
                    });
                }
            }

            // Level 3 ढूँढो
            if (l2Codes.length > 0) {
                for (let i = 0; i < l2Codes.length; i += 10) {
                    const chunk = l2Codes.slice(i, i + 10);
                    const l3Snap = await db.collection('users').where('referCodeUsed', 'in', chunk).get();
                    l3Count += l3Snap.size;
                }
            }
        }

        // 4. Secure Data Packing (सिर्फ वही भेजो जो UI को चाहिए, PIN या सीक्रेट्स नहीं)
        const responseData = {
            user: {
                name: userData.name || "User",
                referCode: userData.ownReferCode || ""
            },
            wallet: {
                balance: userData.balance || 0
            },
            kyc: {
                bankName: userData.bankName || "",
                upi: userData.upi || ""
            },
            stats: {
                totalEarn: userData.totalEarn || 0,
                totalWithdraw: userData.totalWithdraw || 0,
                taskEarn: userData.taskEarn || 0,
                referEarn: userData.referEarn || 0
            },
            network: {
                l1: l1Count,
                l2: l2Count,
                l3: l3Count,
                totalCount: l1Count + l2Count + l3Count
            }
        };

        return res.status(200).json(responseData);

    } catch (e) {
        console.error("Dashboard Data API Error:", e);
        return res.status(500).json({ error: 'Server Error Fetching Dashboard' });
    }
};
