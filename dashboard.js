import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS & UTILS =================
window.currentBalance = 0;
window.savedUPI = "";
window.selectedGigData = null;
window.myReferCode = ""; 
window.referBonusPerUser = 5; 
window.userDocId = null; // 🔥 Global Doc ID for updates

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

// 🟢 1. LIVE USER SYNC & LOCK SYSTEM
if(userPhone) {
    const q = query(collection(db, "users"), where("phone", "==", userPhone));
    onSnapshot(q, (snapshot) => {
        if(!snapshot.empty) {
            const docData = snapshot.docs[0];
            window.userDocId = docData.id; // 🔥 Storing the real ID
            const userData = docData.data();
            
            // UI Update Logic
            document.getElementById("home-user-name").innerText = userData.name || "User";
            document.getElementById("home-top-balance").innerText = `₹ ${userData.balance || 0}`;
            document.getElementById("withdraw-page-balance").innerText = `₹ ${userData.balance || 0}`;
            window.currentBalance = userData.balance || 0;

            // UPI Lock Logic
            if(userData.upi && userData.upi !== "") {
                window.savedUPI = userData.upi;
                const upiBox = document.getElementById("upi-input-box");
                if(upiBox) {
                    upiBox.value = userData.upi;
                    upiBox.disabled = true;
                }
                // Update Button
                const btn = document.querySelector("#kyc-sheet button");
                if(btn) {
                    btn.innerText = "Verified & Locked 🔒";
                    btn.disabled = true;
                    btn.classList.add("bg-emerald-500");
                }
            }
        }
    });
}

// 🟢 2. REAL UPI SAVE FUNCTION (The Fix)
window.saveRealKYC = async function() {
    const upiInput = document.getElementById("upi-input-box").value.trim();
    
    if(!upiInput.includes("@")) {
        window.showToast("⚠️ Please enter a valid UPI ID");
        return;
    }

    if(!window.userDocId) {
        window.showToast("❌ System Error: Try logging in again.");
        return;
    }

    window.showToast("⏳ Saving UPI...");
    
    try {
        const userRef = doc(db, "users", window.userDocId);
        await updateDoc(userRef, {
            upi: upiInput
        });
        window.showToast("✅ UPI Saved & Locked!");
        setTimeout(() => { window.closeAllSheets(); }, 1000);
    } catch (e) {
        console.error(e);
        window.showToast("❌ Error saving to server.");
    }
}

// Gig and Ledger Sync (Old Logic remains same but inside the module)
onSnapshot(collection(db, "gigs"), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const g = doc.data();
        html += `<div class="premium-card p-5 rounded-3xl mb-4">
            <h4 class="font-black text-slate-800">${g.title}</h4>
            <p class="text-emerald-500 font-bold">₹${g.reward}</p>
            <button onclick="window.openGigSheet('${g.title}', ${g.reward}, '${g.link}')" class="w-full bg-blue-600 text-white font-bold py-2 rounded-xl mt-3 text-sm">View Details</button>
        </div>`;
    });
    document.getElementById('gigs-container').innerHTML = html;
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
    window.closeAllSheets();
    window.switchTab('project');
    window.showToast("✅ Accepted!");
}
