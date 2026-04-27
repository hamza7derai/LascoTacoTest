// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBebaGxqiNBvCqofveg1Fmztl7av3Mdoyg",
    authDomain: "lascotaco-67fe5.firebaseapp.com",
    projectId: "lascotaco-67fe5",
    storageBucket: "lascotaco-67fe5.firebasestorage.app",
    messagingSenderId: "865918381027",
    appId: "1:865918381027:web:abc6435df20894020c4ed6"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- 2. GLOBAL STATE ---
let cart = JSON.parse(localStorage.getItem('lt_cart')) || {}; // Store cart in local for persistence
let activeStore = 'Restaurant'; 
let activeCat = '🔥 Top vente';

// --- 3. INITIALIZATION ---
function init() {
    loadDynamicSlides();
    renderLabels();
    loadProducts();
    syncUI();
    lucide.createIcons();
}

// --- 4. DYNAMIC SLIDER (From Dashboard) ---
async function loadDynamicSlides() {
    const slider = document.getElementById('slider');
    const snap = await db.collection("banners").orderBy("timestamp", "desc").get();
    
    if (snap.empty) {
        slider.innerHTML = `<img src="https://via.placeholder.com/1000x400?text=Bienvenue" class="min-w-full object-cover rounded-[20px]">`;
        return;
    }

    slider.innerHTML = "";
    snap.forEach(doc => {
        slider.innerHTML += `
            <div class="min-w-full h-full shrink-0">
                <img src="${doc.data().url}" class="w-full h-full object-cover rounded-[20px]">
            </div>`;
    });

    startAutoSlider();
}

function startAutoSlider() {
    let index = 0;
    const slider = document.getElementById('slider');
    const total = slider.children.length;
    if(total <= 1) return;

    setInterval(() => {
        index = (index + 1) % total;
        slider.style.transform = `translateX(-${index * 100}%)`;
    }, 5000);
}

// --- 5. CATEGORY & STORE LOGIC ---
async function renderLabels() {
    const nav = document.getElementById('sub-nav');
    nav.innerHTML = `<button onclick="setCat('🔥 Top vente')" class="px-6 py-2.5 rounded-xl font-bold whitespace-nowrap border ${activeCat === '🔥 Top vente' ? 'active-label' : 'bg-white text-gray-400 border-transparent'}">🔥 Top vente</button>`;
    
    // Fetch labels created in Manager Pro
    const snap = await db.collection("categories").where("type", "==", activeStore).get();
    snap.forEach(doc => {
        const name = doc.data().name;
        const active = activeCat === name ? 'active-label' : 'bg-white text-gray-400 border-transparent';
        nav.innerHTML += `<button onclick="setCat('${name}')" class="px-6 py-2.5 rounded-xl font-bold whitespace-nowrap border transition-all ${active}">${name}</button>`;
    });
}

function setStore(type) {
    activeStore = type;
    activeCat = '🔥 Top vente';
    document.getElementById('btn-resto').classList.toggle('active-main', type === 'Restaurant');
    document.getElementById('btn-epi').classList.toggle('active-main', type === 'Épicerie');
    renderLabels();
    loadProducts();
}

function setCat(cat) {
    activeCat = cat;
    renderLabels();
    loadProducts();
}

// --- 6. PRODUCT ENGINE ---
function loadProducts() {
    let query = db.collection("products").where("type", "==", activeStore);
    
    if (activeCat === '🔥 Top vente') {
        query = query.where("isTop", "==", true);
    } else {
        query = query.where("category", "==", activeCat);
    }

    query.onSnapshot(snap => {
        const grid = document.getElementById('product-grid');
        grid.innerHTML = snap.empty ? `<p class="col-span-2 text-center py-20 text-gray-300 font-bold">Arrivage bientôt...</p>` : "";
        
        snap.forEach(doc => {
            const p = doc.data();
            const qtyInCart = cart[p.name]?.qty || 0;
            
            grid.innerHTML += `
                <div class="glass-card p-3 flex flex-col gap-3">
                    <div class="h-32 bg-gray-50 rounded-2xl overflow-hidden relative">
                        <img src="${p.image}" class="w-full h-full object-cover">
                        ${p.isTop ? '<span class="absolute top-2 left-2 bg-orange-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-md">TOP</span>' : ''}
                    </div>
                    <h3 class="font-bold text-sm text-gray-800">${p.name}</h3>
                    <div class="flex justify-between items-center mt-auto">
                        <span class="font-black text-[#E85A24] text-sm">${p.price} DH</span>
                        <div class="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                            <button onclick="updateQty('${p.name}', ${p.price}, -1)" class="w-7 h-7 bg-white rounded-lg shadow-sm font-bold text-xs">-</button>
                            <span class="font-bold text-xs w-4 text-center">${qtyInCart}</span>
                            <button onclick="updateQty('${p.name}', ${p.price}, 1)" class="w-7 h-7 bg-[#E85A24] text-white rounded-lg shadow-sm font-bold text-xs">+</button>
                        </div>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    });
}

// --- 7. CART SYSTEM ---
function updateQty(name, price, change) {
    if (!cart[name]) cart[name] = { qty: 0, price: price };
    cart[name].qty += change;
    
    if (cart[name].qty <= 0) delete cart[name];
    
    localStorage.setItem('lt_cart', JSON.stringify(cart));
    syncUI();
}

function syncUI() {
    let total = 0; 
    let count = 0;
    
    for (let id in cart) { 
        total += cart[id].qty * cart[id].price; 
        count += cart[id].qty;
    }

    document.getElementById('nav-total').innerText = total + " DH";
    document.getElementById('final-price').innerText = total + " DH";
    document.getElementById('item-count').innerText = count + " ARTICLES";
    document.getElementById('checkout-bar').classList.toggle('hidden', count === 0);
    
    if (document.getElementById('cart-drawer').classList.contains('hidden') === false) {
        renderDrawer();
    }
}

function toggleCart(show) {
    const drawer = document.getElementById('cart-drawer');
    const panel = document.getElementById('cart-panel');
    if(show) {
        drawer.classList.remove('hidden');
        setTimeout(() => panel.classList.remove('translate-x-full'), 10);
        renderDrawer();
    } else {
        panel.classList.add('translate-x-full');
        setTimeout(() => drawer.classList.add('hidden'), 400);
    }
}

function renderDrawer() {
    const items = document.getElementById('cart-items');
    const cartKeys = Object.keys(cart);
    
    if(cartKeys.length === 0) {
        items.innerHTML = `<p class="text-center text-gray-400 py-10 font-bold">Panier vide 🥪</p>`;
        return;
    }
    
    items.innerHTML = cartKeys.map(name => `
        <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl">
            <div class="flex-1">
                <p class="font-black text-sm">${name}</p>
                <p class="text-[#F28C28] font-black">${cart[name].price} DH</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="updateQty('${name}', ${cart[name].price}, -1)" class="w-8 h-8 bg-white rounded-lg shadow-sm font-black">-</button>
                <span class="font-bold text-sm">${cart[name].qty}</span>
                <button onclick="updateQty('${name}', ${cart[name].price}, 1)" class="w-8 h-8 bg-[#F28C28] text-white rounded-lg shadow-sm font-black">+</button>
            </div>
        </div>
    `).join('');
}

function sendToWhatsApp() {
    let msg = `🛒 *Nouvelle Commande LASCOTACO*\n\n`;
    let total = 0;
    
    for (let name in cart) { 
        msg += `• ${cart[name].qty}x ${name} (${cart[name].qty * cart[name].price} DH)\n`;
        total += cart[name].qty * cart[name].price;
    }
    
    msg += `\n💰 *Total: ${total} DH*`;
    window.open(`https://wa.me/212635791674?text=${encodeURIComponent(msg)}`);
}

// Start
init();