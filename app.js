// ==================== INITIAL DATA & STATE ====================

// --- Firebase Configuration ---
// TODO: Replace this with your actual Firebase configuration object from your Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyAee5w7VvHwp2vQTQ-tmMXTZq9A56cZrx8",
  authDomain: "shop-e1ee5.firebaseapp.com",
  projectId: "shop-e1ee5",
  storageBucket: "shop-e1ee5.firebasestorage.app",
  messagingSenderId: "134385752009",
  appId: "1:134385752009:web:ba94a13ceb01062f0b3a18",
  measurementId: "G-J4VMRL84RW"
};

// Initialize Firebase
let db = null;
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}


const INITIAL_PRODUCTS = [
  // Sauces
  { id: "p1", name: "Tomato Ketchup", category: "Sauces", price: 120, mrp: 150, unit: "500g", imageUrl: "assets/sauces.png", stock: 50, desc: "Rich and thick tomato ketchup." },
  // Frozen
  { id: "p2", name: "Frozen Peas", category: "Frozen", price: 80, mrp: 100, unit: "1 kg", imageUrl: "assets/frozen.png", stock: 100, desc: "Freshly frozen green peas." },
  // Seasoning
  { id: "p3", name: "Mixed Herbs", category: "Seasoning", price: 60, mrp: 75, unit: "50g", imageUrl: "assets/seasoning.png", stock: 120, desc: "Aromatic mixed herbs for pizza and pasta." },
  // Cakes Material
  { id: "p4", name: "Baking Powder", category: "Cakes Material", price: 40, mrp: 50, unit: "100g", imageUrl: "assets/cakes_material.png", stock: 80, desc: "High quality baking powder for fluffy cakes." },
  // Cake Mould
  { id: "p5", name: "Silicone Cake Mould", category: "Cake Mould", price: 250, mrp: 300, unit: "1 pc", imageUrl: "assets/cake_mould.png", stock: 30, desc: "Non-stick silicone mould for baking." },
  // Cake Premix
  { id: "p6", name: "Chocolate Cake Premix", category: "Cake Premix", price: 150, mrp: 180, unit: "400g", imageUrl: "assets/cake_premix.png", stock: 60, desc: "Easy to bake chocolate cake premix." },
  // Coffees
  { id: "p7", name: "Instant Coffee", category: "Coffees", price: 200, mrp: 250, unit: "100g", imageUrl: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", stock: 90, desc: "Strong and aromatic instant coffee." },
  // Mojitos
  { id: "p8", name: "Virgin Mojito Syrup", category: "Mojitos", price: 180, mrp: 220, unit: "750ml", imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", stock: 45, desc: "Refreshing mint and lime mojito syrup." }
];

const DEFAULT_STORE_SETTINGS = {
  storeName: "QuickShop",
  deliveryFee: 25,
  freeDeliveryAbove: 300,
  deliveryTime: "10 min",
  phone: "+91 98765 43210",
  address: "Shop 12, Block C, Central Market, New Delhi"
};

// State management
let state = {
  currentUser: null,
  products: [],
  categories: [],
  cart: [],
  orders: [],
  appliedCoupon: null,
  storeSettings: {},
  currentCategory: null,
  activeAdminTab: 'dashboard'
};

// Initialize app data on startup
async function initApp() {
  if (!localStorage.getItem('qs_force_updated_categories_v3')) {
    localStorage.removeItem('qs_products');
    localStorage.removeItem('qs_categories');
    localStorage.setItem('qs_force_updated_categories_v3', 'true');
  }

  // Load products & categories from Firebase first, fallback to local
  try {
    const prodsSnap = await db.collection('products').get();
    if (!prodsSnap.empty) {
      state.products = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem('qs_products', JSON.stringify(state.products));
    } else {
      throw new Error('No products in Firebase');
    }
  } catch(e) {
    const savedProducts = localStorage.getItem('qs_products');
    if (savedProducts && JSON.parse(savedProducts).length > 0) {
      state.products = JSON.parse(savedProducts);
    } else {
      state.products = INITIAL_PRODUCTS;
      localStorage.setItem('qs_products', JSON.stringify(state.products));
    }
  }

  try {
    const catSnap = await db.collection('categories').orderBy('order').get();
    if (!catSnap.empty) {
      state.categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch(e) {
    state.categories = [];
  }

  // Load Settings
  try {
    const savedSettings = localStorage.getItem('qs_settings');
    if (savedSettings) {
      state.storeSettings = JSON.parse(savedSettings);
    } else {
      state.storeSettings = DEFAULT_STORE_SETTINGS;
      localStorage.setItem('qs_settings', JSON.stringify(state.storeSettings));
    }
  } catch(e) {
    state.storeSettings = DEFAULT_STORE_SETTINGS;
    localStorage.setItem('qs_settings', JSON.stringify(state.storeSettings));
  }

  // Load orders
  try {
    const savedOrders = localStorage.getItem('qs_orders');
    if (savedOrders) {
      state.orders = JSON.parse(savedOrders);
    } else {
      state.orders = [];
      localStorage.setItem('qs_orders', JSON.stringify(state.orders));
    }
  } catch(e) {
    state.orders = [];
    localStorage.setItem('qs_orders', JSON.stringify(state.orders));
  }

  // Sync all localStorage orders up to Firestore (migrates historical orders)
  if (db && Array.isArray(state.orders) && state.orders.length > 0) {
    state.orders.forEach(order => {
      const docId = String(order.id || order._id || '');
      if (!docId) return;
      db.collection('orders').doc(docId).set(order, { merge: true })
        .catch(err => console.warn('Order sync err:', err.message));
    });
  }

  try {
    const savedUser = localStorage.getItem('qs_current_user');
    if (savedUser) {
      state.currentUser = JSON.parse(savedUser);
      if (state.currentUser) {
        showScreen('store-screen');
        initStorefront();
      } else {
        showScreen('auth-screen');
      }
    } else {
      showScreen('auth-screen');
    }
  } catch(e) {
    console.warn('Session corrupted, clearing.', e);
    localStorage.removeItem('qs_current_user');
    showScreen('auth-screen');
  }
}

function clearSession() {
  localStorage.removeItem('qs_current_user');
  localStorage.removeItem('qs_products');
  localStorage.removeItem('qs_orders');
  localStorage.removeItem('qs_settings');
  location.reload();
}


// ==================== HELPER FUNCTIONS ====================

function showScreen(screenId) {
  // Use inline styles (highest specificity) — immune to any CSS override or caching
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
  });
  const target = document.getElementById(screenId);
  if (target) {
    // auth-screen needs flex, store-screen needs block
    target.style.display = (screenId === 'auth-screen') ? 'flex' : 'block';
  }
}


function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  if (type === 'info') icon = 'fa-info-circle';

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
function toggleAuthForm(formType) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm) loginForm.classList.add('hidden');
  if (signupForm) signupForm.classList.add('hidden');

  if (formType === 'login' && loginForm) {
    loginForm.classList.remove('hidden');
  } else if (formType === 'signup' && signupForm) {
    signupForm.classList.remove('hidden');
  }
}


function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }

  // Get local users
  const users = JSON.parse(localStorage.getItem('qs_users') || '[]');
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    state.currentUser = { name: user.name, email: user.email, phone: user.phone, address: user.address, role: 'customer' };
    localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));
    showToast(`Welcome back, ${user.name}!`);
    showScreen('store-screen');
    initStorefront();
  } else {
    showToast('Invalid email or password', 'error');
  }
}

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  const address = document.getElementById('signup-address').value.trim();

  if (!name || !phone || !email || !password || !address) {
    showToast('Please fill all fields', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  const users = JSON.parse(localStorage.getItem('qs_users') || '[]');
  if (users.some(u => u.email === email)) {
    showToast('Email already registered', 'error');
    return;
  }

  const newUser = { name, phone, email, password, address };
  users.push(newUser);
  localStorage.setItem('qs_users', JSON.stringify(users));

  state.currentUser = { name, email, phone, address, role: 'customer' };
  localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));

  // Save to Firestore customers collection
  if (db) {
    db.collection('customers').doc(email).set({ name, email, phone, address, joinedAt: new Date().toISOString() }, { merge: true })
      .catch(err => console.warn('Customer sync failed:', err));
  }

  showToast('Account created successfully!');
  showScreen('store-screen');
  initStorefront();
}

function handleGoogleLogin() {
  if (typeof firebase === 'undefined' || !firebase.apps.length) {
    showToast('Firebase configuration not initialized yet', 'error');
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  
  // Start the loading overlay
  document.getElementById('loading-overlay').classList.remove('hidden');

  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      
      // Update our state with Firebase User details
      state.currentUser = {
        name: user.displayName || 'Google User',
        email: user.email,
        phone: user.phoneNumber || '',
        address: 'Update your address',
        role: 'customer',
        googleAuth: true
      };
      
      localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));

      // Save to Firestore customers collection
      db.collection('customers').doc(user.email).set({
        name: state.currentUser.name,
        email: user.email,
        phone: user.phoneNumber || '',
        address: 'Update your address',
        joinedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Customer sync failed:', err));
      
      // Hide loading overlay
      document.getElementById('loading-overlay').classList.add('hidden');
      
      showToast(`Welcome, ${state.currentUser.name}! Signed in ✓`);
      showScreen('store-screen');
      initStorefront();
    })
    .catch((error) => {
      console.error("Error signing in with Google:", error);
      document.getElementById('loading-overlay').classList.add('hidden');
      showToast(`Google Sign-In failed: ${error.message}`, 'error');
    });
}

function handleLogout() {
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    firebase.auth().signOut().catch(err => console.error("Error signing out from Firebase:", err));
  }
  
  state.currentUser = null;
  state.cart = [];
  state.appliedCoupon = null;
  localStorage.removeItem('qs_current_user');
  showToast('Logged out successfully');
  showScreen('auth-screen');
  toggleAuthForm('login');
}


// ==================== CUSTOMER STOREFRONT ====================

function initStorefront() {
  // Update header text
  document.getElementById('user-avatar').innerText = state.currentUser.name.charAt(0).toUpperCase();
  document.getElementById('dropdown-name').innerText = state.currentUser.name;
  document.getElementById('dropdown-email').innerText = state.currentUser.email;
  document.getElementById('delivery-time').innerText = state.storeSettings.deliveryTime;

  renderCategoryPills();
  renderHeroBanner();
  renderCategoriesGrid();
  renderStoreSections();
  updateCartBadge();
  initArticlesListener();
  goHome();
}

// Real-time listener for articles from Firestore
function initArticlesListener() {
  if (!db) return;
  db.collection('articles')
    .where('published', '==', true)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      state.articles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderArticlesSection();
    }, () => {
      // Silent fail — articles are optional content
    });
}

function renderArticlesSection() {
  const container = document.getElementById('articles-section');
  if (!container) return;
  const articles = state.articles || [];
  if (!articles.length) { container.innerHTML = ''; return; }

  // Group by category
  const byCategory = {};
  articles.forEach(a => {
    const cat = a.category || 'General';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(a);
  });

  container.innerHTML = Object.entries(byCategory).map(([cat, arts]) => `
    <section class="store-section" style="margin-bottom:40px;">
      <h2 class="section-title">
        <span>📰 ${cat}</span>
      </h2>
      <div class="articles-row" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
        ${arts.map(a => `
          <div class="article-card-store" onclick="openArticleView('${a.id}')" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.13)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)'">
            ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%;height:160px;object-fit:cover;display:block;">` : `<div style="width:100%;height:160px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:48px;">📰</div>`}
            <div style="padding:16px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6366f1;letter-spacing:0.06em;margin-bottom:6px;">${a.category || 'General'}</div>
              <div style="font-size:15px;font-weight:700;color:#1e293b;line-height:1.4;margin-bottom:8px;">${a.title}</div>
              ${a.content ? `<div style="font-size:13px;color:#64748b;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${a.content}</div>` : ''}
              <div style="font-size:12px;color:#94a3b8;margin-top:10px;">By ${a.author || 'Admin'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');
}

function openArticleView(id) {
  const a = (state.articles || []).find(x => x.id === id);
  if (!a) return;
  // Show article in a simple overlay
  const overlay = document.createElement('div');
  overlay.id = 'article-view-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,0.4);animation:modalIn 0.25s ease;">
      ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%;height:220px;object-fit:cover;border-radius:20px 20px 0 0;">` : ''}
      <div style="padding:28px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6366f1;letter-spacing:0.06em;margin-bottom:8px;">${a.category || 'General'}</div>
        <h2 style="font-size:22px;font-weight:800;color:#1e293b;margin-bottom:12px;line-height:1.3;">${a.title}</h2>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:20px;">By ${a.author || 'Admin'}</div>
        <div style="font-size:15px;color:#334155;line-height:1.8;white-space:pre-wrap;">${a.content || ''}</div>
        <button onclick="document.getElementById('article-view-overlay').remove()" style="margin-top:24px;width:100%;padding:13px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;">Close</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// Category image mapping
const CATEGORY_IMAGES = {
  "Sauces": "assets/sauces.png",
  "Frozen": "assets/frozen.png",
  "Seasoning": "assets/seasoning.png",
  "Cakes Material": "assets/cakes_material.png",
  "Cake Mould": "assets/cake_mould.png",
  "Cake Premix": "assets/cake_premix.png",
  "Coffees": "https://images.unsplash.com/photo-1559525839-b184a4d698c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Mojitos": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
};

function getCategoriesList() {
  if (state.categories && state.categories.length > 0) {
    return state.categories.map(c => ({ name: c.name, imageUrl: c.imageUrl || CATEGORY_IMAGES[c.name] || '' }));
  }
  const catNames = [...new Set(state.products.map(p => p.category))];
  return catNames.map(name => ({ name, imageUrl: CATEGORY_IMAGES[name] || '' }));
}

function renderCategoryPills() {
  const categories = getCategoriesList();
  const pillsContainer = document.getElementById('category-pills');

  let html = `<div class="category-pill active" onclick="goHome()">All Items</div>`;
  categories.forEach(cat => {
    html += `<div class="category-pill" onclick="showCategory('${cat.name}')">${cat.name}</div>`;
  });
  pillsContainer.innerHTML = html;
}

function renderHeroBanner() {
  const slides = [
    { title: "Super Fast Delivery!", desc: "Get all your grocery essentials delivered in 10 minutes.", bg: "linear-gradient(135deg, #10b981, #059669)" },
    { title: "Special Deal: 10% OFF", desc: "Use coupon SAVE10 to save on fruits & veg today.", bg: "linear-gradient(135deg, #f59e0b, #d97706)" },
    { title: "Organic & Fresh", desc: "Straight from the local farm to your doorstep.", bg: "linear-gradient(135deg, #3b82f6, #2563eb)" }
  ];

  const slidesContainer = document.getElementById('hero-slides');
  const dotsContainer = document.getElementById('hero-dots');

  slidesContainer.innerHTML = slides.map(s => `
    <div class="hero-slide" style="background: ${s.bg}">
      <div class="hero-slide-content">
        <h2>${s.title}</h2>
        <p>${s.desc}</p>
      </div>
    </div>
  `).join('');

  dotsContainer.innerHTML = slides.map((_, i) => `
    <div class="hero-dot ${i === 0 ? 'active' : ''}" onclick="setHeroSlide(${i})"></div>
  `).join('');

  // Start auto slide
  if (window.heroInterval) clearInterval(window.heroInterval);
  let currentSlide = 0;
  window.heroInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    setHeroSlide(currentSlide);
  }, 5000);
}

function setHeroSlide(index) {
  const slidesContainer = document.getElementById('hero-slides');
  slidesContainer.style.transform = `translateX(-${index * 100}%)`;

  const dots = document.querySelectorAll('.hero-dot');
  dots.forEach((dot, i) => {
    if (i === index) dot.classList.add('active');
    else dot.classList.remove('active');
  });
}

function renderCategoriesGrid() {
  const categories = getCategoriesList();
  const container = document.getElementById('categories-grid');

  container.innerHTML = categories.map(cat => `
    <div class="category-card" onclick="showCategory('${cat.name}')">
      <div class="category-emoji">${cat.imageUrl ? `<img src="${cat.imageUrl}" alt="${cat.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : '🛒'}</div>
      <div class="category-name">${cat.name}</div>
    </div>
  `).join('');
}

// Function to render product sections on the storefront
function renderStoreSections() {
  // Ensure we have products; if empty, reset to defaults
  if (!Array.isArray(state.products) || state.products.length === 0) {
    state.products = INITIAL_PRODUCTS;
    localStorage.setItem('qs_products', JSON.stringify(state.products));
  }
  const container = document.getElementById('product-sections');
  const categories = getCategoriesList();

  container.innerHTML = categories.map(cat => {
    const catProds = state.products.filter(p => p.category === cat.name).slice(0, 4);
    if (catProds.length === 0) return '';
    return `
      <section class="store-section" style="margin-bottom: 40px;">
        <h2 class="section-title">
          <span>${cat.name}</span>
          <button class="btn-outline-sm" onclick="showCategory('${cat.name}')" style="padding: 6px 12px; font-size: 13px; background: white; border: 1.5px solid var(--primary-color); color: var(--primary-color); border-radius: 6px; cursor: pointer;">See All</button>
        </h2>
        <div class="products-grid">
          ${catProds.map(p => renderProductCard(p)).join('')}
        </div>
      </section>
    `;
  }).join('');
}

function renderProductCard(p) {
  const cartItem = state.cart.find(item => item.product.id === p.id);
  const qty = cartItem ? cartItem.quantity : 0;

  let actionHtml = '';
  if (qty > 0) {
    actionHtml = `
      <div class="quantity-controls">
        <button class="qty-btn" onclick="updateCartQty('${p.id}', -1, event)">-</button>
        <span class="qty-val">${qty}</span>
        <button class="qty-btn" onclick="updateCartQty('${p.id}', 1, event)">+</button>
      </div>
    `;
  } else {
    actionHtml = `
      <button class="add-btn" onclick="addToCart('${p.id}', event)">ADD</button>
    `;
  }

  const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const discountTag = discount > 0 ? `<div class="product-discount-tag">${discount}% OFF</div>` : '';
  const mrpHtml = p.mrp && p.mrp > p.price ? `<span class="product-mrp">₹${p.mrp}</span>` : '';

  return `
    <div class="product-card">
      ${discountTag}
      <div class="product-image-container" onclick="openProductModal('${p.id}')">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : (p.emoji || '🛒')}
      </div>
      <div class="product-info">
        <div class="product-title" onclick="openProductModal('${p.id}')">${p.name}</div>
        <div class="product-unit">${p.unit || '1 unit'}</div>
        <div class="product-footer">
          <div class="product-price-box">
            <span class="product-price">₹${p.price}</span>
            ${mrpHtml}
          </div>
          <div class="product-action-wrapper" id="act-${p.id}">
            ${actionHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Navigation & Category Views
function goHome() {
  document.getElementById('hero-banner').classList.remove('hidden');
  document.getElementById('categories-section').classList.remove('hidden');
  document.getElementById('product-sections').classList.remove('hidden');
  document.getElementById('articles-section').classList.remove('hidden');
  document.getElementById('search-results').classList.add('hidden');
  document.getElementById('category-view').classList.add('hidden');

  // Reset active pills
  document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('.category-pill:first-child').classList.add('active');
}

function showCategory(catName) {
  state.currentCategory = catName;
  document.getElementById('hero-banner').classList.add('hidden');
  document.getElementById('categories-section').classList.add('hidden');
  document.getElementById('product-sections').classList.add('hidden');
  document.getElementById('articles-section').classList.add('hidden');
  document.getElementById('search-results').classList.add('hidden');

  const catView = document.getElementById('category-view');
  catView.classList.remove('hidden');
  document.getElementById('category-view-title').innerText = catName;

  const catProds = state.products.filter(p => p.category === catName);
  const grid = document.getElementById('category-products-grid');
  grid.innerHTML = catProds.map(p => renderProductCard(p)).join('');

  // Update category pills styling
  document.querySelectorAll('.category-pill').forEach(p => {
    if (p.innerText === catName) p.classList.add('active');
    else p.classList.remove('active');
  });
}

function setMobileActive(element) {
  document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
}

// User Dropdown Menu
function toggleUserMenu() {
  const menu = document.getElementById('user-dropdown');
  menu.classList.toggle('hidden');
}

// Close menus when clicking outside
document.addEventListener('click', function (e) {
  const userMenu = document.querySelector('.user-menu');
  if (userMenu && !userMenu.contains(e.target)) {
    document.getElementById('user-dropdown').classList.add('hidden');
  }
  const searchInput = document.getElementById('search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  if (searchInput && !searchInput.contains(e.target) && searchDropdown && !searchDropdown.contains(e.target)) {
    searchDropdown.classList.add('hidden');
  }
});

// ==================== SEARCH FUNCTIONALITY ====================

function handleSearch(query) {
  const dropdown = document.getElementById('search-dropdown');
  if (!query.trim()) {
    dropdown.classList.add('hidden');
    return;
  }

  const filtered = state.products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.category.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) {
    dropdown.innerHTML = `<div class="search-item">No products found</div>`;
  } else {
    dropdown.innerHTML = filtered.slice(0, 5).map(p => `
      <div class="search-item" onclick="openProductModal('${p.id}')">
        <span class="search-item-emoji">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (p.emoji || '🛒')}</span>
        <div class="search-item-info">
          <span class="search-item-name">${p.name}</span>
          <span class="search-item-price">₹${p.price}</span>
        </div>
      </div>
    `).join('');
  }
  dropdown.classList.remove('hidden');

  // Trigger main screen search if user presses enter or queries deeply
  const resultsSection = document.getElementById('search-results');
  const queryText = document.getElementById('search-query-text');
  const grid = document.getElementById('search-results-grid');
  const noResults = document.getElementById('no-results');

  document.getElementById('hero-banner').classList.add('hidden');
  document.getElementById('categories-section').classList.add('hidden');
  document.getElementById('product-sections').classList.add('hidden');
  document.getElementById('articles-section').classList.add('hidden');
  document.getElementById('category-view').classList.add('hidden');
  resultsSection.classList.remove('hidden');
  queryText.innerText = query;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.classList.remove('hidden');
  } else {
    noResults.classList.add('hidden');
    grid.innerHTML = filtered.map(p => renderProductCard(p)).join('');
  }
}

// ==================== PRODUCT DETAIL MODAL ====================

function openProductModal(prodId) {
  const p = state.products.find(prod => prod.id === prodId);
  if (!p) return;

  document.getElementById('detail-category').innerText = p.category;
  document.getElementById('detail-name').innerText = p.name;
  document.getElementById('detail-desc').innerText = p.desc || 'No description available for this local fresh item.';
  document.getElementById('detail-price').innerText = `₹${p.price}`;

  const mrpBox = document.getElementById('detail-mrp');
  const discountBox = document.getElementById('detail-discount');
  if (p.mrp && p.mrp > p.price) {
    mrpBox.innerText = `₹${p.mrp}`;
    mrpBox.classList.remove('hidden');
    const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
    discountBox.innerText = `${discount}% OFF`;
    discountBox.classList.remove('hidden');
  } else {
    mrpBox.classList.add('hidden');
    discountBox.classList.add('hidden');
  }

  document.getElementById('detail-unit').innerText = p.unit || '1 unit';
  document.getElementById('product-detail-image').innerHTML = p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : (p.emoji || '🛒');

  // Detail Cart Actions
  updateDetailModalCartActions(p);

  // Related products
  const related = state.products.filter(item => item.category === p.category && item.id !== p.id).slice(0, 4);
  const relatedGrid = document.getElementById('related-products-grid');
  relatedGrid.innerHTML = related.map(item => renderProductCard(item)).join('');

  document.getElementById('product-modal').classList.remove('hidden');
}

function updateDetailModalCartActions(p) {
  const container = document.getElementById('detail-cart-controls');
  const cartItem = state.cart.find(item => item.product.id === p.id);
  const qty = cartItem ? cartItem.quantity : 0;

  if (qty > 0) {
    container.innerHTML = `
      <div class="quantity-controls" style="font-size: 16px; padding: 4px;">
        <button class="qty-btn" style="padding: 10px 16px;" onclick="updateCartQty('${p.id}', -1, event); updateDetailModalCartActionsById('${p.id}')">-</button>
        <span class="qty-val" style="min-width: 30px;">${qty}</span>
        <button class="qty-btn" style="padding: 10px 16px;" onclick="updateCartQty('${p.id}', 1, event); updateDetailModalCartActionsById('${p.id}')">+</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="btn-primary" style="max-width: 200px;" onclick="addToCart('${p.id}', event); updateDetailModalCartActionsById('${p.id}')"><i class="fas fa-plus"></i> Add to Cart</button>
    `;
  }
}

function updateDetailModalCartActionsById(id) {
  const p = state.products.find(prod => prod.id === id);
  if (p) updateDetailModalCartActions(p);
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}

// ==================== NAVIGATION ACTIONS ====================

function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden') && window.innerWidth <= 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

function focusSearch() {
  const isMobile = window.innerWidth <= 768;
  const searchInput = document.getElementById(isMobile ? 'mobile-search-input' : 'search-input');
  if (searchInput) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => searchInput.focus(), 300);
  }
}

// ==================== CART ACTIONS ====================

function toggleCart() {
  const sidebar = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('cart-overlay');

  if (sidebar.style.transform === 'translateX(0px)' || sidebar.classList.contains('active-cart')) {
    sidebar.style.transform = 'translateX(100%)';
    sidebar.classList.remove('active-cart');
    overlay.classList.add('hidden');
  } else {
    sidebar.style.transform = 'translateX(0)';
    sidebar.classList.add('active-cart');
    overlay.classList.remove('hidden');
    renderCartItems();
  }
}

function addToCart(prodId, event) {
  if (event) event.stopPropagation();
  const product = state.products.find(p => p.id === prodId);
  if (!product) return;

  state.cart.push({ product, quantity: 1 });
  showToast(`${product.name} added to cart`);

  updateCartState(prodId);
}

function updateCartQty(prodId, delta, event) {
  if (event) event.stopPropagation();
  const cartIndex = state.cart.findIndex(item => item.product.id === prodId);
  if (cartIndex === -1) return;

  state.cart[cartIndex].quantity += delta;

  if (state.cart[cartIndex].quantity <= 0) {
    state.cart.splice(cartIndex, 1);
  }

  updateCartState(prodId);
}

function updateCartState(prodId) {
  updateCartBadge();

  // Rerender specific item action on storefront if visible
  const actionWrappers = document.querySelectorAll(`#act-${prodId}`);
  actionWrappers.forEach(wrap => {
    const p = state.products.find(prod => prod.id === prodId);
    if (p) {
      const cartItem = state.cart.find(item => item.product.id === prodId);
      const qty = cartItem ? cartItem.quantity : 0;
      if (qty > 0) {
        wrap.innerHTML = `
          <div class="quantity-controls">
            <button class="qty-btn" onclick="updateCartQty('${p.id}', -1, event)">-</button>
            <span class="qty-val">${qty}</span>
            <button class="qty-btn" onclick="updateCartQty('${p.id}', 1, event)">+</button>
          </div>
        `;
      } else {
        wrap.innerHTML = `<button class="add-btn" onclick="addToCart('${p.id}', event)">ADD</button>`;
      }
    }
  });

  // Re-render cart elements
  if (document.getElementById('cart-sidebar').classList.contains('active-cart')) {
    renderCartItems();
  }
}

function updateCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-badge');
  const mobileBadge = document.getElementById('mobile-cart-badge');

  if (count > 0) {
    badge.innerText = count;
    badge.classList.remove('hidden');
    if (mobileBadge) {
      mobileBadge.innerText = count;
      mobileBadge.classList.remove('hidden');
    }
  } else {
    badge.classList.add('hidden');
    if (mobileBadge) mobileBadge.classList.add('hidden');
  }
}

function renderCartItems() {
  const itemsContainer = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const emptyState = document.getElementById('cart-empty');

  if (state.cart.length === 0) {
    itemsContainer.innerHTML = '';
    footer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  footer.classList.remove('hidden');

  itemsContainer.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-emoji">${item.product.imageUrl ? `<img src="${item.product.imageUrl}" alt="${item.product.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : (item.product.emoji || '🛒')}</span>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.product.name}</div>
        <div class="cart-item-unit">${item.product.unit || '1 unit'}</div>
        <div class="cart-item-price">₹${item.product.price}</div>
      </div>
      <div class="quantity-controls">
        <button class="qty-btn" onclick="updateCartQty('${item.product.id}', -1, event)">-</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartQty('${item.product.id}', 1, event)">+</button>
      </div>
    </div>
  `).join('');

  calculateCartTotals();
}

function calculateCartTotals() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  let delivery = Number(state.storeSettings.deliveryFee);

  if (subtotal >= Number(state.storeSettings.freeDeliveryAbove)) {
    delivery = 0;
  }

  let discount = 0;
  if (state.appliedCoupon) {
    discount = Math.round(subtotal * (state.appliedCoupon.discountPercent / 100));
  }

  const total = subtotal + delivery - discount;

  document.getElementById('cart-subtotal').innerText = `₹${subtotal}`;
  document.getElementById('cart-delivery').innerText = delivery === 0 ? 'FREE' : `₹${delivery}`;

  const discountRow = document.getElementById('discount-row');
  if (discount > 0) {
    document.getElementById('cart-discount').innerText = `-₹${discount}`;
    discountRow.classList.remove('hidden');
  } else {
    discountRow.classList.add('hidden');
  }

  document.getElementById('cart-total').innerText = `₹${total}`;
}

function applyCoupon() {
  const code = document.getElementById('coupon-input').value.trim().toUpperCase();
  if (!code) return;

  if (code === 'SAVE10') {
    state.appliedCoupon = { code: 'SAVE10', discountPercent: 10 };
    showToast('Coupon SAVE10 applied! 10% discount added.');
  } else if (code === 'FREE25') {
    state.appliedCoupon = { code: 'FREE25', discountPercent: 25 };
    showToast('Coupon FREE25 applied! 25% discount added.');
  } else {
    showToast('Invalid promo code', 'error');
    state.appliedCoupon = null;
  }

  calculateCartTotals();
}

// ==================== CHECKOUT & ORDER PLACEMENT ====================

function showCheckout() {
  if (!isStandalone()) {
    document.getElementById('pwa-block-modal').classList.remove('hidden');
    return;
  }

  toggleCart();
  const modal = document.getElementById('checkout-modal');
  modal.classList.remove('hidden');

  // Load user info
  document.getElementById('checkout-address').innerText = state.currentUser.address;
  document.getElementById('checkout-name-input').value = state.currentUser.name || '';
  document.getElementById('checkout-phone-input').value = state.currentUser.phone || '';
  document.getElementById('checkout-email-input').value = state.currentUser.email || '';
  document.getElementById('checkout-address-input').value = state.currentUser.address || '';

  // Checkout items list
  const list = document.getElementById('checkout-items');
  list.innerHTML = state.cart.map(item => `
    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
      <span>${item.product.name} (x${item.quantity})</span>
      <span>₹${item.product.price * item.quantity}</span>
    </div>
  `).join('');

  // Totals
  const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  let delivery = Number(state.storeSettings.deliveryFee);
  if (subtotal >= Number(state.storeSettings.freeDeliveryAbove)) delivery = 0;

  let discount = 0;
  if (state.appliedCoupon) {
    discount = Math.round(subtotal * (state.appliedCoupon.discountPercent / 100));
  }
  const total = subtotal + delivery - discount;

  document.getElementById('checkout-subtotal').innerText = `₹${subtotal}`;
  document.getElementById('checkout-delivery').innerText = delivery === 0 ? 'FREE' : `₹${delivery}`;

  const discountRow = document.getElementById('checkout-discount-row');
  if (discount > 0) {
    document.getElementById('checkout-discount').innerText = `-₹${discount}`;
    discountRow.classList.remove('hidden');
  } else {
    discountRow.classList.add('hidden');
  }
  document.getElementById('checkout-total').innerText = `₹${total}`;

  // Hook up payment change logic
  const radios = document.querySelectorAll('input[name="payment"]');
  radios.forEach(radio => {
    radio.addEventListener('change', function () {
      // Remove selected class from all labels
      document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
      this.closest('.payment-option').classList.add('selected');

      // Show specific details
      document.getElementById('upi-section').classList.add('hidden');
      document.getElementById('card-section').classList.add('hidden');
      if (this.value === 'upi') {
        document.getElementById('upi-section').classList.remove('hidden');
      } else if (this.value === 'card') {
        document.getElementById('card-section').classList.remove('hidden');
      }
    });
  });
}

function closeCheckout() {
  document.getElementById('checkout-modal').classList.add('hidden');
}

async function placeOrder() {
  const finalName = document.getElementById('checkout-name-input').value.trim();
  const finalPhone = document.getElementById('checkout-phone-input').value.trim();
  const finalEmail = document.getElementById('checkout-email-input').value.trim();
  const finalAddress = document.getElementById('checkout-address-input').value.trim();

  if (!finalName) {
    showToast('Please enter your full name', 'error');
    const input = document.getElementById('checkout-name-input');
    input.scrollIntoView({behavior: 'smooth', block: 'center'});
    input.focus();
    return;
  }
  if (!finalPhone) {
    showToast('Please enter your phone number', 'error');
    const input = document.getElementById('checkout-phone-input');
    input.scrollIntoView({behavior: 'smooth', block: 'center'});
    input.focus();
    return;
  }
  if (!finalEmail) {
    showToast('Please enter your email address', 'error');
    const input = document.getElementById('checkout-email-input');
    input.scrollIntoView({behavior: 'smooth', block: 'center'});
    input.focus();
    return;
  }
  if (!finalAddress) {
    showToast('Please enter your delivery address', 'error');
    const input = document.getElementById('checkout-address-input');
    input.scrollIntoView({behavior: 'smooth', block: 'center'});
    input.focus();
    return;
  }

  // Persist the entered contact info back to the profile
  state.currentUser.name = finalName;
  state.currentUser.phone = finalPhone;
  state.currentUser.email = finalEmail;
  state.currentUser.address = finalAddress;
  localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));

  // Payment Verification
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  if (paymentMethod === 'upi') {
    const upiId = document.getElementById('upi-id').value.trim();
    if (!upiId || !upiId.includes('@')) {
      showToast('Please enter a valid UPI ID', 'error');
      return;
    }
  } else if (paymentMethod === 'card') {
    const cardNum = document.getElementById('card-number').value.trim();
    const expiry = document.getElementById('card-expiry').value.trim();
    const cvv = document.getElementById('card-cvv').value.trim();
    if (cardNum.length < 16 || expiry.length < 5 || cvv.length < 3) {
      showToast('Please complete all card details', 'error');
      return;
    }
  }

  // Generate sequential order ID using Firestore counter
  let orderNumber = Date.now(); // fallback
  if (db) {
    try {
      const counterRef = db.collection('counters').doc('orders');
      const counterSnap = await counterRef.get();
      if (counterSnap.exists) {
        orderNumber = (counterSnap.data().lastOrderNumber || 0) + 1;
      } else {
        orderNumber = 1;
      }
      await counterRef.set({ lastOrderNumber: orderNumber });
    } catch(e) {
      console.warn('Counter fetch failed, using fallback:', e);
      orderNumber = state.orders.length + 1;
    }
  } else {
    orderNumber = state.orders.length + 1;
  }

  const orderId = String(orderNumber);
  const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  let delivery = Number(state.storeSettings.deliveryFee);
  if (subtotal >= Number(state.storeSettings.freeDeliveryAbove)) delivery = 0;

  let discount = 0;
  if (state.appliedCoupon) {
    discount = Math.round(subtotal * (state.appliedCoupon.discountPercent / 100));
  }
  const total = subtotal + delivery - discount;

  const newOrder = {
    id: orderId,
    customerName: finalName,
    customerEmail: finalEmail,
    customerPhone: finalPhone,
    address: finalAddress,
    items: state.cart.map(item => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      imageUrl: item.product.imageUrl || null,
      emoji: item.product.emoji
    })),
    subtotal,
    deliveryFee: delivery,
    discount,
    total,
    paymentMethod,
    status: 'Pending',
    date: new Date().toLocaleString()
  };

  // Update order stock levels
  state.cart.forEach(cartItem => {
    const pIndex = state.products.findIndex(p => p.id === cartItem.product.id);
    if (pIndex !== -1) {
      state.products[pIndex].stock = Math.max(0, state.products[pIndex].stock - cartItem.quantity);
    }
  });

  // Save changes to local storage
  localStorage.setItem('qs_products', JSON.stringify(state.products));
  state.orders.unshift(newOrder);
  localStorage.setItem('qs_orders', JSON.stringify(state.orders));

  // Save changes to Firebase (if configured)
  if (db) {
    db.collection('orders').doc(orderId).set(newOrder)
      .then(() => console.log('Order successfully synced to Firebase!'))
      .catch((error) => console.error('Error syncing order to Firebase: ', error));
  }

  // Reset cart
  state.cart = [];
  state.appliedCoupon = null;
  document.getElementById('coupon-input').value = '';
  updateCartBadge();

  // Close checkout and show success
  closeCheckout();

  document.getElementById('success-order-id').innerText = '#' + orderId;
  document.getElementById('order-success').classList.remove('hidden');
}

function closeSuccess() {
  document.getElementById('order-success').classList.add('hidden');
  goHome();
}

// ==================== MY ORDERS VIEW ====================

function showOrders() {
  const modal = document.getElementById('orders-modal');
  modal.classList.remove('hidden');

  const list = document.getElementById('orders-list');
  
  if (db && state.currentUser) {
    list.innerHTML = `<p style="text-align:center;color:var(--gray-dark);padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading orders...</p>`;
    db.collection('orders')
      .where('customerEmail', '==', state.currentUser.email)
      .get()
      .then(querySnapshot => {
        const firebaseOrders = [];
        querySnapshot.forEach(doc => {
          firebaseOrders.push(doc.data());
        });
        
        // Sort by date descending
        firebaseOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update local state & storage to match database
        state.orders = firebaseOrders;
        localStorage.setItem('qs_orders', JSON.stringify(state.orders));
        
        renderUserOrdersList(list);
      })
      .catch(error => {
        console.error('Error fetching orders from Firebase:', error);
        renderUserOrdersList(list);
      });
  } else {
    renderUserOrdersList(list);
  }
}

function renderUserOrdersList(list) {
  const userOrders = state.orders.filter(o => o.customerEmail === state.currentUser.email);

  if (userOrders.length === 0) {
    list.innerHTML = `<p style="text-align:center;color:var(--gray-dark);padding:20px;">You have not placed any orders yet.</p>`;
    return;
  }

  list.innerHTML = userOrders.map(o => `
    <div class="order-card">
      <div class="order-header">
        <span class="order-id">#${o.id}</span>
        <span class="order-status status-${o.status.toLowerCase()}">${o.status}</span>
      </div>
      <div class="order-items">
        ${o.items.map(item => `<div style="width:24px;height:24px;display:inline-block;vertical-align:middle;margin-right:8px;">${item.emoji || '📦'}</div><span style="vertical-align:middle;">${item.name} x ${item.quantity}</span>`).join('<br>')}
      </div>
      <div class="order-footer">
        <span class="order-date">${o.date}</span>
        <span class="order-total">Total: ₹${o.total}</span>
      </div>
    </div>
  `).join('');
}

function closeOrders() {
  document.getElementById('orders-modal').classList.add('hidden');
}

function showAddresses() {
  const currentAddress = state.currentUser.address || '';
  const defaultAddress = currentAddress === 'Update your address' ? '' : currentAddress;
  const newAddress = prompt('Update your delivery address:', defaultAddress);
  
  if (newAddress !== null) {
    const trimmedAddress = newAddress.trim();
    if (trimmedAddress) {
      state.currentUser.address = trimmedAddress;
      localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));
      showToast('Delivery address updated successfully!', 'success');
      
      // If user avatar menu is open, we can update details
      if (document.getElementById('user-dropdown') && !document.getElementById('user-dropdown').classList.contains('hidden')) {
        initStorefront();
      }
    } else {
      showToast('Address cannot be empty.', 'error');
    }
  }
}

// ==================== PWA & INSTALLATION ====================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show the download button
  const installBtn = document.getElementById('install-app-btn');
  if (installBtn) installBtn.classList.remove('hidden');
});

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function promptAppInstall() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS && !isStandalone()) {
    document.getElementById('pwa-block-modal').classList.add('hidden');
    document.getElementById('ios-install-modal').classList.remove('hidden');
    return;
  }
  
  if (deferredPrompt) {
    document.getElementById('pwa-block-modal').classList.add('hidden');
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) installBtn.classList.add('hidden');
      }
      deferredPrompt = null;
    });
  } else {
    // If no prompt available but not standalone, show fallback alert
    document.getElementById('pwa-block-modal').classList.add('hidden');
    alert("Please use your browser's menu (e.g., 'Add to Home Screen') to install this app.");
  }
}

// Show install button for iOS immediately since it doesn't fire beforeinstallprompt
window.addEventListener('DOMContentLoaded', () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS && !isStandalone()) {
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) installBtn.classList.remove('hidden');
  }
});

// Startup
window.addEventListener('DOMContentLoaded', initApp);
