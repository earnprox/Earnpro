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

// ================= REFRESH STATE HANDLER & CACHE =================
document.addEventListener("DOMContentLoaded", () => {
    const savedTab = sessionStorage.getItem('lastActiveTab');
    const savedFullPage = sessionStorage.getItem('lastActiveFullPage');

    if(savedTab) { window.switchTab(savedTab); }
    if(savedFullPage) {
        const fp = document.getElementById(savedFullPage);
        if(fp) fp.classList.add('full-page-active');
    }

    // 🔥 FIX: INSTANT CACHE LOAD (Flash issue solved)
    const cachedName = localStorage.getItem("epx_cached_name");
    const cachedBal = localStorage.getItem("epx_cached_bal");

    if(cachedName) {
        const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };
        setText("home-card-user-name", cachedName);
        setText("profile-user-name", cachedName);
        setText("refer-page-name", cachedName);
        if(document.getElementById("home-user-name")) document.getElementById("home-user-name").innerText = cachedName.split(" ")[0];
    }
    
    if(cachedBal) {
        const mainBal = document.getElementById("main-balance-display");
        if(document.getElementById("home-top-balance")) document.getElementById("home-top-balance").innerText = `₹${cachedBal}`;
        if(mainBal) mainBal.innerHTML = `₹ ${cachedBal}<span class="text-xl text-slate-500 font-bold drop-shadow-none">.00</span>`;
        if(document.getElementById("withdraw-page-balance")) document.getElementById("withdraw-page-balance").innerText = `₹${cachedBal}`;
    }
});

// ================= UI FUNCTIONS =================
window.showToast = (m) => { 
    const t = document.getElementById("toast"); 
    if(t) { 
        t.innerText = m; 
        t.classList.add("show"); 
        // Force reflow for animation restart if clicked multiple times
        void t.offsetWidth; 
        setTimeout(() => t.classList.remove("show"), 3000); 
    } 
};

window.switchTab = (id) => { 
    sessionStorage.setItem('lastActiveTab', id); 
    const h = document.getElementById('main-header'); 
    if(id === 'home') { if(h) h.style.display = 'none'; } 
    else { if(h) { h.style.display = 'flex'; h.style.opacity = '1'; } } 
    
    // Smooth opacity transition for tabs
    document.querySelectorAll('.tab-content').forEach(t => {
        t.style.opacity = '0';
        setTimeout(() => t.classList.remove('active'), 150);
    }); 
    
    setTimeout(() => {
        const target = document.getElementById('view-' + id); 
        if(target) {
            target.classList.add('active'); 
            // Trigger reflow
            void target.offsetWidth;
            target.style.opacity = '1';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }, 150);

    // Update Nav Active State
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === id) {
            btn.classList.remove('text-slate-400');
            btn.classList.add('text-blue-600');
        } else {
            btn.classList.add('text-slate-400');
            btn.classList.remove('text-blue-600');
        }
    });
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
    const targetContent = document.getElementById('ws-' + id);
    if(targetContent) targetContent.classList.add('active'); 
};

window.openSheet = (id) => { 
    const overlay = document.getElementById('universal-overlay');
    const sheet = document.getElementById(id);
    if(overlay && sheet) {
        overlay.classList.add('modal-active'); 
        sheet.classList.add('sheet-active'); 
    }
    if(id === 'notification-sheet') {
        const badge = document.getElementById("notification-badge");
        if(badge) badge.classList.add("hidden");
    }
};

window.closeAllSheets = () => { 
    document.querySelectorAll('.sheet-active').forEach(s => s.classList.remove('sheet-active')); 
    const overlay = document.getElementById('universal-overlay');
    if(overlay) overlay.classList.remove('modal-active'); 
};

window.openFullPage = (id) => { 
    if(!window.savedUPI && id === 'withdraw-page') return window.showToast("⚠️ Link Payout Settings first!"); 
    sessionStorage.setItem('lastActiveFullPage', id);
    const fp = document.getElementById(id);
    if(fp) {
        fp.classList.add('full-page-active'); 
        if(id === 'withdraw-page') setTimeout(() => document.getElementById("withdraw-amount").focus(), 300); 
    }
};

window.closeFullPage = (id) => { 
    sessionStorage.removeItem('lastActiveFullPage');
    const fp = document.getElementById(id);
    if(fp) fp.classList.remove('full-page-active'); 
};

window.logoutUser = () => { 
    if(confirm("Are you sure you want to log out?")) { 
        localStorage.removeItem("earnprox_user_phone"); 
        sessionStorage.clear();
        window.location.href="index.html"; 
    } 
};

window.copyReferLink = () => { 
    if(!window.myReferCode) return window.showToast("⚠️ Code not ready"); 
    navigator.clipboard.writeText(`https://earnprox.in/index.html?ref=${window.myReferCode}`).then(()=>window.showToast("✅ Code Copied!")); 
};

window.shareOnWhatsApp = () => { 
    if(!window.myReferCode) return window.showToast("⚠️ Link not ready"); 
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
            
            // 🔥 HIDE THE ANIMATED LOGO LOADER SMOOTHLY
            const appLoader = document.getElementById("app-loader");
            if(appLoader) {
                appLoader.style.opacity = "0"; 
                appLoader.style.pointerEvents = "none";
                setTimeout(() => {
                    appLoader.style.display = "none";
                }, 500); 
            }

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

            // 🔥 CACHE THE NAME FOR NEXT RELOAD
            localStorage.setItem("epx_cached_name", realName);

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

            // Safe DOM Updates
            const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };
            
            setText("home-user-name", realName.split(" ")[0]); 
            setText("profile-user-name", realName);
            setText("profile-user-phone", "+91 " + userPhone); 
            setText("refer-page-name", realName);
            setText("referral-code-text", window.myReferCode); 
            setText("withdraw-display-name", window.savedBankName || "Bank Transfer");
            setText("withdraw-display-upi", window.savedUPI || "Processing..."); 
            setText("withdraw-avatar-text", (window.savedBankName || realName).charAt(0).toUpperCase());
            setText("home-card-user-name", realName);
            setText("home-card-refer-code", window.myReferCode);

            const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${realName}&backgroundColor=b6e3f4`;
            const setImg = (id) => { const el = document.getElementById(id); if(el) el.src = avatarUrl; };
            setImg("home-profile-avatar"); setImg("header-avatar"); setImg("profile-avatar"); setImg("refer-profile-img");

            if(window.savedUPI) {
                const badge = document.getElementById("upi-status-badge");
                if(badge) {
                    badge.innerText = "Verified ✅"; 
                    badge.className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                }
                setText("bank-display-text", window.savedBankName); 
                setText("upi-display-text", window.savedUPI);
                
                const bNameInput = document.getElementById("bank-name-input");
                if(bNameInput) { bNameInput.value = window.savedBankName; bNameInput.disabled = true; }
                const upiInput = document.getElementById("upi-input-box");
                if(upiInput) { upiInput.value = window.savedUPI; upiInput.disabled = true; }
                
                const kycBtn = document.querySelector("#kyc-sheet button"); 
                if(kycBtn) { 
                    kycBtn.innerText = "Verified & Locked 🔒"; 
                    kycBtn.disabled = true; 
                    kycBtn.classList.remove("bg-[#1E293B]", "hover:bg-slate-800");
                    kycBtn.classList.add("bg-emerald-500", "opacity-80", "cursor-not-allowed"); 
                }
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
            <div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mb-3 hover:bg-indigo-50 transition-colors duration-200">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-black text-indigo-900 text-sm">${n.title}</h4>
                    <span class="text-[9px] font-bold text-indigo-400 bg-white px-2 py-1 rounded border border-indigo-50">${timeDate}</span>
                </div>
                <p class="text-xs text-indigo-700 font-medium leading-relaxed">${n.message}</p>
            </div>`;
        });

        const notifContainer = document.getElementById("notification-container");
        if(notifContainer) notifContainer.innerHTML = notifHtml || "<div class='text-center py-10 opacity-60'><span class='text-4xl mb-3 block'>🔔</span><p class='text-sm font-bold text-slate-500'>No new alerts.</p></div>";

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

    // 🔥 CACHE THE BALANCE FOR NEXT RELOAD
    localStorage.setItem("epx_cached_bal", window.currentBalance);

    const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };

    setText("stat-total-earn", `₹${totalEarned.toFixed(2)}`);
    setText("home-top-balance", `₹${window.currentBalance}`);
    setText("withdraw-page-balance", `₹${window.currentBalance}`);
    
    const mainBal = document.getElementById("main-balance-display");
    if(mainBal) mainBal.innerHTML = `₹ ${window.currentBalance}<span class="text-xl text-slate-500 font-bold drop-shadow-none">.00</span>`;
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
                referListHtml += `<div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200"><div class="w-1/2 flex items-center gap-2 overflow-hidden"><div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">${uName.charAt(0).toUpperCase()}</div><p class="text-xs font-bold text-slate-800 truncate">${uName}</p></div><div class="w-1/4 text-center text-[10px] font-bold text-slate-400">${joinDate}</div><div class="w-1/4 text-right text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100">Level 1</div></div>`; 
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

        const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };

        setText('total-refers-count', l1Count); 
        setText('today-refers-count', todayCount); 
        setText('graph-active-members', l1Size + l2Size + l3Size);
        
        const referCont = document.getElementById('referral-list-container');
        if(referCont) referCont.innerHTML = referListHtml || `<div class="text-4xl mb-3 text-center mt-6">🌱</div><p class="text-center text-slate-400 font-bold text-sm">No referrals yet.<br>Share your link & watch your network grow!</p>`; 
        
        // --- 🔥 DYNAMIC GRAPH BADGES & BARS LOGIC 🔥 ---
        setText('badge-l1', l1Size);
        setText('badge-l2', l2Size);
        setText('badge-l3', l3Size);
        
        // Calculate Bar Height based on members
        let maxLvl = Math.max(1, l1Size, l2Size, l3Size); 
        let h1 = Math.max(5, (l1Size / maxLvl) * 80) + "%"; 
        let h2 = Math.max(5, (l2Size / maxLvl) * 80) + "%";
        let h3 = Math.max(5, (l3Size / maxLvl) * 80) + "%";
        
        const setHeight = (id, h) => { const el = document.getElementById(id); if(el) el.style.height = h; };
        setHeight('bar-l1', h1);
        setHeight('bar-l2', h2);
        setHeight('bar-l3', h3);

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
        
        const statTask = document.getElementById("stat-task-earn");
        if(statTask) statTask.innerText = `₹${taskTotal}`; 
        
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
        const statWith = document.getElementById("stat-total-withdraw");
        if(statWith) statWith.innerText = `₹${withTotal}`; 
        renderLedger(allTransactions); 
        window.updateLiveBalance();
    });
}

function updateReferUI() {
    const totalReferEarning = window.referFlatBonus + window.referCommission;
    const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };
    
    setText('stat-refer-earn', `₹${totalReferEarning.toFixed(2)}`); 
    setText('total-refer-earnings', totalReferEarning.toFixed(2));
    setText('graph-network-income', `₹${totalReferEarning.toFixed(2)}`);
}

// 🟢 4. ADVANCED 3-LEVEL LEDGER FIX
async function renderLedger(withs) {
    const historyCont = document.getElementById('history-container'); 
    if(!historyCont) return;

    let combined = [...withs];
    
    try {
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
    } catch(e) {
        console.error("Ledger fetch error:", e);
    }

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
        
        html += `<div class="flex justify-between items-center border-b border-slate-50 pb-4 mb-4 ${isPending ? 'opacity-70' : ''} hover:bg-slate-50 transition-colors duration-200 p-2 rounded-lg -mx-2">
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
        
        html += `<div class="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow duration-200 relative overflow-hidden mb-4 group">
            <div class="absolute -right-4 -top-2 opacity-[0.03] text-8xl pointer-events-none group-hover:scale-110 transition-transform duration-500">🚀</div>
            <h4 class="font-black text-xl text-slate-800 mb-2">${g.title}</h4>
            <div class="flex items-center gap-3 mb-5">
                <span class="text-emerald-500 font-bold text-sm bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Reward: ₹${g.reward}</span>
                <span class="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-md border border-blue-100">Direct Pay</span>
            </div>
            <button onclick="window.openGigSheet('${g.title}', 'explore')" class="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-all duration-200">View Task Details</button>
        </div>`;
    });
    const gc = document.getElementById('gigs-container');
    if(gc) gc.innerHTML = html || `<div class="text-center py-20 opacity-60"><span class="text-5xl mb-4 block">🔍</span><p class="font-bold text-slate-500">No new tasks available.<br>Check back later!</p></div>`;
}

// 🟢 6. RENDER REVIEW TAB
window.renderReviewTab = function() {
    let html = ""; 
    window.mySubmissionsList.sort((a,b) => getSafeTime(b.timestamp) - getSafeTime(a.timestamp));
    
    window.mySubmissionsList.forEach(sub => {
        let badgeColor = "bg-orange-50 text-orange-600 border-orange-100"; let icon = "⏳";
        if(sub.status === "Approved" || sub.status === "Completed") { badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100"; icon = "✅"; }
        if(sub.status === "Rejected") { badgeColor = "bg-rose-50 text-rose-600 border-rose-100"; icon = "❌"; }
        html += `<div class="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow duration-200 mb-4"><div class="flex justify-between items-start mb-3"><h4 class="font-black text-lg text-slate-800 pr-2">${sub.gigName}</h4><span class="${badgeColor} text-[10px] font-black px-2 py-1 rounded-md border shrink-0">${icon} ${sub.status}</span></div><p class="text-xs font-bold text-emerald-500 bg-emerald-50 inline-block px-2 py-1 rounded border border-emerald-100">Reward: ₹${sub.gigReward}</p></div>`;
    });
    const rc = document.getElementById('review-container');
    if(rc) rc.innerHTML = html || `<div class="text-center py-20 text-slate-400 font-bold opacity-60"><div class="text-5xl mb-4">📂</div>No tasks under review.</div>`;
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
    
    const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };

    setText('sheet-gig-title', window.viewingGigData.title); 
    setText('sheet-gig-reward', `₹${window.viewingGigData.reward} Reward`); 
    setText('sheet-gig-desc', window.viewingGigData.desc || window.viewingGigData.link || "Follow the instructions provided.");
    
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
    if(btn) { btn.disabled = true; btn.innerText = "Accepting..."; btn.classList.add("opacity-70", "cursor-not-allowed"); }
    
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
        if(btn) { btn.disabled = false; btn.innerText = "Accept & Start Task"; btn.classList.remove("opacity-70", "cursor-not-allowed"); } 
    }
}

// SUBMIT PROOF
window.submitTaskProofReal = async () => {
    if(!window.myActiveGig) return window.showToast("⚠️ No active task found!");
    
    const imgInput = document.getElementById("proof-image");
    const f = imgInput ? imgInput.files[0] : null; 
    const remarkField = document.getElementById("proof-remark"); 
    const remark = remarkField ? remarkField.value : "No Remark";
    
    if(!f) return window.showToast("⚠️ Please select a screenshot proof!");
    
    const btn = document.getElementById("submit-proof-btn"); 
    if(btn) { btn.disabled = true; btn.innerText = "Uploading..."; btn.classList.add("opacity-70", "cursor-not-allowed"); }
    
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
        if(imgInput) imgInput.value = ""; 
        if(remarkField) remarkField.value = "";
        
        window.showToast("🚀 Successfully Submitted!"); 
        window.closeAllSheets(); 
        window.switchWsTab('review', document.querySelectorAll('.ws-tab')[2]);
    } catch (e) { 
        window.showToast("❌ Upload Failed. Try again."); 
    } finally { 
        if(btn) { btn.disabled = false; btn.innerText = "Submit For Verification"; btn.classList.remove("opacity-70", "cursor-not-allowed"); }
    }
}

// ACTIONS
window.saveRealKYC = async function() { 
    const nInput = document.getElementById("bank-name-input");
    const uInput = document.getElementById("upi-input-box");
    if(!nInput || !uInput) return;

    const n = nInput.value.trim(); 
    const u = uInput.value.trim(); 
    if(n.length < 3 || !u.includes("@")) return window.showToast("⚠️ Invalid Name or UPI"); 
    
    try { 
        await updateDoc(doc(db, "users", window.userDocId), { bankName: n, upi: u }); 
        window.showToast("✅ Details Locked!"); 
        setTimeout(() => window.closeAllSheets(), 1000); 
    } catch (e) { 
        window.showToast("❌ Error saving."); 
    } 
}

window.processWithdrawReal = async function() { 
    const amtInput = document.getElementById("withdraw-amount");
    if(!amtInput) return;
    
    const amt = parseInt(amtInput.value); 
    if(!amt || amt < 50) return window.showToast("⚠️ Min ₹50"); 
    if(amt > window.currentBalance) return window.showToast("❌ Insufficient Balance"); 
    
    const btn = document.getElementById("withdraw-btn"); 
    if(btn) { 
        btn.disabled = true; 
        btn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`; 
        btn.classList.add("opacity-80", "cursor-not-allowed");
    }
    
    try { 
        await updateDoc(doc(db, "users", window.userDocId), { balance: window.currentBalance - amt }); 
        await addDoc(collection(db, "withdrawals"), { userPhone, userName: window.savedBankName, amount: amt, upi: window.savedUPI, status: "Pending", timestamp: new Date() }); 
        window.showToast("🚀 Sent securely!"); 
        window.closeFullPage('withdraw-page'); 
        amtInput.value = ""; // Clear input after success
    } catch(e) { 
        window.showToast("❌ Failed"); 
    } finally { 
        if(btn) { 
            btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Proceed Securely`; 
            btn.disabled = false; 
            btn.classList.remove("opacity-80", "cursor-not-allowed");
        }
    } 
}
