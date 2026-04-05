// ==========================================
// 🛡️ SECURE API-DRIVEN DASHBOARD LOGIC 🛡️
// No Firebase Keys Exposed. 100% Backend Control.
// ==========================================

const userPhone = localStorage.getItem("earnprox_user_phone");
const userToken = sessionStorage.getItem("earnprox_secure_token");

if (!userPhone || !userToken) {
    window.location.replace("login.html");
}

// ================= UI GLOBALS =================
window.currentBalance = 0; 
window.savedUPI = ""; 
window.savedBankName = ""; 
window.myReferCode = ""; 
window.myActiveGig = null;

// ================= 1. UI FUNCTIONS (TABS & MODALS) =================
window.showToast = (m) => { 
    const t = document.getElementById("toast"); 
    if(t) { t.innerText = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); } 
};

window.switchTab = (id) => { 
    document.querySelectorAll('.tab-content').forEach(t => {
        t.style.opacity = '0'; setTimeout(() => t.classList.remove('active'), 150);
    }); 
    setTimeout(() => {
        const target = document.getElementById('view-' + id); 
        if(target) { target.classList.add('active'); target.style.opacity = '1'; }
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }, 150);

    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === id) {
            btn.classList.remove('text-slate-400'); btn.classList.add('text-pink-600');
        } else {
            btn.classList.add('text-slate-400'); btn.classList.remove('text-pink-600');
        }
    });
};

window.openSheet = (id) => { 
    const overlay = document.getElementById('universal-overlay');
    const sheet = document.getElementById(id);
    if(overlay && sheet) { overlay.classList.add('modal-active'); sheet.classList.add('sheet-active'); }
};

window.closeAllSheets = () => { 
    document.querySelectorAll('.sheet-active').forEach(s => s.classList.remove('sheet-active')); 
    const overlay = document.getElementById('universal-overlay');
    if(overlay) overlay.classList.remove('modal-active'); 
};

window.openFullPage = (id) => { 
    if(!window.savedUPI && id === 'withdraw-page') return window.showToast("⚠️ Link Payout Settings first!"); 
    const fp = document.getElementById(id);
    if(fp) { fp.classList.add('full-page-active'); if(id === 'withdraw-page') setTimeout(() => document.getElementById("withdraw-amount").focus(), 300); }
};

window.closeFullPage = (id) => { 
    const fp = document.getElementById(id);
    if(fp) fp.classList.remove('full-page-active'); 
};

window.logoutUser = () => { 
    if(confirm("Are you sure you want to log out?")) { 
        localStorage.clear(); sessionStorage.clear(); window.location.href="login.html"; 
    } 
};

window.copyReferLink = () => { 
    if(!window.myReferCode) return window.showToast("⚠️ Code not ready"); 
    navigator.clipboard.writeText(`https://earnprox.in/index.html?ref=${window.myReferCode}`).then(()=>window.showToast("✅ Code Copied!")); 
};

// ================= 2. SECURE DATA FETCHING =================
document.addEventListener("DOMContentLoaded", async () => {
    // Show cached UI immediately for speed
    const cachedName = localStorage.getItem("epx_cached_name");
    if(cachedName) document.getElementById("home-card-user-name").innerText = cachedName;

    await syncDashboard();
});

async function syncDashboard() {
    try {
        // 🔥 सारा डेटा एक ही सिक्योर API कॉल से आएगा
        const response = await fetch('/api/dashboard-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone, token: userToken })
        });

        const data = await response.json();

        if (response.ok) {
            updateDashboardUI(data);
            // Hide Loader
            const loader = document.getElementById("app-loader");
            if(loader) { loader.style.opacity = "0"; setTimeout(() => loader.style.display = "none", 500); }
        } else {
            alert(data.error || "Session Expired!");
            window.logoutUser();
        }
    } catch (e) {
        window.showToast("❌ Network Error while syncing.");
    }
}

// ================= 3. POPULATE UI WITH REAL DATA =================
function updateDashboardUI(data) {
    // Set Globals
    window.currentBalance = data.wallet.balance;
    window.savedUPI = data.kyc.upi;
    window.savedBankName = data.kyc.bankName;
    window.myReferCode = data.user.referCode;
    
    localStorage.setItem("epx_cached_name", data.user.name);

    // Write text safely function
    const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };

    // Header & Home Profile
    setText("home-card-user-name", data.user.name);
    setText("profile-user-name", data.user.name);
    setText("refer-page-name", data.user.name);
    setText("home-card-refer-code", data.user.referCode);
    setText("referral-code-text", data.user.referCode);
    
    // Set Avatars
    const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${data.user.name}&backgroundColor=b6e3f4`;
    const setImg = (id) => { const el = document.getElementById(id); if(el) el.src = avatarUrl; };
    setImg("home-profile-avatar"); setImg("profile-avatar"); setImg("refer-profile-img");

    // Wallet Balances
    setText("home-top-balance", `₹${data.wallet.balance.toFixed(2)}`);
    setText("withdraw-page-balance", `₹${data.wallet.balance.toFixed(2)}`);
    
    const mainBal = document.getElementById("main-balance-display");
    if(mainBal) mainBal.innerHTML = `₹ ${Math.floor(data.wallet.balance)}<span class="text-xl text-white/80 font-bold drop-shadow-none">.${(data.wallet.balance % 1).toFixed(2).split('.')[1]}</span>`;

    // Stats
    setText("stat-total-earn", `₹${data.stats.totalEarn.toFixed(2)}`);
    setText("stat-total-withdraw", `₹${data.stats.totalWithdraw.toFixed(2)}`);
    setText("stat-task-earn", `₹${data.stats.taskEarn.toFixed(2)}`);
    setText("stat-refer-earn", `₹${data.stats.referEarn.toFixed(2)}`);

    // 3-Level Network UI Updates
    setText("total-refers-count", data.network.totalCount);
    setText("graph-active-members", data.network.totalCount);
    setText("graph-network-income", `₹${data.stats.referEarn.toFixed(2)}`);
    
    setText("badge-l1", data.network.l1);
    setText("badge-l2", data.network.l2);
    setText("badge-l3", data.network.l3);

    // KYC Settings update
    if (window.savedUPI) {
        document.getElementById("bank-name-input").value = window.savedBankName;
        document.getElementById("upi-input-box").value = window.savedUPI;
        setText("withdraw-display-name", window.savedBankName);
        setText("withdraw-display-upi", window.savedUPI);
        setText("withdraw-avatar-text", window.savedBankName.charAt(0).toUpperCase());
    }
}

// ================= 4. SECURE ACTIONS =================

// KYC SAVE API
window.saveRealKYC = async function() { 
    const n = document.getElementById("bank-name-input").value.trim();
    const u = document.getElementById("upi-input-box").value.trim();
    
    if(n.length < 3 || !u.includes("@")) return window.showToast("⚠️ Invalid Name or UPI"); 
    
    try {
        const response = await fetch('/api/update-kyc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone, token: userToken, bankName: n, upi: u })
        });
        
        if(response.ok) {
            window.showToast("✅ Details Saved!"); 
            setTimeout(() => window.closeAllSheets(), 1000);
            syncDashboard(); // refresh data
        } else {
            const data = await response.json();
            window.showToast("❌ " + data.error);
        }
    } catch(e) {
        window.showToast("❌ Network Error.");
    }
}

// WITHDRAWAL API (Secured)
window.processWithdrawReal = async function() { 
    const amtInput = document.getElementById("withdraw-amount");
    if(!amtInput) return;
    
    const amt = parseInt(amtInput.value); 
    if(!amt || amt < 50) return window.showToast("⚠️ Min Withdraw ₹50"); 
    
    const btn = document.getElementById("withdraw-btn"); 
    if(btn) { 
        btn.disabled = true; 
        btn.innerText = "Processing..."; 
        btn.classList.add("opacity-80", "cursor-not-allowed");
    }
    
    try { 
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone, token: userToken, amount: amt })
        });

        const data = await response.json();

        if(response.ok) {
            window.showToast("🚀 Withdrawal Request Sent!"); 
            window.closeFullPage('withdraw-page'); 
            amtInput.value = ""; 
            syncDashboard(); // Update balance live
        } else {
            window.showToast("❌ " + data.error); 
        }
    } catch(e) { 
        window.showToast("❌ Connection Failed"); 
    } finally { 
        if(btn) { 
            btn.innerText = "Proceed Securely"; 
            btn.disabled = false; 
            btn.classList.remove("opacity-80", "cursor-not-allowed");
        }
    } 
}
