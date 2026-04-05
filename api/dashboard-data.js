const { db } = require('./_firebase');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { phone, token } = req.body;
    if (!phone || !token) return res.status(400).json({ error: 'Missing Credentials' });

    try {
        const userSnap = await db.collection('users').where('phone', '==', phone).get();
        if (userSnap.empty) return res.status(404).json({ error: 'User not found' });

        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();

        if (userData.sessionToken !== token) {
            return res.status(401).json({ error: 'Invalid Session. Please login again.' });
        }

        const myCode = userData.ownReferCode;
        let l1Count = 0, l2Count = 0, l3Count = 0;
        let l1Codes = [], l2Codes = [];

        if (myCode) {
            // Level 1
            const l1Snap = await db.collection('users').where('referCodeUsed', '==', myCode).get();
            l1Count = l1Snap.size;
            l1Snap.forEach(doc => { if (doc.data().ownReferCode) l1Codes.push(doc.data().ownReferCode); });

            // Level 2
            if (l1Codes.length > 0) {
                for (let i = 0; i < l1Codes.length; i += 10) {
                    const chunk = l1Codes.slice(i, i + 10);
                    const l2Snap = await db.collection('users').where('referCodeUsed', 'in', chunk).get();
                    l2Count += l2Snap.size;
                    l2Snap.forEach(doc => { if (doc.data().ownReferCode) l2Codes.push(doc.data().ownReferCode); });
                }
            }

            // Level 3
            if (l2Codes.length > 0) {
                for (let i = 0; i < l2Codes.length; i += 10) {
                    const chunk = l2Codes.slice(i, i + 10);
                    const l3Snap = await db.collection('users').where('referCodeUsed', 'in', chunk).get();
                    l3Count += l3Snap.size;
                }
            }
        }

        // 🔥 Live Task & Referral Earning Calculation
        let taskEarn = 0;
        let referEarn = 0;

        try {
            const tasksSnap = await db.collection('task_submissions').where('status', 'in', ['Approved', 'Completed']).get();
            tasksSnap.forEach(doc => {
                const t = doc.data();
                // खुद की कमाई
                if (t.userPhone === phone) taskEarn += (t.gigReward || 0);
                
                // नेटवर्क कमीशन (10%, 6%, 3%)
                if (t.referrerCode === myCode) referEarn += (t.gigReward * 0.10);
                else if (l1Codes.includes(t.referrerCode)) referEarn += (t.gigReward * 0.06);
                else if (l2Codes.includes(t.referrerCode)) referEarn += (t.gigReward * 0.03);
            });
        } catch (err) {
            console.error("Task fetch error:", err);
        }

        // 4. Secure Data Packing
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
                totalEarn: taskEarn + referEarn,
                totalWithdraw: userData.totalWithdraw || 0,
                taskEarn: taskEarn,
                referEarn: referEarn 
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
