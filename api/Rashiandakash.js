const { db, admin } = require('./_firebase'); 

const SECURE_API_TOKEN = process.env.ADMIN_SECRET_KEY || "RashiAkash@2026_Secure";

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action, payload, secureToken } = req.body;

    if (secureToken !== SECURE_API_TOKEN) {
        return res.status(401).json({ error: '🚨 Unauthorized Access. Hacker spotted!' });
    }

    try {
        const logsRef = db.collection('admin_logs');

        switch (action) {

            case 'update_banner':
                await db.collection("app_settings").doc("master_config").set({ bannerUrl: payload.url }, { merge: true });
                await logsRef.add({ action: "update_banner", time: new Date() });
                return res.status(200).json({ success: true });
            
            case 'update_trust_images':
                await db.collection("app_settings").doc("master_config").set({ trustImages: payload.images }, { merge: true });
                return res.status(200).json({ success: true });

            case 'edit_user':
                await db.collection('users').doc(payload.userId).update({
                    name: payload.name, 
                    upi: payload.upi, 
                    balance: parseFloat(payload.balance)
                });
                return res.status(200).json({ success: true });

            case 'toggle_block_user':
                await db.collection('users').doc(payload.userId).update({ status: payload.status });
                return res.status(200).json({ success: true });

            case 'delete_user':
                await db.collection('users').doc(payload.userId).delete();
                return res.status(200).json({ success: true });

            case 'approve_task':
                const taskRef = db.collection('task_submissions').doc(payload.taskId);
                const taskDoc = await taskRef.get();

                if (!taskDoc.exists || taskDoc.data().status !== 'Pending Approval') {
                    return res.status(400).json({ error: "Task not pending or doesn't exist" });
                }

                await taskRef.update({ status: 'Completed' });

                const uSnap = await db.collection('users').where('phone', '==', payload.userPhone).get();
                if (!uSnap.empty) {
                    await uSnap.docs[0].ref.update({ 
                        balance: admin.firestore.FieldValue.increment(parseFloat(payload.reward)) 
                    });
                }
                return res.status(200).json({ success: true });

            case 'reject_task':
                await db.collection('task_submissions').doc(payload.taskId).update({ 
                    status: 'Rejected', 
                    remark: payload.reason || "Invalid Proof" 
                });
                return res.status(200).json({ success: true });

            case 'mark_paid':
                await db.collection('withdrawals').doc(payload.withdrawId).update({ 
                    status: 'Completed', 
                    completedAt: new Date() 
                });
                return res.status(200).json({ success: true });

            case 'reject_payout':
                const withRef = db.collection('withdrawals').doc(payload.withdrawId);
                const withDoc = await withRef.get();

                if (withDoc.exists && withDoc.data().status === 'Pending') {
                    await withRef.update({ status: 'Rejected', remark: payload.reason });

                    const wpq = await db.collection('users').where('phone', '==', payload.userPhone).get();
                    if (!wpq.empty) {
                        await wpq.docs[0].ref.update({ 
                            balance: admin.firestore.FieldValue.increment(parseFloat(payload.amount)) 
                        });
                    }
                    return res.status(200).json({ success: true });
                }
                return res.status(400).json({ error: "Invalid Payout Request" });

            case 'add_gig':
                await db.collection('gigs').add({
                    title: payload.title,
                    reward: parseFloat(payload.reward),
                    category: payload.category, 
                    link: payload.link,
                    desc: payload.desc,
                    timestamp: new Date()
                });
                return res.status(200).json({ success: true });

            case 'delete_gig':
                await db.collection('gigs').doc(payload.gigId).delete();
                return res.status(200).json({ success: true });

            // ==========================================
            // 🛒 DEALS MANAGEMENT (Affiliate Shopping)
            // ==========================================
            case 'add_deal':
                await db.collection('deals').add({
                    title: payload.title,
                    mrp: parseFloat(payload.mrp),
                    dealPrice: parseFloat(payload.dealPrice),
                    image: payload.image,
                    link: payload.link,
                    timestamp: new Date()
                });
                return res.status(200).json({ success: true });

            case 'delete_deal':
                await db.collection('deals').doc(payload.dealId).delete();
                return res.status(200).json({ success: true });

            case 'send_notification':
                await db.collection('notifications').add({ 
                    title: payload.title, 
                    message: payload.message, 
                    timestamp: new Date() 
                });
                return res.status(200).json({ success: true });

            case 'delete_notification':
                await db.collection('notifications').doc(payload.notifId).delete();
                return res.status(200).json({ success: true });

            default:
                return res.status(400).json({ error: "Unknown action" });
        }

    } catch (error) {
        console.error("Admin API Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
