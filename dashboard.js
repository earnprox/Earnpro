import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS =================
window.currentBalance = 0; 
window.savedUPI = ""; window.savedBankName = ""; window.userDocId = null; window.myReferCode = ""; window.referBonusPerUser = 5;
window.myReferrerCode = ""; 

// 🔥 Live Earning Trackers
window.taskEarned = 0;
window.referCommission = 0; 
window.referFlatBonus = 0;  
window.withTotal = 0;

// Data Holders
window.liveGigs = {}; window.mySubmissionsMap = {}; window.mySubmissionsList = [];
window.myActiveGig = null; window.viewingGigData = null; 

window.showToast = (m) => { const t = document.getElementById("toast"); if(t) { t.innerText = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); } };
window.switchTab = (id) => { const h = document.getElementById('main-header'); if(id === 'home') { if(h) h.style.display = 'none'; } else { if(h) { h.style.display = 'flex'; h.style.opacity = '1'; } } document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); const target = document.getElementById('view-' + id); if(target) target.classList.add('active'); window.scrollTo(0,0); };
window.switchWsTab = (id, btn) => { document.querySelectorAll('.ws-tab').forEach(t => { t.classList.remove('bg-white', 'shadow-sm', 'text-blue-600'); t.classList.add('text-slate-500'); }); if(btn) { btn.classList.remove('text-slate-500'); btn.classList.add('bg-white', 'shadow-sm', 'text-blue-600'); } document.querySelectorAll('.ws-content').forEach(c => c.classList.remove('active')); document.getElementById('ws-' + id).classList.add('active'); };
window.openSheet = (id) => { document.getElementById('universal-overlay').classList.add('modal-active'); document.getElementById(id).classList.add('sheet-active'); };
window.closeAllSheets = () => { document.querySelectorAll('.sheet-active').forEach(s => s.classList.remove('sheet-active')); document.getElementById('universal-overlay').classList.remove('modal-active'); };
window.openFullPage = (id) => { if(!window.savedUPI) return window.showToast("⚠️ Link Payout Settings first!"); document.getElementById(id).classList.add('full-page-active'); if(id === 'withdraw-page') setTimeout(() => document.getElementById("withdraw-amount").focus(), 300); };
window.closeFullPage = (id) => { document.getElementById(id).classList.remove('full-page-active'); };
window.logoutUser = () => { if(confirm("Are you sure?")) { localStorage.removeItem("earnprox_user_phone"); window.location.href="index.html"; } };
window.copyReferLink = () => { if(!window.myReferCode) return; navigator.clipboard.writeText(`https://earnprox.in/index.html?ref=${window.myReferCode}`).then(()=>window.showToast("✅ Copied!")); };
window.shareOnWhatsApp = () => { if(!window.myReferCode) return; window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`🔥 Earn cash with EarnproX! Complete tasks & get paid instantly!\n\nUse my code *${window.myReferCode}* to get joining bonus!\n👇👇\nhttps://earnprox.in/index.html?ref=${window.myReferCode}`)}`, '_blank'); };

// ================= FIREBASE =================
const firebaseConfig = { apiKey: "AIzaSyCtOcibo2YODmROtrW4W1oRCW1ZvOslPfI", authDomain: "earnproxuc.firebaseapp.com", projectId: "earnproxuc", storageBucket: "earnproxuc.firebasestorage.app", messagingSenderId: "411733884378", appId: "1:411733884378:web:b3944ee303740e4ae1d4e3" };
const app = initializeApp(firebaseConfig); const db = getFirestore(app); const userPhone = localStorage.getItem("earnprox_user_phone");
const isToday = (dateObj) => { if(!dateObj) return false; const today = new Date(); const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj); return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); };
const getSafeTime = (ts) => ts ? (ts.toMillis ? ts.toMillis() : new Date(ts).getTime()) : 0;

// 🟢 1. MASTER SYNC ENGINE
if(userPhone) {
    onSnapshot(query(collection(db, "users"), where("phone", "==", userPhone)), (snap) => {
        if(!snap.empty) {
            const docSnap = snap.docs[0]; window.userDocId = docSnap.id; const u = docSnap.data();
            window.savedUPI = u.upi || ""; window.savedBankName = u.bankName || ""; window.myReferrerCode = u.referCodeUsed || ""; 
            const realName = u.name || "User"; window.myReferCode = (realName.substring(0,3) + userPhone.substring(userPhone.length - 4)).toUpperCase();

            window.myActiveGig = u.activeGig || null;
            if(window.myActiveGig) {
                document.getElementById('active-gig-name').innerText = window.myActiveGig.title;
                document.getElementById('active-gig-reward').innerText = `Reward: ₹${window.myActiveGig.reward}`;
                document.getElementById('active-task-card').classList.remove('hidden');
                document.getElementById('no-active-task').classList.add('hidden');
            } else {
                document.getElementById('active-task-card').classList.add('hidden');
                document.getElementById('no-active-task').classList.remove('hidden');
            }
            if(Object.keys(window.liveGigs).length > 0) renderExploreGigs();

            // Setup Base UI
            document.getElementById("home-user-name").innerText = realName.split(" ")[0]; document.getElementById("profile-user-name").innerText = realName;
            document.getElementById("profile-user-phone").innerText = "+91 " + userPhone; document.getElementById("refer-page-name").innerText = realName;
            document.getElementById("referral-code-text").innerText = window.myReferCode; document.getElementById("withdraw-display-name").innerText = window.savedBankName || "Bank Transfer";
            document.getElementById("withdraw-display-upi").innerText = window.savedUPI || "Processing..."; document.getElementById("withdraw-avatar-text").innerText = (window.savedBankName || realName).charAt(0).toUpperCase();

            const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${realName}&backgroundColor=b6e3f4`;
            document.getElementById("home-profile-avatar").src = avatarUrl; document.getElementById("header-avatar").src = avatarUrl; document.getElementById("profile-avatar").src = avatarUrl; document.getElementById("refer-profile-img").src = avatarUrl;

            if(window.savedUPI) {
                document.getElementById("upi-status-badge").innerText = "Verified ✅"; document.getElementById("upi-status-badge").className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                document.getElementById("bank-display-text").innerText = window.savedBankName; document.getElementById("upi-display-text").innerText = window.savedUPI;
                if(document.getElementById("bank-name-input")) { document.getElementById("bank-name-input").value = window.savedBankName; document.getElementById("bank-name-input").disabled = true; }
                if(document.getElementById("upi-input-box")) { document.getElementById("upi-input-box").value = window.savedUPI; document.getElementById("upi-input-box").disabled = true; }
                const kycBtn = document.querySelector("#kyc-sheet button"); if(kycBtn) { kycBtn.innerText = "Verified & Locked 🔒"; kycBtn.disabled = true; kycBtn.classList.add("bg-emerald-500"); }
            }
            syncStatsAndHistory();
        }
    });
}

// 🟢 2. DYNAMIC LIVE BALANCE CALCULATOR (THE FIX)
window.updateLiveBalance = function() {
    const totalEarned = (window.taskEarned || 0) + (window.referFlatBonus || 0) + (window.referCommission || 0);
    const totalWithdrawn = window.withTotal || 0;
    
    // Live Auto-Calculate
    window.currentBalance = Math.floor(totalEarned - totalWithdrawn);
    if(window.currentBalance < 0) window.currentBalance = 0; // Safety check

    // Update ALL Balances in App instantly
    document.getElementById("stat-total-earn").innerText = `₹${totalEarned.toFixed(0)}`;
    document.getElementById("home-top-balance").innerText = `₹${window.currentBalance}`;
    document.getElementById("main-balance-display").innerHTML = `₹ ${window.currentBalance}<span class="text-xl text-slate-500 font-bold">.00</span>`;
    document.getElementById("withdraw-page-balance").innerText = `₹${window.currentBalance}`;
    
    // Also save it back to Firebase quietly so Admin Panel shows correct data
    if(window.userDocId) {
        updateDoc(doc(db, "users", window.userDocId), { balance: window.currentBalance }).catch(e => console.log(e));
    }
}

// 🟢 3. SYNC ENGINE (Calculates 5% Commission + Tasks + Withdrawals)
async function syncStatsAndHistory() {
    if(!userPhone || !window.myReferCode) return;
    
    const taskQ = query(collection(db, "task_submissions"), where("userPhone", "==", userPhone));
    const referQ = query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode));
    const withQ = query(collection(db, "withdrawals"), where("userPhone", "==", userPhone));
    const referCommissionQ = query(collection(db, "task_submissions"), where("referrerCode", "==", window.myReferCode));

    // A. MY TASK SUBMISSIONS
    onSnapshot(taskQ, (snap) => { 
        let taskTotal = 0; window.mySubmissionsMap = {}; window.mySubmissionsList = [];
        snap.forEach(d => { 
            const data = d.data();
            window.mySubmissionsMap[data.gigName] = data; window.mySubmissionsList.push(data); 
            if(data.status === "Approved" || data.status === "Completed") taskTotal += (data.gigReward || 0); 
        }); 
        window.taskEarned = taskTotal;
        document.getElementById("stat-task-earn").innerText = `₹${taskTotal}`; 
        renderExploreGigs(); renderReviewTab(); window.updateLiveBalance(); 
    });

    // B. MY 5% COMMISSION EARNINGS
    onSnapshot(referCommissionQ, (snap) => {
        let commTotal = 0;
        snap.forEach(d => {
            const data = d.data();
            if(data.status === "Approved" || data.status === "Completed") commTotal += (data.gigReward * 0.05);
        });
        window.referCommission = parseFloat(commTotal.toFixed(2));
        updateReferUI(); window.updateLiveBalance();
    });

    // C. REFERRALS (Joining Bonus)
    onSnapshot(referQ, (snap) => {
        let totalCount = 0, todayCount = 0, referListHtml = ""; const docsArr = [];
        snap.forEach(d => docsArr.push(d.data())); docsArr.sort((a,b) => getSafeTime(b.timestamp) - getSafeTime(a.timestamp));
        docsArr.forEach(data => { 
            totalCount++; if(isToday(data.timestamp)) todayCount++; 
            const joinDate = data.timestamp ? new Date(getSafeTime(data.timestamp)).toLocaleDateString('en-GB') : "Recently"; 
            const uName = data.name || "User"; 
            referListHtml += `<div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm"><div class="w-1/2 flex items-center gap-2 overflow-hidden"><div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">${uName.charAt(0).toUpperCase()}</div><p class="text-xs font-bold text-slate-800 truncate">${uName}</p></div><div class="w-1/4 text-center text-[10px] font-bold text-slate-400">${joinDate}</div><div class="w-1/4 text-right text-xs font-black text-emerald-500">+₹${window.referBonusPerUser}</div></div>`; 
        });
        
        document.getElementById('total-refers-count').innerText = totalCount; 
        document.getElementById('today-refers-count').innerText = todayCount; 
        window.referFlatBonus = totalCount * window.referBonusPerUser;
        document.getElementById('referral-list-container').innerHTML = referListHtml || "<p class='text-center py-10 text-slate-400 font-bold'>No referrals yet.</p>"; 
        updateReferUI(); window.updateLiveBalance();
    });

    // D. WITHDRAWALS
    onSnapshot(withQ, (snap) => {
        let withTotal = 0; const allTransactions = [];
        snap.forEach(d => { 
            const data = d.data(); 
            if(data.status !== "Rejected") withTotal += (data.amount || 0); // Only deduct approved/pending
            allTransactions.push({ type: 'debit', timestamp: data.timestamp, desc: 'Withdrawal to Bank', amt: data.amount, status: data.status }); 
        });
        window.withTotal = withTotal;
        document.getElementById("stat-total-withdraw").innerText = `₹${withTotal}`; 
        renderLedger(allTransactions); window.updateLiveBalance();
    });
}

function updateReferUI() {
    const totalReferEarning = window.referFlatBonus + window.referCommission;
    document.getElementById('stat-refer-earn').innerText = `₹${totalReferEarning.toFixed(0)}`; 
    const referBonusPageText = document.getElementById('total-refer-earnings');
    if(referBonusPageText) referBonusPageText.innerText = totalReferEarning.toFixed(0);
}

async function renderLedger(withs) {
    const historyCont = document.getElementById('history-container'); let combined = [...withs];
    const taskSnap = await getDocs(query(collection(db, "task_submissions"), where("userPhone", "==", userPhone)));
    taskSnap.forEach(d => { if(d.data().status === 'Approved' || d.data().status === 'Completed') combined.push({ type: 'credit', timestamp: d.data().timestamp, desc: `Task: ${d.data().gigName}`, amt: d.data().gigReward, status: 'Completed' }); });
    const referSnap = await getDocs(query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode)));
    referSnap.forEach(d => combined.push({ type: 'credit', timestamp: d.data().timestamp, desc: `Refer Bonus (${d.data().name})`, amt: window.referBonusPerUser, status: 'Completed' });
    const commSnap = await getDocs(query(collection(db, "task_submissions"), where("referrerCode", "==", window.myReferCode)));
    commSnap.forEach(d => { if(d.data().status === 'Approved' || d.data().status === 'Completed') { const comm = d.data().gigReward * 0.05; combined.push({ type: 'credit', timestamp: d.data().timestamp, desc: `5% Commission (${d.data().gigName})`, amt: parseFloat(comm.toFixed(2)), status: 'Completed' }); } });

    combined.sort((a,b) => getSafeTime(b.timestamp) - getSafeTime(a.timestamp));
    let html = "";
    combined.forEach(item => {
        const isDebit = item.type === 'debit'; const isPending = item.status === 'Pending';
        let iconBg = isDebit ? 'bg-rose-50' : 'bg-emerald-50'; let iconColor = isDebit ? 'text-rose-500' : 'text-emerald-500'; let icon = isDebit ? '↑' : '↓'; let amtColor = isDebit ? 'text-slate-800' : 'text-emerald-500';
        if(isPending) { iconBg = 'bg-orange-50'; iconColor = 'text-orange-500'; icon = '⏳'; amtColor = 'text-slate-500'; }
        html += `<div class="flex justify-between items-center border-b border-slate-50 pb-4 mb-4 ${isPending ? 'opacity-70' : ''}"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full ${iconBg} ${iconColor} flex items-center justify-center font-bold shrink-0 text-xl">${icon}</div><div><p class="text-sm font-bold text-slate-800">${item.desc}</p><p class="text-[10px] text-slate-400 uppercase font-bold">${item.status}</p></div></div><p class="text-sm font-black ${amtColor}">${isDebit ? '-' : '+'} ₹${item.amt}</p></div>`;
    });
    historyCont.innerHTML = html || "<div class='text-center py-10 opacity-60'><span class='text-5xl mb-3 block'>📭</span><p class='text-sm font-bold text-slate-800'>No transactions yet</p></div>";
}

// 🟢 4. RENDER EXPLORE GIGS
window.renderExploreGigs = function() {
    let html = ""; let tasksFound = false;
    Object.values(window.liveGigs).forEach(g => {
        if(window.mySubmissionsMap[g.title]) return;
        if(window.myActiveGig && window.myActiveGig.title === g.title) return;
        tasksFound = true;
        html += `<div class="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden mb-4"><div class="absolute -right-4 -top-2 opacity-[0.03] text-8xl pointer-events-none">🚀</div><h4 class="font-black text-xl text-slate-800 mb-2">${g.title}</h4><div class="flex items-center gap-3 mb-5"><span class="text-emerald-500 font-bold text-sm">Reward: ₹${g.reward}</span><span class="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-md">Direct Pay</span></div><button onclick="window.openGigSheet('${g.title}', 'explore')" class="w-full bg-[#0F172A] text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition">View Task Details</button></div>`;
    });
    document.getElementById('gigs-container').innerHTML = html || "<p class='text-center py-10 font-bold text-slate-400'>No new tasks available. Check back later!</p>";
}

// 🟢 5. RENDER REVIEW TAB
window.renderReviewTab = function() {
    let html = ""; window.mySubmissionsList.sort((a,b) => getSafeTime(b.timestamp) - getSafeTime(a.timestamp));
    window.mySubmissionsList.forEach(sub => {
        let badgeColor = "bg-orange-50 text-orange-600 border-orange-100"; let icon = "⏳";
        if(sub.status === "Approved" || sub.status === "Completed") { badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100"; icon = "✅"; }
        if(sub.status === "Rejected") { badgeColor = "bg-rose-50 text-rose-600 border-rose-100"; icon = "❌"; }
        html += `<div class="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] mb-4"><div class="flex justify-between items-start mb-3"><h4 class="font-black text-lg text-slate-800 pr-2">${sub.gigName}</h4><span class="${badgeColor} text-[10px] font-black px-2 py-1 rounded-md border shrink-0">${icon} ${sub.status}</span></div><p class="text-xs font-bold text-emerald-500 bg-emerald-50 inline-block px-2 py-1 rounded border border-emerald-100">Reward: ₹${sub.gigReward}</p></div>`;
    });
    document.getElementById('review-container').innerHTML = html || `<div class="text-center py-20 text-slate-400 font-bold"><div class="text-5xl mb-4 opacity-50">📂</div>No tasks under review.</div>`;
}

// FETCH GIGS
onSnapshot(collection(db, "gigs"), (snap) => { window.liveGigs = {}; snap.forEach(doc => { const g = doc.data(); window.liveGigs[g.title] = g; }); renderExploreGigs(); });

// DYNAMIC SHEET HANDLER
window.openGigSheet = (gigTitleOrNull, mode) => {
    if(mode === 'explore') { window.viewingGigData = window.liveGigs[gigTitleOrNull]; } else { window.viewingGigData = window.myActiveGig; }
    if(!window.viewingGigData) return; 
    document.getElementById('sheet-gig-title').innerText = window.viewingGigData.title; document.getElementById('sheet-gig-reward').innerText = `₹${window.viewingGigData.reward} Reward`; document.getElementById('sheet-gig-desc').innerText = window.viewingGigData.desc || window.viewingGigData.link || "Follow the instructions provided.";
    if(mode === 'explore') { document.getElementById('task-action-explore').classList.remove('hidden'); document.getElementById('task-action-submit').classList.add('hidden'); } else { document.getElementById('task-action-explore').classList.add('hidden'); document.getElementById('task-action-submit').classList.remove('hidden'); }
    window.openSheet('task-sheet');
}
window.openSubmitSheet = () => { window.openGigSheet(null, 'progress'); }

// ACCEPT TASK
window.acceptTask = async () => {
    if(!window.viewingGigData) return; if(window.myActiveGig) return window.showToast("⚠️ You already have an active task!");
    const btn = document.querySelector("#task-action-explore button"); if(btn) { btn.disabled = true; btn.innerText = "Accepting..."; }
    try {
        await updateDoc(doc(db, "users", window.userDocId), { activeGig: window.viewingGigData });
        if(window.viewingGigData.link && window.viewingGigData.link.startsWith('http')) window.open(window.viewingGigData.link, '_blank');
        window.closeAllSheets(); window.switchWsTab('active', document.querySelectorAll('.ws-tab')[1]); window.showToast("✅ Task Accepted & Saved!");
    } catch (e) { window.showToast("❌ Failed. Try again."); } finally { if(btn) { btn.disabled = false; btn.innerText = "Accept & Start Task"; } }
}

// SUBMIT PROOF
window.submitTaskProofReal = async () => {
    if(!window.myActiveGig) return window.showToast("⚠️ No active task found!");
    const f = document.getElementById("proof-image").files[0]; const remarkField = document.getElementById("proof-remark"); const remark = remarkField ? remarkField.value : "No Remark";
    if(!f) return window.showToast("⚠️ Please select a screenshot proof!");
    const btn = document.getElementById("submit-proof-btn"); btn.disabled = true; btn.innerText = "Uploading...";
    try {
        const formData = new FormData(); formData.append("image", f);
        const res = await fetch("https://api.imgbb.com/1/upload?key=7d2c13c8fedf546d91b46d36c1ef76d0", { method: "POST", body: formData }).then(r => r.json());
        if(!res.success) throw new Error("ImgBB Failed");
        await addDoc(collection(db, "task_submissions"), { userPhone, gigName: window.myActiveGig.title, gigReward: window.myActiveGig.reward, proofLink: res.data.url, remark: remark, referrerCode: window.myReferrerCode, status: "Pending Approval", timestamp: new Date() });
        await updateDoc(doc(db, "users", window.userDocId), { activeGig: null });
        document.getElementById("proof-image").value = ""; if(remarkField) remarkField.value = "";
        window.showToast("🚀 Successfully Submitted!"); window.closeAllSheets(); window.switchWsTab('review', document.querySelectorAll('.ws-tab')[2]);
    } catch (e) { window.showToast("❌ Upload Failed. Try again."); } finally { btn.disabled = false; btn.innerText = "Submit For Verification"; }
}

// KYC & WITHDRAW
window.saveRealKYC = async function() { const n = document.getElementById("bank-name-input").value.trim(); const u = document.getElementById("upi-input-box").value.trim(); if(n.length < 3 || !u.includes("@")) return window.showToast("⚠️ Invalid Name or UPI"); try { await updateDoc(doc(db, "users", window.userDocId), { bankName: n, upi: u }); window.showToast("✅ Details Locked!"); setTimeout(() => window.closeAllSheets(), 1000); } catch (e) { window.showToast("❌ Error saving."); } }
window.processWithdrawReal = async function() { const amt = parseInt(document.getElementById("withdraw-amount").value); if(!amt || amt < 50) return window.showToast("⚠️ Min ₹50"); if(amt > window.currentBalance) return window.showToast("❌ Insufficient Balance"); const btn = document.getElementById("withdraw-btn"); btn.disabled = true; btn.innerText = "Processing Securely..."; try { await addDoc(collection(db, "withdrawals"), { userPhone, userName: window.savedBankName, amount: amt, upi: window.savedUPI, status: "Pending", timestamp: new Date() }); window.showToast("🚀 Sent securely!"); window.closeFullPage('withdraw-page'); } catch(e) { window.showToast("❌ Failed"); } finally { btn.innerHTML = `Proceed Securely`; btn.disabled = false; } }

