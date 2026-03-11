// State Management
let customers = [];
let transactions = [];
let currentDetailId = null;
const customerGrid = document.getElementById('customer-grid');
const emptyState = document.getElementById('empty-state');
const totalCustomersEl = document.getElementById('total-customers');
const totalCompletedEl = document.getElementById('total-completed');
const searchInputFull = document.getElementById('search-input-full');
const customerGridRecent = document.getElementById('customer-grid-recent');
const customerGridFull = document.getElementById('customer-grid-full');
const totalCustomersSub = document.getElementById('total-customers-sub');

// Income DOM Elements
const totalGmvEl = document.getElementById('total-gmv');
const totalProfitEl = document.getElementById('total-profit');
const incomeList = document.getElementById('income-list');
const incomeEmptyState = document.getElementById('income-empty-state');

// Modals
const addModal = document.getElementById('add-modal');
const detailModal = document.getElementById('detail-modal');
const btnAddCustomer = document.getElementById('btn-add-customer');
const closeAddModal = document.getElementById('close-add-modal');
const closeDetailModal = document.getElementById('close-detail-modal');
const cancelAdd = document.getElementById('cancel-add');

// Forms & Detail Elements
const addForm = document.getElementById('add-form');
const detailName = document.getElementById('detail-name');
const detailPackage = document.getElementById('detail-package');
const detailDate = document.getElementById('detail-date');
const weekList = document.getElementById('week-list');
const btnDelete = document.getElementById('btn-delete');

// Initialize App
function init() {
    renderCustomers();
    renderIncomes();
    updateStats();
    setupEventListeners();
    registerServiceWorker();
    checkAuth();
    initBiometrics();
}

function checkAuth() {
    const loginWrapper = document.getElementById('login-wrapper');
    const appWrapper = document.getElementById('app-wrapper');
    if (localStorage.getItem('isLoggedIn') === 'true') {
        if (loginWrapper) loginWrapper.classList.add('hidden');
        if (appWrapper) appWrapper.classList.remove('hidden');
    }
}

// Global Firebase Access & Listener Setup
// Kita tunggu sampai window.db tersedia dengan polling singkat
const checkFirebaseInterval = setInterval(() => {
    if (window.db && window.onSnapshot && window.collection) {
        clearInterval(checkFirebaseInterval);
        setupRealtimeListeners();
    }
}, 100);

function setupRealtimeListeners() {
    const { collection, onSnapshot } = window;

    // Dengarkan perubahan pelanggan
    onSnapshot(collection(window.db, "customers"), (snapshot) => {
        customers = [];
        snapshot.forEach((doc) => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        renderCustomers();
        updateStats();

        // Jika modal detail sedang terbuka, perbarui visualnya
        if (currentDetailId && document.getElementById('detail-modal').classList.contains('active')) {
            openDetailModal(currentDetailId);
        }
    });

    // Dengarkan perubahan transaksi (urutkan berdasarkan tanggal terbaru dari server)
    const { query, orderBy } = window;
    const transQuery = query(collection(window.db, "transactions"), orderBy("date", "desc"));

    onSnapshot(transQuery, (snapshot) => {
        transactions = [];
        snapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        renderIncomes();
        updateStats();
    });
}

// Generate unique ID (Tidak terlalu krusial untuk ID lagi jika Firestore auto-gen, tapi dipertahankan opsional)
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format Date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Format Rupiah
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

// Save to Cloud Firestore
async function saveCustomers(docId, dataToSave) {
    if (!window.db || !window.setDoc || !window.doc) return;
    try {
        await window.setDoc(window.doc(window.db, "customers", docId), dataToSave);
    } catch (e) {
        console.error("Error adding document: ", e);
        alert('Gagal menyimpan data ke cloud. Cek koneksi internet Anda.');
    }
}

async function saveTransactions(docId, dataToSave) {
    if (!window.db || !window.setDoc || !window.doc) return;
    try {
        await window.setDoc(window.doc(window.db, "transactions", docId), dataToSave);
    } catch (e) {
        console.error("Error adding transaction: ", e);
    }
}

// Delete from Cloud Firestore
async function deleteDocDatabase(collectionName, docId) {
    if (!window.db || !window.deleteDoc || !window.doc) return;
    try {
        await window.deleteDoc(window.doc(window.db, collectionName, docId));
    } catch (e) {
        console.error("Error deleting document: ", e);
        alert('Gagal menghapus data dari cloud.');
    }
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        });
    }
}

// Navigation & View Management
function switchView(viewName) {
    const dashboardView = document.getElementById('view-dashboard');
    const historyView = document.getElementById('view-history');
    const customersView = document.getElementById('view-customers');
    const navHome = document.getElementById('nav-home');
    const navHistory = document.getElementById('nav-history');

    // Hide all views first
    dashboardView.classList.add('hidden');
    historyView.classList.add('hidden');
    customersView.classList.add('hidden');

    if (viewName === 'dashboard') {
        dashboardView.classList.remove('hidden');

        // Update Nav UI
        navHome.classList.add('text-brand-blue');
        navHome.classList.remove('text-brand-secondary');
        navHome.querySelector('div').classList.add('bg-brand-blue/10');

        navHistory.classList.remove('text-brand-blue');
        navHistory.classList.add('text-brand-secondary');
        navHistory.querySelector('div').classList.remove('bg-brand-blue/10');
    } else if (viewName === 'history') {
        historyView.classList.remove('hidden');

        // Update Nav UI
        navHistory.classList.add('text-brand-blue');
        navHistory.classList.remove('text-brand-secondary');
        navHistory.querySelector('div').classList.add('bg-brand-blue/10');

        navHome.classList.remove('text-brand-blue');
        navHome.classList.add('text-brand-secondary');
        navHome.querySelector('div').classList.remove('bg-brand-blue/10');
    } else if (viewName === 'customers') {
        customersView.classList.remove('hidden');

        // Customers view doesn't change bottom nav highlight (it's a sub-view of home)
        navHome.classList.add('text-brand-blue');
        navHome.classList.remove('text-brand-secondary');
        navHome.querySelector('div').classList.add('bg-brand-blue/10');

        navHistory.classList.remove('text-brand-blue');
        navHistory.classList.add('text-brand-secondary');
        navHistory.querySelector('div').classList.remove('bg-brand-blue/10');
    }

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update Dashboard Stats
function updateStats() {
    totalCustomersEl.textContent = customers.length;
    const completed = customers.filter(c => c.package === 'Paket VPN' && c.weeks.every(w => w === true)).length;
    totalCompletedEl.textContent = completed;

    const totalGmv = transactions.reduce((sum, t) => sum + parseInt(t.amount || 0), 0);
    const totalProfit = transactions.reduce((sum, t) => sum + parseInt(t.profit || 0), 0);

    totalGmvEl.textContent = formatRupiah(totalGmv);
    totalProfitEl.textContent = formatRupiah(totalProfit);
}

// Render Dashboard Cards
function renderCustomers(searchTerm = '') {
    // Sort customers by date descending (latest first)
    const sortedCustomers = [...customers].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    // Render Recent (Dashboard) - Limit 3
    renderToGrid(customerGridRecent, sortedCustomers.slice(0, 3));

    // Render Full List
    const filtered = sortedCustomers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderToGrid(customerGridFull, filtered);

    // Update sub-text
    totalCustomersSub.textContent = `${customers.length} Pelanggan Terdaftar`;
}

function renderToGrid(gridElement, customerList) {
    gridElement.innerHTML = '';

    if (customerList.length === 0) {
        gridElement.innerHTML = `<p style="color:var(--text-secondary); grid-column:1/-1; text-align:center; padding: 2rem 0;">Tidak ada data pelanggan.</p>`;
        return;
    }

    customerList.forEach(customer => {
        const isVpn = customer.package === 'Paket VPN';
        const completedWeeks = customer.weeks.filter(w => w).length;
        const progressPercent = (completedWeeks / 4) * 100;
        const isCompleted = completedWeeks === 4;
        const isPaid = customer.isPaid ?? false;

        const card = document.createElement('div');
        card.className = 'group bg-brand-card border border-brand-border rounded-xl p-6 cursor-pointer hover:-translate-y-1 hover:border-brand-blue hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.4)] transition-all relative overflow-hidden';
        card.onclick = () => openDetailModal(customer.id);

        const statusBadge = isPaid
            ? '<span class="text-[10px] font-bold bg-brand-green/10 text-brand-green px-2 py-0.5 rounded border border-brand-green/20">LUNAS</span>'
            : '<span class="text-[10px] font-bold bg-brand-red/10 text-brand-red px-2 py-0.5 rounded border border-brand-red/20">BELUM LUNAS</span>';

        let progressHtml = '';
        if (isVpn) {
            progressHtml = `
            <div class="mt-4">
                <div class="flex justify-between text-xs text-brand-secondary mb-2 font-medium">
                    <span>Status Perpanjangan</span>
                    <span class="${isCompleted ? 'text-brand-green' : 'text-brand-primary'}">${completedWeeks} / 4 Bln</span>
                </div>
                <div class="h-2 w-full bg-brand-border rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500 ease-out ${isCompleted ? 'bg-gradient-to-r from-brand-green to-emerald-400' : 'bg-gradient-to-r from-brand-blue to-purple-500'}" style="width: ${progressPercent}%;"></div>
                </div>
            </div>
            `;
        } else {
            progressHtml = `
            <div class="mt-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <i class="fa-solid fa-check"></i> Pembelian Langsung
                </span>
            </div>
            `;
        }

        card.innerHTML = `
            <div class="flex justify-between items-start mb-5">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-lg font-semibold text-brand-primary leading-none">${customer.name}</h3>
                        ${statusBadge}
                    </div>
                    <div class="text-xs text-brand-secondary flex items-center gap-1.5 font-medium">
                        <i class="fa-solid ${isVpn ? 'fa-server' : 'fa-bolt'} text-brand-blue"></i> ${customer.package}
                    </div>
                </div>
                <div class="text-[11px] font-semibold text-brand-secondary bg-white/5 px-2.5 py-1 rounded-full border border-white/5">${formatDate(customer.startDate)}</div>
            </div>
            ${progressHtml}
        `;
        gridElement.appendChild(card);
    });
}

// Add New Customer
function addCustomer(e) {
    e.preventDefault();

    const name = document.getElementById('customer-name').value;
    const pkg = document.getElementById('vpn-package').value;
    const priceInput = document.getElementById('customer-price').value;
    const costInput = document.getElementById('customer-cost').value;
    const date = document.getElementById('start-date').value;

    const price = parseInt(priceInput) || 0;
    const cost = parseInt(costInput) || 0;

    const newCustomer = {
        name: name,
        package: pkg,
        cost: cost,
        startDate: date,
        weeks: [true, false, false, false],
        isPaid: document.getElementById('is-paid').checked
    };

    const newId = generateId();
    saveCustomers(newId, newCustomer);

    // Auto-record income for the first week
    if (price > 0) {
        const transId = generateId();
        saveTransactions(transId, {
            type: `${pkg} (${name} - M1)`,
            amount: price,
            profit: price - cost,
            date: date
        });
    }

    closeModal(addModal);
    addForm.reset();
}

// Open Detail Modal
function openDetailModal(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    currentDetailId = id;

    detailName.textContent = customer.name;
    detailPackage.textContent = customer.package;
    detailDate.textContent = formatDate(customer.startDate);

    // Render Payment Status
    const statusBadge = document.getElementById('payment-status-badge');
    const isPaid = customer.isPaid ?? false;

    statusBadge.innerHTML = isPaid
        ? `<span class="text-brand-green flex items-center gap-1.5"><i class="fa-solid fa-circle-check"></i> Lunas</span>`
        : `<button onclick="togglePaymentStatus('${id}')" class="px-3 py-1 bg-brand-blue text-white text-xs rounded-md hover:bg-brand-blueHover transition-colors">Tandai Lunas</button>`;

    // Render Checkboxes
    weekList.innerHTML = '';

    if (customer.package === 'Paket VPN') {
        customer.weeks.forEach((isRenewed, index) => {
            // Hitung tanggal jatuh tempo (tanggal mulai + (minggu * 7 hari))
            const dueDate = new Date(customer.startDate);
            dueDate.setDate(dueDate.getDate() + (index * 7));

            const dateString = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

            const item = document.createElement('div');
            // Disable interaksi di minggu 1 (index 0)
            if (index === 0) {
                item.className = `flex justify-between items-center p-4 rounded-lg border bg-brand-green/5 border-brand-green/30 opacity-80 cursor-not-allowed`;
            } else {
                item.className = `flex justify-between items-center p-4 rounded-lg cursor-pointer transition-all border ${isRenewed ? 'bg-brand-green/5 border-brand-green/30' : 'bg-brand-card border-brand-border hover:border-slate-600'}`;
                item.onclick = () => toggleWeek(index);
            }

            item.innerHTML = `
                <div class="flex flex-col gap-1">
                    <span class="font-semibold text-[15px] ${isRenewed ? 'text-brand-green' : 'text-brand-primary'}">Bulan ${index + 1} &bull; ${dateString}</span>
                    <span class="text-xs ${isRenewed ? 'text-brand-green/80' : 'text-brand-secondary'}">${isRenewed ? 'Sudah Diperpanjang' : 'Belum Diperpanjang'}</span>
                </div>
                <div class="w-6 h-6 rounded flex items-center justify-center transition-colors border ${isRenewed ? 'bg-brand-green border-brand-green text-white' : 'border-brand-border text-transparent'}">
                    <i class="fa-solid fa-check text-xs"></i>
                </div>
            `;
            weekList.appendChild(item);
        });
    } else {
        weekList.innerHTML = `
            <div class="p-4 bg-brand-green/5 border border-brand-green/30 rounded-lg text-center">
                <i class="fa-solid fa-circle-check text-brand-green text-3xl mb-3"></i>
                <p class="text-sm text-brand-green font-semibold">Transaksi Selesai & Lunas</p>
                <p class="text-xs text-brand-secondary mt-1.5 leading-relaxed">Layanan ${customer.package} merupakan pembelian langsung dan tidak memerlukan perpanjangan bulanan.</p>
            </div>
        `;
    }

    openModal(detailModal);
}

// Toggle Week Status
function toggleWeek(weekIndex) {
    if (weekIndex === 0) return;

    const customer = customers.find(c => c.id === currentDetailId);
    if (!customer) return;

    if (weekIndex > 0 && customer.weeks[weekIndex] === false && customer.weeks[weekIndex - 1] === false) {
        alert('Harap perpanjang bulan sebelumnya terlebih dahulu.');
        return;
    }

    // Toggle logic
    const isNowRenewing = !customer.weeks[weekIndex];
    customer.weeks[weekIndex] = isNowRenewing;

    // Save update pelanggan
    const updatedCustomer = { ...customer };
    delete updatedCustomer.id;
    saveCustomers(currentDetailId, updatedCustomer);

    // UI update instan
    openDetailModal(currentDetailId);
}

// Toggle Payment Status
async function togglePaymentStatus(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    const newStatus = !customer.isPaid;

    const updatedCustomer = { ...customer, isPaid: newStatus };
    delete updatedCustomer.id;

    await saveCustomers(id, updatedCustomer);
    openDetailModal(id);
}

// Delete Customer
async function deleteCustomer() {
    if (confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) {
        await deleteDocDatabase("customers", currentDetailId);
        closeModal(detailModal);
    }
}

// Render Incomes
function renderIncomes() {
    incomeList.innerHTML = '';

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedTransactions.length === 0) {
        incomeEmptyState.style.display = 'block';
        incomeList.parentElement.parentElement.style.display = 'none'; // hide the table wrapper visually
    } else {
        incomeEmptyState.style.display = 'none';
        incomeList.parentElement.parentElement.style.display = 'block';

        sortedTransactions.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/50 transition-colors border-b border-brand-border last:border-0';
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-brand-primary">${formatDate(t.date)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                        ${t.type}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right font-semibold text-brand-green">${formatRupiah(t.amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right font-semibold text-emerald-500">${formatRupiah(t.profit || 0)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <button onclick="deleteIncome('${t.id}')" class="text-brand-secondary hover:text-brand-red transition-colors w-8 h-8 rounded-full hover:bg-brand-red/10 flex items-center justify-center mx-auto">
                        <i class="fa-solid fa-trash-can text-sm"></i>
                    </button>
                </td>
            `;
            incomeList.appendChild(tr);
        });
    }
}

// Delete Income
async function deleteIncome(id) {
    if (confirm('Hapus histori pendapatan ini?')) {
        await deleteDocDatabase("transactions", id);
    }
}

// Modal Helpers
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

// Setup Event Listeners
function setupEventListeners() {
    // Modal Toggles
    btnAddCustomer.addEventListener('click', () => openModal(addModal));
    closeAddModal.addEventListener('click', () => closeModal(addModal));
    cancelAdd.addEventListener('click', () => closeModal(addModal));

    closeDetailModal.addEventListener('click', () => closeModal(detailModal));

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === addModal) closeModal(addModal);
        if (e.target === detailModal) closeModal(detailModal);
    });

    // Forms
    addForm.addEventListener('submit', addCustomer);
    btnDelete.addEventListener('click', deleteCustomer);

    // Search
    searchInputFull.addEventListener('input', (e) => {
        renderCustomers(e.target.value);
    });

    // Sub-navigation buttons
    document.getElementById('btn-see-all').addEventListener('click', () => switchView('customers'));
    document.getElementById('btn-back-to-dash').addEventListener('click', () => switchView('dashboard'));

    // Bottom Navigation
    document.getElementById('nav-home').addEventListener('click', () => switchView('dashboard'));
    document.getElementById('nav-history').addEventListener('click', () => switchView('history'));

    // Login Handle
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            const loginError = document.getElementById('login-error');

            if (user === 'admin' && pass === 'admin123') {
                processLoginSuccess();
            } else {
                loginError.classList.remove('hidden');
                loginError.innerHTML = `<p class="text-sm text-brand-red font-medium"><i class="fa-solid fa-circle-exclamation mr-1"></i> Username atau password salah!</p>`;
            }
        });
    }

    // Logout Handle
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            document.getElementById('app-wrapper').classList.add('hidden');
            document.getElementById('login-wrapper').classList.remove('hidden');
            document.getElementById('login-form').reset();
            document.getElementById('login-error').classList.add('hidden');
        });
    }
}

// Auth Helpers
function processLoginSuccess() {
    localStorage.setItem('isLoggedIn', 'true');
    const loginWrapper = document.getElementById('login-wrapper');
    const appWrapper = document.getElementById('app-wrapper');
    const loginError = document.getElementById('login-error');
    if (loginWrapper) loginWrapper.classList.add('hidden');
    if (appWrapper) appWrapper.classList.remove('hidden');
    if (loginError) loginError.classList.add('hidden');
}

// Base64Url string to ArrayBuffer and vice versa
function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const charCode of bytes) {
        str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url) {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const buffer = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        buffer[i] = rawData.charCodeAt(i);
    }
    return buffer;
}

// Biometric Auth Support
function initBiometrics() {
    const btnBiometric = document.getElementById('btn-biometric');
    if (!btnBiometric) return;

    // Show button if WebAuthn is supported
    // Only works reliably on localhost, secure contexts (https), etc.
    if (window.PublicKeyCredential && window.isSecureContext) {
        btnBiometric.classList.remove('hidden');
        
        btnBiometric.addEventListener('click', async () => {
            const loginError = document.getElementById('login-error');
            loginError.classList.add('hidden');
            try {
                const existingCredIdBase64 = localStorage.getItem('biometricCredentialId');
                
                const challenge = new Uint8Array(32);
                window.crypto.getRandomValues(challenge);
                
                if (!existingCredIdBase64) {
                    // Register New Device for this browser
                    const userId = new Uint8Array(16);
                    window.crypto.getRandomValues(userId);
                    
                    const publicKey = {
                        challenge: challenge,
                        rp: { name: "Santri Digital Hub" },
                        user: {
                            id: userId,
                            name: "admin",
                            displayName: "Admin"
                        },
                        pubKeyCredParams: [
                            { type: "public-key", alg: -7 }, // ES256
                            { type: "public-key", alg: -257 } // RS256
                        ],
                        authenticatorSelection: {
                            userVerification: "preferred"
                        },
                        timeout: 60000,
                        attestation: "none"
                    };

                    const cred = await navigator.credentials.create({ publicKey });
                    localStorage.setItem('biometricCredentialId', bufferToBase64url(cred.rawId));
                    processLoginSuccess();
                } else {
                    // Authenticate with existing device
                    const publicKey = {
                        challenge: challenge,
                        allowCredentials: [{
                            type: "public-key",
                            id: base64urlToBuffer(existingCredIdBase64),
                            transports: ["internal"]
                        }],
                        userVerification: "preferred",
                        timeout: 60000
                    };
                    
                    await navigator.credentials.get({ publicKey });
                    processLoginSuccess();
                }
            } catch (err) {
                console.error("Biometric Authentication Failed:", err);
                loginError.innerHTML = `<p class="text-sm text-brand-red font-medium"><i class="fa-solid fa-circle-exclamation mr-1"></i> Biometrik gagal atau dibatalkan.</p>`;
                loginError.classList.remove('hidden');
            }
        });
    }
}

// Boot
init();
