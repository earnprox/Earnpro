const { db } = require('./_firebase');

// Naya Helper Function: IST Date nikalne ke liye (ex: "27/4/2026")
const getISTDateString = (dateObj) => {
    return new Date(dateObj).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
};

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
        
        // 🔥 NAYA LOGIC: All, Today aur Yesterday ka data alag alag store karne ke liye
        const now = new Date();
        const todayStr = getISTDateString(now);
        const yesterdayStr = getISTDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

        let networkStats = {
            all: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 },
            today: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 },
            yesterday: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 }
        };

        // Helper: User kis din aya uske hisab se counter badhana
        const evaluateNetworkDate = (docData, level) => {
            networkStats.all[level]++;
            networkStats.all.totalCount++;

            if (docData.createdAt) {
                let dateObj = docData.createdAt.toDate ? docData.createdAt.toDate() : new Date(docData.createdAt);
                let docDateStr = getISTDateString(dateObj);
                
                if (docDateStr === todayStr) {
                    networkStats.today[level]++;
                    networkStats.today.totalCount++;
                } else if (docDateStr === yesterdayStr) {
                    networkStats.yesterday[level]++;
                    networkStats.yesterday.totalCount++;
                }
            }
        };

        let l1Codes = [], l2Codes = [];

        if (myCode) {
            // Level 1 Fetch
            const l1Snap = await db.collection('users').where('referCodeUsed', '==', myCode).get();
            l1Snap.forEach(doc => { 
                const d = doc.data();
                evaluateNetworkDate(d, 'l1');
                if (d.ownReferCode) l1Codes.push(d.ownReferCode); 
            });

            // Level 2 Fetch
            if (l1Codes.length > 0) {
                for (let i = 0; i < l1Codes.length; i += 10) {
                    const chunk = l1Codes.slice(i, i + 10);
                    const l2Snap = await db.collection('users').where('referCodeUsed', 'in', chunk).get();
                    l2Snap.forEach(doc => { 
                        const d = doc.data();
                        evaluateNetworkDate(d, 'l2');
                        if (d.ownReferCode) l2Codes.push(d.ownReferCode); 
                    });
                }
            }

            // Level 3 Fetch
            if (l2Codes.length > 0) {
                for (let i = 0; i < l2Codes.length; i += 10) {
                    const chunk = l2Codes.slice(i, i + 10);
                    const l3Snap = await db.collection('users').where('referCodeUsed', 'in', chunk).get();
                    l3Snap.forEach(doc => { evaluateNetworkDate(doc.data(), 'l3'); });
                }
            }
        }

        let taskEarn = 0;
        let referEarn = 0;

        try {
            const tasksSnap = await db.collection('task_submissions').where('status', 'in', ['Approved', 'Completed']).get();
            tasksSnap.forEach(doc => {
                const t = doc.data();
                const reward = t.gigReward || 0; 
                
                if (t.userPhone === phone) taskEarn += reward;
                
                // Task kis din pura hua uska time check karna
                let timeStr = "";
                if (t.timestamp) {
                    let dateObj = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
                    timeStr = getISTDateString(dateObj);
                }

                const applyComm = (level, comm) => {
                    referEarn += comm;
                    networkStats.all[level] += comm;
                    networkStats.all.totalEarn += comm;

                    if (timeStr === todayStr) {
                        networkStats.today[level] += comm;
                        networkStats.today.totalEarn += comm;
                    } else if (timeStr === yesterdayStr) {
                        networkStats.yesterday[level] += comm;
                        networkStats.yesterday.totalEarn += comm;
                    }
                };

                // 🔥 COMMISSION SPLIT LOGIC
                if (t.referrerCode === myCode) applyComm('l1Earn', reward * 0.10);
                else if (l1Codes.includes(t.referrerCode)) applyComm('l2Earn', reward * 0.06);
                else if (l2Codes.includes(t.referrerCode)) applyComm('l3Earn', reward * 0.03);
            });
        } catch (err) {
            console.error("Task fetch error:", err);
        }

        // ==========================================
        // 🔥 TRANSACTION HISTORY LOGIC 
        // ==========================================
        let transactions = [];
        try {
            const withdrawalsSnap = await db.collection('withdrawals').where('phone', '==', phone).get();
            withdrawalsSnap.forEach(doc => {
                const w = doc.data();
                let dateObj = new Date();
                if (w.timestamp) dateObj = w.timestamp.toDate ? w.timestamp.toDate() : new Date(w.timestamp);
                else if (w.createdAt) dateObj = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt);

                transactions.push({
                    type: "Withdrawal",
                    title: "Bank Transfer",
                    dateObj: dateObj,
                    status: w.status || "Pending",
                    amount: parseFloat(w.amount || 0)
                });
            });

            const userTasksSnap = await db.collection('task_submissions').where('userPhone', '==', phone).get();
            userTasksSnap.forEach(doc => {
                const t = doc.data();
                let dateObj = new Date();
                if (t.timestamp) dateObj = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);

                let displayTitle = "Task Reward";
                if (t.gigName) displayTitle = t.gigName; 
                else if (t.gigTitle) displayTitle = `Task: ${t.gigTitle}`; 

                transactions.push({
                    type: "Earning",
                    title: displayTitle,
                    dateObj: dateObj,
                    status: t.status || "Completed",
                    amount: parseFloat(t.gigReward || 0)
                });
            });

            transactions.sort((a, b) => b.dateObj - a.dateObj);
            const formatDate = (date) => {
                const options = { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true };
                return date.toLocaleString('en-IN', options).replace(',', '').toUpperCase();
            };

            transactions = transactions.map(t => ({
                type: t.type, title: t.title, date: formatDate(t.dateObj), status: t.status, amount: t.amount
            }));
            
        } catch (err) {
            console.error("History fetch error:", err);
        }

        // 4. Secure Data Packing
        const responseData = {
            user: { name: userData.name || "User", referCode: userData.ownReferCode || "" },
            wallet: { balance: userData.balance || 0 },
            kyc: { bankName: userData.bankName || "", upi: userData.upi || "" },
            stats: { 
                totalEarn: taskEarn + referEarn, 
                totalWithdraw: userData.totalWithdraw || 0, 
                taskEarn: taskEarn, 
                referEarn: referEarn 
            },
            // 🔥 NAYA NETWORK OBJECT: Ab isme 'all', 'today', aur 'yesterday' aayega
            network: networkStats, 
            transactions: transactions
        };

        return res.status(200).json(responseData);

    } catch (e) {
        console.error("Dashboard Data API Error:", e);
        return res.status(500).json({ error: 'Server Error Fetching Dashboard' });
    }
};
