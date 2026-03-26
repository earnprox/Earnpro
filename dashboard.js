import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= UI GLOBALS =================
window.currentBalance = 0;
window.savedUPI = "";
window.savedBankName = "";
window.userDocId = null;

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

// 🔥 NAV SYSTEM
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
    if(targetView) targetView.classList.add('active');
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
    if(pageId === 'withdraw-page') {
        setTimeout(() => document.getElementById("withdraw-amount").focus(), 300);
    }
}

window.closeFullPage = function(pageId) {
    document.getElementById(pageId).classList.remove('full-page-active');
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

// 🟢 1. LIVE USER SYNC (NAME & UPI)
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

            // Home UI
            document.getElementById("home-user-name").innerText = u.name || "User";
            document.getElementById("home-top-balance").innerText = `₹ ${window.currentBalance}`;
            
            // Withdraw Page UI
            document.getElementById("withdraw-page-balance").innerText = `₹ ${window.currentBalance}`;
            document.getElementById("withdraw-display-name").innerText = window.savedBankName || "Bank Transfer";
            document.getElementById("withdraw-display-upi").innerText = window.savedUPI || "Not Linked";
            document.getElementById("withdraw-avatar-text").innerText = (window.savedBankName || "U").charAt(0).toUpperCase();

            // Payout Sheet UI & Lock System
            if(window.savedUPI && window.savedBankName) {
                const bnameInput = document.getElementById("bank-name-input");
                const upiInput = document.getElementById("upi-input-box");
                if(bnameInput) { bnameInput.value = window.savedBankName; bnameInput.disabled = true; }
                if(upiInput) { upiInput.value = window.savedUPI; upiInput.disabled = true; }
                
                const btn = document.querySelector("#kyc-sheet button");
                if(btn) {
                    btn.innerText = "Verified & Locked 🔒";
                    btn.disabled = true;
                    btn.className = "w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg text-lg opacity-80";
                }
                const badge = document.getElementById("upi-status-badge");
                if(badge) {
                    badge.innerText = "Verified ✅";
                    badge.className = "text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded";
                }
            }
        }
    });
}

// 🟢 2. SAVE KYC (FIXED: NOW SAVES NAME + UPI)
window.saveRealKYC = async function() {
    const nameInput = document.getElementById("bank-name-input").value.trim();
    const upiInput = document.getElementById("upi-input-box").value.trim();

    if(nameInput.length < 3) {
        window.showToast("⚠️ Enter valid Banking Name");
        return;
    }
    if(!upiInput.includes("@")) {
        window.showToast("⚠️ Enter valid UPI ID");
        return;
    }

    window.showToast("⏳ Saving Details...");

    try {
        const userRef = doc(db, "users", window.userDocId);
        await updateDoc(userRef, {
            bankName: nameInput, // 🔥 Name saving fix
            upi: upiInput
        });
        window.showToast("✅ Details Locked!");
        setTimeout(() => { window.closeAllSheets(); }, 1000);
    } catch (e) { 
        console.error(e);
        window.showToast("❌ Save Failed"); 
    }
}

// 🟢 3. WITHDRAWAL ACTION
window.processWithdrawReal = async function() {
    const amt = parseInt(document.getElementById("withdraw-amount").value);
    
    if(!amt || isNaN(amt)) { window.showToast("⚠️ Enter amount!"); return; }
    if(amt < 50) { window.showToast("⚠️ Minimum withdrawal ₹50"); return; }
    if(amt > window.currentBalance) { window.showToast("❌ Insufficient Balance!"); return; }

    const btn = document.getElementById("withdraw-btn");
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        await updateDoc(doc(db, "users", window.userDocId), { 
            balance: window.currentBalance - amt 
        });
        
        await addDoc(collection(db, "withdrawals"), {
            userPhone: userPhone,
            userName: window.savedBankName,
            amount: amt,
            upi: window.savedUPI,
            status: "Pending",
            timestamp: new Date()
        });

        window.showToast("🚀 Success! Sent to Admin.");
        window.closeFullPage('withdraw-page');
    } catch(e) {
        window.showToast("❌ Failed");
    } finally {
        btn.innerHTML = `<svg class="w-5 h-5 inline-block -mt-1 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Proceed Securely`;
        btn.disabled = false;
    }
}
