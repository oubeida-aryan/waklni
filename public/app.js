// App Data (now it's just a state container)
const appData = {
    restaurants: [], // This will be filled from the database
    cart: [],
    orders: [], // This will be filled from the database
    currentView: 'customer',
    currentRestaurant: null,
    currentCategory: 'all',
    editingRestaurant: null,
    editingDish: null,
    selectedRestaurantForDish: null,
    user: null,
    profile: null
};

// Helper Functions
function formatPrice(price) {
    return `${price.toLocaleString()} أوقية`;
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="text-yellow-400">★</span>';
    }

    if (hasHalfStar) {
        stars += '<span class="text-yellow-400">☆</span>';
    }

    return stars;
}

function updateCartCount() {
    const count = appData.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function calculateCartTotal() {
    return appData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function filterRestaurants(category) {
    if (category === 'all') {
        return appData.restaurants;
    }
    return appData.restaurants.filter(restaurant => restaurant.category === category);
}

function searchRestaurantsAndDishes(query) {
    if (!query) return appData.restaurants;

    query = query.toLowerCase();
    return appData.restaurants.filter(restaurant => {
        const nameMatch = restaurant.name.toLowerCase().includes(query);
        const menuMatch = restaurant.menu.some(item =>
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
        );
        return nameMatch || menuMatch;
    });
}

function generateId() {
    return Date.now() + Math.random();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return resolve(null);
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function getImageSource(item) {
    // This function needs to handle both base64 strings and public URLs from Supabase storage
    if (item.image_url) return item.image_url;
    if (item.photo_url) return item.photo_url;
    if (item.image && typeof item.image === 'string' && item.image.startsWith('data:')) {
        return item.image;
    } else if (item.photo && typeof item.photo === 'string' && item.photo.startsWith('data:')) {
        return item.photo;
    }
    return null;
}

function getImageDisplay(item, size = 'default') {
    const imageSource = getImageSource(item);
    if (imageSource) {
        return `<img src="${imageSource}" class="w-full h-full object-cover" alt="${item.name}">`;
    } else {
        const fontSize = size === 'small' ? 'text-sm' : 'text-2xl';
        return `<span class="${fontSize}">${item.image || item.logo || '🍽️'}</span>`;
    }
}

async function loadInitialData() {
    console.log("Fetching data from Supabase...");
    let { data: restaurants, error } = await supabaseClient
        .from('restaurants')
        .select(`
            id,
            name,
            logo,
            image_url,
            bg_color,
            description,
            rating,
            delivery_time,
            category,
            is_open,
            dishes (*)
        `);

    if (error) {
        console.error('Error fetching restaurants:', error);
        return;
    }

    appData.restaurants = restaurants.map(r => ({
        ...r,
        menu: r.dishes || [] // Ensure menu is always an array
    }));

    renderRestaurants();
    renderPopularDishes();
    populateRestaurantSelect();
    console.log("Data loaded and rendered.");
}

// Render Functions
function renderRestaurants(restaurants = appData.restaurants) {
    const grid = document.getElementById('restaurantGrid');
    grid.innerHTML = restaurants.map(restaurant => `
        <div class="card-compact rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300 ${!restaurant.is_open ? 'grayscale' : ''}" onclick="showRestaurantMenu(${restaurant.id})">
            <div class="h-32 bg-gray-200 relative">
                <img src="${getImageSource(restaurant) || 'https://placehold.co/600x400/e2e8f0/e2e8f0'}" alt="${restaurant.name}" class="w-full h-full object-cover">
                ${!restaurant.is_open ? `<div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"><span class="text-white font-bold text-lg">مغلق</span></div>` : ''}
            </div>
            <div class="p-4">
                <div class="flex justify-between items-start">
                    <h3 class="font-semibold text-lg text-gray-900 truncate">${restaurant.name}</h3>
                    <span class="status-badge ${restaurant.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${restaurant.is_open ? 'مفتوح' : 'مغلق'}</span>
                </div>
                <div class="flex items-center gap-2 mt-1 text-sm">
                    <div class="flex items-center gap-1">
                        ${generateStars(restaurant.rating)}
                        <span class="text-gray-600">${restaurant.rating}</span>
                    </div>
                    <span class="text-gray-500">•</span>
                    <span class="text-gray-500">${restaurant.delivery_time}</span>
                </div>
                <p class="text-sm text-gray-500 mt-2 truncate">${restaurant.description}</p>
            </div>
        </div>
    `).join('');
}

function renderPopularDishes() {
    const allDishes = appData.restaurants.flatMap(restaurant =>
        restaurant.menu.map(item => ({...item, restaurantName: restaurant.name, restaurantId: restaurant.id}))
    );

    const popularDishes = allDishes.sort(() => 0.5 - Math.random()).slice(0, 6);

    const container = document.getElementById('popularDishes').querySelector('.grid');
    container.innerHTML = popularDishes.map(dish => `
        <div class="card-compact rounded-xl overflow-hidden shadow-sm">
            <div class="flex items-center gap-4 p-3">
                <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src="${getImageSource(dish) || 'https://placehold.co/400x400/e2e8f0/e2e8f0'}" alt="${dish.name}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-base text-gray-900">${dish.name}</h4>
                    <p class="text-sm text-gray-500 truncate mt-1">${dish.description}</p>
                    <div class="flex items-center justify-between mt-2">
                        <span class="font-bold text-lg text-secondary">${formatPrice(dish.price)}</span>
                        <button onclick="addToCart(${dish.id})" class="btn btn-primary text-sm">
                            إضافة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderMenuItems(restaurant) {
    document.getElementById('restaurantHeader').innerHTML = `
        <div class="flex items-center gap-4">
            <div class="w-24 h-24 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                 <img src="${getImageSource(restaurant) || 'https://placehold.co/600x400/e2e8f0/e2e8f0'}" alt="${restaurant.name}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1">
                <h2 class="font-bold text-2xl text-gray-900">${restaurant.name}</h2>
                <p class="text-sm text-gray-600 mt-1">${restaurant.description}</p>
                <div class="flex items-center gap-3 mt-2 text-sm">
                    <div class="flex items-center gap-1">
                        ${generateStars(restaurant.rating)}
                        <span class="text-gray-600">${restaurant.rating}</span>
                    </div>
                    <span class="text-gray-500">🕐 ${restaurant.delivery_time}</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('menuItems').innerHTML = restaurant.menu.map(item => `
        <div class="card-compact rounded-xl overflow-hidden shadow-sm">
            <div class="flex items-center gap-4 p-3">
                <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src="${getImageSource(item) || 'https://placehold.co/400x400/e2e8f0/e2e8f0'}" alt="${item.name}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-base text-gray-900">${item.name}</h4>
                    <p class="text-sm text-gray-500 truncate mt-1">${item.description}</p>
                    <div class="flex items-center justify-between mt-2">
                        <span class="font-bold text-lg text-secondary">${formatPrice(item.price)}</span>
                        <button onclick="addToCart(${item.id})" class="btn btn-primary text-sm">
                            إضافة للسلة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');

    if (appData.cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <span class="text-4xl block mb-3">🛒</span>
                <p class="text-sm">السلة فارغة</p>
            </div>
        `;
        document.getElementById('cartTotal').textContent = '0 أوقية';
        return;
    }

    cartItems.innerHTML = appData.cart.map(item => `
        <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                    ${getImageDisplay(item, 'small')}
                </div>
                <div>
                    <h5 class="font-medium text-sm text-gray-900">${item.name}</h5>
                    <p class="text-xs text-secondary">${formatPrice(item.price)}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})" class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">-</button>
                <span class="w-6 text-center text-sm font-medium">${item.quantity}</span>
                <button onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})" class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">+</button>
            </div>
        </div>
    `).join('');

    document.getElementById('cartTotal').textContent = formatPrice(calculateCartTotal());
}

async function renderOrders() {
    const container = document.getElementById('ordersContainer');

    let { data: orders, error } = await supabaseClient
        .from('orders')
        .select(`
            *,
            order_items (
                *,
                dishes (*)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        container.innerHTML = `<p class="text-danger">خطأ في تحميل الطلبات</p>`;
        return;
    }

    appData.orders = orders;

    if (appData.orders.length === 0) {
        container.innerHTML = `
            <div class="card-compact rounded-lg text-center py-12 text-gray-500">
                <span class="text-4xl block mb-3">📝</span>
                <h3 class="font-medium text-base mb-2">لا توجد طلبات</h3>
                <p class="text-sm">الطلبات الجديدة ستظهر هنا</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appData.orders.map(order => `
        <div class="card-compact rounded-lg p-4 border-r-4 ${order.status === 'delivered' ? 'border-green-500' : 'border-secondary'}">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-semibold text-sm">طلب #${order.id}</h3>
                    <p class="text-xs text-gray-500 mt-1">${order.customer_name} • ${order.customer_phone}</p>
                </div>
                <div class="text-left">
                    <p class="font-bold text-secondary text-sm">${formatPrice(order.total)}</p>
                    <p class="text-xs text-gray-500">${new Date(order.created_at).toLocaleString('ar-MA')}</p>
                </div>
            </div>

            <div class="mb-3">
                <p class="text-xs text-gray-600 bg-gray-50 p-2 rounded">${order.address}</p>
            </div>

            <div class="mb-3">
                <div class="space-y-1">
                    ${order.order_items.map(item => `
                        <div class="flex justify-between text-xs">
                            <span>${item.dishes.name} x${item.quantity}</span>
                            <span>${formatPrice(item.dishes.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="flex justify-between items-center">
                <div class="flex gap-1">
                    ${getStatusButtons(order)}
                </div>
                <div class="status-badge ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
                    ${getStatusText(order.status)}
                </div>
            </div>
        </div>
    `).join('');
}

function renderRestaurantsManagement() {
    const container = document.getElementById('restaurantsManagement');
    const addRestaurantCard = `
        <div class="card-compact rounded-lg p-4 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer hover:border-secondary" onclick="addRestaurant()">
            <span class="text-3xl mb-2">➕</span>
            <h3 class="font-medium text-sm text-gray-700">إضافة مطعم جديد</h3>
        </div>
    `;

    const restaurantCards = appData.restaurants.map(restaurant => `
        <div class="card-compact rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                    <div class="restaurant-avatar" style="background: ${restaurant.bg_color};">
                       ${getImageDisplay(restaurant)}
                    </div>
                    <div>
                        <h3 class="font-medium text-sm">${restaurant.name}</h3>
                        <p class="text-xs text-gray-500">${restaurant.delivery_time}</p>
                    </div>
                </div>
                <span class="status-badge ${restaurant.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${restaurant.is_open ? 'مفتوح' : 'مغلق'}</span>
            </div>

            <p class="text-xs text-gray-600 mb-3 line-clamp-2">${getCategoryName(restaurant.category)}: ${restaurant.description}</p>

            <div class="flex gap-2">
                <button onclick="editRestaurant(${restaurant.id})" class="btn-secondary flex-1 text-xs py-2">
                    تعديل
                </button>
                <button onclick="deleteRestaurant(${restaurant.id})" class="btn-danger flex-1 text-xs py-2">
                    حذف
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = addRestaurantCard + restaurantCards;
}

function renderDishesManagement(restaurantId) {
    const container = document.getElementById('dishesManagement');
    const restaurant = appData.restaurants.find(r => r.id == restaurantId);

    if (!restaurant) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <span class="text-4xl block mb-3">🍽️</span>
                <p class="text-sm">اختر مطعماً لعرض أطباقه</p>
            </div>
        `;
        return;
    }

    const addDishCard = `
        <div class="card-compact rounded-lg p-4 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer hover:border-secondary" onclick="addDish(${restaurantId})">
            <span class="text-3xl mb-2">➕</span>
            <h3 class="font-medium text-sm text-gray-700">إضافة طبق جديد</h3>
        </div>
    `;

    const dishCards = restaurant.menu.map(dish => `
        <div class="card-compact rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                    <div class="dish-image-container">
                        ${getImageDisplay(dish, 'small')}
                    </div>
                    <div>
                        <h3 class="font-medium text-sm">${dish.name}</h3>
                        <p class="text-xs text-secondary">${formatPrice(dish.price)}</p>
                    </div>
                </div>
                <span class="status-badge bg-secondary text-white">${getCategoryName(dish.category)}</span>
            </div>

            <p class="text-xs text-gray-600 mb-3 line-clamp-2">${dish.description}</p>

            <div class="flex gap-2">
                <button onclick="editDish(${restaurantId}, ${dish.id})" class="btn-secondary flex-1 text-xs py-2">
                    تعديل
                </button>
                <button onclick="deleteDish(${restaurantId}, ${dish.id})" class="btn-danger flex-1 text-xs py-2">
                    حذف
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = addDishCard + dishCards;
}

function populateRestaurantSelect() {
    const select = document.getElementById('dishRestaurantSelect');
    select.innerHTML = '<option value="">اختر مطعم</option>' +
        appData.restaurants.map(restaurant =>
            `<option value="${restaurant.id}">${restaurant.name}</option>`
        ).join('');
}

function getCategoryName(category) {
    const categories = {
        'all': 'الكل',
        'traditional': 'تقليدي',
        'fastfood': 'سريع',
        'desserts': 'حلويات',
        'beverages': 'مشروبات'
    };
    return categories[category] || category;
}

function getStatusButtons(order) {
    const statuses = [
        { key: 'paid', text: '💳', color: 'bg-blue-500' },
        { key: 'preparing', text: '⏱️', color: 'bg-warning' },
        { key: 'ready', text: '✅', color: 'bg-accent' },
        { key: 'delivered', text: '🚚', color: 'bg-gray-500' }
    ];

    return statuses.map(status => {
        const isCurrentOrPast = getStatusIndex(order.status) >= getStatusIndex(status.key);
        const isCurrent = order.status === status.key;

        return `
            <button
                onclick="updateOrderStatus(${order.id}, '${status.key}')"
                class="${status.color} text-white w-6 h-6 rounded text-xs flex items-center justify-center transition-all
                       ${isCurrentOrPast ? '' : 'opacity-50'}
                       ${isCurrent ? 'ring-1 ring-offset-1 ring-blue-300' : ''}"
                title="${getStatusText(status.key)}"
            >
                ${status.text}
            </button>
        `;
    }).join('');
}

function getStatusText(status) {
    const statusMap = {
        'paid': 'مدفوع',
        'preparing': 'يتم التحضير',
        'ready': 'جاهز',
        'delivered': 'تم التوصيل'
    };
    return statusMap[status] || 'غير محدد';
}

function getStatusIndex(status) {
    const statuses = ['paid', 'preparing', 'ready', 'delivered'];
    return statuses.indexOf(status);
}

async function renderOwnerRestaurantStatus() {
    // First, get the restaurants owned by the current user
    const { data: ownedRestaurants, error: fetchError } = await supabaseClient
        .from('restaurant_owners')
        .select('restaurant_id')
        .eq('user_id', appData.user.id);

    if (fetchError || !ownedRestaurants || ownedRestaurants.length === 0) {
        console.error("Could not fetch owner's restaurants", fetchError);
        document.getElementById('ownerRestaurantStatus').innerHTML = '';
        return;
    }

    const restaurantId = ownedRestaurants[0].restaurant_id; // Assuming one restaurant per owner for now
    const restaurant = appData.restaurants.find(r => r.id === restaurantId);

    if (!restaurant) return;

    const container = document.getElementById('ownerRestaurantStatus');
    container.innerHTML = `
        <div class="card-compact rounded-xl p-4">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="font-semibold text-lg">${restaurant.name}</h3>
                    <p class="text-sm text-gray-500">حالة المطعم الحالية</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-bold ${restaurant.is_open ? 'text-green-600' : 'text-red-600'}">${restaurant.is_open ? 'مفتوح' : 'مغلق'}</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" ${restaurant.is_open ? 'checked' : ''} class="sr-only peer" onchange="toggleRestaurantStatus(${restaurant.id}, this.checked)">
                        <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
        </div>
    `;
}

async function toggleRestaurantStatus(restaurantId, newStatus) {
    const { error } = await supabaseClient
        .from('restaurants')
        .update({ is_open: newStatus })
        .eq('id', restaurantId);

    if (error) {
        console.error("Error updating restaurant status:", error);
        showToast('خطأ في تحديث حالة المطعم', 'danger');
        return;
    }

    // Update local data and re-render relevant parts
    const restaurant = appData.restaurants.find(r => r.id === restaurantId);
    if (restaurant) {
        restaurant.is_open = newStatus;
    }

    showToast(`تم تحديث حالة المطعم بنجاح`);
    renderOwnerRestaurantStatus(); // Re-render the toggle
    renderRestaurants(); // Re-render the customer list to reflect changes
}

// Navigation Functions
function showView(viewName) {
    const role = appData.profile?.role;
    const bottomNav = document.querySelector('.bottom-nav');

    // Auth guard
    if ((viewName === 'owner' || viewName === 'admin') && !appData.user) {
        showToast('الرجاء تسجيل الدخول أولاً');
        return showView('signIn');
    }

    if (viewName === 'owner' && !['admin', 'owner'].includes(role)) {
        showToast('ليس لديك الصلاحية للوصول لهذه الصفحة', 'danger');
        return showView('customer');
    }

    if (viewName === 'admin' && role !== 'admin') {
        showToast('ليس لديك الصلاحية للوصول لهذه الصفحة', 'danger');
        return showView('customer');
    }

    appData.currentView = viewName;

    const views = ['roleSelectionView', 'customerView', 'menuView', 'ownerView', 'adminView', 'signInView', 'signUpView'];
    views.forEach(view => {
        const el = document.getElementById(view);
        if(el) el.classList.add('hidden');
    });

    if (['roleSelection', 'signIn', 'signUp'].includes(viewName)) {
        bottomNav.classList.add('hidden');
    } else {
        bottomNav.classList.remove('hidden');
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeView = document.getElementById(`${viewName}View`);
    if(activeView) activeView.classList.remove('hidden');

    const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
    if(activeNavItem) activeNavItem.classList.add('active');

    // Load data for view if needed
    if (viewName === 'customer' && appData.restaurants.length === 0) {
        loadInitialData();
    } else if (viewName === 'owner') {
        renderOwnerRestaurantStatus();
        renderOrders();
    } else if (viewName === 'admin') {
        renderRestaurantsManagement();
        populateRestaurantSelect();
    }
}

function showRestaurantMenu(restaurantId) {
    const restaurant = appData.restaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;

    appData.currentRestaurant = restaurant;

    document.getElementById('customerView').classList.add('hidden');
    document.getElementById('menuView').classList.remove('hidden');

    renderMenuItems(restaurant);
}

function showRestaurantList() {
    document.getElementById('menuView').classList.add('hidden');
    document.getElementById('customerView').classList.remove('hidden');
}

// Cart Functions
function addToCart(itemId) {
    let item = null;
    for (const restaurant of appData.restaurants) {
        item = restaurant.menu.find(menuItem => menuItem.id === itemId);
        if (item) break;
    }

    if (!item) return;

    const existingItem = appData.cart.find(cartItem => cartItem.id === itemId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        appData.cart.push({
            ...item,
            quantity: 1
        });
    }

    updateCartCount();
    showToast('تم إضافة الطبق للسلة');
}

function updateCartItemQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
        appData.cart = appData.cart.filter(item => item.id !== itemId);
    } else {
        const item = appData.cart.find(item => item.id === itemId);
        if (item) {
            item.quantity = newQuantity;
        }
    }

    updateCartCount();
    renderCart();
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'danger' ? 'bg-danger' : 'bg-accent';
    toast.className = `fixed top-16 right-4 ${bgColor} text-white px-4 py-2 rounded-lg text-sm z-50 fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Order Functions
async function updateOrderStatus(orderId, newStatus) {
    if (!appData.user) { return showView('signIn'); }
    const { error } = await supabaseClient
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        console.error('Error updating order status:', error);
        showToast('خطأ في تحديث حالة الطلب', 'danger');
        return;
    }

    const order = appData.orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        renderOrders();
        showToast(`تم تحديث حالة الطلب`);
    }
}

// Admin Functions
function addRestaurant() {
    if (!appData.user) { return showView('signIn'); }
    appData.editingRestaurant = null;
    document.getElementById('restaurantModalTitle').textContent = 'إضافة مطعم';
    document.getElementById('restaurantForm').reset();
    document.getElementById('restaurantImageInput').value = '';

    const preview = document.getElementById('restaurantImagePreview');
    preview.innerHTML = `
        <span class="text-2xl mb-2">📷</span>
        <span class="text-xs text-gray-500">انقر لاختيار صورة</span>
    `;

    showModal('restaurantFormModal');
}

function editRestaurant(restaurantId) {
    if (!appData.user) { return showView('signIn'); }
    const restaurant = appData.restaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;

    appData.editingRestaurant = restaurant;
    document.getElementById('restaurantModalTitle').textContent = 'تعديل المطعم';

    document.getElementById('restaurantName').value = restaurant.name;
    document.getElementById('restaurantLogo').value = restaurant.logo || '';
    document.getElementById('restaurantDescription').value = restaurant.description;
    document.getElementById('restaurantRating').value = restaurant.rating;
    document.getElementById('restaurantDeliveryTime').value = restaurant.delivery_time;
    document.getElementById('restaurantCategory').value = restaurant.category;
    document.getElementById('restaurantBgColor').value = restaurant.bg_color;
    document.getElementById('restaurantImageInput').value = '';

    const preview = document.getElementById('restaurantImagePreview');
    const imageSource = getImageSource(restaurant);
    if (imageSource) {
        preview.innerHTML = `<img src="${imageSource}" class="w-full h-20 object-cover rounded" alt="Restaurant">`;
    } else {
        preview.innerHTML = `
            <span class="text-2xl mb-2">📷</span>
            <span class="text-xs text-gray-500">انقر لاختيار صورة جديدة</span>
        `;
    }

    showModal('restaurantFormModal');
}

async function deleteRestaurant(restaurantId) {
    if (!appData.user) { return showView('signIn'); }
    const restaurant = appData.restaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;

    document.getElementById('deleteMessage').textContent = `حذف مطعم "${restaurant.name}"؟`;

    const confirmBtn = document.getElementById('confirmDelete');
    confirmBtn.onclick = async () => {
        const { error } = await supabaseClient
            .from('restaurants')
            .delete()
            .eq('id', restaurantId);

        if (error) {
            console.error("Error deleting restaurant", error);
            showToast("خطأ في حذف المطعم", "danger");
            return;
        }

        await loadInitialData();
        renderRestaurantsManagement();
        hideModal('confirmDeleteModal');
        showToast('تم حذف المطعم');
    };

    showModal('confirmDeleteModal');
}

function addDish(restaurantId) {
    if (!appData.user) { return showView('signIn'); }
    appData.editingDish = null;
    appData.selectedRestaurantForDish = restaurantId;
    document.getElementById('dishModalTitle').textContent = 'إضافة طبق';
    document.getElementById('dishForm').reset();
    document.getElementById('dishImageInput').value = '';

    const preview = document.getElementById('dishImagePreview');
    preview.innerHTML = `
        <span class="text-2xl mb-2">📷</span>
        <span class="text-xs text-gray-500">انقر لاختيار صورة</span>
    `;

    showModal('dishFormModal');
}

function editDish(restaurantId, dishId) {
    if (!appData.user) { return showView('signIn'); }
    const restaurant = appData.restaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;

    const dish = restaurant.menu.find(d => d.id === dishId);
    if (!dish) return;

    appData.editingDish = dish;
    appData.selectedRestaurantForDish = restaurantId;
    document.getElementById('dishModalTitle').textContent = 'تعديل الطبق';

    document.getElementById('dishName').value = dish.name;
    document.getElementById('dishPrice').value = dish.price;
    document.getElementById('dishDescription').value = dish.description;
    document.getElementById('dishImage').value = dish.image || '';
    document.getElementById('dishCategory').value = dish.category;
    document.getElementById('dishImageInput').value = '';

    const preview = document.getElementById('dishImagePreview');
    const imageSource = getImageSource(dish);
    if (imageSource) {
        preview.innerHTML = `<img src="${imageSource}" class="w-full h-20 object-cover rounded" alt="Dish">`;
    } else {
        preview.innerHTML = `
            <span class="text-2xl mb-2">📷</span>
            <span class="text-xs text-gray-500">انقر لاختيار صورة</span>
        `;
    }

    showModal('dishFormModal');
}

async function deleteDish(restaurantId, dishId) {
    if (!appData.user) { return showView('signIn'); }
    const restaurant = appData.restaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;

    const dish = restaurant.menu.find(d => d.id === dishId);
    if (!dish) return;

    document.getElementById('deleteMessage').textContent = `حذف طبق "${dish.name}"؟`;

    const confirmBtn = document.getElementById('confirmDelete');
    confirmBtn.onclick = async () => {
        const { error } = await supabaseClient
            .from('dishes')
            .delete()
            .eq('id', dishId);

        if (error) {
            console.error("Error deleting dish:", error);
            showToast("خطأ في حذف الطبق", "danger");
            return;
        }

        await loadInitialData();
        renderDishesManagement(restaurantId);
        renderPopularDishes();
        hideModal('confirmDeleteModal');
        showToast('تم حذف الطبق');
    };

    showModal('confirmDeleteModal');
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function updateNavUI(user, profile) {
    const ownerNav = document.getElementById('ownerNav');
    const adminNav = document.getElementById('adminNav');
    const authNavItem = document.getElementById('authNavItem');

    if (user) {
        ownerNav.classList.toggle('hidden', !['admin', 'owner'].includes(profile?.role));
        adminNav.classList.toggle('hidden', profile?.role !== 'admin');
        authNavItem.innerHTML = `
            <span class="text-lg mb-1">🚪</span>
            <span class="text-xs">خروج</span>
        `;
        authNavItem.onclick = async () => {
            await supabaseClient.auth.signOut();
            showView('customer'); // Go to home view after logout
        };
    } else {
        ownerNav.classList.add('hidden');
        adminNav.classList.add('hidden');
        authNavItem.innerHTML = `
            <span class="text-lg mb-1">🔑</span>
            <span class="text-xs">دخول</span>
        `;
        authNavItem.onclick = () => {
            showView('signIn');
        };
    }
}

// --- MAIN ---
document.addEventListener('DOMContentLoaded', async function() {
    updateCartCount();

    // Auth state management
    async function handleAuthChange(session) {
        appData.user = session ? session.user : null;
        if (appData.user) {
            let { data, error } = await supabaseClient
                .from('profiles')
                .select(`role`)
                .eq('id', appData.user.id)
                .single();
            if (error) {
                console.error("Error fetching profile:", error);
                appData.profile = null;
            } else {
                appData.profile = data;
            }
        } else {
            appData.profile = null;
        }
        updateNavUI(appData.user, appData.profile);
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    await handleAuthChange(session);

    supabaseClient.auth.onAuthStateChange((event, session) => {
        handleAuthChange(session);
    });

    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginError = document.getElementById('loginError');

        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            loginError.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            loginError.classList.remove('hidden');
        } else {
            loginError.classList.add('hidden');
            showView('customer');
            document.getElementById('loginForm').reset();
        }
    });

    // Sign-up form submission
    document.getElementById('signUpForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;
        const signUpError = document.getElementById('signUpError');

        const { error } = await supabaseClient.auth.signUp({ email, password });

        if (error) {
            signUpError.textContent = error.message;
            signUpError.classList.remove('hidden');
        } else {
            signUpError.classList.add('hidden');
            showToast('تم إرسال رابط التأكيد إلى بريدك الإلكتروني.');
            showView('signInView');
            document.getElementById('signUpForm').reset();
        }
    });

    // Role selection
    document.getElementById('customerBtn').addEventListener('click', () => {
        showView('customer');
    });
    document.getElementById('ownerBtn').addEventListener('click', () => {
        showView('signIn');
    });
    document.getElementById('adminBtn').addEventListener('click', () => {
        showView('signIn');
    });

    // Auth view toggling
    document.getElementById('showSignUpLink').addEventListener('click', (e) => {
        e.preventDefault();
        showView('signUpView');
    });
    document.getElementById('showSignInLink').addEventListener('click', (e) => {
        e.preventDefault();
        showView('signIn');
    });

    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const view = this.dataset.view;
            showView(view);
        });
    });

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function() {
        const query = this.value.trim();
        const filteredRestaurants = searchRestaurantsAndDishes(query);
        renderRestaurants(filteredRestaurants);
    });

    // Category buttons
    document.querySelectorAll('.category-pill').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const category = this.dataset.category;
            appData.currentCategory = category;
            const filteredRestaurants = filterRestaurants(category);
            renderRestaurants(filteredRestaurants);
        });
    });

    // Admin tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.admin-tab-btn').forEach(b => {
                b.classList.remove('btn-primary', 'text-white');
                b.classList.add('text-gray-600');
            });
            this.classList.remove('text-gray-600');
            this.classList.add('btn-primary', 'text-white');

            document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.add('hidden'));

            const tab = this.dataset.tab;
            document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.remove('hidden');
        });
    });
    // Initialize first admin tab
    document.querySelector('.admin-tab-btn[data-tab="restaurants"]').click();


    // Image upload handlers
    document.getElementById('restaurantImageInput').addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('restaurantImagePreview');
                preview.innerHTML = `<img src="${event.target.result}" class="w-full h-20 object-cover rounded" alt="Restaurant">`;
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    document.getElementById('dishImageInput').addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
             const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('dishImagePreview');
                preview.innerHTML = `<img src="${event.target.result}" class="w-full h-20 object-cover rounded" alt="Dish">`;
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Navigation events
    document.getElementById('backToRestaurants').addEventListener('click', showRestaurantList);
    document.getElementById('addRestaurantBtn').addEventListener('click', addRestaurant);

    // Restaurant form events
    document.getElementById('restaurantForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!appData.user) {
            showToast('يجب تسجيل الدخول لحفظ التغييرات', 'danger');
            return showView('signIn');
        }

        const saveBtn = this.querySelector('button[type="submit"]');
        saveBtn.disabled = true;
        saveBtn.textContent = 'جاري الحفظ...';

        const imageFile = document.getElementById('restaurantImageInput').files[0];
        let imageUrl = appData.editingRestaurant ? appData.editingRestaurant.image_url : null;

        if (imageFile) {
            saveBtn.textContent = 'جاري رفع الصورة...';
            const filePath = `restaurant-images/${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await supabaseClient.storage.from('app-images').upload(filePath, imageFile);
            if(uploadError) {
                console.error("Upload error", uploadError);
                showToast('خطأ في رفع الصورة: ' + uploadError.message, 'danger');
                saveBtn.disabled = false;
                saveBtn.textContent = 'حفظ';
                return;
            }
            const { data: urlData } = supabaseClient.storage.from('app-images').getPublicUrl(filePath);
            imageUrl = urlData.publicUrl;
        }

        saveBtn.textContent = 'جاري حفظ البيانات...';
        const formData = {
            name: document.getElementById('restaurantName').value,
            logo: document.getElementById('restaurantLogo').value,
            description: document.getElementById('restaurantDescription').value,
            rating: parseFloat(document.getElementById('restaurantRating').value),
            delivery_time: document.getElementById('restaurantDeliveryTime').value,
            category: document.getElementById('restaurantCategory').value,
            bg_color: document.getElementById('restaurantBgColor').value,
            image_url: imageUrl
        };

        let error;
        if (appData.editingRestaurant) {
            const { error: updateError } = await supabaseClient.from('restaurants').update(formData).eq('id', appData.editingRestaurant.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseClient.from('restaurants').insert([formData]);
            error = insertError;
        }

        saveBtn.disabled = false;
        saveBtn.textContent = 'حفظ';

        if (error) {
            console.error('Error saving restaurant:', error);
            showToast('خطأ في حفظ المطعم: ' + error.message, 'danger');
            return;
        }

        await loadInitialData();
        hideModal('restaurantFormModal');
        showToast('تم حفظ المطعم');
        renderRestaurantsManagement();
    });

    document.getElementById('cancelRestaurantForm').addEventListener('click', () => hideModal('restaurantFormModal'));
    document.getElementById('closeRestaurantModal').addEventListener('click', () => hideModal('restaurantFormModal'));

    // Dish form events
    document.getElementById('dishForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!appData.user) {
            showToast('يجب تسجيل الدخول لحفظ التغييرات', 'danger');
            return showView('signIn');
        }

        const saveBtn = this.querySelector('button[type="submit"]');
        saveBtn.disabled = true;
        saveBtn.textContent = 'جاري الحفظ...';

        const restaurant = appData.restaurants.find(r => r.id == appData.selectedRestaurantForDish);
        if (!restaurant) {
            showToast('الرجاء اختيار مطعم أولاً', 'danger');
            saveBtn.disabled = false;
            saveBtn.textContent = 'حفظ';
            return;
        }

        const imageFile = document.getElementById('dishImageInput').files[0];
        let photoUrl = appData.editingDish ? appData.editingDish.photo_url : null;

        if (imageFile) {
            saveBtn.textContent = 'جاري رفع الصورة...';
            const filePath = `dish-images/${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await supabaseClient.storage.from('app-images').upload(filePath, imageFile);
             if(uploadError) {
                console.error("Upload error", uploadError);
                showToast('خطأ في رفع الصورة: ' + uploadError.message, 'danger');
                saveBtn.disabled = false;
                saveBtn.textContent = 'حفظ';
                return;
            }
            const { data: urlData } = supabaseClient.storage.from('app-images').getPublicUrl(filePath);
            photoUrl = urlData.publicUrl;
        }

        saveBtn.textContent = 'جاري حفظ البيانات...';
        const formData = {
            name: document.getElementById('dishName').value,
            price: parseInt(document.getElementById('dishPrice').value),
            description: document.getElementById('dishDescription').value,
            image: document.getElementById('dishImage').value,
            category: document.getElementById('dishCategory').value,
            restaurant_id: restaurant.id,
            photo_url: photoUrl
        };

        let error;
        if (appData.editingDish) {
            const { error: updateError } = await supabaseClient.from('dishes').update(formData).eq('id', appData.editingDish.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseClient.from('dishes').insert([formData]);
            error = insertError;
        }

        saveBtn.disabled = false;
        saveBtn.textContent = 'حفظ';

        if (error) {
            console.error('Error saving dish:', error);
            showToast('خطأ في حفظ الطبق: ' + error.message, 'danger');
            return;
        }

        await loadInitialData();
        renderDishesManagement(appData.selectedRestaurantForDish);
        renderPopularDishes();
        hideModal('dishFormModal');
        showToast('تم حفظ الطبق');
    });

    document.getElementById('cancelDishForm').addEventListener('click', () => hideModal('dishFormModal'));
    document.getElementById('closeDishModal').addEventListener('click', () => hideModal('dishFormModal'));

    // Dish restaurant select change
    document.getElementById('dishRestaurantSelect').addEventListener('change', function() {
        const restaurantId = this.value;
        renderDishesManagement(restaurantId ? parseInt(restaurantId) : null);
    });

    // Cart modal events
    document.getElementById('cartBtn').addEventListener('click', function() {
        showModal('cartModal');
        renderCart();
    });
    document.getElementById('closeCartModal').addEventListener('click', () => hideModal('cartModal'));

    // Checkout events
    document.getElementById('checkoutBtn').addEventListener('click', function() {
        if (appData.cart.length === 0) {
            showToast('السلة فارغة!', 'danger');
            return;
        }
        hideModal('cartModal');
        showModal('checkoutModal');
        document.getElementById('finalTotal').textContent = formatPrice(calculateCartTotal());
    });
    document.getElementById('closeCheckoutModal').addEventListener('click', () => hideModal('checkoutModal'));

    // Payment method change
    document.getElementById('paymentMethod').addEventListener('change', function() {
        const proofSection = document.getElementById('paymentProofSection');
        if (this.value === 'electronic') {
            proofSection.classList.remove('hidden');
            document.getElementById('paymentProof').required = true;
        } else {
            proofSection.classList.add('hidden');
            document.getElementById('paymentProof').required = false;
        }
    });

    // Checkout form submission
    document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const saveBtn = this.querySelector('button[type="submit"]');
        saveBtn.disabled = true;
        saveBtn.textContent = 'جاري إرسال الطلب...';

        const paymentProofFile = document.getElementById('paymentProof').files[0];
        let paymentProofUrl = null;

        if (paymentProofFile) {
            const filePath = `payment-proofs/${Date.now()}-${paymentProofFile.name}`;
            let { error: uploadError } = await supabaseClient.storage.from('app-images').upload(filePath, paymentProofFile);
            if (uploadError) {
                console.error('Error uploading payment proof:', uploadError);
                showToast('خطأ في رفع إثبات الدفع', 'danger');
                saveBtn.disabled = false;
                saveBtn.textContent = 'تأكيد الطلب';
                return;
            }
            const { data: urlData } = supabaseClient.storage.from('app-images').getPublicUrl(filePath);
            paymentProofUrl = urlData.publicUrl;
        }

        const { data, error } = await supabaseClient.functions.invoke('create-customer-and-order', {
            body: {
                name: document.getElementById('customerName').value,
                phone: document.getElementById('customerPhone').value,
                address: document.getElementById('customerAddress').value,
                cart: appData.cart,
                paymentMethod: document.getElementById('paymentMethod').value,
                paymentProofUrl: paymentProofUrl
            }
        })

        saveBtn.disabled = false;
        saveBtn.textContent = 'تأكيد الطلب';

        if (error) {
            console.error('Error creating order:', error);
            showToast('حدث خطأ أثناء إرسال الطلب', 'danger');
            return;
        }

        appData.cart = [];
        updateCartCount();
        hideModal('checkoutModal');
        showModal('successModal');
        this.reset();
        document.getElementById('paymentProofSection').classList.add('hidden');
    });

    // Success modal close
    document.getElementById('closeSuccessModal').addEventListener('click', () => hideModal('successModal'));

    // Confirm delete modal
    document.getElementById('cancelDelete').addEventListener('click', () => hideModal('confirmDeleteModal'));

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            hideModal(e.target.id);
        }
    });
});
