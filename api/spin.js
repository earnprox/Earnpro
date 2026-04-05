const { db } = require('./_firebase');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { phone, token } = req.body;
    if (!phone || !token) return res.status(400).json({ error: 'Missing Credentials' });

    try {
        // Transaction use kar rahe hain taaki koi spam click na kar sake
        const result = await db.runTransaction(async (transaction) => {
            const userQuery = await transaction.get(db.collection('users').where('phone', '==', phone));
            if (userQuery.empty) throw new Error('User not found');

            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();

            // Security Check
            if (userData.sessionToken !== token) {
                throw new Error('Invalid Session. Please login again.');
            }

            // Daily Spin Limit Check (24 hours)
            const now = new Date();
            if (userData.lastSpinDate) {
                const lastSpin = userData.lastSpinDate.toDate ? userData.lastSpinDate.toDate() : new Date(userData.lastSpinDate);
                
                // Agar aaj ki date aur last spin ki date same hai
                if (lastSpin.getDate() === now.getDate() && 
                    lastSpin.getMonth() === now.getMonth() && 
                    lastSpin.getFullYear() === now.getFullYear()) {
                    throw new Error('You have already used your Daily Spin! Come back tomorrow.');
                }
            }

            // 🎯 TERI WALI PROBABILITY (100% Hack-Proof)
            const rand = Math.floor(Math.random() * 100); // 0 se 99 tak random number
            let reward = 0;
            let status = 'Win';

            if (rand < 40) {
                reward = 1; // 40% Chance
            } else if (rand < 64) {
                reward = 2; // 24% Chance
            } else if (rand < 79) {
                reward = 3; // 15% Chance
            } else if (rand < 94) {
                reward = 0; status = 'Loss'; // 15% Chance (Better Luck)
            } else if (rand < 99) {
                reward = 5; // 5% Chance
            } else {
                reward = 10; // 1% Chance (JACKPOT)
            }

            // Update User Balance & Spin Date
            const newBalance = (userData.balance || 0) + reward;
            const newTaskEarn = (userData.taskEarn || 0) + reward; // Spin ko task earn me jod rahe hain

            transaction.update(userDoc.ref, {
                balance: newBalance,
                taskEarn: newTaskEarn,
                lastSpinDate: now
            });

            // Ledger/History ke liye record
            if (reward > 0) {
                const historyRef = db.collection('task_submissions').doc();
                transaction.set(historyRef, {
                    userPhone: phone,
                    gigName: "Daily Spin & Win",
                    gigReward: reward,
                    status: "Completed",
                    timestamp: now
                });
            }

            return { reward, newBalance };
        });

        return res.status(200).json({ 
            message: 'Spin successful', 
            reward: result.reward,
            newBalance: result.newBalance 
        });

    } catch (e) {
        console.error("Spin API Error:", e);
        return res.status(400).json({ error: e.message || 'Spin failed. Try again.' });
    }
};
