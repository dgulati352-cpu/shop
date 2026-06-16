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
  activeAdminTab: 'dashboard',
  banners: [],
  articlesListenerActive: false,
  ordersListenerActive: false
};

function saveCartState() {
  try {
    localStorage.setItem('qs_cart', JSON.stringify(state.cart));
  } catch (e) {
    console.warn('Failed to save cart:', e);
  }
}

// Initialize app data on startup
async function initApp() {
  // --- A. Load app data first ---
  try {
    const savedCart = localStorage.getItem('qs_cart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      state.cart = Array.isArray(parsedCart) ? parsedCart : [];
    }
  } catch(e) {
    console.warn('Failed to load cart:', e);
    state.cart = [];
  }

  renderSkeletons();

  const style = document.createElement('style');
  style.innerHTML = `
    .size-pill { padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; border: 1px solid var(--border, #cbd5e1); background: var(--bg-card, #ffffff); color: var(--text, #1e293b); cursor: pointer; transition: all 0.15s ease; }
    .size-pill:hover { border-color: #6366f1; }
    .size-pill.active { border-color: #6366f1; background: rgba(99, 102, 241, 0.1); color: #6366f1; }
    .detail-size-pill { padding: 8px 16px; font-size: 14px; font-weight: 600; border-radius: 8px; border: 2px solid var(--border, #cbd5e1); background: var(--bg-card, #ffffff); color: var(--text, #1e293b); cursor: pointer; transition: all 0.15s ease; }
    .detail-size-pill:hover { border-color: #6366f1; }
    .detail-size-pill.active { border-color: #6366f1; background: rgba(99, 102, 241, 0.1); color: #6366f1; }
  `;
  document.head.appendChild(style);

  if (!localStorage.getItem('qs_force_updated_categories_v3')) {
    localStorage.removeItem('qs_products');
    localStorage.removeItem('qs_categories');
    localStorage.setItem('qs_force_updated_categories_v3', 'true');
  }

  // Load database data — store the promise so auth handler can await it
  const dbLoadPromise = (async () => {
    try {
      const prodsSnap = await db.collection('products').get();
      if (!prodsSnap.empty) {
        state.products = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        localStorage.setItem('qs_products', JSON.stringify(state.products));
      } else {
        throw new Error('No products in Firebase');
      }
    } catch(e) {
      let parsed = null;
      try {
        const savedProducts = localStorage.getItem('qs_products');
        if (savedProducts) parsed = JSON.parse(savedProducts);
      } catch(e2){}
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.products = parsed;
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
  })();

  // Seed from localStorage immediately so first render has data
  try {
    const savedProducts = localStorage.getItem('qs_products');
    if (savedProducts) {
      const parsed = JSON.parse(savedProducts);
      if (Array.isArray(parsed) && parsed.length > 0) state.products = parsed;
    }
  } catch(e) {}

  // Expose promise for auth handler
  window._dbLoadPromise = dbLoadPromise;

  try {
    if (db) {
      db.collection('banners').onSnapshot(snap => {
        state.banners = snap.docs.map(d => d.data());
        state.banners.sort((a,b) => (a.order || 0) - (b.order || 0));
        if (document.getElementById('hero-slides') && state.currentUser) {
          renderHeroBanner();
        }
      }, err => console.warn('Banners load failed:', err));
    }
  } catch(e) {
    state.banners = [];
  }

  try {
    if (db) {
      db.collection('settings').doc('store').onSnapshot(settingsSnap => {
        if (settingsSnap.exists) {
          const s = settingsSnap.data();
          state.storeSettings = {
            ...DEFAULT_STORE_SETTINGS,
            deliveryFee: s.deliveryFee ?? DEFAULT_STORE_SETTINGS.deliveryFee,
            freeDeliveryAbove: s.freeDeliveryAbove ?? DEFAULT_STORE_SETTINGS.freeDeliveryAbove,
            deliveryTime: s.deliveryTime || DEFAULT_STORE_SETTINGS.deliveryTime,
            requirePwaInstall: !!s.requirePwaInstall
          };
          localStorage.setItem('qs_settings', JSON.stringify(state.storeSettings));
          
          const deliveryTimeEl = document.getElementById('delivery-time');
          if (deliveryTimeEl) deliveryTimeEl.innerText = state.storeSettings.deliveryTime;
          
          if (document.getElementById('cart-sidebar')) {
            calculateCartTotals();
          }
        }
      }, err => console.warn('Settings load failed:', err));
    } else {
      throw new Error('No DB');
    }
  } catch(e) {
    const savedSettings = localStorage.getItem('qs_settings');
    if (savedSettings) {
      state.storeSettings = JSON.parse(savedSettings);
    } else {
      state.storeSettings = DEFAULT_STORE_SETTINGS;
      localStorage.setItem('qs_settings', JSON.stringify(state.storeSettings));
    }
  }

  try {
    const savedOrders = localStorage.getItem('qs_orders');
    if (savedOrders) {
      const parsedOrders = JSON.parse(savedOrders);
      state.orders = Array.isArray(parsedOrders) ? parsedOrders : [];
    } else {
      state.orders = [];
      localStorage.setItem('qs_orders', JSON.stringify(state.orders));
    }
  } catch(e) {
    state.orders = [];
    localStorage.setItem('qs_orders', JSON.stringify(state.orders));
  }

  if (db && Array.isArray(state.orders) && state.orders.length > 0) {
    state.orders.forEach(order => {
      const docId = String(order.id || order._id || '');
      if (!docId) return;
      db.collection('orders').doc(docId).set(order, { merge: true })
        .catch(err => console.warn('Order sync err:', err.message));
    });
  }

  // --- B. Check Google Sign-In redirect result first ---
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    try {
      const redirectResult = await firebase.auth().getRedirectResult();
      if (redirectResult && redirectResult.user) {
        const user = redirectResult.user;
        
        let existingCust = null;
        if (db && user.email) {
          try {
            const custSnap = await db.collection('customers').doc(user.email).get();
            if (custSnap.exists) {
              existingCust = custSnap.data();
            }
          } catch (e) {
            console.warn('Failed to fetch existing customer on redirect:', e);
          }
        }

        state.currentUser = {
          name: existingCust?.name || user.displayName || 'Google User',
          email: user.email || '',
          phone: existingCust?.phone || user.phoneNumber || '',
          address: existingCust?.address || 'Update your address',
          role: 'customer',
          googleAuth: true
        };
        localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));
        
        // Save to Firestore customers collection in background
        if (db && user.email) {
          db.collection('customers').doc(user.email).set({
            name: state.currentUser.name,
            email: user.email,
            phone: state.currentUser.phone,
            address: state.currentUser.address,
            joinedAt: existingCust?.joinedAt || new Date().toISOString()
          }, { merge: true }).catch(err => console.warn('Customer sync failed:', err));
        }
        
        showToast(`Welcome, ${state.currentUser.name}! Signed in ✓`);
        // Show store screen immediately on successful redirect, don't wait for observer
        showScreen('store-screen');
        initStorefront();
      }
    } catch (error) {
      console.error("Error with Google Redirect Sign-In:", error);
      showToast(`Google Sign-In failed: ${error.message}`, 'error');
    }
  }

  // --- C. Listen to Authentication State Observer ---
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    firebase.auth().onAuthStateChanged(async (user) => {
      // Hide loading overlay if active
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) loadingOverlay.classList.add('hidden');

      if (user) {
        // Set user state immediately from cache
        const savedUser = localStorage.getItem('qs_current_user');
        let parsed = null;
        try {
          if (savedUser) parsed = JSON.parse(savedUser);
        } catch(e) {}

        if (parsed && parsed.email === user.email) {
          state.currentUser = parsed;
        } else {
          state.currentUser = {
            name: user.displayName || 'Google User',
            email: user.email || '',
            phone: user.phoneNumber || '',
            address: 'Update your address',
            role: 'customer',
            googleAuth: true
          };
          localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));
        }

        // Wait for DB products to load (with 4s timeout) then show store
        try {
          await Promise.race([
            window._dbLoadPromise,
            new Promise(res => setTimeout(res, 4000))
          ]);
        } catch(e) { /* ignore, use whatever products we have */ }

        // Ensure we always have some products to render
        if (!state.products || state.products.length === 0) {
          state.products = INITIAL_PRODUCTS;
        }

        showScreen('store-screen');
        initStorefront();

        // Sync profile from Firestore in background
        if (db && user.email) {
          db.collection('customers').doc(user.email).get()
            .then(custSnap => {
              if (custSnap.exists) {
                const existingCust = custSnap.data();
                state.currentUser.name = existingCust.name || state.currentUser.name;
                state.currentUser.phone = existingCust.phone || state.currentUser.phone;
                state.currentUser.address = existingCust.address || state.currentUser.address;
                localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));
                const avatarEl = document.getElementById('user-avatar');
                if (avatarEl) avatarEl.innerText = state.currentUser.name.charAt(0).toUpperCase();
                const nameEl = document.getElementById('dropdown-name');
                if (nameEl) nameEl.innerText = state.currentUser.name;
                const emailEl = document.getElementById('dropdown-email');
                if (emailEl) emailEl.innerText = state.currentUser.email;
                db.collection('customers').doc(user.email).set({
                  name: state.currentUser.name,
                  email: user.email,
                  phone: state.currentUser.phone,
                  address: state.currentUser.address,
                  joinedAt: existingCust.joinedAt || new Date().toISOString()
                }, { merge: true }).catch(err => console.warn('Customer profile sync failed:', err));
              }
            })
            .catch(e => console.warn('Failed to fetch customer on auth change:', e));
        }
      } else {
        // No Firebase user — check for local (non-Google) session
        const savedUser = localStorage.getItem('qs_current_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed && !parsed.googleAuth) {
              state.currentUser = parsed;
              // Ensure products for local-auth users too
              try {
                await Promise.race([
                  window._dbLoadPromise,
                  new Promise(res => setTimeout(res, 4000))
                ]);
              } catch(e) {}
              if (!state.products || state.products.length === 0) state.products = INITIAL_PRODUCTS;
              initStorefront();
              showScreen('store-screen');
              return;
            }
          } catch(e) {}
        }
        showScreen('auth-screen');
      }
    });
  } else {
    // Firebase is not initialized, fallback to simple localStorage session check
    const savedUser = localStorage.getItem('qs_current_user');
    if (savedUser) {
      try {
        state.currentUser = JSON.parse(savedUser);
        initStorefront();
        showScreen('store-screen');
      } catch(e) {
        showScreen('auth-screen');
      }
    } else {
      showScreen('auth-screen');
    }
  }
}

function clearSession() {
  localStorage.removeItem('qs_current_user');
  localStorage.removeItem('qs_products');
  localStorage.removeItem('qs_orders');
  localStorage.removeItem('qs_settings');
  localStorage.removeItem('qs_cart');
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

  // Use signInWithRedirect on mobile devices or in standalone PWA mode
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isPWA = typeof isStandalone === 'function' && isStandalone();

  if (isMobile || isPWA) {
    firebase.auth().signInWithRedirect(provider)
      .catch((error) => {
        console.error("Error starting redirect sign-in:", error);
        document.getElementById('loading-overlay').classList.add('hidden');
        showToast(`Google Sign-In failed: ${error.message}`, 'error');
      });
  } else {
    firebase.auth().signInWithPopup(provider)
      .then(async (result) => {
        const user = result.user;
        
        let existingCust = null;
        if (db) {
          try {
            const custSnap = await db.collection('customers').doc(user.email).get();
            if (custSnap.exists) {
              existingCust = custSnap.data();
            }
          } catch (e) {
            console.warn('Failed to fetch existing customer on popup login:', e);
          }
        }

        // Update our state with Firebase User details
        state.currentUser = {
          name: existingCust?.name || user.displayName || 'Google User',
          email: user.email,
          phone: existingCust?.phone || user.phoneNumber || '',
          address: existingCust?.address || 'Update your address',
          role: 'customer',
          googleAuth: true
        };
        
        localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));

        // Save to Firestore customers collection
        if (db) {
          db.collection('customers').doc(user.email).set({
            name: state.currentUser.name,
            email: user.email,
            phone: state.currentUser.phone,
            address: state.currentUser.address,
            joinedAt: existingCust?.joinedAt || new Date().toISOString()
          }, { merge: true }).catch(err => console.warn('Customer sync failed:', err));
        }
        
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
}

function handleLogout() {
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    firebase.auth().signOut().catch(err => console.error("Error signing out from Firebase:", err));
  }
  
  // Detach real-time listeners
  if (_articlesUnsubscribe) {
    try { _articlesUnsubscribe(); } catch(e) {}
    _articlesUnsubscribe = null;
  }

  state.currentUser = null;
  state.cart = [];
  state.appliedCoupon = null;
  state.articlesListenerActive = false;
  state.ordersListenerActive = false;
  state.articles = [];
  localStorage.removeItem('qs_current_user');
  localStorage.removeItem('qs_cart');
  showToast('Logged out successfully');
  showScreen('auth-screen');
  toggleAuthForm('login');
}


// ==================== CUSTOMER STOREFRONT ====================

function initStorefront() {
  if (!state.currentUser) return;

  // Update header text
  const userName = state.currentUser.name || 'Google User';
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) avatarEl.innerText = userName.charAt(0).toUpperCase();
  const nameEl = document.getElementById('dropdown-name');
  if (nameEl) nameEl.innerText = userName;
  const emailEl = document.getElementById('dropdown-email');
  if (emailEl) emailEl.innerText = state.currentUser.email || '';
  
  const deliveryTimeEl = document.getElementById('delivery-time');
  if (deliveryTimeEl) deliveryTimeEl.innerText = state.storeSettings?.deliveryTime || '10 min';

  // Toggle download app button in menu
  const menuInstallBtn = document.getElementById('menu-install-btn');
  if (menuInstallBtn) {
    if (!isStandalone()) {
      menuInstallBtn.classList.remove('hidden');
    } else {
      menuInstallBtn.classList.add('hidden');
    }
  }

  renderCategoryPills();
  renderHeroBanner();
  renderCategoriesGrid();
  renderStoreSections();
  updateCartBadge();
  initArticlesListener();
  initOrdersListener();
  goHome();
}

// Real-time listener for articles from Firestore
let _articlesUnsubscribe = null;
function initArticlesListener() {
  if (!db) return;
  // Always detach any existing listener before creating a new one
  if (_articlesUnsubscribe) {
    try { _articlesUnsubscribe(); } catch(e) {}
    _articlesUnsubscribe = null;
  }
  state.articlesListenerActive = true;

  const isFirstArticleLoad = !state.articles || state.articles.length === 0;

  const handleSnap = (snap) => {
    const incoming = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort client-side so we don't depend on a composite Firestore index
    incoming.sort((a, b) => {
      const ta = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime()/1000 : 0);
      const tb = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime()/1000 : 0);
      return tb - ta;
    });

    const previousCount = (state.articles || []).length;
    state.articles = incoming;
    renderArticlesSection();

    // Notify user if a new article was published while they're browsing
    if (!isFirstArticleLoad && incoming.length > previousCount) {
      showToast('📰 New article published! Check it out below.', 'info');
    }
  };

  // Try with compound query first (requires Firestore index)
  _articlesUnsubscribe = db.collection('articles')
    .where('published', '==', true)
    .orderBy('createdAt', 'desc')
    .onSnapshot(handleSnap, (err) => {
      console.warn('Articles listener (ordered) failed, retrying without orderBy:', err.code);
      // Fallback: query without orderBy (no index required), sort client-side
      if (_articlesUnsubscribe) { try { _articlesUnsubscribe(); } catch(e) {} }
      _articlesUnsubscribe = db.collection('articles')
        .where('published', '==', true)
        .onSnapshot(handleSnap, (err2) => {
          console.warn('Articles listener failed entirely:', err2.code);
          state.articlesListenerActive = false;
          _articlesUnsubscribe = null;
        });
    });
}

// Real-time listener for customer orders
function initOrdersListener() {
  if (!db || !state.currentUser || !state.currentUser.email || state.ordersListenerActive) return;
  state.ordersListenerActive = true;
  
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  let isFirstLoad = true;
  
  db.collection('orders')
    .where('customerEmail', '==', state.currentUser.email)
    .onSnapshot(snap => {
      const firebaseOrders = [];
      let statusChanged = false;
      let notificationMsg = '';
      
      snap.forEach(doc => {
        const newData = doc.data();
        firebaseOrders.push(newData);
        
        if (!isFirstLoad && Array.isArray(state.orders)) {
          const oldData = state.orders.find(o => o.id === newData.id);
          if (oldData && oldData.status !== newData.status) {
            statusChanged = true;
            notificationMsg = `Your order ${newData.id.slice(-4)} is now ${newData.status}!`;
          }
        }
      });
      
      firebaseOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      state.orders = firebaseOrders;
      localStorage.setItem('qs_orders', JSON.stringify(state.orders));
      
      if (!isFirstLoad && statusChanged) {
        showToast(notificationMsg, 'success');
        if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
          new Notification("QuickShop Order Update", { body: notificationMsg, icon: "assets/icon-192.png" });
        }
      }
      
      isFirstLoad = false;
      
      const modal = document.getElementById('orders-modal');
      if (modal && !modal.classList.contains('hidden')) {
        renderUserOrdersList(document.getElementById('orders-list'));
      }
    }, (error) => {
      console.error("Order listener error:", error);
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
  
  // Show article in a premium full screen reader overlay
  const overlay = document.createElement('div');
  overlay.id = 'article-view-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: #ffffff;
    z-index: 10000;
    overflow-y: auto;
    animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', sans-serif;
  `;
  
  // Custom styles for slide animation
  const styleEl = document.createElement('style');
  styleEl.id = 'article-animation-styles';
  styleEl.innerHTML = `
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0.8; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100%); opacity: 0.8; }
    }
    .article-back-btn {
      position: fixed;
      top: 20px;
      left: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10002;
      transition: all 0.2s ease;
      color: #1e293b;
    }
    .article-back-btn:hover {
      transform: scale(1.05);
      background: #ffffff;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }
  `;
  document.head.appendChild(styleEl);

  const heroImageHtml = a.imageUrl 
    ? `<div style="position: relative; width: 100%; height: 50vh; min-height: 300px; max-height: 500px; overflow: hidden; background: #f1f5f9;">
         <img src="${a.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">
         <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.6) 100%);"></div>
       </div>`
    : `<div style="position: relative; width: 100%; height: 25vh; min-height: 180px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 64px; color: white;">
         📰
       </div>`;

  overlay.innerHTML = `
    <button class="article-back-btn" onclick="closeArticleView()">
      <i class="fas fa-arrow-left" style="font-size: 18px;"></i>
    </button>
    ${heroImageHtml}
    <div style="flex: 1; max-width: 800px; width: 100%; margin: 0 auto; padding: 40px 24px 60px 24px; box-sizing: border-box;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6366f1; letter-spacing: 0.08em; background: rgba(99, 102, 241, 0.08); padding: 4px 10px; border-radius: 9999px;">
          ${a.category || 'General'}
        </span>
      </div>
      <h1 style="font-size: 32px; font-weight: 900; color: #0f172a; line-height: 1.25; margin: 0 0 16px 0; letter-spacing: -0.02em;">
        ${a.title}
      </h1>
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 32px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <i class="fas fa-user-circle" style="font-size: 16px; color: #94a3b8;"></i>
          <span>By <strong>${a.author || 'Admin'}</strong></span>
        </div>
      </div>
      <div class="article-rich-content" style="font-size: 17px; color: #334155; line-height: 1.85; white-space: pre-wrap; letter-spacing: -0.011em;">
        ${a.content || 'This article has no content.'}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function closeArticleView() {
  const overlay = document.getElementById('article-view-overlay');
  const styleEl = document.getElementById('article-animation-styles');
  if (overlay) {
    overlay.style.animation = 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => {
      overlay.remove();
      if (styleEl) styleEl.remove();
    }, 300);
  }
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
  const defaultSlides = [
    { title: "Super Fast Delivery!", desc: "Get all your grocery essentials delivered in 10 minutes.", bg: "linear-gradient(135deg, #10b981, #059669)" },
    { title: "Special Deal: 10% OFF", desc: "Use coupon SAVE10 to save on fruits & veg today.", bg: "linear-gradient(135deg, #f59e0b, #d97706)" },
    { title: "Organic & Fresh", desc: "Straight from the local farm to your doorstep.", bg: "linear-gradient(135deg, #3b82f6, #2563eb)" }
  ];

  const slides = state.banners && state.banners.length > 0 ? state.banners : defaultSlides;

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
  if (p.hasSizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
    const firstSize = p.sizes[0];
    const discount = firstSize.mrp && firstSize.mrp > firstSize.price ? Math.round(((firstSize.mrp - firstSize.price) / firstSize.mrp) * 100) : 0;
    const discountTag = discount > 0 ? `<div class="product-discount-tag">${discount}% OFF</div>` : '';
    const mrpHtml = firstSize.mrp && firstSize.mrp > firstSize.price ? `<span class="product-mrp">₹${firstSize.mrp}</span>` : '';
    
    const firstVariantId = `${p.id}-${firstSize.size}`;
    const cartItem = state.cart.find(item => item.product.id === firstVariantId);
    const qty = cartItem ? cartItem.quantity : 0;

    let actionHtml = '';
    if (qty > 0) {
      actionHtml = `
        <div class="quantity-controls">
          <button class="qty-btn" onclick="updateCartQty('${firstVariantId}', -1, event, '${p.id}')">-</button>
          <span class="qty-val">${qty}</span>
          <button class="qty-btn" onclick="updateCartQty('${firstVariantId}', 1, event, '${p.id}')">+</button>
        </div>
      `;
    } else {
      actionHtml = `
        <button class="add-btn" onclick="addSizeToCart('${p.id}', '${firstSize.size}', event)">ADD</button>
      `;
    }

    return `
      <div class="product-card">
        ${discountTag}
        <div class="product-image-container" onclick="openProductModal('${p.id}')">
          ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : (p.emoji || '🛒')}
        </div>
        <div class="product-info">
          <div class="product-title" onclick="openProductModal('${p.id}')">${p.name}</div>
          <div class="product-unit" style="margin-top: 6px;">
            <div class="product-sizes-pills" style="display:flex; gap:6px; flex-wrap:wrap;">
              ${p.sizes.map((sz, idx) => `
                <button class="size-pill ${idx === 0 ? 'active' : ''}" onclick="selectCardSizePill(this, '${p.id}', '${sz.size}', ${sz.price}, ${sz.mrp || sz.price}, event)">
                  ${sz.size}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="product-footer">
            <div class="product-price-box">
              <span class="product-price">₹${firstSize.price}</span>
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
  const ids = ['hero-banner', 'categories-section', 'product-sections', 'articles-section'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
  ['search-results', 'category-view'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });

  // Reset active pills (null-safe)
  document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
  const firstPill = document.querySelector('.category-pill:first-child');
  if (firstPill) firstPill.classList.add('active');
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

  const pricingArea = document.querySelector('.product-detail-pricing');
  const unitEl = document.getElementById('detail-unit');
  const actionsEl = document.getElementById('detail-cart-controls');

  if (p.hasSizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
    // Render pills in product detail modal
    unitEl.innerHTML = `
      <div style="font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom:8px;">Select Size:</div>
      <div class="detail-sizes-pills" style="display:flex; gap:10px; flex-wrap:wrap;">
        ${p.sizes.map((sz, idx) => `
          <button class="detail-size-pill ${idx === 0 ? 'active' : ''}" onclick="selectDetailSizePill(this, '${p.id}', '${sz.size}', ${sz.price}, ${sz.mrp || sz.price})">
            ${sz.size}
          </button>
        `).join('')}
      </div>
    `;

    // Initialize display with first size
    const firstSz = p.sizes[0];
    document.getElementById('detail-price').innerText = `₹${firstSz.price}`;
    
    const mrpBox = document.getElementById('detail-mrp');
    const discountBox = document.getElementById('detail-discount');
    if (firstSz.mrp && firstSz.mrp > firstSz.price) {
      mrpBox.innerText = `₹${firstSz.mrp}`;
      mrpBox.classList.remove('hidden');
      const discount = Math.round(((firstSz.mrp - firstSz.price) / firstSz.mrp) * 100);
      discountBox.innerText = `${discount}% OFF`;
      discountBox.classList.remove('hidden');
    } else {
      mrpBox.classList.add('hidden');
      discountBox.classList.add('hidden');
    }

    // Set cart controls for first variant
    updateDetailModalVariantActions(p.id, firstSz.size);
  } else {
    // Normal behavior
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
    updateDetailModalCartActions(p);
  }

  document.getElementById('product-detail-image').innerHTML = p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : (p.emoji || '🛒');

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

function toggleUserMenu(event) {
  if (event) event.stopPropagation();
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
  saveCartState();
}

function updateCartQty(prodId, delta, event) {
  if (event) event.stopPropagation();
  const cartIndex = state.cart.findIndex(item => item.product.id === prodId);
  if (cartIndex === -1) return;

  state.cart[cartIndex].quantity += delta;

  const isRemoved = state.cart[cartIndex].quantity <= 0;
  if (isRemoved) {
    state.cart.splice(cartIndex, 1);
  }

  // Extract base product ID and size name if it is a variant
  let baseProdId = prodId;
  let sizeName = '';
  let isVariant = false;
  
  const matchingProd = state.products.find(p => prodId.startsWith(p.id + '-'));
  if (matchingProd) {
    baseProdId = matchingProd.id;
    sizeName = prodId.substring(matchingProd.id.length + 1);
    isVariant = true;
  }

  if (isVariant) {
    updateCartBadge();
    
    // Update the card UI if visible
    const actionWrappers = document.querySelectorAll(`#act-${baseProdId}`);
    actionWrappers.forEach(actionWrapper => {
      const card = actionWrapper.closest('.product-card');
      if (card) {
        const activePill = card.querySelector('.size-pill.active');
        if (activePill && activePill.innerText.trim() === sizeName) {
          const cartItem = state.cart.find(item => item.product.id === prodId);
          const qty = cartItem ? cartItem.quantity : 0;
          if (qty > 0) {
            actionWrapper.innerHTML = `
              <div class="quantity-controls">
                <button class="qty-btn" onclick="updateCartQty('${prodId}', -1, event)">-</button>
                <span class="qty-val">${qty}</span>
                <button class="qty-btn" onclick="updateCartQty('${prodId}', 1, event)">+</button>
              </div>
            `;
          } else {
            actionWrapper.innerHTML = `
              <button class="add-btn" onclick="addSizeToCart('${baseProdId}', '${sizeName}', event)">ADD</button>
            `;
          }
        }
      }
    });

    // Re-render cart elements
    if (document.getElementById('cart-sidebar').classList.contains('active-cart')) {
      renderCartItems();
    }
  } else {
    updateCartState(prodId);
  }

  saveCartState();
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

// ==================== MULTIPLE SIZES HELPERS ====================
function selectCardSizePill(btn, prodId, sizeName, price, mrp, event) {
  if (event) event.stopPropagation();
  
  const container = btn.closest('.product-sizes-pills');
  if (container) {
    container.querySelectorAll('.size-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  
  const card = btn.closest('.product-card');
  if (!card) return;

  // Update price
  const priceEl = card.querySelector('.product-price');
  if (priceEl) priceEl.innerText = `₹${price}`;
  
  // Update MRP
  const mrpEl = card.querySelector('.product-mrp');
  if (mrpEl) {
    if (mrp && Number(mrp) > Number(price)) {
      mrpEl.innerText = `₹${mrp}`;
      mrpEl.style.display = 'inline-block';
    } else {
      mrpEl.style.display = 'none';
    }
  }
  
  // Update Discount tag
  const discountTag = card.querySelector('.product-discount-tag');
  if (discountTag) {
    const discount = mrp && Number(mrp) > Number(price) ? Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100) : 0;
    if (discount > 0) {
      discountTag.innerText = `${discount}% OFF`;
      discountTag.style.display = 'block';
    } else {
      discountTag.style.display = 'none';
    }
  }
  
  // Update Action buttons (ADD / controls) based on whether this variant is in the cart
  const actionWrapper = card.querySelector('.product-action-wrapper');
  if (actionWrapper) {
    const variantId = `${prodId}-${sizeName}`;
    const cartItem = state.cart.find(item => item.product.id === variantId);
    const qty = cartItem ? cartItem.quantity : 0;
    
    if (qty > 0) {
      actionWrapper.innerHTML = `
        <div class="quantity-controls">
          <button class="qty-btn" onclick="updateCartQty('${variantId}', -1, event)">-</button>
          <span class="qty-val">${qty}</span>
          <button class="qty-btn" onclick="updateCartQty('${variantId}', 1, event)">+</button>
        </div>
      `;
    } else {
      actionWrapper.innerHTML = `
        <button class="add-btn" onclick="addSizeToCart('${prodId}', '${sizeName}', event)">ADD</button>
      `;
    }
  }
}

function addSizeToCart(prodId, sizeName, event) {
  if (event) event.stopPropagation();
  const product = state.products.find(p => p.id === prodId);
  if (!product || !product.sizes) return;
  const sz = product.sizes.find(s => s.size === sizeName);
  if (!sz) return;

  // Clone product and override fields for this size
  const variantProduct = {
    ...product,
    id: `${product.id}-${sizeName}`,
    name: `${product.name} (${sizeName})`,
    price: sz.price,
    mrp: sz.mrp || sz.price,
    unit: sizeName,
    stock: sz.stock
  };

  state.cart.push({ product: variantProduct, quantity: 1 });
  showToast(`${variantProduct.name} added to cart`);

  // Update card state for currently selected size
  updateCartBadge();
  const actionWrappers = document.querySelectorAll(`#act-${prodId}`);
  actionWrappers.forEach(actionWrapper => {
    const card = actionWrapper.closest('.product-card');
    if (card) {
      const activePill = card.querySelector('.size-pill.active');
      if (activePill && activePill.innerText.trim() === sizeName) {
        actionWrapper.innerHTML = `
          <div class="quantity-controls">
            <button class="qty-btn" onclick="updateCartQty('${variantProduct.id}', -1, event)">-</button>
            <span class="qty-val">1</span>
            <button class="qty-btn" onclick="updateCartQty('${variantProduct.id}', 1, event)">+</button>
          </div>
        `;
      }
    }
  });

  // Re-render cart elements
  if (document.getElementById('cart-sidebar').classList.contains('active-cart')) {
    renderCartItems();
  }

  saveCartState();
}

function selectDetailSizePill(btn, prodId, sizeName, price, mrp) {
  const container = btn.closest('.detail-sizes-pills');
  if (container) {
    container.querySelectorAll('.detail-size-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  
  document.getElementById('detail-price').innerText = `₹${price}`;
  
  const mrpBox = document.getElementById('detail-mrp');
  const discountBox = document.getElementById('detail-discount');
  if (mrp && Number(mrp) > Number(price)) {
    mrpBox.innerText = `₹${mrp}`;
    mrpBox.classList.remove('hidden');
    const discount = Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100);
    discountBox.innerText = `${discount}% OFF`;
    discountBox.classList.remove('hidden');
  } else {
    mrpBox.classList.add('hidden');
    discountBox.classList.add('hidden');
  }
  
  updateDetailModalVariantActions(prodId, sizeName);
}

function updateDetailModalVariantActions(prodId, sizeName) {
  const actionsEl = document.getElementById('detail-cart-controls');
  const variantId = `${prodId}-${sizeName}`;
  const cartItem = state.cart.find(item => item.product.id === variantId);
  const qty = cartItem ? cartItem.quantity : 0;
  
  if (qty > 0) {
    actionsEl.innerHTML = `
      <div class="quantity-controls" style="font-size: 16px; padding: 4px;">
        <button class="qty-btn" style="padding: 10px 16px;" onclick="updateCartQty('${variantId}', -1, event); updateDetailModalVariantActions('${prodId}', '${sizeName}')">-</button>
        <span class="qty-val" style="min-width: 30px;">${qty}</span>
        <button class="qty-btn" style="padding: 10px 16px;" onclick="updateCartQty('${variantId}', 1, event); updateDetailModalVariantActions('${prodId}', '${sizeName}')">+</button>
      </div>
    `;
  } else {
    actionsEl.innerHTML = `
      <button class="btn-primary" style="max-width: 200px;" onclick="addSizeToCart('${prodId}', '${sizeName}', event); updateDetailModalVariantActions('${prodId}', '${sizeName}')"><i class="fas fa-plus"></i> Add to Cart</button>
    `;
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
  try {
    if (!state.currentUser) {
      showToast('Please log in first', 'error');
      return;
    }
    if (state.cart.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    // Check if admin requires PWA install for checkout
    if (state.storeSettings.requirePwaInstall && typeof isStandalone === 'function' && !isStandalone()) {
      const pwaModal = document.getElementById('pwa-block-modal');
      if (pwaModal) {
        pwaModal.classList.remove('hidden');
        return;
      }
    }

    toggleCart();
    const modal = document.getElementById('checkout-modal');
    modal.classList.remove('hidden');

    // Load user info (null-safe)
    const userAddress = state.currentUser.address || '';
    const userName = state.currentUser.name || '';
    const userPhone = state.currentUser.phone || '';
    const userEmail = state.currentUser.email || '';

    document.getElementById('checkout-address').innerText = userAddress;
    document.getElementById('checkout-name-input').value = userName;
    document.getElementById('checkout-phone-input').value = userPhone;
    document.getElementById('checkout-email-input').value = userEmail;
    document.getElementById('checkout-address-input').value = userAddress === 'Update your address' ? '' : userAddress;

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
    let delivery = Number(state.storeSettings.deliveryFee) || 0;
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

    // Reset payment sections to default state
    document.getElementById('upi-section').classList.add('hidden');
    document.getElementById('card-section').classList.add('hidden');
    // Ensure COD is selected by default
    const codRadio = document.querySelector('input[name="payment"][value="cod"]');
    if (codRadio) codRadio.checked = true;
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
    if (codRadio) codRadio.closest('.payment-option').classList.add('selected');

    // Hook up payment change logic (use onclick to avoid stacking listeners)
    const radios = document.querySelectorAll('input[name="payment"]');
    radios.forEach(radio => {
      radio.onchange = function () {
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
      };
    });
  } catch (err) {
    console.error('showCheckout error:', err);
    showToast('Error opening checkout. Please try again.', 'error');
  }
}

function closeCheckout() {
  document.getElementById('checkout-modal').classList.add('hidden');
}

async function placeOrder() {
  try {
    const nameInput = document.getElementById('checkout-name-input');
    const phoneInput = document.getElementById('checkout-phone-input');
    const emailInput = document.getElementById('checkout-email-input');
    const addressInput = document.getElementById('checkout-address-input');

    if (!nameInput || !phoneInput || !emailInput || !addressInput) {
      showToast('Checkout form error. Please close and reopen checkout.', 'error');
      console.error('Missing checkout input elements');
      return;
    }

    const finalName = nameInput.value.trim();
    const finalPhone = phoneInput.value.trim();
    const finalEmail = emailInput.value.trim();
    const finalAddress = addressInput.value.trim();

    if (!finalName || finalName.length < 2) {
      showToast('Please enter your full name', 'error');
      nameInput.scrollIntoView({behavior: 'smooth', block: 'center'});
      nameInput.focus();
      return;
    }
    if (!finalPhone || finalPhone.length < 8) {
      showToast('Please enter a valid phone number', 'error');
      phoneInput.scrollIntoView({behavior: 'smooth', block: 'center'});
      phoneInput.focus();
      return;
    }
    if (!finalEmail || !finalEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      emailInput.scrollIntoView({behavior: 'smooth', block: 'center'});
      emailInput.focus();
      return;
    }
    if (!finalAddress || finalAddress.toLowerCase().includes('update your address') || finalAddress.length < 5) {
      showToast('Please enter a complete delivery address', 'error');
      addressInput.scrollIntoView({behavior: 'smooth', block: 'center'});
      addressInput.focus();
      return;
    }

    if (state.cart.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    // Persist the entered contact info back to the profile
    state.currentUser.name = finalName;
    state.currentUser.phone = finalPhone;
    state.currentUser.email = finalEmail;
    state.currentUser.address = finalAddress;
    localStorage.setItem('qs_current_user', JSON.stringify(state.currentUser));

    if (db) {
      db.collection('customers').doc(finalEmail).set({
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
        address: finalAddress
      }, { merge: true }).catch(err => console.warn('Customer details sync failed on order:', err));
    }

    // Payment Verification
    const checkedPayment = document.querySelector('input[name="payment"]:checked');
    const paymentMethod = checkedPayment ? checkedPayment.value : 'cod';
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
    let delivery = Number(state.storeSettings.deliveryFee) || 0;
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
        emoji: item.product.emoji || null
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
        state.products[pIndex].stock = Math.max(0, (state.products[pIndex].stock || 0) - cartItem.quantity);
      }
    });

    // Save changes to local storage
    localStorage.setItem('qs_products', JSON.stringify(state.products));
    state.orders.unshift(newOrder);
    localStorage.setItem('qs_orders', JSON.stringify(state.orders));

    // Save changes to Firebase (if configured)
    if (db) {
      try {
        await db.collection('orders').doc(orderId).set(newOrder);
        console.log('Order successfully synced to Firebase!');
      } catch (error) {
        console.error('Error syncing order to Firebase: ', error);
      }
    }

    // Reset cart
    state.cart = [];
    state.appliedCoupon = null;
    const couponInput = document.getElementById('coupon-input');
    if (couponInput) couponInput.value = '';
    updateCartBadge();
    saveCartState();

    // Close checkout and show success
    closeCheckout();

    document.getElementById('success-order-id').innerText = '#' + orderId;
    document.getElementById('order-success').classList.remove('hidden');
  } catch (err) {
    console.error('placeOrder error:', err);
    showToast('Order failed: ' + (err.message || 'Unknown error. Check console.'), 'error');
  }
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
  renderUserOrdersList(list);
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
      
      if (db) {
        db.collection('customers').doc(state.currentUser.email).set({
          address: trimmedAddress
        }, { merge: true }).catch(err => console.warn('Address sync failed:', err));
      }
      
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

let deferredPrompt = null;

// Capture the beforeinstallprompt event to enable direct PWA installation
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Only show the installation UI elements once the prompt is ready
  if (!isStandalone()) {
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) installBtn.classList.remove('hidden');

    const menuInstallBtn = document.getElementById('menu-install-btn');
    if (menuInstallBtn) menuInstallBtn.classList.remove('hidden');

    const hideBanner = localStorage.getItem('qs_hide_install_banner');
    if (!hideBanner) {
      const banner = document.getElementById('sticky-install-banner');
      if (banner) banner.classList.remove('hidden');
    }
  }
});

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true || 
         window.location.search.includes('source=pwa') ||
         window.location.search.includes('installed=true') ||
         document.referrer.includes('android-app://');
}

function promptAppInstall() {
  // Close any PWA block modal if it's open
  const pwaModal = document.getElementById('pwa-block-modal');
  if (pwaModal) pwaModal.classList.add('hidden');

  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        // Hide UI elements if user installed the app
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) installBtn.classList.add('hidden');
        const menuInstallBtn = document.getElementById('menu-install-btn');
        if (menuInstallBtn) menuInstallBtn.classList.add('hidden');
        const banner = document.getElementById('sticky-install-banner');
        if (banner) banner.classList.add('hidden');
      }
      deferredPrompt = null;
    });
  } else {
    // Custom HTML toast (no native browser alert popup)
    showToast("To install, open your browser's menu (three dots) and select 'Install app' or 'Add to Home screen'.", 'info');
  }
}

// Show install button for everyone not in standalone mode immediately
function initInstallPrompt() {
  if (!isStandalone()) {
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) installBtn.classList.remove('hidden');

    const menuInstallBtn = document.getElementById('menu-install-btn');
    if (menuInstallBtn) menuInstallBtn.classList.remove('hidden');

    const hideBanner = localStorage.getItem('qs_hide_install_banner');
    if (!hideBanner) {
      const banner = document.getElementById('sticky-install-banner');
      if (banner) banner.classList.remove('hidden');
    }
  }
}

// Safe startup execution
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    initInstallPrompt();
    initApp();
  });
} else {
  initInstallPrompt();
  initApp();
}


function renderSkeletons() {
  const categoriesGrid = document.getElementById('categories-grid');
  if (categoriesGrid) {
    categoriesGrid.innerHTML = Array(6).fill('<div class="skeleton-shimmer skeleton-category"></div>').join('');
  }
  const productSections = document.getElementById('product-sections');
  if (productSections) {
    productSections.innerHTML = `
      <section class="store-section">
        <h2 class="section-title"><div class="skeleton-shimmer skeleton-text" style="width: 150px; height: 24px;"></div></h2>
        <div class="products-grid">
          ${Array(4).fill(`
            <div class="skeleton-card skeleton-shimmer">
              <div class="skeleton-img"></div>
              <div class="skeleton-text"></div>
              <div class="skeleton-text short"></div>
              <div class="skeleton-btn"></div>
            </div>
          `).join('')}
        </div>
      </section>
      <section class="store-section">
        <h2 class="section-title"><div class="skeleton-shimmer skeleton-text" style="width: 150px; height: 24px;"></div></h2>
        <div class="products-grid">
          ${Array(4).fill(`
            <div class="skeleton-card skeleton-shimmer">
              <div class="skeleton-img"></div>
              <div class="skeleton-text"></div>
              <div class="skeleton-text short"></div>
              <div class="skeleton-btn"></div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }
  const heroSlides = document.getElementById('hero-slides');
  if (heroSlides) {
    heroSlides.innerHTML = '<div class="skeleton-shimmer skeleton-hero" style="width:100%; height:200px; border-radius:24px;"></div>';
  }
}
