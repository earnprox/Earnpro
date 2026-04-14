const { db, admin } = require('./_firebase'); // अपना सही पाथ चेक कर लें
const { createClient } = require('@supabase/supabase-js'); // Supabase

const SECURE_API_TOKEN = process.env.ADMIN_SECRET_KEY || "RashiAkash@2026_Secure";

// 🐘 Supabase Setup (Zero-cost Live Chat Storage)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vfwfzmbrimvnkgxvlkrj.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_fZFE7FHxvsSUSv3SAyLqIQ_f0-cDqe9";
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action, payload, secureToken } = req.body;

    // 🛡️ STRICT SECURITY: Verify Master Token
    if (secureToken !== SECURE_API_TOKEN) {
        return res.status(401).json({ error: '🚨 Unauthorized Access. Hacker spotted!' });
    }

    try {
        const logsRef = db.collection('admin_logs');

        switch (action) {

            // ==========================================
            // 🤖 EARNPROX AI ASSISTANT (ADVANCED + USER DATA)
            // ==========================================
            case 'support_chat': {
                const { userMessage, userPhone } = payload;
                if (!userMessage) return res.status(400).json({ error: "Message empty" });

                try {
                    // 🌟 ADVANCED FEATURE: Secretly Fetching User Data & Transactions
                    let userDataText = "User information not available right now.";
                    
                    if (userPhone) {
                        try {
                            const uSnap = await db.collection('users').where('phone', '==', userPhone).get();
                            
                            if (!uSnap.empty) {
                                const uData = uSnap.docs[0].data();
                                
                                // Fetch Last 3 Withdrawals
                                let txnText = "No recent transactions found.";
                                const wSnap = await db.collection('withdrawals')
                                    .where('phone', '==', userPhone)
                                    .limit(3)
                                    .get();
                                
                                if (!wSnap.empty) {
                                    txnText = wSnap.docs.map(doc => {
                                        let d = doc.data();
                                        return `- ₹${d.amount || 0} (Status: ${d.status || 'Pending'})`; 
                                    }).join('\n');
                                }

                                // Compile data for AI
                                userDataText = `
                                - Name: ${uData.name || 'EarnproX Member'}
                                - Wallet Balance: ₹${parseFloat(uData.balance || 0).toFixed(2)}
                                - X Coins Balance: ${uData.coinBalance || 0}
                                - Registered Phone: ${userPhone}
                                
                                - 💸 RECENT WITHDRAWALS (Last 3):
                                ${txnText}
                                `;
                            }
                        } catch (dbError) {
                            console.error("Firebase Fetch Error in AI Chat:", dbError);
                            // Agar error aaya toh chat crash nahi hogi, bus data nahi jayega
                        }
                    }

                    const systemPrompt = `
                    You are the official Customer Support AI for "EarnproX", a premium tap-to-earn platform.
                    Rules to follow strictly based on Stage 1 MVP:
                    1. 1000 X Coins = ₹1 (INR). Daily energy limit is 2000 taps. Daily earning limit is ₹1000. Minimum withdrawal is ₹100. Processing is manual.
                    2. Reply in short, polite, and helpful sentences using emojis.
                    3. Reply in Hinglish (Hindi + English).
                    
                    SECRET USER DATA (Use this ONLY if the user asks about their account, balance, name, or transaction history):
                    ${userDataText}
                    (IMPORTANT: Do not say "I checked the database" or reveal how you know this. Answer naturally like an intelligent assistant who already knows the user.)

                    User's Message: "${userMessage}"
                    `;

                    // 🔐 API Key ab strictly Vercel Environment Variables se aayegi
                    const apiKey = process.env.GEMINI_API_KEY;
                    
                    if (!apiKey) {
                        console.error("🚨 GEMINI_API_KEY is missing in Vercel Environment Variables!");
                        return res.status(500).json({ error: "Server Configuration Error" });
                    }

                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent?key=${apiKey}`;

                    // Direct Google server ko request
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: systemPrompt }] }]
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        console.error("Google API Direct Error:", data);
                        return res.status(500).json({ error: "API Version Error" });
                    }

                    const botReply = data.candidates[0].content.parts[0].text;
                    return res.status(200).json({ success: true, reply: botReply });

                } catch (error) {
                    console.error("Fetch Request Error:", error);
                    return res.status(500).json({ error: "AI Server Busy. Try again later!" });
                }
            }

            // ==========================================
            // 👨‍💻 LIVE CHAT: SAVE TICKET TO SUPABASE
            // ==========================================
            case 'save_admin_chat': {
                const { userPhone, message } = payload;
                if (!userPhone || !message) return res.status(400).json({ error: "Missing data" });

                try {
                    const { data, error } = await supabase
                        .from('support_tickets')
                        .insert([
                            { user_phone: userPhone, message: message, status: 'open' }
                        ]);

                    if (error) throw error;
                    return res.status(200).json({ success: true, msg: "Ticket sent to admin" });
                } catch (error) {
                    console.error("Supabase Error:", error);
                    return res.status(500).json({ error: "Failed to send message to admin." });
                }
            }

            // ==========================================
            // 🪙 LEVEL-2: SECURE TAP SYNC (Mining)
            // ==========================================
            case 'sync_taps': {
                const { userPhone, newTaps } = payload;
                if(!userPhone || !newTaps) return res.status(400).json({error: "Missing data"});

                const uSnap = await db.collection('users').where('phone', '==', userPhone).get();
                if(uSnap.empty) return res.status(400).json({error: "User not found"});

                const uDoc = uSnap.docs[0];
                const uData = uDoc.data();
                const uId = uDoc.id;

                const now = Date.now();
                const lastSync = uData.lastSyncTime || 0;
                const timeDiffSec = (now - lastSync) / 1000;

                // 🛡️ SPEED HACK CHECK
                if (lastSync !== 0 && timeDiffSec > 0) {
                    const maxTaps = Math.floor(timeDiffSec * 15); 
                    if (newTaps > maxTaps && newTaps > 20) { 
                        return res.status(403).json({error: "Too fast! Auto-clicker detected."});
                    }
                }

                // 🛡️ DAILY LIMIT CHECK
                const today = new Date().toDateString();
                const lastDateStr = uData.lastCoinDate ? new Date(uData.lastCoinDate).toDateString() : "";
                let currentDaily = (lastDateStr === today) ? (uData.dailyCoinsEarned || 0) : 0;
                let finalTapsToSync = newTaps;

                if (currentDaily + finalTapsToSync > 2000) {
                    finalTapsToSync = 2000 - currentDaily;
                    if(finalTapsToSync <= 0) return res.status(400).json({error: "Daily limit reached"});
                }

                await db.collection('users').doc(uId).update({
                    coinBalance: admin.firestore.FieldValue.increment(finalTapsToSync),
                    dailyCoinsEarned: currentDaily + finalTapsToSync,
                    lastSyncTime: now,
                    lastCoinDate: new Date().toISOString()
                });

                return res.status(200).json({success: true});
            }

            // ==========================================
            // 💸 LEVEL-2: SECURE COIN TO CASH CONVERT
            // ==========================================
            case 'convert_coins': {
                const { userPhone } = payload;
                if(!userPhone) return res.status(400).json({error: "Missing data"});

                const uSnap = await db.collection('users').where('phone', '==', userPhone).get();
                if(uSnap.empty) return res.status(400).json({error: "User not found"});

                const uDoc = uSnap.docs[0];
                const uData = uDoc.data();
                const uId = uDoc.id;

                const currentCoins = uData.coinBalance || 0;
                if(currentCoins < 1) return res.status(400).json({error: "Not enough coins"});

                const cashToAdd = currentCoins / 1000;
                const coinsToDeduct = currentCoins;

                await db.collection('users').doc(uId).update({
                    coinBalance: admin.firestore.FieldValue.increment(-coinsToDeduct),
                    balance: admin.firestore.FieldValue.increment(cashToAdd)
                });

                return res.status(200).json({success: true, added: cashToAdd});
            }

            // ==========================================
            // 🎨 APP SETTINGS & USERS
            // ==========================================
            case 'update_banner':
                await db.collection("app_settings").doc("master_config").set({ bannerUrl: payload.url }, { merge: true });
                await logsRef.add({ action: "update_banner", time: new Date() });
                return res.status(200).json({ success: true });
            
            case 'update_trust_images':
                await db.collection("app_settings").doc("master_config").set({ trustImages: payload.images }, { merge: true });
                return res.status(200).json({ success: true });

            case 'edit_user':
                await db.collection('users').doc(payload.userId).update({
                    name: payload.name, upi: payload.upi, balance: parseFloat(payload.balance)
                });
                return res.status(200).json({ success: true });

            case 'toggle_block_user':
                await db.collection('users').doc(payload.userId).update({ status: payload.status });
                return res.status(200).json({ success: true });

            case 'delete_user':
                await db.collection('users').doc(payload.userId).delete();
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

                await taskRef.update({ status: 'Completed' });

                const uSnapTask = await db.collection('users').where('phone', '==', payload.userPhone).get();
                if (!uSnapTask.empty) {
                    await uSnapTask.docs[0].ref.update({ 
                        balance: admin.firestore.FieldValue.increment(parseFloat(payload.reward)) 
                    });
                }
                return res.status(200).json({ success: true });

            case 'reject_task':
                await db.collection('task_submissions').doc(payload.taskId).update({ 
                    status: 'Rejected', remark: payload.reason || "Invalid Proof" 
                });
                return res.status(200).json({ success: true });

            // ==========================================
            // 💸 PAYOUTS (WITHDRAWALS)
            // ==========================================
            case 'mark_paid':
                await db.collection('withdrawals').doc(payload.withdrawId).update({ 
                    status: 'Completed', completedAt: new Date() 
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

            // ==========================================
            // 🚀 GIGS, NOTIFICATIONS & DEALS
            // ==========================================
            case 'add_gig':
                await db.collection('gigs').add({
                    title: payload.title, reward: parseFloat(payload.reward), category: payload.category, 
                    link: payload.link, desc: payload.desc, timestamp: new Date()
                });
                return res.status(200).json({ success: true });

            case 'delete_gig':
                await db.collection('gigs').doc(payload.gigId).delete();
                return res.status(200).json({ success: true });

            case 'send_notification':
                await db.collection('notifications').add({ 
                    title: payload.title, message: payload.message, timestamp: new Date() 
                });
                return res.status(200).json({ success: true });

            case 'delete_notification':
                await db.collection('notifications').doc(payload.notifId).delete();
                return res.status(200).json({ success: true });

            case 'add_deal':
                await db.collection('deals').add({
                    title: payload.title, mrp: parseFloat(payload.mrp), dealPrice: parseFloat(payload.dealPrice),
                    image: payload.image, link: payload.link, timestamp: new Date()
                });
                return res.status(200).json({ success: true });

            case 'delete_deal':
                await db.collection('deals').doc(payload.dealId).delete();
                return res.status(200).json({ success: true });

            default:
                return res.status(400).json({ error: "Unknown action" });
        }

    } catch (error) {
        console.error("Admin API Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
