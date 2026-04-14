const { db, admin } = require('./_firebase'); // अपना सही पाथ चेक कर लें
const { createClient } = require('@supabase/supabase-js'); // Supabase

const SECURE_API_TOKEN = process.env.ADMIN_SECRET_KEY || "RashiAkash@2026_Secure";

// 🐘 Supabase Setup
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

            // ... (Baaki saare cases jaise update_banner, approve_task wese hi rahenge)
            
            default:
                return res.status(400).json({ error: "Unknown action" });
        }

    } catch (error) {
        console.error("Admin API Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
