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
window.networkData = null; // Tabs ke liye
window.networkDetails = null; // 🔥 FIX: Level list show karne ke liye

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

// --- Refer Tabs (All, Today, Yesterday) ko switch karne ke liye ---
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

        setText('total-refers-count', d.totalCount || 0);
        setText('stat-refer-earn-display', (d.totalEarn || 0).toFixed(2));

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

        setText('lvl1-count', l1C);
        setText('lvl1-earn', (d.l1Earn || 0).toFixed(2));
        setText('lvl2-count', l2C);
        setText('lvl2-earn', (d.l2Earn || 0).toFixed(2));
        setText('lvl3-count', l3C);
        setText('lvl3-earn', (d.l3Earn || 0).toFixed(2));
    }
}

// 🔥 Downline List Sheet open karne ka logic 🔥
window.showDownline = function(level) {
    const container = document.getElementById('downline-container');
    const title = document.getElementById('downline-sheet-title');
    
    if(!window.networkDetails || !window.networkDetails[level] || window.networkDetails[level].length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="text-5xl mb-3">📭</div>
                <p class="text-slate-400 font-bold text-sm">No members found.</p>
            </div>`;
    } else {
        let listHTML = '';
        window.networkDetails[level].forEach(user => {
            listHTML += `
            <div class="bg-white rounded-[16px] p-4 border border-slate-100 shadow-sm flex justify-between items-center mb-2">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200">
                        ${(user.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p class="text-[13px] font-bold text-slate-800">${user.name || "User"}</p>
                        <p class="text-[10px] font-bold text-slate-400 mt-0.5">Joined: ${user.date}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-[13px] font-black text-[#00A87A]">₹${parseFloat(user.earned || 0).toFixed(2)}</p>
                    <p class="text-[10px] font-bold text-slate-400 mt-0.5">Earned</p>
                </div>
            </div>`;
        });
        container.innerHTML = listHTML;
    }

    title.innerText = level === 'l1' ? "Level 1 Team" : (level === 'l2' ? "Level 2 Team" : "Level 3 Team");
    window.openSheet('downline-sheet');
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
        console.error(e);
        window.showToast("❌ Network Error while syncing.");
        const logContainer = document.getElementById("referral-list-container");
        if(logContainer) {
            logContainer.innerHTML = `<div class="bg-red-50 text-red-500 p-4 rounded-xl text-center font-bold text-sm border border-red-100 shadow-sm">Backend API (/api/dashboard-data) is not responding or connected yet.</div>`;
        }
    }
}

// ================= 3. POPULATE UI WITH REAL DATA =================
function updateDashboardUI(data) {
    window.currentBalance = data.wallet?.balance || 0;
    window.savedUPI = data.kyc?.upi || "";
    window.savedBankName = data.kyc?.bankName || "";
    window.myReferCode = data.user?.referCode || "";
    
    if(data.user?.name) localStorage.setItem("epx_cached_name", data.user.name);

    const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };

    // --- Header & Home Profile ---
    const userName = data.user?.name || "User";
    setText("home-card-user-name", userName);
    setText("profile-user-name", userName);
    setText("refer-page-name", userName);
    setText("home-card-refer-code", window.myReferCode);
    setText("referral-code-text", window.myReferCode);
    setText("top-nav-profile-initial", userName.charAt(0).toUpperCase());
    
    // --- Set Avatars ---
    const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${userName}&backgroundColor=b6e3f4`;
    const setImg = (id) => { const el = document.getElementById(id); if(el) el.src = avatarUrl; };
    setImg("home-profile-avatar"); setImg("profile-avatar"); setImg("refer-profile-img");

    // --- Wallet Balances ---
    setText("home-top-balance", `₹${window.currentBalance.toFixed(2)}`);
    setText("home-card-big-balance", window.currentBalance.toFixed(2));
    setText("withdraw-page-balance", `₹${window.currentBalance.toFixed(2)}`);
    
    const mainBal = document.getElementById("main-balance-display");
    if(mainBal) {
        const splitBal = window.currentBalance.toFixed(2).split('.');
        mainBal.innerHTML = `₹${splitBal[0]}<span class="text-xl text-white/80 font-bold drop-shadow-none">.${splitBal[1]}</span>`;
    }

    // --- Vault Stats ---
    setText("stat-total-earn", `₹${(data.stats?.totalEarn || 0).toFixed(2)}`);
    setText("stat-total-withdraw", `₹${(data.stats?.totalWithdraw || 0).toFixed(2)}`);
    setText("stat-task-earn", `₹${(data.stats?.taskEarn || 0).toFixed(2)}`);
    setText("stat-refer-earn", `₹${(data.stats?.referEarn || 0).toFixed(2)}`);
    setText("stat-refer-earn-display", (data.stats?.referEarn || 0).toFixed(2));

    // --- Store Data Globally ---
    if (data.network && data.network.all) {
        window.networkData = data.network;
    } else {
        window.networkData = {
            all: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 },
            today: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 },
            yesterday: { l1: 0, l2: 0, l3: 0, l1Earn: 0, l2Earn: 0, l3Earn: 0, totalCount: 0, totalEarn: 0 }
        };
    }

    // 🔥 FIX: Store individual user details globally for bottom sheet
    if (data.networkDetails) {
        window.networkDetails = data.networkDetails;
    }

    // Tab Load Karein
    window.switchReferTab('all');

    // --- Network Logs Fallback ---
    const logsContainer = document.getElementById('referral-list-container');
    if (logsContainer) {
        if(data.logs && data.logs.length > 0) {
            let logsHTML = '';
            data.logs.forEach(log => {
                logsHTML += `
                <div class="bg-white rounded-[16px] p-4 border border-slate-100 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer mt-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-${log.color || 'emerald'}-100 text-${log.color || 'emerald'}-600 flex items-center justify-center font-bold text-lg">${log.initial}</div>
                        <div>
                            <p class="text-[13px] font-bold text-slate-800">${log.name}</p>
                            <p class="text-[10px] font-bold text-slate-400 mt-0.5">${log.time}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-[13px] font-black text-[#00A87A]">+ ₹${log.amount}</p>
                        <p class="text-[10px] font-bold text-slate-400 mt-0.5">${log.comm} Comm.</p>
                    </div>
                </div>`;
            });
            logsContainer.innerHTML = logsHTML;
        } else {
            logsContainer.innerHTML = `
                <div class="bg-white rounded-xl p-6 text-center border border-slate-100 shadow-sm">
                    <span class="text-3xl mb-2 block opacity-50">👥</span>
                    <p class="text-sm font-bold text-slate-400">No network logs yet.</p>
                </div>
            `;
        }
    }

    // --- KYC Settings update ---
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
