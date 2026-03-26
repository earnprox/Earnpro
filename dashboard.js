import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS & UTILS =================
window.currentBalance = 0;
window.savedUPI = "";
window.selectedGigData = null;
window.myReferCode = ""; 
window.referBonusPerUser = 5; 

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

// 🔥 NAVIGATION SYSTEM 
window.switchTab = function(tabId) {
    const mainHeader = document.getElementById('main-header');
    
    if(tabId === 'home') {
        mainHeader.style.opacity = '0';
        setTimeout(() => mainHeader.style.display = 'none', 200);
    } else {
        mainHeader.style.display = 'flex';
        setTimeout(() => mainHeader.style.opacity = '1', 50);
    }

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetView = document.getElementById('view-' + tabId);
    if(targetView) { setTimeout(() => targetView.classList.add('active'), 50); }
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
    if(!window.savedUPI) { window.showToast("⚠️ Save UPI ID in Profile first!"); return; }
    document.getElementById(pageId).classList.add('full-page-active');
    
    if(pageId === 'withdraw-page') {
        setTimeout(() => document.getElementById("withdraw-amount").focus(), 300);
    }
}

window.closeFullPage = function(pageId) {
    document.getElementById(pageId).classList.remove('full-page-active');
    document.getElementById("withdraw-amount").value = "";
}

window.logoutUser = function() {
    document.getElementById("loading-overlay").classList.add("active"); 
    localStorage.removeItem("earnprox_user_phone");
    setTimeout(() => { window.location.href = "index.html"; }, 1500);
}

window.copyReferLink = function() {
    if(!window.myReferCode) return;
    const link = `https://earnprox.in/index.html?ref=${window.myReferCode}`;
    navigator.clipboard.writeText(link).then(() => {
        showToast("✅ Referral Link Copied!");
    }).catch(err => { showToast("⚠️ Failed to copy!"); });
}

window.shareOnWhatsApp = function() {
    if(!window.myReferCode) return;
    const link = `https://earnprox.in/index.html?ref=${window.myReferCode}`;
    const promoMessage = `🔥 Bro! I just found this app *EarnproX*. Complete tasks and earn cash to UPI! \n\nUse my invite code *${window.myReferCode}* and get joining bonus!\n👇👇\n${link} 🚀`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(promoMessage)}`, '_blank');
}

// ================= FIREBASE MASTER ENGINE =================
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

let userDocId = null;
const userPhone = localStorage.getItem("earnprox_user_phone");

const isToday = (dateObj) => {
    if(!dateObj) return false;
    const today = new Date();
    const dateToCheck = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
    return dateToCheck.getDate() === today.getDate() &&
           dateToCheck.getMonth() === today.getMonth() &&
           dateToCheck.getFullYear() === today.getFullYear();
};

// 🟢 1. LIVE USER DATA & SECURITY LOCKS
if(userPhone) {
    const q = query(collection(db, "users"), where("phone", "==", userPhone));
    getDocs(q).then((querySnapshot) => {
        if(!querySnapshot.empty) {
            userDocId = querySnapshot.docs[0].id;
            onSnapshot(doc(db, "users", userDocId), (docSnap) => {
                if(docSnap.exists()) {
                    const userData = docSnap.data();
                    
                    if(userData.status === 'blocked') {
                        document.body.innerHTML = '<div style="height:100vh;display:flex;align-items:center;justify-content:center;background:#0F172A;color:white;flex-direction:column;"><h1 style="font-size:3rem;margin-bottom:10px;">🚫</h1><h2 style="font-size:1.5rem;font-weight:bold;">Account Banned</h2><p style="color:#94A3B8;margin-top:10px;">Contact Admin for support.</p></div>';
                        localStorage.removeItem("earnprox_user_phone");
                        setTimeout(() => { window.location.href = "index.html"; }, 3000);
                        return;
                    }
                    
                    const n = userData.name || "User";
                    const p = userData.phone || "0000000000";
                    
                    window.myReferCode = (n.substring(0,3) + p.substring(p.length - 4)).toUpperCase();
                    document.getElementById("referral-code-text").innerText = window.myReferCode;

                    document.getElementById("home-user-name").innerText = n.split(" ")[0];
                    document.getElementById("header-user-name").innerText = n.split(" ")[0];
                    document.getElementById("profile-user-name").innerText = n;
                    document.getElementById("refer-page-name").innerText = n;
                    
                    document.getElementById("withdraw-avatar-text").innerText = n.charAt(0).toUpperCase();
                    
                    const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${n}&backgroundColor=b6e3f4`;
                    document.getElementById("home-profile-avatar").src = avatarUrl;
                    document.getElementById("header-avatar").src = avatarUrl;
                    document.getElementById("profile-avatar").src = avatarUrl;
                    document.getElementById("refer-profile-img").src = avatarUrl;
                    
                    document.getElementById("profile-user-phone").innerText = "+91 " + p;

                    window.currentBalance = userData.balance || 0;
                    document.getElementById("main-balance-display").innerHTML = `₹ ${window.currentBalance}<span class="text-xl text-slate-500 font-bold">.00</span>`;
                    document.getElementById("withdraw-page-balance").innerText = `₹ ${window.currentBalance}`;
                    document.getElementById("home-top-balance").innerText = `₹ ${window.currentBalance}`;

                    // 🔥 SECURITY LOCK: UPI VERIFIED & LOCKED FOREVER
                    if(userData.upi && userData.upi !== "None" && userData.upi !== "") {
                        window.savedUPI = userData.upi;
                        document.getElementById("upi-display-text").innerText = userData.upi;
                        document.getElementById("withdraw-page-upi").innerText = userData.upi; 
                        document.getElementById("upi-status-badge").innerText = "Verified ✅";
                        document.getElementById("upi-status-badge").className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                        
                        // Disable Input
                        const upiBox = document.getElementById("upi-input-box");
                        if(upiBox) {
                            upiBox.value = userData.upi;
                            upiBox.disabled = true;
                            upiBox.classList.add("bg-slate-100", "text-slate-500", "cursor-not-allowed");
                        }

                        // Disable Button
                        const kycBtnDiv = document.querySelector("#kyc-sheet .border-t.bg-white");
                        if(kycBtnDiv) {
                            const btn = kycBtnDiv.querySelector("button");
                            if(btn) {
                                btn.innerText = "Verified & Locked 🔒";
                                btn.disabled = true;
                                btn.classList.replace("bg-[#1E293B]", "bg-emerald-500");
                                btn.classList.remove("active:scale-95");
                                btn.onclick = null; // Remove click action
                            }
                        }
                    }

                    fetchReferrals();
                }
            });
        }
    });
}

// 🟢 2. REFERRAL SYSTEM
function fetchReferrals() {
    if(!window.myReferCode) return;
    
    const refQ = query(collection(db, "users"), where("referCodeUsed", "==", window.myReferCode));
    onSnapshot(refQ, (snap) => {
        let totalRef = 0;
        let todayRef = 0;
        let html = "";
        
        const docsArr = [];
        snap.forEach(d => docsArr.push(d.data()));
        docsArr.sort((a,b) => b.timestamp - a.timestamp);

        docsArr.forEach(u => {
            totalRef++;
            if(isToday(u.timestamp)) todayRef++;
            
            const joinDate = u.timestamp ? new Date(u.timestamp.toDate ? u.timestamp.toDate() : u.timestamp).toLocaleDateString('en-GB') : "Recently";
            
            html += `
            <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div class="w-1/2 flex items-center gap-2 overflow-hidden">
                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">${u.name.charAt(0).toUpperCase()}</div>
                    <p class="text-xs font-bold text-slate-800 truncate">${u.name}</p>
                </div>
                <div class="w-1/4 text-center text-[10px] font-bold text-slate-400">${joinDate}</div>
                <div class="w-1/4 text-right text-xs font-black text-emerald-500">+₹${window.referBonusPerUser}</div>
            </div>`;
        });

        document.getElementById('total-refers-count').innerText = totalRef;
        document.getElementById('today-refers-count').innerText = todayRef;
        document.getElementById('total-refer-earnings').innerText = totalRef * window.referBonusPerUser;
        
        if(html) {
            document.getElementById('referral-list-container').innerHTML = html;
        }
    });
}

// 🟢 3. LIVE GIGS SYNC
onSnapshot(collection(db, "gigs"), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const g = doc.data();
        const safeTitle = g.title.replace(/'/g, "");
        const safeDesc = (g.link || "Complete this task as per instructions.").replace(/'/g, ""); 
        
        html += `
        <div class="premium-card p-5 rounded-3xl relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div class="flex justify-between items-start mb-3">
                <div class="flex gap-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 text-xl">🚀</div>
                    <div>
                        <h4 class="font-bold text-sm text-slate-800">${safeTitle}</h4>
                        <p class="text-[10px] text-slate-500 font-medium mt-0.5">Recommended</p>
                    </div>
                </div>
                <p class="text-lg font-black text-emerald-500">₹${g.reward}</p>
            </div>
            <button onclick="window.openGigSheet('${safeTitle}', ${g.reward}, '${safeDesc}')" class="w-full bg-slate-50 hover:bg-blue-50 text-blue-600 font-bold py-3 rounded-xl text-sm transition border border-slate-200 mt-2 active:scale-95">View Details & Accept</button>
        </div>`;
    });
    document.getElementById('gigs-container').innerHTML = html || "<p class='text-center text-slate-400 py-10 font-bold'>No active gigs right now.</p>";
});

window.openGigSheet = function(title, reward, desc) {
    document.getElementById('sheet-gig-title').innerText = title;
    document.getElementById('sheet-gig-reward').innerText = `₹${reward} Reward`;
    document.getElementById('sheet-gig-desc').innerText = desc;
    window.selectedGigData = { title, reward, desc };
    window.openSheet('task-sheet');
}

window.acceptTask = function() {
    if(!window.selectedGigData) return;
    document.getElementById('active-gig-name').innerText = window.selectedGigData.title;
    document.getElementById('active-gig-reward').innerText = `₹${window.selectedGigData.reward}`;
    document.getElementById('active-gig-desc').innerText = window.selectedGigData.desc;
    
    window.closeAllSheets();
    setTimeout(() => {
        window.switchTab('project');
        window.switchWsTab('active', document.querySelectorAll('.ws-tab')[1]);
        window.showToast("✅ Gig Accepted! Upload proof now.");
    }, 300);
}

// 🟢 4. IMGBB UPLOAD & TASK SUBMIT
window.submitTaskProofReal = async function() {
    const gigName = document.getElementById('active-gig-name').innerText;
    if(gigName === "No Task Accepted") { window.showToast("⚠️ Accept a gig first!"); return; }

    const fileInput = document.getElementById("proof-image");
    const file = fileInput.files[0];
    if(!file) { window.showToast("⚠️ Please select a screenshot proof!"); return; }

    const btn = document.getElementById("submit-proof-btn");
    btn.innerText = "Uploading Screenshot... ⏳";
    btn.disabled = true;
    btn.classList.add("opacity-50");

    try {
        const formData = new FormData();
        formData.append("image", file);
        const imgResponse = await fetch("https://api.imgbb.com/1/upload?key=7d2c13c8fedf546d91b46d36c1ef76d0", {
            method: "POST",
            body: formData
        });
        
        const imgData = await imgResponse.json();
        if(!imgData.success) throw new Error("Image upload failed");
        const downloadURL = imgData.data.url; 

        await addDoc(collection(db, "task_submissions"), {
            userPhone: userPhone || "Unknown",
            gigName: gigName,
            gigReward: window.selectedGigData.reward,
            proofLink: downloadURL, 
            status: "Pending Approval",
            timestamp: new Date()
        });

        fileInput.value = ""; 
        document.getElementById('active-gig-name').innerText = "No Task Accepted";
        document.getElementById('active-gig-reward').innerText = "₹0";
        document.getElementById('active-gig-desc').innerText = "Browse the explore tab to accept a task.";
        window.selectedGigData = null;

        window.showToast("🚀 Proof Uploaded! Sent to Admin.");
        setTimeout(() => { window.switchWsTab('review', document.querySelectorAll('.ws-tab')[2]); }, 1000);
    } catch (e) {
        console.error(e);
        window.showToast("❌ Upload Failed. Check connection!");
    } finally {
        btn.innerText = "Submit Task For Review";
        btn.disabled = false;
        btn.classList.remove("opacity-50");
    }
}

// 🟢 5. FULL TRANSACTION HISTORY 
if(userPhone) {
    let combinedLedger = [];

    const renderLedger = () => {
        let html = "";
        combinedLedger.sort((a,b) => b.timestamp - a.timestamp);

        combinedLedger.forEach(item => {
            if (item.type === 'withdrawal') {
                html += `
                <div class="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold">↑</div>
                        <div>
                            <p class="text-sm font-bold text-slate-800">Withdrawal to UPI</p>
                            <p class="text-[10px] text-slate-400 mt-0.5">Status: <span class="text-orange-500 font-bold">${item.data.status}</span></p>
                        </div>
                    </div>
                    <p class="text-sm font-black text-slate-800">- ₹${item.data.amount}</p>
                </div>`;
            } else if (item.type === 'task') {
                html += `
                <div class="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center font-bold">↓</div>
                        <div>
                            <p class="text-sm font-bold text-slate-800">Task Reward</p>
                            <p class="text-[10px] text-slate-400 mt-0.5">Task: <span class="text-emerald-500 font-bold">${item.data.gigName}</span></p>
                        </div>
                    </div>
                    <p class="text-sm font-black text-emerald-500">+ ₹${item.data.gigReward || 0}</p>
                </div>`;
            }
        });

        document.getElementById('history-container').innerHTML = html || `
            <div class="text-center py-10 opacity-60">
                <span class="text-5xl mb-3 block">📭</span>
                <p class="text-sm font-bold text-slate-800">No transactions yet</p>
            </div>`;
    };

    const histQ = query(collection(db, "withdrawals"), where("userPhone", "==", userPhone));
    onSnapshot(histQ, (snap) => {
        combinedLedger = combinedLedger.filter(item => item.type !== 'withdrawal');
        snap.forEach(d => combinedLedger.push({ type: 'withdrawal', timestamp: d.data().timestamp, data: d.data() }));
        renderLedger();
    });

    const taskQ = query(collection(db, "task_submissions"), where("userPhone", "==", userPhone), where("status", "==", "Completed"));
    onSnapshot(taskQ, (snap) => {
        combinedLedger = combinedLedger.filter(item => item.type !== 'task');
        snap.forEach(d => combinedLedger.push({ type: 'task', timestamp: d.data().timestamp, data: d.data() }));
        renderLedger();
    });
}

// 🟢 6. WITHDRAWAL SYSTEM
window.processWithdrawReal = async function() {
    const amtBox = document.getElementById("withdraw-amount");
    const amt = parseInt(amtBox.value);
    const btn = document.getElementById("withdraw-btn");
    
    if(!amt || amt < 50) { window.showToast("⚠️ Minimum withdrawal is ₹50"); return; }
    if(amt > window.currentBalance) { window.showToast("⚠️ Insufficient balance!"); return; }

    btn.innerText = "Processing Securely...";
    btn.disabled = true;

    if(userDocId) {
        try {
            const newBal = window.currentBalance - amt;
            await updateDoc(doc(db, "users", userDocId), { balance: newBal });
            
            await addDoc(collection(db, "withdrawals"), {
                userPhone: userPhone,
                amount: amt,
                upi: window.savedUPI,
                status: "Pending",
                timestamp: new Date()
            });

            window.closeFullPage('withdraw-page');
            setTimeout(() => { window.showToast(`💸 ₹${amt} request sent securely!`); amtBox.value = ""; }, 400);
        } catch(e) { 
            window.showToast("❌ Withdrawal Failed. Try again."); 
        } finally {
            btn.innerHTML = `<svg class="w-5 h-5 inline-block -mt-1 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Proceed Securely`;
            btn.disabled = false;
        }
    }
}

// 🟢 7. KYC / UPI SAVING
window.saveRealKYC = async function() {
    const inputBox = document.getElementById("upi-input-box");
    if(inputBox.value.includes("@")) {
        if(userDocId) {
            window.showToast("⏳ Saving Securely...");
            try {
                await updateDoc(doc(db, "users", userDocId), { upi: inputBox.value });
                window.closeAllSheets();
                window.showToast("🏦 UPI Linked & Locked!");
            } catch(e) {
                window.showToast("❌ Error saving UPI.");
            }
        }
    } else { window.showToast("⚠️ Enter a valid UPI ID (e.g., name@ybl)"); }
}
