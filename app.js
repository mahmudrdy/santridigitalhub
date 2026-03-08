// State Management
let customers = [];
let transactions = [];
let currentDetailId = null;
const customerGrid = document.getElementById('customer-grid');
const emptyState = document.getElementById('empty-state');
const totalCustomersEl = document.getElementById('total-customers');
const totalCompletedEl = document.getElementById('total-completed');
const searchInput = document.getElementById('search-input');

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
    const navHome = document.getElementById('nav-home');
    const navHistory = document.getElementById('nav-history');

    if (viewName === 'dashboard') {
        dashboardView.classList.remove('hidden');
        historyView.classList.add('hidden');

        // Update Nav UI
        navHome.classList.add('text-brand-blue');
        navHome.classList.remove('text-brand-secondary');
        navHome.querySelector('div').classList.add('bg-brand-blue/10');

        navHistory.classList.remove('text-brand-blue');
        navHistory.classList.add('text-brand-secondary');
        navHistory.querySelector('div').classList.remove('bg-brand-blue/10');
    } else {
        dashboardView.classList.add('hidden');
        historyView.classList.remove('hidden');

        // Update Nav UI
        navHistory.classList.add('text-brand-blue');
        navHistory.classList.remove('text-brand-secondary');
        navHistory.querySelector('div').classList.add('bg-brand-blue/10');

        navHome.classList.remove('text-brand-blue');
        navHome.classList.add('text-brand-secondary');
        navHome.querySelector('div').classList.remove('bg-brand-blue/10');
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
    customerGrid.innerHTML = '';

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) {
        customerGrid.style.display = 'none';
        emptyState.style.display = searchTerm ? 'none' : 'block';
        if (searchTerm && customers.length > 0) {
            customerGrid.style.display = 'grid';
            customerGrid.innerHTML = `<p style="color:var(--text-secondary); grid-column:1/-1; text-align:center;">Tidak ada pelanggan dengan nama "${searchTerm}".</p>`;
        }
    } else {
        customerGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        filtered.forEach(customer => {
            const isVpn = customer.package === 'Paket VPN';
            const completedWeeks = customer.weeks.filter(w => w).length;
            const progressPercent = (completedWeeks / 4) * 100;
            const isCompleted = completedWeeks === 4;

            const card = document.createElement('div');
            card.className = 'group bg-brand-card border border-brand-border rounded-xl p-6 cursor-pointer hover:-translate-y-1 hover:border-brand-blue hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.4)] transition-all relative overflow-hidden';
            card.onclick = () => openDetailModal(customer.id);

            let progressHtml = '';
            if (isVpn) {
                progressHtml = `
                <div class="mt-4">
                    <div class="flex justify-between text-xs text-brand-secondary mb-2 font-medium">
                        <span>Status Perpanjangan</span>
                        <span class="${isCompleted ? 'text-brand-green' : 'text-brand-primary'}">${completedWeeks} / 4 Minggu</span>
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
                        <h3 class="text-lg font-semibold text-brand-primary mb-1">${customer.name}</h3>
                        <div class="text-xs text-brand-secondary flex items-center gap-1.5 font-medium">
                            <i class="fa-solid ${isVpn ? 'fa-server' : 'fa-bolt'} text-brand-blue"></i> ${customer.package}
                        </div>
                    </div>
                    <div class="text-[11px] font-semibold text-brand-secondary bg-white/5 px-2.5 py-1 rounded-full border border-white/5">${formatDate(customer.startDate)}</div>
                </div>
                ${progressHtml}
            `;
            customerGrid.appendChild(card);
        });
    }
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
        price: price,
        cost: cost,
        startDate: date,
        weeks: [true, false, false, false]
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
                    <span class="font-semibold text-[15px] ${isRenewed ? 'text-brand-green' : 'text-brand-primary'}">Minggu ${index + 1} &bull; ${dateString}</span>
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
                <p class="text-xs text-brand-secondary mt-1.5 leading-relaxed">Layanan ${customer.package} merupakan pembelian langsung dan tidak memerlukan perpanjangan mingguan.</p>
            </div>
        `;
    }

    openModal(detailModal);
}

// Toggle Week Status
function toggleWeek(weekIndex) {
    // Pencegahan ganda (tindakan keamanan js): cegah minggu 1 (index 0) diubah
    if (weekIndex === 0) return;

    const customer = customers.find(c => c.id === currentDetailId);
    if (!customer) return;

    // Optional constraint: can only check week 2 if week 1 is checked
    if (weekIndex > 0 && customer.weeks[weekIndex] === false && customer.weeks[weekIndex - 1] === false) {
        alert('Harap perpanjang minggu sebelumnya terlebih dahulu.');
        return;
    }

    // Toggle logic
    const isNowRenewing = !customer.weeks[weekIndex];
    customer.weeks[weekIndex] = isNowRenewing;

    // Auto-record income if checking (not un-checking)
    if (isNowRenewing && customer.price && customer.price > 0) {
        // Hitung tanggal perpanjangan saat ini
        const dueDate = new Date(customer.startDate);
        dueDate.setDate(dueDate.getDate() + (weekIndex * 7));
        const dateStr = dueDate.toISOString().split('T')[0];

        // Ambil cost jika ada (untuk backward compatibility pelanggan lama, kita anggap cost 0 jika tidak diset)
        const cost = customer.cost || 0;

        const transId = generateId();
        saveTransactions(transId, {
            type: `${customer.package} (${customer.name} - M${weekIndex + 1})`,
            amount: customer.price,
            profit: customer.price - cost,
            date: dateStr
        });
    }

    // Save update pelanggan
    const updatedCustomer = { ...customer };
    delete updatedCustomer.id; // Jangan simpan ID di dalam field doc agar tidak duplicate
    saveCustomers(currentDetailId, updatedCustomer);

    // UI update instan (sambil menunggu server balik)
    openDetailModal(currentDetailId);
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
    searchInput.addEventListener('input', (e) => {
        renderCustomers(e.target.value);
    });

    // Bottom Navigation
    document.getElementById('nav-home').addEventListener('click', () => switchView('dashboard'));
    document.getElementById('nav-history').addEventListener('click', () => switchView('history'));
}

// Boot
init();
