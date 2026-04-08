// File: /api/admin.js
// Import your configured Firebase instance
const { db, admin } = require('../../firebase.js'); // Path check kar lena aapne firebase.js kahan rakhi hai

export default async function handler(req, res) {
    // 1. Sirf POST requests allow karenge
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. 🛡️ STRICT SECURITY: Verify Master Token
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`) {
        return res.status(401).json({ error: 'Unauthorized Access. Hacker spotted! 🚨' });
    }

    // 3. Extract action and data from request
    const { action, ...payload } = req.body;

    try {
        switch (action) {

            // ==========================================
            // 📊 DASHBOARD DATA (Optional: Aggregate all data for initial load)
            // ==========================================
            case 'get_dashboard_data':
                // Yahan aap baaki collections ka data fetch karke bhej sakte hain
                // Example: users, tasks, payouts etc.
                return res.status(200).json({ message: "Data fetched securely", data: {} });

            // ==========================================
            // 🎨 APP SETTINGS
            // ==========================================
            case 'update_banner':
                await db.collection('app_settings').doc('master_config').set(
                    { bannerUrl: payload.bannerUrl }, 
                    { merge: true }
                );
                await db.collection('admin_logs').add({ action: "update_banner", time: new Date() });
                return res.status(200).json({ success: true, message: "Banner Updated" });

            // ==========================================
            // 👥 USER MANAGEMENT
            // ==========================================
            case 'edit_user':
                await db.collection('users').doc(payload.userId).update({
                    name: payload.name,
                    upi: payload.upi || "None",
                    balance: parseFloat(payload.balance)
                });
                return res.status(200).json({ success: true });

            case 'toggle_block_user':
                await db.collection('users').doc(payload.userId).update({
                    status: payload.status // 'active' or 'blocked'
                });
                return res.status(200).json({ success: true });

            // ==========================================
            // 📝 TASK APPROVALS
            // ==========================================
            case 'approve_task':
                const taskRef = db.collection('task_submissions').doc(payload.taskId);
                const taskDoc = await taskRef.get();

                if (!taskDoc.exists || taskDoc.data().status !== 'Pending Approval') {
                    return res.status(400).json({ error: "Task not pending or doesn't exist" });
                }

                const rewardAmt = parseFloat(taskDoc.data().gigReward || 0);
                const userPhone = taskDoc.data().userPhone;

                // 1. Mark Task as Completed
                await taskRef.update({ status: 'Completed' });

                // 2. Add Money to User Wallet (SECURE BACKEND CALCULATION)
                const usersRef = db.collection('users');
                const userQuery = await usersRef.where('phone', '==', userPhone).get();
                
                if (!userQuery.empty) {
                    const userDoc = userQuery.docs[0];
                    await userDoc.ref.update({
                        balance: admin.firestore.FieldValue.increment(rewardAmt) // Prevents race conditions
                    });
                }
                return res.status(200).json({ success: true, message: `Approved ₹${rewardAmt}` });

            case 'reject_task':
                await db.collection('task_submissions').doc(payload.taskId).update({
                    status: 'Rejected',
                    adminRemark: payload.reason || "Invalid Proof"
                });
                return res.status(200).json({ success: true });

            // ==========================================
            // 💸 PAYOUTS (WITHDRAWALS)
            // ==========================================
            case 'mark_payout_paid':
                await db.collection('withdrawals').doc(payload.withdrawalId).update({
                    status: 'Completed',
                    completedAt: new Date()
                });
                return res.status(200).json({ success: true });

            case 'reject_payout':
                const withRef = db.collection('withdrawals').doc(payload.withdrawalId);
                const withDoc = await withRef.get();

                if (withDoc.exists && withDoc.data().status === 'Pending') {
                    const refundAmt = parseFloat(withDoc.data().amount || 0);
                    const wpPhone = withDoc.data().userPhone;

                    // 1. Mark as Rejected
                    await withRef.update({ status: 'Rejected', remark: payload.reason });

                    // 2. Refund Money to User Wallet
                    const uq = await db.collection('users').where('phone', '==', wpPhone).get();
                    if (!uq.empty) {
                        await uq.docs[0].ref.update({
                            balance: admin.firestore.FieldValue.increment(refundAmt)
                        });
                    }
                    return res.status(200).json({ success: true, message: "Refunded to wallet" });
                }
                return res.status(400).json({ error: "Invalid Payout Request" });

            // ==========================================
            // 🚀 GIGS MANAGEMENT
            // ==========================================
            case 'create_gig':
                await db.collection('gigs').add({
                    title: payload.title,
                    reward: parseFloat(payload.reward),
                    link: payload.link,
                    desc: payload.desc,
                    timestamp: new Date()
                });
                return res.status(200).json({ success: true });

            case 'delete_gig':
                await db.collection('gigs').doc(payload.gigId).delete();
                return res.status(200).json({ success: true });

            // ==========================================
            // 📢 NOTIFICATIONS
            // ==========================================
            case 'send_notification':
                await db.collection('notifications').add({
                    title: payload.title,
                    message: payload.message,
                    timestamp: new Date()
                });
                return res.status(200).json({ success: true });

            case 'delete_notification':
                await db.collection('notifications').doc(payload.notificationId).delete();
                return res.status(200).json({ success: true });

            // ==========================================
            // DEFAULT / UNKNOWN ACTION
            // ==========================================
            default:
                return res.status(400).json({ error: "Unknown action" });
        }

    } catch (error) {
        console.error("Admin API Error:", error);
        return res.status(500).json({ error: "Internal Server Error. Please check backend logs." });
    }
}
