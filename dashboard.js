import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

let currentOpenSheet = null;
window.openSheet = function(sheetId) {
    if(currentOpenSheet) window.closeAllSheets();
    const sheet = document.getElementById(sheetId);
    if(!sheet) return;
    document.getElementById('universal-overlay').classList.add('modal-active');
    currentOpenSheet = sheet;
    setTimeout(() => { sheet.classList.add('sheet-active'); }, 10);
}

window.closeAllSheets = function() {
    if(currentOpenSheet) {
        currentOpenSheet.classList.remove('sheet-active');
        setTimeout(() => {
            document.getElementById('universal-overlay').classList.remove('modal-active');
            currentOpenSheet = null;
        }, 300);
    }
}

window.openFullPage = function(pageId) {
    if(!window.savedUPI) { window.showToast("⚠️ Link UPI in Payout Settings first!"); return; }
    const page = document.getElementById(pageId);
    if(page) page.classList.add('full-page-active');
    if(pageId === 'withdraw-page') {
        setTimeout(() => document.getElementById("withdraw-amount").focus(), 300);
    }
}

window.closeFullPage = function(pageId) {
    const page = document.getElementById(pageId);
    if(page) page.classList.remove('full-page-active');
}

window.logoutUser = function() {
    if(confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("earnprox_user_phone");
        window.location.href = "index.html";
    }
}

window.copyReferLink = function() {
    if(!window.myReferCode) return;
    const link = `https://earnprox.vercel.app/index.html?ref=${window.myReferCode}`;
    navigator.clipboard.writeText(link).then(() => {
        window.showToast("✅ Referral Link Copied!");
    }).catch(err => { window.showToast("⚠️ Failed to copy!"); });
}

window.shareOnWhatsApp = function() {
    if(!window.myReferCode) return;
    const link = `https://earnprox.vercel.app/index.html?ref=${window.myReferCode}`;
    const promoMessage = `🔥 Bro! I just found this app *EarnproX*. Complete tasks and earn cash to UPI! \n\nUse my invite code *${window.myReferCode}* and get joining bonus!\n👇👇\n${link} 🚀`;
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

// UTILS
const isToday = (dateObj) => {
    if(!dateObj) return false;
    const today = new Date();
    const dateToCheck = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
    return dateToCheck.getDate() === today.getDate() &&
           dateToCheck.getMonth() === today.getMonth() &&
           dateToCheck.getFullYear() === today.getFullYear();
};

// 🟢 1. LIVE USER DATA & BADGE SYNC (REAL-TIME)
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
            window.myReferCode = (realName.substring(0,3) + userPhone.substring(6)).toUpperCase();

            // Home UI
            const homeUserName = document.getElementById("home-user-name");
            const homeTopBalance = document.getElementById("home-top-balance");
            if(homeUserName) homeUserName.innerText = realName.split(" ")[0];
            if(homeTopBalance) homeTopBalance.innerText = `₹ ${window.currentBalance}`;
            
            // Profile UI
            const profileUserName = document.getElementById("profile-user-name");
            const profileUserPhone = document.getElementById("profile-user-phone");
            if(profileUserName) profileUserName.innerText = realName;
            if(profileUserPhone) profileUserPhone.innerText = "+91 " + userPhone;

            // Vault UI
            const mainBalanceDisplay = document.getElementById("main-balance-display");
            const upiDisplayText = document.getElementById("upi-display-text");
            const upiStatusBadge = document.getElementById("upi-status-badge");
            
            if(mainBalanceDisplay) mainBalanceDisplay.innerHTML = `₹ ${window.currentBalance}<span class="text-xl text-slate-500 font-bold">.00</span>`;
            if(upiDisplayText) upiDisplayText.innerText = window.savedUPI || "Payout Settings";
            
            if(window.savedUPI) {
                if(upiStatusBadge) {
                    upiStatusBadge.innerText = "Verified ✅";
                    upiStatusBadge.className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                }
                const bnameInput = document.getElementById("bank-name-input");
                const upiInput = document.getElementById("upi-input-box");
                if(bnameInput) { bnameInput.value = window.savedBankName; bnameInput.disabled = true; }
                if(upiInput) { upiInput.value = window.savedUPI; upiInput.disabled = true; }
                const kycBtn = document.querySelector("#kyc-sheet button");
                if(kycBtn) { kycBtn.innerText = "Verified & Locked 🔒"; kycBtn.disabled = true; kycBtn.classList.add("bg-emerald-500"); }
            }

            // Withdraw Page UI
            const withdrawPageBalance = document.getElementById("withdraw-page-balance");
            const withdrawDisplayName = document.getElementById("withdraw-display-name");
            const withdrawDisplayUpi = document.getElementById("withdraw-display-upi");
            const withdrawAvatarText = document.getElementById("withdraw-avatar-text");
            
            if(withdrawPageBalance) withdrawPageBalance.innerText = `₹ ${window.currentBalance}`;
            if(withdrawDisplayName) withdrawDisplayName.innerText = window.savedBankName || "Bank Transfer";
            if(withdrawDisplayUpi) withdrawDisplayUpi.innerText = window.savedUPI || "Not Linked";
            if(withdrawAvatarText) withdrawAvatarText.innerText = (window.savedBankName || realName).charAt(0).toUpperCase();

            // Refer Page UI
            const referPageName = document.getElementById("refer-page-name");
            const referralCodeText = document.getElementById("referral-code-text");
            if(referPageName) referPageName.innerText = realName;
            if(referralCodeText) referralCodeText.innerText = window.myReferCode;

            // Avatars
            const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${realName}&backgroundColor=b6e3f4`;
            document.getElementById("home-profile-avatar").src = avatarUrl;
            document.getElementById("header-avatar").src = avatarUrl;
            document.getElementById("profile-avatar").src = avatarUrl;
            document.getElementById("refer-profile-img").src = avatarUrl;

            // 🔥 Fetch refer list and stats
            fetchReferralsAndCalculateStats();
            // 🔥 Fetch transaction history (history)
            fetchTransactionHistory();
        }
    });
}

// 🟢 2. SAVE KYC
window.saveRealKYC = async function() {
    const name = document.getElementById("bank-name-input").value.trim();
    const upi = document.getElementById("upi-input-box").value.trim();

    if(name.length < 3 || !upi.includes("@")) {
        window.showToast("⚠️ Enter valid Banking Name & UPI ID");
        return;
    }

    if(!window.userDocId) return;

    try {
        await updateDoc(doc(db, "users", window.userDocId), {
            bankName: name,
            upi: upi
        });
        window.showToast("✅ Payout Details Locked!");
        setTimeout(() => { window.closeAllSheets(); }, 1000);
    } catch (e) { window.showToast("❌ Server Error."); }
}

// 🟢 3. WITHDRAWAL ACTION
window.processWithdrawReal = async function() {
    const amountBox = document.getElementById("withdraw-amount");
    const amt = parseInt(amountBox.value);
    
    if(!amt || isNaN(amt)) { window.showToast("⚠️ Enter amount first!"); return; }
    if(amt < 50) { window.showToast("⚠️ Minimum withdrawal is ₹50"); return; }
    if(amt > window.currentBalance) { window.showToast("❌ Insufficient Balance!"); return; }

    const btn = document.getElementById("withdraw-btn");
    btn.innerText = "Processing Securely...";
    btn.disabled = true;

    try {
        await updateDoc(doc(db, "users", window.userDocId), { balance: window.currentBalance - amt });
        await addDoc(collection(db, "withdrawals"), {
            userPhone: userPhone,
            userName: window.savedBankName,
            amount: amt,
            upi: window.savedUPI,
            status: "Pending",
            timestamp: new Date()
        });
        window.showToast("🚀 Request Sent Successfully!");
        window.closeFullPage('withdraw-page');
        amountBox.value = ""; 
    } catch(e) { window.showToast("❌ Request Failed."); }
    finally {
        btn.innerText = "Proceed Securely";
        btn.disabled = false;
    }
}

// 🟢 4. REFERRALS & STATS (Fixed logic for real-time sync)
async function fetchReferralsAndCalculateStats() {
    if(!window.myReferCode) return;
    
    // Naya data fetch karne se pehle loaders show karein
    document.getElementById('total-refer-earnings').innerText = "⏳";
    document.getElementById('total-refers-count').innerText = "⏳";
    document.getElementById('referral-list-container').innerHTML = "<p class='text-center py-6'>Updating...</p>";

    // Refer list query
    const refQ = query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode));
    onSnapshot(refQ, async (snap) => {
        let totalCount = 0;
        let todayCount = 0;
        let referListHtml = "";
        
        const docsArr = [];
        snap.forEach(d => {
            docsArr.push({ id: d.id, ...d.data() });
        });
        
        docsArr.sort((a,b) => b.timestamp - a.timestamp); // Naye joins sabse upar

        docsArr.forEach(u => {
            totalCount++;
            if(isToday(u.timestamp)) todayCount++;
            
            const joinDate = u.timestamp ? new Date(u.timestamp.toDate ? u.timestamp.toDate() : u.timestamp).toLocaleDateString('en-GB') : "Recently";
            const uName = u.name || "New User";
            
            referListHtml += `
            <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div class="w-1/2 flex items-center gap-2 overflow-hidden">
                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">${uName.charAt(0).toUpperCase()}</div>
                    <p class="text-xs font-bold text-slate-800 truncate">${uName}</p>
                </div>
                <div class="w-1/4 text-center text-[10px] font-bold text-slate-400">${joinDate}</div>
                <div class="w-1/4 text-right text-xs font-black text-emerald-500">+₹${window.referBonusPerUser}</div>
            </div>`;
        });

        // Update Refer Page UI
        document.getElementById('total-refers-count').innerText = totalCount;
        document.getElementById('today-refers-count').innerText = todayCount;
        document.getElementById('total-refer-earnings').innerText = totalCount * window.referBonusPerUser;
        document.getElementById('referral-list-container').innerHTML = referListHtml || "<p class='text-center py-10'>No referrals yet.</p>";

        // 🔥 Ab Vault page ke stats calculate karein (Total/Task/Refer Earning)
        calculateVaultStats();
    });
}

// 🟢 5. VAULT STATS (Dynamic calculation from collections)
async function calculateVaultStats() {
    if(!window.myReferCode || !userPhone) return;

    let taskEarnings = 0;
    let referEarnings = 0;
    let totalWithdrawals = 0;

    // A. Task Earning calculate karein (Sirf Completed tasks)
    const taskQ = query(collection(db, "task_submissions"), where("userPhone", "==", userPhone), where("status", "==", "Completed"));
    const taskSnap = await getDocs(taskQ);
    taskSnap.forEach(d => {
        taskEarnings += (d.data().gigReward || 0);
    });

    // B. Refer Earning calculate karein
    const referCodeUsed = localStorage.getItem("earnprox_user_refer_code_used") || window.myReferCode; // Agar referrer hai
    const referQ = query(collection(db, "users"), where("referCodeUsed", "==", referCodeUsed));
    const referSnap = await getDocs(referQ);
    referEarnings = referSnap.size * window.referBonusPerUser;

    // C. Total Withdrawal calculate karein
    const withQ = query(collection(db, "withdrawals"), where("userPhone", "==", userPhone));
    const withSnap = await getDocs(withQ);
    withSnap.forEach(d => {
        totalWithdrawals += (d.data().amount || 0);
    });

    // Update Vault Page UI
    document.getElementById("stat-task-earn").innerText = `₹${taskEarnings}`;
    document.getElementById("stat-refer-earn").innerText = `₹${referEarnings}`;
    document.getElementById("stat-total-earn").innerText = `₹${taskEarnings + referEarnings}`;
    document.getElementById("stat-total-withdraw").innerText = `₹${totalWithdrawals}`;
}

// 🟢 6. TRANSACTION HISTORY (History Fix)
async function fetchTransactionHistory() {
    if(!userPhone) return;
    
    document.getElementById('history-container').innerHTML = "<p class='text-center py-6'>⏳ Loading History...</p>";

    const completedTasksQuery = query(collection(db, "task_submissions"), where("userPhone", "==", userPhone), where("status", "==", "Completed"));
    const approvedWithdrawalsQuery = query(collection(db, "withdrawals"), where("userPhone", "==", userPhone), where("status", "==", "Approved"));
    const pendingWithdrawalsQuery = query(collection(db, "withdrawals"), where("userPhone", "==", userPhone), where("status", "==", "Pending"));
    const referQ = query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode));

    try {
        const [taskSnap, approvedSnap, pendingSnap, referSnap] = await Promise.all([
            getDocs(completedTasksQuery),
            getDocs(approvedWithdrawalsQuery),
            getDocs(pendingWithdrawalsQuery),
            getDocs(referQ)
        ]);

        let historyHtml = "";
        const allTransactions = [];

        // Completed Tasks add karein
        taskSnap.forEach(d => {
            const data = d.data();
            allTransactions.push({
                type: 'credit',
                timestamp: data.timestamp,
                description: 'Task Reward',
                amount: data.gigReward,
                icon: '↓',
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-500',
                amountColor: 'text-emerald-500',
                note: `Task: ${data.gigName}`
            });
        });

        // approved Withdrawals add karein
        approvedSnap.forEach(d => {
            const data = d.data();
            allTransactions.push({
                type: 'debit',
                timestamp: data.timestamp,
                description: 'Withdrawal to UPI',
                amount: data.amount,
                icon: '↑',
                iconBg: 'bg-rose-50',
                iconColor: 'text-rose-500',
                amountColor: 'text-slate-800',
                note: `Status: Completed ✅`
            });
        });

        // pending Withdrawals add karein
        pendingSnap.forEach(d => {
            const data = d.data();
            allTransactions.push({
                type: 'pending',
                timestamp: data.timestamp,
                description: 'Withdrawal to UPI',
                amount: data.amount,
                icon: '⏳',
                iconBg: 'bg-orange-50',
                iconColor: 'text-orange-500',
                amountColor: 'text-slate-500',
                note: `Status: Processing`
            });
        });

        // Refer Bonus add karein (Har referral ek transaction hai)
        referSnap.forEach(d => {
            const data = d.data();
            allTransactions.push({
                type: 'credit',
                timestamp: data.timestamp,
                description: 'Refer Bonus',
                amount: window.referBonusPerUser,
                icon: '↓',
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-500',
                amountColor: 'text-emerald-500',
                note: `Friend joined: ${data.name}`
            });
        });

        // Timestamp se sort karein (Sabse naya upar)
        allTransactions.sort((a,b) => b.timestamp - a.timestamp);

        allTransactions.forEach(item => {
            historyHtml += `
            <div class="flex justify-between items-center border-b border-slate-100 pb-4 mb-4 ${item.type === 'pending' ? 'opacity-70' : ''}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${item.iconBg} ${item.iconColor} flex items-center justify-center font-bold text-xl shrink-0">${item.icon}</div>
                    <div>
                        <p class="text-sm font-bold text-slate-800">${item.description}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">${item.note}</p>
                    </div>
                </div>
                <p class="text-sm font-black ${item.amountColor}">${item.type === 'debit' ? '-' : '+'} ₹${item.amount}</p>
            </div>`;
        });

        document.getElementById('history-container').innerHTML = historyHtml || `
            <div class="text-center py-10 opacity-60">
                <span class="text-5xl mb-3 block">📭</span>
                <p class="text-sm font-bold text-slate-800">No transactions yet</p>
            </div>`;
            
    } catch (e) {
        console.error("Error loading history:", e);
        document.getElementById('history-container').innerHTML = "<p class='text-center py-6 text-red-500'>❌ Failed to load history.</p>";
    }
}

// 🟢 7. LIVE GIGS SYNC
onSnapshot(collection(db, "gigs"), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const g = doc.data();
        html += `<div class="premium-card p-5 rounded-3xl mb-4 border border-slate-100 shadow-sm relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-6xl opacity-10">🚀</div>
            <h4 class="font-black text-slate-800 text-lg relative z-10 truncate">${g.title}</h4>
            <p class="text-emerald-600 font-bold text-sm mt-1 relative z-10">Reward: ₹${g.reward}</p>
            <button onclick="window.openGigSheet('${g.title}', ${g.reward}, '${g.link}')" class="w-full bg-slate-900 text-white font-black py-3 rounded-xl mt-4 text-sm active:scale-95 transition relative z-10">View Task Details</button>
        </div>`;
    });
    document.getElementById('gigs-container').innerHTML = html || "<p class='text-center py-10 text-slate-400 font-bold'>No tasks available</p>";
});

window.openGigSheet = function(t, r, d) {
    document.getElementById('sheet-gig-title').innerText = t;
    document.getElementById('sheet-gig-reward').innerText = `₹${r} Reward`;
    document.getElementById('sheet-gig-desc').innerText = d;
    window.selectedGigData = { title:t, reward:r, desc:d };
    window.openSheet('task-sheet');
}

window.acceptTask = function() {
    if(!window.selectedGigData) return;
    document.getElementById('active-gig-name').innerText = window.selectedGigData.title;
    document.getElementById('active-gig-reward').innerText = `₹${window.selectedGigData.reward}`;
    window.closeAllSheets(); window.switchTab('project');
    window.switchWsTab('active', document.querySelectorAll('.ws-tab')[1]);
    window.showToast("✅ Accepted!");
}
