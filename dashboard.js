import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS =================
window.currentBalance = 0;
window.savedUPI = "";
window.savedBankName = "";
window.userDocId = null;
window.myReferCode = "";
window.referBonus = 5;

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    if(toast) { toast.innerText = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 3000); }
}

window.switchTab = function(t) {
    const h = document.getElementById('main-header');
    if(t==='home') { h.style.display='none'; } else { h.style.display='flex'; h.style.opacity='1'; }
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById('view-' + t);
    if(target) target.classList.add('active');
    window.scrollTo(0,0);
}

window.openSheet = function(id) { document.getElementById('universal-overlay').classList.add('modal-active'); document.getElementById(id).classList.add('sheet-active'); }
window.closeAllSheets = function() { document.querySelectorAll('.sheet-active').forEach(s => s.classList.remove('sheet-active')); document.getElementById('universal-overlay').classList.remove('modal-active'); }
window.openFullPage = function(id) { if(!window.savedUPI) { window.showToast("⚠️ Link UPI first!"); return; } document.getElementById(id).classList.add('full-page-active'); if(id==='withdraw-page') setTimeout(()=>document.getElementById("withdraw-amount").focus(),300); }
window.closeFullPage = function(id) { document.getElementById(id).classList.remove('full-page-active'); }

window.logoutUser = function() { if(confirm("Logout?")) { localStorage.removeItem("earnprox_user_phone"); window.location.href="index.html"; } }

// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyCtOcibo2YODmROtrW4W1oRCW1ZvOslPfI",
  authDomain: "earnproxuc.firebaseapp.com", projectId: "earnproxuc",
  storageBucket: "earnproxuc.firebasestorage.app", messagingSenderId: "411733884378",
  appId: "1:411733884378:web:b3944ee303740e4ae1d4e3"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userPhone = localStorage.getItem("earnprox_user_phone");

if(userPhone) {
    // 🟢 1. LIVE USER SYNC
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

            // UI Updates
            document.getElementById("home-user-name").innerText = realName.split(" ")[0];
            document.getElementById("profile-user-name").innerText = realName;
            document.getElementById("profile-user-phone").innerText = "+91 " + userPhone;
            document.getElementById("home-top-balance").innerText = `₹ ${window.currentBalance}`;
            document.getElementById("main-balance-display").innerHTML = `₹ ${window.currentBalance}<span class="text-xl text-slate-500 font-bold">.00</span>`;
            document.getElementById("withdraw-page-balance").innerText = `₹ ${window.currentBalance}`;
            document.getElementById("withdraw-display-name").innerText = window.savedBankName || "Bank Transfer";
            document.getElementById("withdraw-display-upi").innerText = window.savedUPI || "Not Linked";
            document.getElementById("withdraw-avatar-text").innerText = (window.savedBankName || realName).charAt(0).toUpperCase();

            // Lock KYC if saved
            if(window.savedUPI) {
                const badge = document.getElementById("upi-status-badge");
                badge.innerText = "Verified ✅"; badge.className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                const btn = document.querySelector("#kyc-sheet button");
                btn.innerText = "Verified & Locked 🔒"; btn.disabled = true; btn.classList.add("bg-emerald-500");
                document.getElementById("bank-name-input").value = window.savedBankName; document.getElementById("bank-name-input").disabled = true;
                document.getElementById("upi-input-box").value = window.savedUPI; document.getElementById("upi-input-box").disabled = true;
            }

            // 🔥 START CALCULATION ENGINE
            calculateStats();
        }
    });
}

// 🟢 2. CALCULATION ENGINE (The Fix)
async function calculateStats() {
    let taskEarnings = 0;
    let referEarnings = 0;
    let totalWithdrawals = 0;

    // A. Calculate Tasks
    const taskQ = query(collection(db, "task_submissions"), where("userPhone", "==", userPhone), where("status", "==", "Completed"));
    const taskSnap = await getDocs(taskQ);
    taskSnap.forEach(d => { taskEarnings += (d.data().gigReward || 0); });

    // B. Calculate Refers
    const referQ = query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode));
    const referSnap = await getDocs(referQ);
    referEarnings = referSnap.size * window.referBonus;

    // C. Calculate Withdrawals
    const withQ = query(collection(db, "withdrawals"), where("userPhone", "==", userPhone));
    const withSnap = await getDocs(withQ);
    withSnap.forEach(d => { totalWithdrawals += (d.data().amount || 0); });

    // Update UI Stats
    document.getElementById("stat-task-earn").innerText = `₹${taskEarnings}`;
    document.getElementById("stat-refer-earn").innerText = `₹${referEarnings}`;
    document.getElementById("stat-total-earn").innerText = `₹${taskEarnings + referEarnings}`;
    document.getElementById("stat-total-withdraw").innerText = `₹${totalWithdrawals}`;
}

// 🟢 3. SAVE KYC
window.saveRealKYC = async function() {
    const n = document.getElementById("bank-name-input").value.trim();
    const u = document.getElementById("upi-input-box").value.trim();
    if(n.length < 3 || !u.includes("@")) { window.showToast("⚠️ Invalid Name/UPI"); return; }
    try {
        await updateDoc(doc(db, "users", window.userDocId), { bankName: n, upi: u });
        window.showToast("✅ Locked!"); setTimeout(() => window.closeAllSheets(), 1000);
    } catch (e) { window.showToast("❌ Save Failed"); }
}

// 🟢 4. WITHDRAW ACTION
window.processWithdrawReal = async function() {
    const amt = parseInt(document.getElementById("withdraw-amount").value);
    if(!amt || amt < 50) { window.showToast("⚠️ Min withdrawal ₹50"); return; }
    if(amt > window.currentBalance) { window.showToast("❌ Insufficient Balance!"); return; }

    const btn = document.getElementById("withdraw-btn");
    btn.innerText = "Processing..."; btn.disabled = true;

    try {
        await updateDoc(doc(db, "users", window.userDocId), { balance: window.currentBalance - amt });
        await addDoc(collection(db, "withdrawals"), {
            userPhone: userPhone, userName: window.savedBankName, amount: amt, upi: window.savedUPI, status: "Pending", timestamp: new Date()
        });
        window.showToast("🚀 Sent to Admin!"); window.closeFullPage('withdraw-page');
    } catch(e) { window.showToast("❌ Failed"); }
    finally { btn.innerText = "Proceed Securely"; btn.disabled = false; }
}

// 🟢 5. GIG SYNC
onSnapshot(collection(db, "gigs"), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const g = doc.data();
        html += `<div class="premium-card p-5 rounded-3xl mb-4 border border-slate-100 shadow-sm">
            <h4 class="font-black text-slate-800 text-lg">${g.title}</h4>
            <p class="text-emerald-600 font-bold text-sm">Reward: ₹${g.reward}</p>
            <button onclick="window.openGigSheet('${g.title}', ${g.reward}, '${g.link}')" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mt-4 text-sm active:scale-95 transition">View Details</button>
        </div>`;
    });
    document.getElementById('gigs-container').innerHTML = html || "<p class='text-center py-10 text-slate-400 font-bold'>No tasks</p>";
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
