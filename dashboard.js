import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS & UTILS =================
window.currentBalance = 0;
window.savedUPI = "";
window.selectedGigData = null;
window.myReferCode = ""; 
window.referBonusPerUser = 5; 
window.userDocId = null;

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

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
    if(!window.savedUPI) { window.showToast("⚠️ Save UPI ID in Payout Settings first!"); return; }
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

// 🟢 1. LIVE USER SYNC & BADGE FIX
if(userPhone) {
    const q = query(collection(db, "users"), where("phone", "==", userPhone));
    onSnapshot(q, (snapshot) => {
        if(!snapshot.empty) {
            const docData = snapshot.docs[0];
            window.userDocId = docData.id; 
            const userData = docData.data();
            
            document.getElementById("home-user-name").innerText = userData.name || "User";
            document.getElementById("home-top-balance").innerText = `₹ ${userData.balance || 0}`;
            window.currentBalance = userData.balance || 0;

            // 🔥 UPI STATUS BADGE LOGIC (The Fix)
            const statusBadge = document.getElementById("upi-status-badge");
            const upiDisplayText = document.getElementById("upi-display-text");
            const upiBox = document.getElementById("upi-input-box");
            const saveBtn = document.querySelector("#kyc-sheet button");

            if(userData.upi && userData.upi !== "" && userData.upi !== "None") {
                window.savedUPI = userData.upi;
                
                // Update Main Vault View
                upiDisplayText.innerText = userData.upi;
                statusBadge.innerText = "Verified ✅";
                statusBadge.className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                
                // Update KYC Sheet View
                if(upiBox) {
                    upiBox.value = userData.upi;
                    upiBox.disabled = true;
                    upiBox.classList.add("bg-slate-100", "text-slate-400");
                }
                if(saveBtn) {
                    saveBtn.innerText = "Verified & Locked 🔒";
                    saveBtn.disabled = true;
                    saveBtn.className = "w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg text-lg opacity-80 cursor-not-allowed";
                    saveBtn.onclick = null;
                }
            } else {
                // Keep it Pending if no UPI
                statusBadge.innerText = "Pending";
                statusBadge.className = "text-[11px] font-bold text-red-500 border border-red-200 bg-red-50 px-2 py-1 rounded";
                upiDisplayText.innerText = "UPI not linked";
            }
        }
    });
}

// 🟢 2. SAVE UPI FUNCTION
window.saveRealKYC = async function() {
    const upiInput = document.getElementById("upi-input-box").value.trim();
    
    if(!upiInput.includes("@")) {
        window.showToast("⚠️ Please enter a valid UPI ID");
        return;
    }

    if(!window.userDocId) {
        window.showToast("❌ Error: User ID not found");
        return;
    }

    window.showToast("⏳ Linking Account...");
    
    try {
        const userRef = doc(db, "users", window.userDocId);
        await updateDoc(userRef, {
            upi: upiInput
        });
        window.showToast("✅ UPI Linked Successfully!");
        setTimeout(() => { window.closeAllSheets(); }, 1000);
    } catch (e) {
        window.showToast("❌ Server Error.");
    }
}

// Gig Sync (In Progress logic)
onSnapshot(collection(db, "gigs"), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const g = doc.data();
        html += `<div class="premium-card p-5 rounded-3xl mb-4 border border-slate-100 shadow-sm">
            <div class="flex justify-between items-start">
               <div>
                  <h4 class="font-black text-slate-800 text-lg">${g.title}</h4>
                  <p class="text-emerald-600 font-bold text-sm mt-1">Reward: ₹${g.reward}</p>
               </div>
               <div class="bg-blue-50 p-2 rounded-xl text-xl">🚀</div>
            </div>
            <button onclick="window.openGigSheet('${g.title}', ${g.reward}, '${g.link}')" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mt-4 text-sm active:scale-95 transition">View Task Details</button>
        </div>`;
    });
    document.getElementById('gigs-container').innerHTML = html || "<p class='text-center py-10 text-slate-400 font-bold'>No tasks available</p>";
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
    document.getElementById('active-gig-desc').innerText = "Follow instructions and upload screenshot.";
    window.closeAllSheets();
    window.switchTab('project');
    window.switchWsTab('active', document.querySelectorAll('.ws-tab')[1]);
    window.showToast("✅ Gig Accepted!");
}
