const { db } = require('./_firebase');

module.exports = async function handler(req, res) {
    // सिर्फ POST रिक्वेस्ट
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { phone, token, amount } = req.body;
    const withdrawAmount = parseInt(amount);

    // बेसिक चेक (क्या डेटा सही है?)
    if (!phone || !token || !withdrawAmount) {
        return res.status(400).json({ error: 'Missing Data' });
    }

    if (isNaN(withdrawAmount) || withdrawAmount < 50) {
        return res.status(400).json({ error: 'Minimum withdrawal amount is ₹50' });
    }

    try {
        // 🔥 FIRESTORE TRANSACTION: यह हैकर्स को 'Double Click' स्पैम से रोकता है
        const result = await db.runTransaction(async (transaction) => {
            
            // 1. यूज़र को ढूँढो
            const userQuery = await transaction.get(db.collection('users').where('phone', '==', phone));
            if (userQuery.empty) throw new Error('User not found');

            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();

            // 2. SECURITY CHECKS (सबसे ज़रूरी)
            if (userData.sessionToken !== token) {
                throw new Error('Invalid Session. Please login again.'); // टोकन गलत है
            }
            if (!userData.upi || userData.upi.trim() === '') {
                throw new Error('Payout details not linked! Please complete KYC first.'); // UPI नहीं है
            }
            if (userData.balance < withdrawAmount) {
                throw new Error('Insufficient Balance!'); // बैलेंस कम है
            }

            // 3. नया बैलेंस कैलकुलेट करो
            const newBalance = userData.balance - withdrawAmount;
            const newTotalWithdraw = (userData.totalWithdraw || 0) + withdrawAmount;

            // 4. यूज़र का बैलेंस काटो (Update)
            transaction.update(userDoc.ref, {
                balance: newBalance,
                totalWithdraw: newTotalWithdraw
            });

            // 5. Withdrawal रिकॉर्ड बनाओ (ताकि तू उसे Payout दे सके)
            const newWithdrawRef = db.collection('withdrawals').doc();
            transaction.set(newWithdrawRef, {
                userPhone: phone,
                userName: userData.bankName || userData.name,
                upi: userData.upi,
                amount: withdrawAmount,
                status: "Pending",
                timestamp: new Date()
            });

            return newBalance;
        });

        // अगर ट्रांज़ैक्शन सक्सेसफुल रहा
        return res.status(200).json({ 
            message: 'Withdrawal successful', 
            newBalance: result 
        });

    } catch (e) {
        console.error("Withdrawal API Error:", e);
        
        // अगर हमारी कोई सिक्योरिटी कंडीशन फेल हुई है, तो वही मैसेज यूज़र को दिखाओ
        const errorMsg = e.message;
        if (errorMsg.includes('Session') || errorMsg.includes('Insufficient') || errorMsg.includes('User not') || errorMsg.includes('Payout')) {
            return res.status(400).json({ error: errorMsg });
        }
        
        return res.status(500).json({ error: 'Transaction failed due to heavy traffic. Try again.' });
    }
};
