// متغيرات عامة
let cart = [];
let user = null;
let deferredPrompt;
let adminPhoneNumber = ""; 
let sliderInterval; // متغير لحفظ توقيت السلايدر

const firebaseConfig = {
    apiKey: "AIzaSyDX0esBRiQ4MuyvWH_s2UZ2kJpA9GryDgE",
    authDomain: "tttttt-48c2e.firebaseapp.com",
    databaseURL: "https://tttttt-48c2e-default-rtdb.firebaseio.com",
    projectId: "tttttt-48c2e",
    storageBucket: "tttttt-48c2e.firebasestorage.app",
    messagingSenderId: "982883301644",
    appId: "1:982883301644:web:7b1676215cb4f0fe7c7129",
    measurementId: "G-QLCYC16T20"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. جلب إعدادات المتجر (الاسم + واتساب) وتحديثها فوراً
    db.ref('settings').on('value', snapshot => {
        const s = snapshot.val();
        if(s) {
            // تحديث اسم المتجر
            if(s.storeName) {
                const formattedName = `<span class="store-text" style="color:#fff">${s.storeName.charAt(0)}</span>${s.storeName.substring(1)}`;
                const headerDisplay = document.getElementById('store-name-display');
                if(headerDisplay) headerDisplay.innerHTML = formattedName;
                const splashTitle = document.getElementById('splash-title');
                if(splashTitle) splashTitle.innerText = s.storeName;
            }
            // تحديث رقم الواتساب
            if(s.whatsapp) {
                adminPhoneNumber = s.whatsapp;
            }
        }
    });

    // 2. جلب الفئات
    db.ref('categories').on('value', snapshot => {
        const catContainer = document.getElementById('dynamic-categories');
        const data = snapshot.val();
        catContainer.innerHTML = `<div class="category-item" onclick="filterProducts('all')"><div class="cat-box active"><div class="square-icon"></div></div><span class="cat-name">الكل</span></div>`;
        
        if(data) {
            Object.values(data).forEach(cat => {
                catContainer.innerHTML += `
                <div class="category-item" onclick="filterProducts('${cat.id}')">
                    <div class="cat-box"><img src="${cat.image}" class="cat-img"></div>
                    <span class="cat-name">${cat.name}</span>
                </div>`;
            });
        }
    });

    // 3. جلب البنرات وعمل حركة تلقائية (Silder)
    db.ref('banners').on('value', snapshot => {
        const slider = document.getElementById('dynamic-slider');
        const data = snapshot.val();
        
        slider.innerHTML = "";
        if(sliderInterval) clearInterval(sliderInterval);

        if(data) {
            const banners = Object.values(data);
            banners.forEach(b => {
                slider.innerHTML += `<img src="${b.image}" alt="${b.title || 'Offer'}">`;
            });

            // كود الحركة التلقائية
            let currentIndex = 0;
            const totalSlides = banners.length;

            if(totalSlides > 1) {
                sliderInterval = setInterval(() => {
                    currentIndex = (currentIndex + 1) % totalSlides;
                    slider.style.transform = `translateX(-${currentIndex * 100}%)`;
                }, 3000); // يتحرك كل 3 ثواني
            }
        } else {
            slider.innerHTML = '<img src="https://via.placeholder.com/800x450?text=Welcome" style="width:100%; height:100%; object-fit:cover">';
        }
    });

    // إخفاء شاشة التحميل
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => splash.style.display = 'none', 500);
        if(!localStorage.getItem('visited')) { showPage('login-page'); localStorage.setItem('visited', 'true'); }
    }, 2000);

    // PWA Logic
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('install-banner').style.display = 'flex'; });
    document.getElementById('install-btn').addEventListener('click', async () => {
        if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; document.getElementById('install-banner').style.display = 'none'; }
    });
    document.getElementById('close-install').addEventListener('click', () => document.getElementById('install-banner').style.display = 'none');
    
    // جلب المنتجات
    db.ref('products').on('value', (snapshot) => {
        const container = document.getElementById('products-container');
        container.innerHTML = "";
        const data = snapshot.val();
        if (!data) { container.innerHTML = "<p style='width:200%; text-align:center;'>لا توجد منتجات</p>"; return; }
        const products = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
        products.forEach(prod => {
            const safeTitle = prod.title ? prod.title.replace(/'/g, "&apos;") : "";
            const safeDesc = prod.description ? prod.description.replace(/'/g, "&apos;").replace(/\n/g, "<br>") : "";
            const card = `
            <div class="product-card" data-category="${prod.category || 'general'}" onclick="openProductPage('${prod.id}', '${safeTitle}', ${prod.price}, '${prod.image}', '${safeDesc}')">
                <span class="discount-badge">جديد</span>
                <img src="${prod.image}" class="prod-img" loading="lazy">
                <div class="prod-details">
                    <div class="prod-title">${prod.title}</div>
                    <div class="price-row">
                        <span class="price">${Number(prod.price).toLocaleString()} د.ع</span>
                        <button class="add-cart-btn"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>`;
            container.innerHTML += card;
        });
    });
});

// التنقل والصفحات
window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.getElementById(pageId).classList.add('active-page');
    window.scrollTo(0,0);
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if(pageId === 'home-page') document.querySelector('.nav-item:nth-child(1)').classList.add('active');
    if(pageId === 'cart-page') document.querySelector('.nav-item:nth-child(2)').classList.add('active');
    if(pageId === 'profile-page') document.querySelector('.nav-item:nth-child(3)').classList.add('active');
}
window.goBack = function() { showPage('home-page'); }

// التفاصيل والسلة
window.openProductPage = function(id, title, price, img, desc) {
    document.getElementById('detail-title').innerText = title;
    document.getElementById('detail-price').innerText = Number(price).toLocaleString() + " د.ع";
    document.getElementById('detail-img').src = img;
    document.querySelector('.detail-desc p').innerHTML = desc || "لا يوجد وصف";
    showPage('product-page');
}
window.addToCartFromDetail = function() {
    const title = document.getElementById('detail-title').innerText;
    const price = parseInt(document.getElementById('detail-price').innerText.replace(/[^0-9]/g, ''));
    const img = document.getElementById('detail-img').src;
    addToCart(title, price, img);
    goBack();
}
window.addToCart = function(title, price, img) {
    cart.push({ title, price, img });
    updateCartUI();
    showToast("تمت الإضافة للسلة!");
}
function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    if(cart.length === 0) { list.innerHTML = '<div class="empty-cart-msg">السلة فارغة</div>'; totalEl.innerText = "0 د.ع"; return; }
    let html = '', total = 0;
    cart.forEach((item, index) => {
        total += item.price;
        html += `<div class="cart-item"><img src="${item.img}"><div class="cart-info"><h4>${item.title}</h4><div class="item-price">${item.price.toLocaleString()} د.ع</div></div><button class="delete-btn" onclick="removeFromCart(${index})"><i class="fa-solid fa-trash"></i></button></div>`;
    });
    list.innerHTML = html;
    totalEl.innerText = total.toLocaleString() + " د.ع";
}
window.removeFromCart = function(index) { cart.splice(index, 1); updateCartUI(); }
window.clearCart = function() { cart = []; updateCartUI(); }

// إرسال الطلب
window.processCheckout = function() {
    if(cart.length === 0) return showToast("السلة فارغة!");
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const address = document.getElementById('order-address').value;
    
    if(!name || !phone || !address) return showToast("يرجى ملء جميع البيانات");
    
    let total = 0; cart.forEach(c => total += c.price);
    const orderData = { customerName: name, phone: phone, address: address, items: cart, total: total.toLocaleString() + " د.ع", timestamp: firebase.database.ServerValue.TIMESTAMP };

    db.ref('orders').push(orderData).then(() => {
        showToast("تم إرسال طلبك بنجاح!");
        clearCart();
        setTimeout(() => showPage('home-page'), 2000);
    });
}

// جوجل والبروفايل
window.handleGoogleLogin = function() {
    showToast("جاري الاتصال...");
    setTimeout(() => { user = { name: "مستخدم", email: "user@gmail.com", avatar: "https://via.placeholder.com/80" }; updateProfileUI(); showPage('home-page'); }, 1500);
}
function updateProfileUI() {
    if(user) {
        document.getElementById('profile-name').innerText = user.name;
        document.getElementById('profile-email').innerText = user.email;
        document.getElementById('profile-img').src = user.avatar;
    }
}
window.openWhatsAppSupport = function() {
    if (adminPhoneNumber) window.open(`https://wa.me/${adminPhoneNumber}`, '_blank');
    else showToast("رقم الخدمة غير متوفر");
}
function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    toast.innerText = msg; toast.classList.add('show-toast');
    setTimeout(() => toast.classList.remove('show-toast'), 2000);
}
// القوائم
window.toggleSidebar = function() { document.getElementById('sidebar').classList.toggle('active'); document.getElementById('sidebar-overlay').classList.toggle('active'); }
document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
document.getElementById('close-sidebar').addEventListener('click', toggleSidebar);
document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);

// الفلترة
window.filterProducts = function(cat) {
    const cards = document.querySelectorAll('.product-card');
    document.querySelectorAll('.cat-box').forEach(b => b.classList.remove('active'));
    event.currentTarget.querySelector('.cat-box').classList.add('active');
    cards.forEach(card => {
        if(cat === 'all' || card.dataset.category === cat) card.style.display = 'flex';
        else card.style.display = 'none';
    });
}

