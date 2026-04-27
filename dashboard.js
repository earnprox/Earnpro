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
window.networkData = null; // 🔥 NAYA: Tab switching data hold karne ke liye

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
            btn.classList.remove('text-slate-400'); btn.classList.add('text-[#00A87A]');
        } else {
            btn.classList.add('text-slate-400'); btn.classList.remove('text-[#00A87A]');
        }
    });
};

// 🔥 NAYA FUNCTION: Refer Tabs (All, Today, Yesterday) ko switch karne ke liye
window.switchReferTab = function(tabName) {
    const tabs = ['all', 'today', 'yesterday'];
    tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        if(el) {
            if(t === tabName) {
                el.className = "pb-3 border-b-4 border-[#00A87A] font-black text-slate-800 text-xs uppercase cursor-pointer transition-all";
            } else {
                el.className = "pb-3 text-slate-400 font-bold text-xs uppercase cursor-pointer transition-colors hover:text-slate-600";
            }
        }
    });

    if (window.networkData && window.networkData[tabName]) {
        const d = window.networkData[tabName];
        const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };

        // Update Totals for selected tab
        setText('total-refers-count', d.totalCount || 0);
        setText('stat-refer-earn-display', (d.totalEarn || 0).toFixed(2));

        // Update 3-Level Graph variables
        const l1C = d.l1 || 0, l2C = d.l2 || 0, l3C = d.l3 || 0;
        const maxCount = Math.max(l1C, l2C, l3C) || 1; 

        setText('chart-lvl1-count', l1C);
        setText('chart-lvl2-count', l2C);
        setText('chart-lvl3-count', l3C);

        const setHeight = (id, val) => { 
            const el = document.getElementById(id); 
            if(el) el.style.height = ((val / maxCount) * 80) + "%"; 
        };
        setHeight('chart-lvl1-bar', l1C);
        setHeight('chart-lvl2-bar', l2C);
        setHeight('chart-lvl3-bar', l3C);

        // Update Table
        setText('lvl1-count', l1C);
        setText('lvl1-earn', (d.l1Earn || 0).toFixed(2));
        setText('lvl2-count', l2C);
        setText('lvl2-earn', (d.l2Earn || 0).toFixed(2));
        setText('lvl3-count', l3C);
        setText('lvl3-earn', (d.l3Earn || 0).toFixed(2));
    }
}

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
    if(cachedName) {
        const nameEl = document.getElementById("home-card-user-name");
        if(nameEl) nameEl.innerText = cachedName;
    }

    await syncDashboard();
});

async function syncDashboard() {
    try {
        const response = await fetch('/api/dashboard-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone, token: userToken })
        });

        const data = await response.json();

        if (response.ok) {
            updateDashboardUI(data);
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
    window.currentBalance = data.wallet.balance;
    window.savedUPI = data.kyc.upi;
    window.savedBankName = data.kyc.bankName;
    window.myReferCode = data.user.referCode;
    
    localStorage.setItem("epx_cached_name", data.user.name);

    const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };

    // Header & Home Profile
    setText("home-card-user-name", data.user.name);
    setText("profile-user-name", data.user.name);
    setText("refer-page-name", data.user.name);
    setText("home-card-refer-code", data.user.referCode);
    setText("referral-code-text", data.user.referCode);
    
    const initials = data.user.name.charAt(0).toUpperCase();
    setText("top-nav-profile-initial", initials);
    
    // Set Avatars
    const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${data.user.name}&backgroundColor=b6e3f4`;
    const setImg = (id) => { const el = document.getElementById(id); if(el) el.src = avatarUrl; };
    setImg("home-profile-avatar"); setImg("profile-avatar"); setImg("refer-profile-img");

    // Wallet Balances
    setText("home-top-balance", `₹${data.wallet.balance.toFixed(2)}`);
    setText("withdraw-page-balance", `₹${data.wallet.balance.toFixed(2)}`);
    setText("home-card-big-balance", data.wallet.balance.toFixed(2));
    
    const mainBal = document.getElementById("main-balance-display");
    if(mainBal) mainBal.innerHTML = `₹${Math.floor(data.wallet.balance)}<span class="text-xl text-white/80 font-bold drop-shadow-none">.${(data.wallet.balance % 1).toFixed(2).split('.')[1]}</span>`;

    // Stats (Vault)
    setText("stat-total-earn", `₹${data.stats.totalEarn.toFixed(2)}`);
    setText("stat-total-withdraw", `₹${data.stats.totalWithdraw.toFixed(2)}`);
    setText("stat-task-earn", `₹${data.stats.taskEarn.toFixed(2)}`);
    setText("stat-refer-earn", `₹${data.stats.referEarn.toFixed(2)}`);

    // 🔥 FIX: Store Network Data globally for Tab Switching
    if (data.network && data.network.all) {
        window.networkData = data.network;
    } else {
        // Fallback matching backend structure
        window.networkData = {
            all: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 },
            today: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 },
            yesterday: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 }
        };
    }

    // Load 'ALL' tab by default
    window.switchReferTab('all');

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
            syncDashboard(); 
        } else {
            const data = await response.json();
            window.showToast("❌ " + data.error);
        }
    } catch(e) {
        window.showToast("❌ Network Error.");
    }
}

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
            syncDashboard(); 
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

// ================= 5. TRANSACTION HISTORY =================
window.loadTransactionHistory = async function() {
    const container = document.getElementById('history-container');
    
    // Show Loading State
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10">
            <svg class="animate-spin h-8 w-8 text-[#00A87A] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p class="text-slate-400 font-bold text-sm">Fetching passbook...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/dashboard-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone, token: userToken })
        });

        const data = await response.json();

        if (response.ok && data.transactions && data.transactions.length > 0) {
            container.innerHTML = ''; 
            
            data.transactions.forEach(txn => {
                const isWithdrawal = txn.type === 'Withdrawal';
                const colorClass = isWithdrawal ? 'text-rose-500' : 'text-[#00A87A]';
                const sign = isWithdrawal ? '-' : '+';
                const icon = isWithdrawal ? '📤' : '🎯';
                const statusColor = txn.status === 'Completed' ? 'text-[#00A87A]' : (txn.status === 'Rejected' ? 'text-rose-500' : 'text-amber-500');

                container.innerHTML += `
                    <div class="bg-slate-50 border border-slate-100 rounded-[16px] p-4 flex justify-between items-center hover:bg-slate-100 transition-colors mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-lg shadow-sm">
                                ${icon}
                            </div>
                            <div>
                                <p class="text-[13px] font-bold text-slate-800 leading-tight mb-0.5">${txn.title}</p>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                    ${txn.date} • <span class="${statusColor}">${txn.status}</span>
                                </p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-[15px] font-black ${colorClass}">${sign}₹${parseFloat(txn.amount).toFixed(2)}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12">
                    <div class="text-5xl mb-3">📭</div>
                    <p class="text-slate-400 font-bold text-sm">No transactions yet.</p>
                    <p class="text-slate-400 text-xs mt-1">Complete tasks to see history here.</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10">
                <p class="text-rose-500 font-bold text-sm">❌ Failed to load history.</p>
            </div>
        `;
    }
};
