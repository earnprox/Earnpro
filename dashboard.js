import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS =================
window.currentBalance = 0;
window.savedUPI = "";
window.savedBankName = "";
window.userDocId = null;
window.myReferCode = "";
window.referBonusPerUser = 5; 

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    if(toast) {
        toast.innerText = message;
        toast.classList.add("show");
        setTimeout(() => { toast.classList.remove("show"); }, 3000);
    }
}

// 🔥 NAV SYSTEM
window.switchTab = function(tabId) {
    const mainHeader = document.getElementById('main-header');
    if(tabId === 'home') {
        if(mainHeader) mainHeader.style.display = 'none';
    } else {
        if(mainHeader) {
            mainHeader.style.display = 'flex';
            mainHeader.style.opacity = '1';
        }
    }
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById('view-' + tabId);
    if(target) target.classList.add('active');
    window.scrollTo(0,0);
}

window.switchWsTab = function(wsId, btnElement) {
    document.querySelectorAll('.ws-tab').forEach(tab => {
        tab.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
        tab.classList.add('text-slate-500');
    });
    if(btnElement) {
        btnElement.classList.remove('text-slate-500');
        btnElement.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
    }
    document.querySelectorAll('.ws-content').forEach(content => content.classList.remove('active'));
    document.getElementById('ws-' + wsId).classList.add('active');
}

window.openSheet = function(sheetId) {
    document.getElementById('universal-overlay').classList.add('modal-active');
    document.getElementById(sheetId).classList.add('sheet-active');
}

window.closeAllSheets = function() {
    document.querySelectorAll('.sheet-active').forEach(s => s.classList.remove('sheet-active'));
    document.getElementById('universal-overlay').classList.remove('modal-active');
}

window.openFullPage = function(pageId) {
    if(!window.savedUPI) { window.showToast("⚠️ Link UPI in Payout Settings first!"); return; }
    document.getElementById(pageId).classList.add('full-page-active');
    if(pageId === 'withdraw-page') setTimeout(() => document.getElementById("withdraw-amount").focus(), 300);
}

window.closeFullPage = function(pageId) {
    document.getElementById(pageId).classList.remove('full-page-active');
}

window.logoutUser = function() {
    if(confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("earnprox_user_phone");
        window.location.href = "index.html";
    }
}

window.copyReferLink = function() {
    if(!window.myReferCode) return;
    const link = `https://earnprox.in/index.html?ref=${window.myReferCode}`;
    navigator.clipboard.writeText(link).then(() => {
        window.showToast("✅ Referral Link Copied!");
    }).catch(err => { window.showToast("⚠️ Failed to copy!"); });
}

window.shareOnWhatsApp = function() {
    if(!window.myReferCode) return;
    const link = `https://earnprox.in/index.html?ref=${window.myReferCode}`;
    const promoMessage = `🔥 Bro! I found this app *EarnproX*. Complete tasks and earn cash! \n\nUse code *${window.myReferCode}*\n👇👇\n${link} 🚀`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(promoMessage)}`, '_blank');
}

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

const getSafeTime = (ts) => {
    return ts ? (ts.toMillis ? ts.toMillis() : new Date(ts).getTime()) : 0;
};

// 🟢 1. MASTER SYNC ENGINE (REAL-TIME DATA)
if(userPhone) {
    const q = query(collection(db, "users"), where("phone", "==", userPhone));
    onSnapshot(q, (snapshot) => {
        if(!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            window.userDocId = docSnap.id;
            const u = docSnap.data();
            
            window.currentBalance = u.balance || 0;
            window.savedUPI = u.upi || "";
            window.savedBankName = u.bankName || "";
            const realName = u.name || "User";
            window.myReferCode = (realName.substring(0,3) + userPhone.substring(userPhone.length - 4)).toUpperCase();

            // Update UI
            document.getElementById("home-user-name").innerText = realName.split(" ")[0];
            document.getElementById("profile-user-name").innerText = realName;
            document.getElementById("profile-user-phone").innerText = "+91 " + userPhone;
            document.getElementById("home-top-balance").innerText = `₹${window.currentBalance}`;
            document.getElementById("main-balance-display").innerHTML = `₹ ${window.currentBalance}<span class="text-xl text-slate-500 font-bold">.00</span>`;
            document.getElementById("withdraw-page-balance").innerText = `₹${window.currentBalance}`;
            document.getElementById("refer-page-name").innerText = realName;
            document.getElementById("referral-code-text").innerText = window.myReferCode;
            document.getElementById("withdraw-display-name").innerText = window.savedBankName || "Bank Transfer";
            document.getElementById("withdraw-display-upi").innerText = window.savedUPI || "Processing...";
            document.getElementById("withdraw-avatar-text").innerText = (window.savedBankName || realName).charAt(0).toUpperCase();

            // Avatar Logic
            const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${realName}&backgroundColor=b6e3f4`;
            document.getElementById("home-profile-avatar").src = avatarUrl;
            document.getElementById("header-avatar").src = avatarUrl;
            document.getElementById("profile-avatar").src = avatarUrl;
            document.getElementById("refer-profile-img").src = avatarUrl;

            // Payout settings lock
            if(window.savedUPI) {
                document.getElementById("upi-status-badge").innerText = "Verified ✅";
                document.getElementById("upi-status-badge").className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                document.getElementById("bank-display-text").innerText = window.savedBankName;
                document.getElementById("upi-display-text").innerText = window.savedUPI;
                
                const bnameInput = document.getElementById("bank-name-input");
                const upiInput = document.getElementById("upi-input-box");
                const kycBtn = document.querySelector("#kyc-sheet button");
                if(bnameInput) { bnameInput.value = window.savedBankName; bnameInput.disabled = true; }
                if(upiInput) { upiInput.value = window.savedUPI; upiInput.disabled = true; }
                if(kycBtn) { kycBtn.innerText = "Verified & Locked 🔒"; kycBtn.disabled = true; kycBtn.classList.add("bg-emerald-500"); }
            }

            // 🔥 Fetch Stats and History
            syncStatsAndHistory();
        }
    });
}

// 🟢 2. SYNC STATS & HISTORY
async function syncStatsAndHistory() {
    if(!userPhone || !window.myReferCode) return;

    const taskQ = query(collection(db, "task_submissions"), where("userPhone", "==", userPhone));
    const referQ = query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode));
    const withQ = query(collection(db, "withdrawals"), where("userPhone", "==", userPhone));

    // Listeners for Stats
    onSnapshot(taskQ, (snap) => {
        let taskTotal = 0;
        snap.forEach(d => { if(d.data().status === "Completed") taskTotal += (d.data().gigReward || 0); });
        document.getElementById("stat-task-earn").innerText = `₹${taskTotal}`;
        updateTotalEarning();
    });

    onSnapshot(referQ, (snap) => {
        let totalCount = 0;
        let todayCount = 0;
        let referListHtml = "";
        
        const docsArr = [];
        snap.forEach(d => docsArr.push(d.data()));
        docsArr.sort((a,b) => getSafeTime(b.timestamp) - getSafeTime(a.timestamp));

        docsArr.forEach(data => {
            totalCount++;
            if(isToday(data.timestamp)) todayCount++;
            
            const joinDate = data.timestamp ? new Date(getSafeTime(data.timestamp)).toLocaleDateString('en-GB') : "Recently";
            const uName = data.name || "User";

            referListHtml += `<div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div class="w-1/2 flex items-center gap-2 overflow-hidden"><div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">${uName.charAt(0).toUpperCase()}</div><p class="text-xs font-bold text-slate-800 truncate">${uName}</p></div>
                <div class="w-1/4 text-center text-[10px] font-bold text-slate-400">${joinDate}</div>
                <div class="w-1/4 text-right text-xs font-black text-emerald-500">+₹${window.referBonusPerUser}</div></div>`;
        });
        document.getElementById('total-refers-count').innerText = totalCount;
        document.getElementById('today-refers-count').innerText = todayCount;
        document.getElementById('stat-refer-earn').innerText = `₹${totalCount * window.referBonusPerUser}`;
        document.getElementById('referral-list-container').innerHTML = referListHtml || "<p class='text-center py-10 text-slate-400 font-bold'>No referrals yet.</p>";
        updateTotalEarning();
    });

    onSnapshot(withQ, (snap) => {
        let withTotal = 0;
        const allTransactions = [];

        snap.forEach(d => {
            const data = d.data();
            withTotal += (data.amount || 0);
            allTransactions.push({
                type: 'debit', timestamp: data.timestamp, desc: 'Withdrawal to Bank', amt: data.amount, status: data.status
            });
        });
        document.getElementById("stat-total-withdraw").innerText = `₹${withTotal}`;
        
        // Final Ledger Display
        renderLedger(allTransactions);
    });
}

function updateTotalEarning() {
    const t = parseInt(document.getElementById("stat-task-earn").innerText.replace("₹","")) || 0;
    const r = parseInt(document.getElementById("stat-refer-earn").innerText.replace("₹","")) || 0;
    document.getElementById("stat-total-earn").innerText = `₹${t + r}`;
}

// 🟢 3. LEDGER RENDERER
async function renderLedger(withs) {
    const historyCont = document.getElementById('history-container');
    let combined = [...withs];

    // Get Completed Tasks
    const taskSnap = await getDocs(query(collection(db, "task_submissions"), where("userPhone", "==", userPhone), where("status", "==", "Completed")));
    taskSnap.forEach(d => {
        combined.push({ type: 'credit', timestamp: d.data().timestamp, desc: `Task: ${d.data().gigName}`, amt: d.data().gigReward, status: 'Completed' });
    });

    // Get Refers
    const referSnap = await getDocs(query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode)));
    referSnap.forEach(d => {
        combined.push({ type: 'credit', timestamp: d.data().timestamp, desc: `Refer Bonus (${d.data().name})`, amt: window.referBonusPerUser, status: 'Completed' });
    });

    // Safe Sort
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
            iconBg = 'bg-orange-50'; iconColor = 'text-orange-500'; icon = '⏳'; amtColor = 'text-slate-500';
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

// 🟢 4. ACTIONS (KYC, Withdraw)
window.saveRealKYC = async function() {
    const n = document.getElementById("bank-name-input").value.trim();
    const u = document.getElementById("upi-input-box").value.trim();
    if(n.length < 3 || !u.includes("@")) return window.showToast("⚠️ Invalid Name or UPI");
    try {
        await updateDoc(doc(db, "users", window.userDocId), { bankName: n, upi: u });
        window.showToast("✅ Details Locked!"); setTimeout(() => window.closeAllSheets(), 1000);
    } catch (e) { window.showToast("❌ Error saving details."); }
}

window.processWithdrawReal = async function() {
    const amt = parseInt(document.getElementById("withdraw-amount").value);
    if(!amt || amt < 50) return window.showToast("⚠️ Minimum ₹50 required");
    if(amt > window.currentBalance) return window.showToast("❌ Insufficient Balance");

    const btn = document.getElementById("withdraw-btn");
    btn.disabled = true; btn.innerText = "Processing Securely...";
    try {
        await updateDoc(doc(db, "users", window.userDocId), { balance: window.currentBalance - amt });
        await addDoc(collection(db, "withdrawals"), { userPhone, userName: window.savedBankName, amount: amt, upi: window.savedUPI, status: "Pending", timestamp: new Date() });
        window.showToast("🚀 Sent securely to Admin!"); window.closeFullPage('withdraw-page');
    } catch(e) { window.showToast("❌ Transaction Failed"); }
    finally { btn.innerHTML = `<svg class="w-5 h-5 inline-block -mt-1 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Proceed Securely`; btn.disabled = false; }
}

// 🟢 5. GIG ENGINE
onSnapshot(collection(db, "gigs"), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const g = doc.data();
        html += `<div class="premium-card p-6 rounded-[2rem] border border-slate-100 mb-4 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 text-7xl opacity-5 group-hover:scale-110 transition duration-500">🚀</div>
            <h4 class="font-black text-slate-800 text-xl mb-1 relative z-10">${g.title}</h4>
            <div class="flex items-center gap-2 mb-4 relative z-10">
                <span class="bg-emerald-50 text-emerald-600 text-[11px] font-black px-2.5 py-1 rounded-lg border border-emerald-100">Reward: ₹${g.reward}</span>
                <span class="bg-blue-50 text-blue-600 text-[11px] font-black px-2.5 py-1 rounded-lg border border-blue-100">Direct Pay</span>
            </div>
            <button onclick="window.openGigSheet('${g.title}', ${g.reward}, '${g.link}')" class="w-full bg-slate-900 text-white font-black py-3.5 rounded-2xl text-sm active:scale-95 transition shadow-lg relative z-10">View Task Details</button>
        </div>`;
    });
    document.getElementById('gigs-container').innerHTML = html || "<p class='text-center py-10 font-bold text-slate-400'>No tasks available</p>";
});

window.openGigSheet = (t, r, d) => {
    document.getElementById('sheet-gig-title').innerText = t;
    document.getElementById('sheet-gig-reward').innerText = `₹${r} Reward`;
    document.getElementById('sheet-gig-desc').innerText = d;
    window.selectedGigData = { title: t, reward: r, link: d };
    window.openSheet('task-sheet');
}

window.acceptTask = () => {
    if(!window.selectedGigData) return;
    document.getElementById('active-gig-name').innerText = window.selectedGigData.title;
    document.getElementById('active-gig-reward').innerText = `₹${window.selectedGigData.reward}`;
    document.getElementById('active-task-card').classList.remove('hidden');
    document.getElementById('no-active-task').classList.add('hidden');
    
    // Auto Open Link in New Tab
    if(window.selectedGigData.link.startsWith('http')) {
        window.open(window.selectedGigData.link, '_blank');
    }
    
    window.closeAllSheets(); 
    window.switchTab('project');
    window.switchWsTab('active', document.querySelectorAll('.ws-tab')[1]);
    window.showToast("✅ Task Accepted & Link Opened!");
}

// IMGBB Upload
window.submitTaskProofReal = async () => {
    const file = document.getElementById("proof-image").files[0];
    if(!file) return window.showToast("⚠️ Select proof first");
    
    const btn = document.getElementById("submit-proof-btn");
    btn.disabled = true; btn.innerText = "Uploading Screenshot...";
    
    try {
        const formData = new FormData(); formData.append("image", file);
        const res = await fetch("https://api.imgbb.com/1/upload?key=7d2c13c8fedf546d91b46d36c1ef76d0", { method: "POST", body: formData });
        const imgData = await res.json();
        if(!imgData.success) throw new Error("ImgBB Failed");
        
        await addDoc(collection(db, "task_submissions"), { 
            userPhone, 
            gigName: document.getElementById('active-gig-name').innerText, 
            gigReward: parseInt(document.getElementById('active-gig-reward').innerText.replace("₹","")), 
            proofLink: imgData.data.url, 
            status: "Pending Approval", 
            timestamp: new Date() 
        });
        
        document.getElementById("proof-image").value = "";
        document.getElementById('active-gig-name').innerText = "No Task Accepted";
        document.getElementById('active-gig-reward').innerText = "₹0";
        document.getElementById('active-task-card').classList.add('hidden');
        document.getElementById('no-active-task').classList.remove('hidden');
        window.selectedGigData = null;

        window.showToast("🚀 Successfully Submitted!"); 
        window.switchWsTab('review', document.querySelectorAll('.ws-tab')[2]);
    } catch (e) { window.showToast("❌ Upload Failed. Check connection."); }
    finally { btn.disabled = false; btn.innerText = "Submit Screenshot"; }
}
