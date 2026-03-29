import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS =================
window.currentBalance = 0; 
window.savedUPI = ""; 
window.savedBankName = ""; 
window.userDocId = null; 
window.myReferCode = ""; 

// 🔥 ₹5 Bonus OFF, Level Data Initialized
window.referBonusPerUser = 0; 
window.myReferrerCode = ""; 
window.l1Codes = new Set();
window.l2Codes = new Set();
window.l3Codes = new Set();

window.taskEarned = 0;
window.referCommission = 0; 
window.referFlatBonus = 0;  
window.withTotal = 0;

window.liveGigs = {}; 
window.mySubmissionsMap = {}; 
window.mySubmissionsList = [];
window.myActiveGig = null; 
window.viewingGigData = null; 

// ================= REFRESH STATE HANDLER =================
document.addEventListener("DOMContentLoaded", () => {
    const savedTab = sessionStorage.getItem('lastActiveTab');
    const savedFullPage = sessionStorage.getItem('lastActiveFullPage');

    if(savedTab) { window.switchTab(savedTab); }
    if(savedFullPage) {
        const fp = document.getElementById(savedFullPage);
        if(fp) fp.classList.add('full-page-active');
    }
});

// ================= UI FUNCTIONS =================
window.showToast = (m) => { 
    const t = document.getElementById("toast"); 
    if(t) { t.innerText = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); } 
};

window.switchTab = (id) => { 
    sessionStorage.setItem('lastActiveTab', id); 
    const h = document.getElementById('main-header'); 
    if(id === 'home') { if(h) h.style.display = 'none'; } 
    else { if(h) { h.style.display = 'flex'; h.style.opacity = '1'; } } 
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); 
    const target = document.getElementById('view-' + id); 
    if(target) target.classList.add('active'); 
    window.scrollTo(0,0); 
};

window.switchWsTab = (id, btn) => { 
    document.querySelectorAll('.ws-tab').forEach(t => { 
        t.classList.remove('bg-white', 'shadow-sm', 'text-blue-600'); 
        t.classList.add('text-slate-500'); 
    }); 
    if(btn) { 
        btn.classList.remove('text-slate-500'); 
        btn.classList.add('bg-white', 'shadow-sm', 'text-blue-600'); 
    } 
    document.querySelectorAll('.ws-content').forEach(c => c.classList.remove('active')); 
    document.getElementById('ws-' + id).classList.add('active'); 
};

window.openSheet = (id) => { 
    document.getElementById('universal-overlay').classList.add('modal-active'); 
    document.getElementById(id).classList.add('sheet-active'); 
    if(id === 'notification-sheet') {
        const badge = document.getElementById("notification-badge");
        if(badge) badge.classList.add("hidden");
    }
};

window.closeAllSheets = () => { 
    document.querySelectorAll('.sheet-active').forEach(s => s.classList.remove('sheet-active')); 
    document.getElementById('universal-overlay').classList.remove('modal-active'); 
};

window.openFullPage = (id) => { 
    if(!window.savedUPI) return window.showToast("⚠️ Link Payout Settings first!"); 
    sessionStorage.setItem('lastActiveFullPage', id);
    document.getElementById(id).classList.add('full-page-active'); 
    if(id === 'withdraw-page') setTimeout(() => document.getElementById("withdraw-amount").focus(), 300); 
};

window.closeFullPage = (id) => { 
    sessionStorage.removeItem('lastActiveFullPage');
    document.getElementById(id).classList.remove('full-page-active'); 
};

window.logoutUser = () => { 
    if(confirm("Are you sure?")) { 
        localStorage.removeItem("earnprox_user_phone"); 
        sessionStorage.clear();
        window.location.href="index.html"; 
    } 
};

window.copyReferLink = () => { 
    if(!window.myReferCode) return; 
    navigator.clipboard.writeText(`https://earnprox.in/index.html?ref=${window.myReferCode}`).then(()=>window.showToast("✅ Copied!")); 
};

window.shareOnWhatsApp = () => { 
    if(!window.myReferCode) return; 
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`🔥 Earn cash with EarnproX! Complete tasks & get paid instantly!\n\nUse my code *${window.myReferCode}* to get joining bonus!\n👇👇\nhttps://earnprox.in/index.html?ref=${window.myReferCode}`)}`, '_blank'); 
};

// ================= FIREBASE SETUP =================
const firebaseConfig = { 
    apiKey: "AIzaSyCtOcibo2YODmROtrW4W1oRCW1ZvOslPfI", 
    authDomain: "earnproxuc.firebaseapp.com", 
    projectId: "earnproxuc", 
    storageBucket: "earnproxuc.firebasestorage.app", 
    messagingSenderId: "411733884378", 
    appId: "1:411733884378:web:b3944ee303740e4ae1d4e3" 
};

const app = initializeApp(firebaseConfig); 
const db = getFirestore(app); 
const userPhone = localStorage.getItem("earnprox_user_phone");

const isToday = (dateObj) => { 
    if(!dateObj) return false; 
    const today = new Date(); 
    const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj); 
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); 
};

const getSafeTime = (ts) => ts ? (ts.toMillis ? ts.toMillis() : new Date(ts).getTime()) : 0;

// 🟢 1. MASTER SYNC ENGINE
if(userPhone) {
    onSnapshot(query(collection(db, "users"), where("phone", "==", userPhone)), (snap) => {
        if(!snap.empty) {
            const overlay = document.getElementById("loading-overlay");
            if(overlay) overlay.classList.remove("active");

            const docSnap = snap.docs[0]; 
            window.userDocId = docSnap.id; 
            const u = docSnap.data();
            
            if(u.status === "blocked") {
                alert("🚨 Your account has been suspended by the Admin.");
                localStorage.removeItem("earnprox_user_phone");
                sessionStorage.clear();
                window.location.href="index.html";
                return;
            }

            window.savedUPI = u.upi || ""; 
            window.savedBankName = u.bankName || ""; 
            window.myReferrerCode = u.referCodeUsed || ""; 
            const realName = u.name || "User"; 
            window.myReferCode = (realName.substring(0,3) + userPhone.substring(userPhone.length - 4)).toUpperCase();

            window.myActiveGig = u.activeGig || null;
            if(window.myActiveGig) {
                const gigNameObj = document.getElementById('active-gig-name');
                if(gigNameObj) gigNameObj.innerText = window.myActiveGig.title;
                const gigRewardObj = document.getElementById('active-gig-reward');
                if(gigRewardObj) gigRewardObj.innerText = `Reward: ₹${window.myActiveGig.reward}`;
                
                const activeCard = document.getElementById('active-task-card');
                if(activeCard) activeCard.classList.remove('hidden');
                const noTask = document.getElementById('no-active-task');
                if(noTask) noTask.classList.add('hidden');
            } else {
                const activeCard = document.getElementById('active-task-card');
                if(activeCard) activeCard.classList.add('hidden');
                const noTask = document.getElementById('no-active-task');
                if(noTask) noTask.classList.remove('hidden');
            }
            if(Object.keys(window.liveGigs).length > 0) renderExploreGigs();

            if(document.getElementById("home-user-name")) document.getElementById("home-user-name").innerText = realName.split(" ")[0]; 
            if(document.getElementById("profile-user-name")) document.getElementById("profile-user-name").innerText = realName;
            if(document.getElementById("profile-user-phone")) document.getElementById("profile-user-phone").innerText = "+91 " + userPhone; 
            if(document.getElementById("refer-page-name")) document.getElementById("refer-page-name").innerText = realName;
            if(document.getElementById("referral-code-text")) document.getElementById("referral-code-text").innerText = window.myReferCode; 
            if(document.getElementById("withdraw-display-name")) document.getElementById("withdraw-display-name").innerText = window.savedBankName || "Bank Transfer";
            if(document.getElementById("withdraw-display-upi")) document.getElementById("withdraw-display-upi").innerText = window.savedUPI || "Processing..."; 
            if(document.getElementById("withdraw-avatar-text")) document.getElementById("withdraw-avatar-text").innerText = (window.savedBankName || realName).charAt(0).toUpperCase();

            const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${realName}&backgroundColor=b6e3f4`;
            if(document.getElementById("home-profile-avatar")) document.getElementById("home-profile-avatar").src = avatarUrl; 
            if(document.getElementById("header-avatar")) document.getElementById("header-avatar").src = avatarUrl; 
            if(document.getElementById("profile-avatar")) document.getElementById("profile-avatar").src = avatarUrl; 
            if(document.getElementById("refer-profile-img")) document.getElementById("refer-profile-img").src = avatarUrl;

            if(window.savedUPI) {
                if(document.getElementById("upi-status-badge")) {
                    document.getElementById("upi-status-badge").innerText = "Verified ✅"; 
                    document.getElementById("upi-status-badge").className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                }
                if(document.getElementById("bank-display-text")) document.getElementById("bank-display-text").innerText = window.savedBankName; 
                if(document.getElementById("upi-display-text")) document.getElementById("upi-display-text").innerText = window.savedUPI;
                if(document.getElementById("bank-name-input")) { document.getElementById("bank-name-input").value = window.savedBankName; document.getElementById("bank-name-input").disabled = true; }
                if(document.getElementById("upi-input-box")) { document.getElementById("upi-input-box").value = window.savedUPI; document.getElementById("upi-input-box").disabled = true; }
                const kycBtn = document.querySelector("#kyc-sheet button"); 
                if(kycBtn) { kycBtn.innerText = "Verified & Locked 🔒"; kycBtn.disabled = true; kycBtn.classList.add("bg-emerald-500"); }
            }
            syncStatsAndHistory();
        }
    });

    onSnapshot(collection(db, "notifications"), (snap) => {
        let notifHtml = "";
        let newNotifs = false;
        const notifArr = [];
        
        snap.forEach(d => notifArr.push({ id: d.id, ...d.data() }));
        notifArr.sort((a,b) => getSafeTime(b.timestamp) - getSafeTime(a.timestamp));

        notifArr.forEach(n => {
            newNotifs = true;
            const timeDate = n.timestamp ? new Date(getSafeTime(n.timestamp)).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Recently';
            notifHtml += `
            <div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-black text-indigo-900 text-sm">${n.title}</h4>
                    <span class="text-[9px] font-bold text-indigo-400 bg-white px-2 py-1 rounded border border-indigo-50">${timeDate}</span>
                </div>
                <p class="text-xs text-indigo-700 font-medium leading-relaxed">${n.message}</p>
            </div>`;
        });

        const notifContainer = document.getElementById("notification-container");
        if(notifContainer) notifContainer.innerHTML = notifHtml || "<p class='text-center py-10 text-slate-400 font-bold'>No new alerts.</p>";

        const badge = document.getElementById("notification-badge");
        if(badge && newNotifs) badge.classList.remove("hidden");
    });
}

// 🟢 2. LIVE BALANCE CALCULATOR
window.updateLiveBalance = function() {
    const totalEarned = (window.taskEarned || 0) + (window.referFlatBonus || 0) + (window.referCommission || 0);
    const totalWithdrawn = window.withTotal || 0;
    
    window.currentBalance = Math.floor(totalEarned - totalWithdrawn);
    if(window.currentBalance < 0) window.currentBalance = 0; 

    if(document.getElementById("stat-total-earn")) document.getElementById("stat-total-earn").innerText = `₹${totalEarned.toFixed(2)}`;
    if(document.getElementById("home-top-balance")) document.getElementById("home-top-balance").innerText = `₹${window.currentBalance}`;
    if(document.getElementById("main-balance-display")) document.getElementById("main-balance-display").innerHTML = `₹ ${window.currentBalance}<span class="text-xl text-slate-500 font-bold">.00</span>`;
    if(document.getElementById("withdraw-page-balance")) document.getElementById("withdraw-page-balance").innerText = `₹${window.currentBalance}`;
    
    if(window.userDocId) {
        updateDoc(doc(db, "users", window.userDocId), { balance: window.currentBalance }).catch(e => console.log(e));
    }
}

// 🟢 3. NEW 3-LEVEL STATS & COMMISSION ENGINE
async function syncStatsAndHistory() {
    if(!userPhone || !window.myReferCode) return;
    
    // 3.1 Fetch ALL Users to map 3-Level Network
    onSnapshot(collection(db, "users"), (snap) => {
        let l1Count = 0, todayCount = 0, referListHtml = "";
        window.l1Codes.clear(); window.l2Codes.clear(); window.l3Codes.clear();
        
        const allUsers = [];
        snap.forEach(d => allUsers.push(d.data()));

        // Map Level 1
        allUsers.forEach(u => {
            const uCode = (u.name || "User").substring(0,3).toUpperCase() + (u.phone || "").substring((u.phone||"").length - 4);
            if(u.referCodeUsed === window.myReferCode) {
                window.l1Codes.add(uCode);
                l1Count++;
                if(isToday(u.timestamp)) todayCount++;
                const joinDate = u.timestamp ? new Date(getSafeTime(u.timestamp)).toLocaleDateString('en-GB') : "Recently"; 
                const uName = u.name || "User"; 
                referListHtml += `<div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm"><div class="w-1/2 flex items-center gap-2 overflow-hidden"><div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">${uName.charAt(0).toUpperCase()}</div><p class="text-xs font-bold text-slate-800 truncate">${uName}</p></div><div class="w-1/4 text-center text-[10px] font-bold text-slate-400">${joinDate}</div><div class="w-1/4 text-right text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100">Level 1</div></div>`; 
            }
        });

        // Map Level 2
        allUsers.forEach(u => {
            const uCode = (u.name || "User").substring(0,3).toUpperCase() + (u.phone || "").substring((u.phone||"").length - 4);
            if(window.l1Codes.has(u.referCodeUsed)) window.l2Codes.add(uCode);
        });

        // Map Level 3
        allUsers.forEach(u => {
            const uCode = (u.name || "User").substring(0,3).toUpperCase() + (u.phone || "").substring((u.phone||"").length - 4);
            if(window.l2Codes.has(u.referCodeUsed)) window.l3Codes.add(uCode);
        });

        const l1Size = window.l1Codes.size;
        const l2Size = window.l2Codes.size;
        const l3Size = window.l3Codes.size;

        if(document.getElementById('total-refers-count')) document.getElementById('total-refers-count').innerText = l1Count; 
        if(document.getElementById('today-refers-count')) document.getElementById('today-refers-count').innerText = todayCount; 
        if(document.getElementById('graph-active-members')) document.getElementById('graph-active-members').innerText = l1Size + l2Size + l3Size;
        if(document.getElementById('referral-list-container')) document.getElementById('referral-list-container').innerHTML = referListHtml || "<p class='text-center py-10 text-slate-400 font-bold'>No referrals yet. Share your link!</p>"; 
        
        // --- 🔥 DYNAMIC GRAPH BADGES & BARS LOGIC 🔥 ---
        if(document.getElementById('badge-l1')) document.getElementById('badge-l1').innerText = l1Size;
        if(document.getElementById('badge-l2')) document.getElementById('badge-l2').innerText = l2Size;
        if(document.getElementById('badge-l3')) document.getElementById('badge-l3').innerText = l3Size;
        
        // Calculate Bar Height based on members
        let maxLvl = Math.max(1, l1Size, l2Size, l3Size); 
        let h1 = Math.max(5, (l1Size / maxLvl) * 80) + "%"; 
        let h2 = Math.max(5, (l2Size / maxLvl) * 80) + "%";
        let h3 = Math.max(5, (l3Size / maxLvl) * 80) + "%";
        
        if(document.getElementById('bar-l1')) document.getElementById('bar-l1').style.height = h1;
        if(document.getElementById('bar-l2')) document.getElementById('bar-l2').style.height = h2;
        if(document.getElementById('bar-l3')) document.getElementById('bar-l3').style.height = h3;

        window.referFlatBonus = 0; // Flat ₹5 OFF
        updateReferUI();
        window.updateLiveBalance();
    });

    // 3.2 Listen to ALL Task Submissions to calculate my tasks + 3-Level commissions
    onSnapshot(collection(db, "task_submissions"), (snap) => {
        let taskTotal = 0; 
        let commTotal = 0;
        window.mySubmissionsMap = {}; 
        window.mySubmissionsList = [];

        snap.forEach(d => { 
            const data = d.data();
            
            // Log My Tasks
            if(data.userPhone === userPhone) {
                window.mySubmissionsMap[data.gigName] = data; 
                window.mySubmissionsList.push(data); 
                if(data.status === "Approved" || data.status === "Completed") {
                    taskTotal += (data.gigReward || 0); 
                }
            }

            // Calculate 3-Level Network Commissions (10%, 6%, 3%)
            if(data.status === "Approved" || data.status === "Completed") {
                if(data.referrerCode === window.myReferCode) {
                    commTotal += (data.gigReward * 0.10); // L1
                } else if(window.l1Codes.has(data.referrerCode)) {
                    commTotal += (data.gigReward * 0.06); // L2
                } else if(window.l2Codes.has(data.referrerCode)) {
                    commTotal += (data.gigReward * 0.03); // L3
                }
            }
        }); 
        
        window.taskEarned = taskTotal;
        window.referCommission = parseFloat(commTotal.toFixed(2));
        
        if(document.getElementById("stat-task-earn")) document.getElementById("stat-task-earn").innerText = `₹${taskTotal}`; 
        
        renderExploreGigs(); 
        renderReviewTab(); 
        updateReferUI();
        window.updateLiveBalance(); 
    });

    // 3.3 Withdrawals Data
    onSnapshot(query(collection(db, "withdrawals"), where("userPhone", "==", userPhone)), (snap) => {
        let withTotal = 0; 
        const allTransactions = [];
        snap.forEach(d => { 
            const data = d.data(); 
            if(data.status !== "Rejected") {
                withTotal += (data.amount || 0); 
            }
            allTransactions.push({ type: 'debit', timestamp: data.timestamp, desc: 'Withdrawal to Bank', amt: data.amount, status: data.status }); 
        });
        window.withTotal = withTotal;
        if(document.getElementById("stat-total-withdraw")) document.getElementById("stat-total-withdraw").innerText = `₹${withTotal}`; 
        renderLedger(allTransactions); 
        window.updateLiveBalance();
    });
}

function updateReferUI() {
    const totalReferEarning = window.referFlatBonus + window.referCommission;
    if(document.getElementById('stat-refer-earn')) document.getElementById('stat-refer-earn').innerText = `₹${totalReferEarning.toFixed(2)}`; 
    const referBonusPageText = document.getElementById('total-refer-earnings');
    if(referBonusPageText) referBonusPageText.innerText = totalReferEarning.toFixed(2);
    if(document.getElementById('graph-network-income')) document.getElementById('graph-network-income').innerText = `₹${totalReferEarning.toFixed(2)}`;
}

// 🟢 4. ADVANCED 3-LEVEL LEDGER FIX
async function renderLedger(withs) {
    const historyCont = document.getElementById('history-container'); 
    if(!historyCont) return;

    let combined = [...withs];
    
    const taskSnap = await getDocs(collection(db, "task_submissions"));
    taskSnap.forEach(d => { 
        const data = d.data();
        
        // My Task Income
        if(data.userPhone === userPhone && (data.status === 'Approved' || data.status === 'Completed')) {
            combined.push({ type: 'credit', timestamp: data.timestamp, desc: `Task: ${data.gigName}`, amt: data.gigReward, status: 'Completed' }); 
        }
        
        // Commission Income
        if(data.status === 'Approved' || data.status === 'Completed') {
            if(data.referrerCode === window.myReferCode) {
                combined.push({ type: 'credit', timestamp: data.timestamp, desc: `L1 Comm. (10%)`, amt: parseFloat((data.gigReward * 0.10).toFixed(2)), status: 'Completed' }); 
            } else if(window.l1Codes.has(data.referrerCode)) {
                combined.push({ type: 'credit', timestamp: data.timestamp, desc: `L2 Comm. (6%)`, amt: parseFloat((data.gigReward * 0.06).toFixed(2)), status: 'Completed' }); 
            } else if(window.l2Codes.has(data.referrerCode)) {
                combined.push({ type: 'credit', timestamp: data.timestamp, desc: `L3 Comm. (3%)`, amt: parseFloat((data.gigReward * 0.03).toFixed(2)), status: 'Completed' }); 
            }
        }
    });

    combined.sort((a,b) => getSafeTime(b.timestamp) - getSafeTime(a.timestamp));
    
    let html = "";
    combined.forEach(item => {
        const isDebit = item.type === 'debit'; 
        const isPending = item.status === 'Pending';
        let iconBg = isDebit ? 'bg-rose-50' : 'bg-emerald-50'; 
        let iconColor = isDebit ? 'text-rose-500' : 'text-emerald-500'; 
        let icon = isDebit ? '↑' : '↓'; 
        let amtColor = isDebit ? 'text-slate-800' : 'text-emerald-500';
        
        if(isPending) { 
            iconBg = 'bg-orange-50'; 
            iconColor = 'text-orange-500'; 
            icon = '⏳'; 
            amtColor = 'text-slate-500'; 
        }
        
        html += `<div class="flex justify-between items-center border-b border-slate-50 pb-4 mb-4 ${isPending ? 'opacity-70' : ''}">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full ${iconBg} ${iconColor} flex items-center justify-center font-bold shrink-0 text-xl">${icon}</div>
                <div><p class="text-sm font-bold text-slate-800">${item.desc}</p><p class="text-[10px] text-slate-400 uppercase font-bold">${item.status}</p></div>
            </div>
            <p class="text-sm font-black ${amtColor}">${isDebit ? '-' : '+'} ₹${item.amt}</p>
        </div>`;
    });
    
    historyCont.innerHTML = html || "<div class='text-center py-10 opacity-60'><span class='text-5xl mb-3 block'>📭</span><p class='text-sm font-bold text-slate-800'>No transactions yet</p></div>";
}

// 🟢 5. RENDER EXPLORE GIGS
window.renderExploreGigs = function() {
    let html = ""; 
    Object.values(window.liveGigs).forEach(g => {
        if(window.mySubmissionsMap[g.title]) return;
        if(window.myActiveGig && window.myActiveGig.title === g.title) return;
        
        html += `<div class="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden mb-4">
            <div class="absolute -right-4 -top-2 opacity-[0.03] text-8xl pointer-events-none">🚀</div>
            <h4 class="font-black text-xl text-slate-800 mb-2">${g.title}</h4>
            <div class="flex items-center gap-3 mb-5">
                <span class="text-emerald-500 font-bold text-sm">Reward: ₹${g.reward}</span>
                <span class="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-md">Direct Pay</span>
            </div>
            <button onclick="window.openGigSheet('${g.title}', 'explore')" class="w-full bg-[#0F172A] text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition">View Task Details</button>
        </div>`;
    });
    const gc = document.getElementById('gigs-container');
    if(gc) gc.innerHTML = html || "<p class='text-center py-10 font-bold text-slate-400'>No new tasks available. Check back later!</p>";
}

// 🟢 6. RENDER REVIEW TAB
window.renderReviewTab = function() {
    let html = ""; 
    window.mySubmissionsList.sort((a,b) => getSafeTime(b.timestamp) - getSafeTime(a.timestamp));
    
    window.mySubmissionsList.forEach(sub => {
        let badgeColor = "bg-orange-50 text-orange-600 border-orange-100"; let icon = "⏳";
        if(sub.status === "Approved" || sub.status === "Completed") { badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100"; icon = "✅"; }
        if(sub.status === "Rejected") { badgeColor = "bg-rose-50 text-rose-600 border-rose-100"; icon = "❌"; }
        html += `<div class="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] mb-4"><div class="flex justify-between items-start mb-3"><h4 class="font-black text-lg text-slate-800 pr-2">${sub.gigName}</h4><span class="${badgeColor} text-[10px] font-black px-2 py-1 rounded-md border shrink-0">${icon} ${sub.status}</span></div><p class="text-xs font-bold text-emerald-500 bg-emerald-50 inline-block px-2 py-1 rounded border border-emerald-100">Reward: ₹${sub.gigReward}</p></div>`;
    });
    const rc = document.getElementById('review-container');
    if(rc) rc.innerHTML = html || `<div class="text-center py-20 text-slate-400 font-bold"><div class="text-5xl mb-4 opacity-50">📂</div>No tasks under review.</div>`;
}

// FETCH GIGS FROM DB
onSnapshot(collection(db, "gigs"), (snap) => { 
    window.liveGigs = {}; 
    snap.forEach(doc => { const g = doc.data(); window.liveGigs[g.title] = g; }); 
    renderExploreGigs(); 
});

// DYNAMIC SHEET HANDLER
window.openGigSheet = (gigTitleOrNull, mode) => {
    if(mode === 'explore') { window.viewingGigData = window.liveGigs[gigTitleOrNull]; } 
    else { window.viewingGigData = window.myActiveGig; }
    if(!window.viewingGigData) return; 
    
    const tOb = document.getElementById('sheet-gig-title'); if(tOb) tOb.innerText = window.viewingGigData.title; 
    const rOb = document.getElementById('sheet-gig-reward'); if(rOb) rOb.innerText = `₹${window.viewingGigData.reward} Reward`; 
    const dOb = document.getElementById('sheet-gig-desc'); if(dOb) dOb.innerText = window.viewingGigData.desc || window.viewingGigData.link || "Follow the instructions provided.";
    
    const ex = document.getElementById('task-action-explore');
    const su = document.getElementById('task-action-submit');

    if(mode === 'explore') { 
        if(ex) ex.classList.remove('hidden'); 
        if(su) su.classList.add('hidden'); 
    } else { 
        if(ex) ex.classList.add('hidden'); 
        if(su) su.classList.remove('hidden'); 
    }
    window.openSheet('task-sheet');
}

window.openSubmitSheet = () => { window.openGigSheet(null, 'progress'); }

// ACCEPT TASK
window.acceptTask = async () => {
    if(!window.viewingGigData) return; 
    if(window.myActiveGig) return window.showToast("⚠️ You already have an active task!");
    
    const btn = document.querySelector("#task-action-explore button"); 
    if(btn) { btn.disabled = true; btn.innerText = "Accepting..."; }
    
    try {
        await updateDoc(doc(db, "users", window.userDocId), { activeGig: window.viewingGigData });
        
        let taskLink = window.viewingGigData.link;
        if(taskLink && taskLink.startsWith('http')) {
            if (taskLink.includes('{user_phone}')) {
                taskLink = taskLink.replace('{user_phone}', userPhone);
            } else if (!taskLink.includes('subid=')) {
                if (taskLink.includes('?')) {
                    taskLink += `&subid=${userPhone}`; 
                } else {
                    taskLink += `?subid=${userPhone}`;
                }
            }
            window.open(taskLink, '_blank');
        }

        window.closeAllSheets(); 
        window.switchWsTab('active', document.querySelectorAll('.ws-tab')[1]); 
        window.showToast("✅ Task Accepted!");
    } catch (e) { 
        window.showToast("❌ Failed. Try again."); 
    } finally { 
        if(btn) { btn.disabled = false; btn.innerText = "Accept & Start Task"; } 
    }
}

// SUBMIT PROOF
window.submitTaskProofReal = async () => {
    if(!window.myActiveGig) return window.showToast("⚠️ No active task found!");
    const f = document.getElementById("proof-image").files[0]; 
    const remarkField = document.getElementById("proof-remark"); 
    const remark = remarkField ? remarkField.value : "No Remark";
    
    if(!f) return window.showToast("⚠️ Please select a screenshot proof!");
    const btn = document.getElementById("submit-proof-btn"); 
    if(btn) { btn.disabled = true; btn.innerText = "Uploading..."; }
    
    try {
        const formData = new FormData(); formData.append("image", f);
        const res = await fetch("https://api.imgbb.com/1/upload?key=7d2c13c8fedf546d91b46d36c1ef76d0", { method: "POST", body: formData }).then(r => r.json());
        if(!res.success) throw new Error("ImgBB Failed");
        
        await addDoc(collection(db, "task_submissions"), { 
            userPhone, 
            gigName: window.myActiveGig.title, 
            gigReward: window.myActiveGig.reward, 
            proofLink: res.data.url, 
            remark: remark, 
            referrerCode: window.myReferrerCode, 
            status: "Pending Approval", 
            timestamp: new Date() 
        });
        
        await updateDoc(doc(db, "users", window.userDocId), { activeGig: null });
        const pi = document.getElementById("proof-image"); if(pi) pi.value = ""; 
        if(remarkField) remarkField.value = "";
        
        window.showToast("🚀 Successfully Submitted!"); 
        window.closeAllSheets(); 
        window.switchWsTab('review', document.querySelectorAll('.ws-tab')[2]);
    } catch (e) { 
        window.showToast("❌ Upload Failed. Try again."); 
    } finally { 
        if(btn) { btn.disabled = false; btn.innerText = "Submit For Verification"; }
    }
}

// ACTIONS
window.saveRealKYC = async function() { 
    const n = document.getElementById("bank-name-input").value.trim(); 
    const u = document.getElementById("upi-input-box").value.trim(); 
    if(n.length < 3 || !u.includes("@")) return window.showToast("⚠️ Invalid Name or UPI"); 
    try { await updateDoc(doc(db, "users", window.userDocId), { bankName: n, upi: u }); window.showToast("✅ Details Locked!"); setTimeout(() => window.closeAllSheets(), 1000); } catch (e) { window.showToast("❌ Error saving."); } 
}

window.processWithdrawReal = async function() { 
    const amt = parseInt(document.getElementById("withdraw-amount").value); 
    if(!amt || amt < 50) return window.showToast("⚠️ Min ₹50"); 
    if(amt > window.currentBalance) return window.showToast("❌ Insufficient Balance"); 
    
    const btn = document.getElementById("withdraw-btn"); 
    if(btn) { btn.disabled = true; btn.innerText = "Processing Securely..."; }
    
    try { 
        await updateDoc(doc(db, "users", window.userDocId), { balance: window.currentBalance - amt }); 
        await addDoc(collection(db, "withdrawals"), { userPhone, userName: window.savedBankName, amount: amt, upi: window.savedUPI, status: "Pending", timestamp: new Date() }); 
        window.showToast("🚀 Sent securely!"); window.closeFullPage('withdraw-page'); 
    } catch(e) { 
        window.showToast("❌ Failed"); 
    } finally { 
        if(btn) { btn.innerHTML = `Proceed Securely`; btn.disabled = false; }
    } 
}
