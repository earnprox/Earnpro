import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS =================
window.currentBalance = 0; window.savedUPI = ""; window.savedBankName = ""; window.userDocId = null; window.myReferCode = "";

window.showToast = (m) => { const t = document.getElementById("toast"); t.innerText = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); };
window.switchTab = (id) => { 
    const h = document.getElementById('main-header');
    if(id === 'home') h.classList.add('hidden'); else { h.classList.remove('hidden'); h.style.opacity = '1'; }
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const target = document.getElementById('view-' + id);
    if(target) target.classList.add('active');
    window.scrollTo(0,0);
};
window.switchWsTab = (id, btn) => {
    document.querySelectorAll('.ws-tab').forEach(t => { t.classList.remove('bg-white', 'shadow-sm', 'text-blue-600'); t.classList.add('text-slate-500'); });
    btn.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
    document.querySelectorAll('.ws-content').forEach(c => c.classList.remove('active'));
    document.getElementById('ws-' + id).classList.add('active');
};
window.openSheet = (id) => { document.getElementById('universal-overlay').classList.add('modal-active'); document.getElementById(id).classList.add('sheet-active'); };
window.closeAllSheets = () => { document.querySelectorAll('.sheet-active').forEach(s => s.classList.remove('sheet-active')); document.getElementById('universal-overlay').classList.remove('modal-active'); };
window.openFullPage = (id) => { if(!window.savedUPI) return window.showToast("⚠️ Link Payout Settings!"); document.getElementById(id).classList.add('full-page-active'); };
window.closeFullPage = (id) => { document.getElementById(id).classList.remove('full-page-active'); };
window.logoutUser = () => { if(confirm("Logout?")) { localStorage.clear(); window.location.href="index.html"; } };

// ================= FIREBASE =================
const firebaseConfig = { apiKey: "AIzaSyCtOcibo2YODmROtrW4W1oRCW1ZvOslPfI", authDomain: "earnproxuc.firebaseapp.com", projectId: "earnproxuc", storageBucket: "earnproxuc.firebasestorage.app", messagingSenderId: "411733884378", appId: "1:411733884378:web:b3944ee303740e4ae1d4e3" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userPhone = localStorage.getItem("earnprox_user_phone");

if(userPhone) {
    onSnapshot(query(collection(db, "users"), where("phone", "==", userPhone)), (snap) => {
        if(!snap.empty) {
            const docSnap = snap.docs[0]; window.userDocId = docSnap.id;
            const u = docSnap.data();
            window.currentBalance = u.balance || 0; window.savedUPI = u.upi || ""; window.savedBankName = u.bankName || "";
            const name = u.name || "User";
            window.myReferCode = (name.substring(0,3) + userPhone.substring(userPhone.length - 4)).toUpperCase();

            document.getElementById("home-user-name").innerText = name;
            document.getElementById("profile-user-name").innerText = name;
            document.getElementById("profile-user-phone").innerText = "+91 " + userPhone;
            document.getElementById("home-top-balance").innerText = `₹${window.currentBalance}`;
            document.getElementById("main-balance-display").innerText = `₹ ${window.currentBalance}.00`;
            document.getElementById("withdraw-page-balance").innerText = window.currentBalance;
            document.getElementById("withdraw-display-name").innerText = window.savedBankName || "Bank Transfer";
            document.getElementById("withdraw-display-upi").innerText = window.savedUPI || "Not Linked";
            document.getElementById("refer-page-name").innerText = name;
            document.getElementById("referral-code-text").innerText = window.myReferCode;

            const avatar = `https://api.dicebear.com/7.x/micah/svg?seed=${name}&backgroundColor=b6e3f4`;
            document.getElementById("home-profile-avatar").src = avatar;
            document.getElementById("header-avatar").src = avatar;
            document.getElementById("profile-avatar").src = avatar;
            document.getElementById("refer-profile-img").src = avatar;
            document.getElementById("withdraw-avatar-text").innerText = (window.savedBankName || name).charAt(0).toUpperCase();

            if(window.savedUPI) {
                document.getElementById("upi-status-badge").innerText = "Verified ✅";
                document.getElementById("upi-status-badge").className = "text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded";
                document.getElementById("bank-display-text").innerText = window.savedBankName;
                document.getElementById("upi-display-text").innerText = window.savedUPI;
                document.getElementById("bank-name-input").value = window.savedBankName; document.getElementById("bank-name-input").disabled = true;
                document.getElementById("upi-input-box").value = window.savedUPI; document.getElementById("upi-input-box").disabled = true;
                const kycBtn = document.querySelector("#kyc-sheet button");
                if(kycBtn) { kycBtn.innerText = "Verified & Locked 🔒"; kycBtn.disabled = true; kycBtn.classList.add("bg-emerald-500"); }
            }
            syncStatsAndHistory();
        }
    });
}

async function syncStatsAndHistory() {
    const [tasks, refers, withs] = await Promise.all([
        getDocs(query(collection(db, "task_submissions"), where("userPhone", "==", userPhone))),
        getDocs(query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode))),
        getDocs(query(collection(db, "withdrawals"), where("userPhone", "==", userPhone)))
    ]);
    let tE = 0, rE = refers.size * 5, wE = 0; const history = [];
    tasks.forEach(d => { if(d.data().status === "Completed") { tE += d.data().gigReward; history.push({ type:'credit', desc:'Task Reward', amt:d.data().gigReward, status:'Completed', ts:d.data().timestamp }); } });
    refers.forEach(d => { history.push({ type:'credit', desc:'Refer Bonus', amt:5, status:'Completed', ts:d.data().timestamp }); });
    withs.forEach(d => { wE += d.data().amount; history.push({ type:'debit', desc:'Withdrawal', amt:d.data().amount, status:d.data().status, ts:d.data().timestamp }); });
    document.getElementById("stat-task-earn").innerText = `₹${tE}`; document.getElementById("stat-refer-earn").innerText = `₹${rE}`; document.getElementById("stat-total-earn").innerText = `₹${tE + rE}`; document.getElementById("stat-total-withdraw").innerText = `₹${wE}`;
    document.getElementById("total-refers-count").innerText = refers.size; document.getElementById("total-refer-earnings").innerText = rE;
    history.sort((a,b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
    let hHtml = ""; history.forEach(i => { const isD = i.type === 'debit'; hHtml += `<div class="flex justify-between items-center border-b border-slate-50 pb-4 mb-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full ${isD?'bg-rose-50 text-rose-500':'bg-emerald-50 text-emerald-500'} flex items-center justify-center font-bold">${isD?'↑':'↓'}</div><div><p class="text-sm font-bold text-slate-800">${i.desc}</p><p class="text-[10px] text-slate-400 uppercase">${i.status}</p></div></div><p class="text-sm font-black ${isD?'text-slate-800':'text-emerald-500'}">${isD?'-':'+'} ₹${i.amt}</p></div>`; });
    document.getElementById("history-container").innerHTML = hHtml || "No transactions";
    document.getElementById("referral-list-container").innerHTML = refers.docs.map(d => `<div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm"><div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">${d.data().name.charAt(0)}</div><p class="text-xs font-bold text-slate-800">${d.data().name}</p></div><div class="text-right"><p class="text-xs font-black text-emerald-500">+₹5</p></div></div>`).join("") || "No referrals";
}

window.saveRealKYC = async () => {
    const n = document.getElementById("bank-name-input").value; const u = document.getElementById("upi-input-box").value;
    if(n.length < 3 || !u.includes("@")) return window.showToast("⚠️ Invalid input");
    await updateDoc(doc(db, "users", window.userDocId), { bankName: n, upi: u }); window.showToast("✅ Details Locked!"); window.closeAllSheets();
};

window.processWithdrawReal = async () => {
    const amt = parseInt(document.getElementById("withdraw-amount").value);
    if(!amt || amt < 50) return window.showToast("⚠️ Min ₹50"); if(amt > window.currentBalance) return window.showToast("❌ Low Balance");
    await updateDoc(doc(db, "users", window.userDocId), { balance: window.currentBalance - amt });
    await addDoc(collection(db, "withdrawals"), { userPhone, userName: window.savedBankName, amount: amt, upi: window.savedUPI, status: "Pending", timestamp: new Date() });
    window.showToast("🚀 Sent!"); window.closeFullPage('withdraw-page');
};

onSnapshot(collection(db, "gigs"), (snap) => {
    let html = ""; snap.forEach(d => { const g = d.data(); html += `<div class="premium-card p-6 rounded-[2rem] border border-slate-100 mb-4 relative overflow-hidden group"><div class="absolute -right-4 -top-4 text-7xl opacity-5 group-hover:scale-110 transition duration-500">🚀</div><h4 class="font-black text-slate-800 text-xl mb-1">${g.title}</h4><p class="text-emerald-600 font-bold mb-4">Reward: ₹${g.reward}</p><button onclick="window.openGigSheet('${g.title}', ${g.reward}, '${g.link}')" class="w-full bg-slate-900 text-white font-black py-3.5 rounded-2xl text-sm active:scale-95 transition">View Task Details</button></div>`; });
    document.getElementById('gigs-container').innerHTML = html || "No tasks";
});

window.openGigSheet = (t, r, d) => { document.getElementById('sheet-gig-title').innerText = t; document.getElementById('sheet-gig-reward').innerText = `₹${r} Reward`; document.getElementById('sheet-gig-desc').innerText = d; window.selectedGigData = { title: t, reward: r, link: d }; window.openSheet('task-sheet'); };
window.acceptTask = () => { if(!window.selectedGigData) return; document.getElementById('active-gig-name').innerText = window.selectedGigData.title; document.getElementById('active-gig-reward').innerText = `₹${window.selectedGigData.reward}`; document.getElementById('active-task-card').classList.remove('hidden'); document.getElementById('no-active-task').classList.add('hidden'); if(window.selectedGigData.link.startsWith('http')) window.open(window.selectedGigData.link, '_blank'); window.closeAllSheets(); window.switchTab('project'); window.switchWsTab('active', document.querySelectorAll('.ws-tab')[1]); };
window.submitTaskProofReal = async () => {
    const f = document.getElementById("proof-image").files[0]; if(!f) return window.showToast("⚠️ Select proof");
    const btn = document.getElementById("submit-proof-btn"); btn.disabled = true; btn.innerText = "Uploading...";
    const formData = new FormData(); formData.append("image", f);
    const res = await fetch("https://api.imgbb.com/1/upload?key=7d2c13c8fedf546d91b46d36c1ef76d0", { method: "POST", body: formData }).then(r => r.json());
    await addDoc(collection(db, "task_submissions"), { userPhone, gigName: document.getElementById('active-gig-name').innerText, gigReward: parseInt(document.getElementById('active-gig-reward').innerText.replace("₹","")), proofLink: res.data.url, status: "Pending Approval", timestamp: new Date() });
    window.showToast("🚀 Submitted!"); window.switchWsTab('review', document.querySelectorAll('.ws-tab')[2]); btn.disabled = false; btn.innerText = "Submit Screenshot";
};
