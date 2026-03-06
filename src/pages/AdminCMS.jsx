import React, { useMemo, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Edit3,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MoonStar,
  Package,
  Palette,
  Plus,
  Power,
  Ruler,
  Search,
  Filter,
  CalendarDays,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  SunMedium,
  Trash2,
} from 'lucide-react';
import { uploadProductImage } from '../services/storeService';
import { validateImageFile } from '../services/imgbbService';
import { getOrderDateRange, isWithinDateRange, toDateInputValue } from '../utils/orderDateFilters';

const OrderStatusPill = ({ status, getOrderStatusMeta }) => {
  const meta = getOrderStatusMeta(status);
  return <span className={`text-xs font-black px-3 py-1 rounded-full border ${meta.className}`}>{meta.label}</span>;
};
const ORDER_PERIOD_OPTIONS = [
  { key: 'today', label: '\u0637\u0644\u0628\u064a\u0627\u062a \u0627\u0644\u064a\u0648\u0645' },
  { key: 'yesterday', label: '\u0637\u0644\u0628\u064a\u0627\u062a \u0627\u0644\u0628\u0627\u0631\u062d\u0629' },
  { key: 'week', label: '\u0637\u0644\u0628\u064a\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639' },
  { key: 'month', label: '\u0637\u0644\u0628\u064a\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631' },
  { key: 'all', label: '\u0643\u0644 \u0627\u0644\u0637\u0644\u0628\u064a\u0627\u062a' },
  { key: 'custom', label: '\u0641\u062a\u0631\u0629 \u0645\u062e\u0635\u0635\u0629' },
];

const AdminCMS = ({
  orders,
  setOrders,
  products,
  setProducts,
  siteConfig,
  setSiteConfig,
  onLogout,
  showToast,
  syncStatus,
  adminUser,
  adminTheme,
  setAdminTheme,
  helpers,
}) => {
  const {
    CATEGORIES,
    DEFAULT_PRODUCT_VARIANTS,
    SHOE_SIZES,
    CLOTHING_SIZES,
    COLOR_PRESETS,
    ORDER_STATUSES,
    clampStock,
    normalizeCoupons,
    normalizeCouponCode,
    clampDiscount,
    clampUses,
    normalizeProductVariants,
    isProductOnSale,
    getDiscountPercent,
    buildCartItemKey,
    getOrderStatusMeta,
    PAGE_TRANSITION,
  } = helpers;
  const isCouponExpired = (coupon) =>
    Boolean(coupon?.expiresAt) && new Date(coupon.expiresAt).getTime() < Date.now();
  const isCouponExhausted = (coupon) =>
    (Number(coupon?.usedCount) || 0) >= (Number(coupon?.maxUses) || 0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    oldPrice: '',
    category: CATEGORIES[1],
    image: '',
    stock: 10,
    variants: { ...DEFAULT_PRODUCT_VARIANTS },
  });
  const [productQuery, setProductQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('\u0627\u0644\u0643\u0644');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPeriodFilter, setOrderPeriodFilter] = useState('today');
  const [customDateFrom, setCustomDateFrom] = useState(toDateInputValue(new Date()));
  const [customDateTo, setCustomDateTo] = useState(toDateInputValue(new Date()));
  const [imageUploadState, setImageUploadState] = useState({
    isUploading: false,
    progress: 0,
    error: '',
    success: '',
  });
  const [couponForm, setCouponForm] = useState({ code: '', discount: 10, maxUses: 100, expiresAt: '' });
  const isDarkMode = adminTheme === 'dark';

  const formatMoney = (value) => new Intl.NumberFormat('fr-DZ').format(Number(value) || 0) + ' \u062f.\u062c';
  const formatOrderDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '\u062a\u0627\u0631\u064a\u062e \u063a\u064a\u0631 \u0635\u0627\u0644\u062d';
    return date.toLocaleString('ar-DZ');
  };

  const orderDateRange = useMemo(
    () =>
      getOrderDateRange(orderPeriodFilter, {
        customStart: customDateFrom,
        customEnd: customDateTo,
      }),
    [orderPeriodFilter, customDateFrom, customDateTo],
  );

  const revenue = useMemo(
    () =>
      orders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0),
    [orders],
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => order.status === 'pending').length,
    [orders],
  );

  const deliveredOrdersCount = useMemo(
    () => orders.filter((order) => order.status === 'delivered').length,
    [orders],
  );

  const lowStockProducts = useMemo(
    () => products.filter((product) => clampStock(product.stock) <= 3),
    [products, clampStock],
  );

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();

    return orders
      .filter((order) => {
        const statusOk = orderStatusFilter === 'all' || order.status === orderStatusFilter;
        const customerWilayaName = (order.customer?.wilaya_name || order.customer?.wilaya || '').toLowerCase();
        const customerCommuneName = (order.customer?.commune_name || order.customer?.commune || order.customer?.city || '').toLowerCase();
        const queryOk =
          !query ||
          String(order.id || '').toLowerCase().includes(query) ||
          order.customer?.name?.toLowerCase().includes(query) ||
          order.customer?.phone?.toLowerCase().includes(query) ||
          customerWilayaName.includes(query) ||
          customerCommuneName.includes(query);

        const dateOk =
          orderPeriodFilter === 'all'
            ? true
            : isWithinDateRange(order.date, orderDateRange);

        return statusOk && queryOk && dateOk;
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [orders, orderSearch, orderStatusFilter, orderPeriodFilter, orderDateRange]);

  const filteredOrdersRevenue = useMemo(
    () =>
      filteredOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0),
    [filteredOrders],
  );

  const filteredOrdersPending = useMemo(
    () => filteredOrders.filter((order) => order.status === 'pending').length,
    [filteredOrders],
  );

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products.filter((product) => {
      const queryOk =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      const categoryOk = productCategoryFilter === '\u0627\u0644\u0643\u0644' || product.category === productCategoryFilter;
      return queryOk && categoryOk;
    });
  }, [products, productQuery, productCategoryFilter]);

  const adminCoupons = useMemo(
    () => normalizeCoupons(siteConfig.coupons, siteConfig.couponCode, siteConfig.couponDiscount),
    [siteConfig.coupons, siteConfig.couponCode, siteConfig.couponDiscount, normalizeCoupons],
  );

  const sizeOptions = productForm.variants.sizeType === 'shoes' ? SHOE_SIZES : CLOTHING_SIZES;

  const handleSaveProduct = (event) => {
    event.preventDefault();

    const normalizedVariants = normalizeProductVariants(productForm.variants);

    const normalizedProduct = {
      ...productForm,
      name: productForm.name.trim(),
      image: productForm.image.trim(),
      price: Number(productForm.price) || 0,
      oldPrice: Number(productForm.oldPrice) > 0 ? Number(productForm.oldPrice) : 0,
      stock: clampStock(productForm.stock),
      variants: normalizedVariants,
    };

    if (!normalizedProduct.name || !normalizedProduct.image || normalizedProduct.price <= 0) {
      showToast('أدخل بيانات منتج صحيحة', 'error');
      return;
    }

    if (normalizedProduct.oldPrice > 0 && normalizedProduct.oldPrice <= normalizedProduct.price) {
      showToast('السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي', 'error');
      return;
    }

    if (editingProduct) {
      setProducts(
        products.map((product) =>
          product.id === editingProduct.id ? { ...normalizedProduct, id: editingProduct.id } : product,
        ),
      );
      showToast('تم تعديل المنتج بنجاح');
    } else {
      setProducts([{ ...normalizedProduct, id: Date.now() }, ...products]);
      showToast('تم نشر المنتج الجديد في المتجر');
    }

    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: '',
      oldPrice: '',
      category: CATEGORIES[1],
      image: '',
      stock: 10,
      variants: { ...DEFAULT_PRODUCT_VARIANTS },
    });
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('هل تريد حذف هذا المنتج من المتجر؟')) {
      setProducts(products.filter((product) => product.id !== id));
      showToast('تم حذف المنتج', 'error');
    }
  };


  const handleUploadProductImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file, { maxSizeMb: 8 });
    if (!validation.ok) {
      setImageUploadState({
        isUploading: false,
        progress: 0,
        error: validation.message,
        success: '',
      });
      showToast(validation.message, 'error');
      event.target.value = '';
      return;
    }

    try {
      setImageUploadState({
        isUploading: true,
        progress: 0,
        error: '',
        success: '',
      });

      const imageUrl = await uploadProductImage(file, {
        maxSizeMb: 8,
        onProgress: (progress) =>
          setImageUploadState((previous) => ({
            ...previous,
            progress,
          })),
      });

      setProductForm((prev) => ({ ...prev, image: imageUrl }));
      setImageUploadState({
        isUploading: false,
        progress: 100,
        error: '',
        success: 'تم رفع الصورة بنجاح عبر ImgBB.',
      });
      showToast('تم رفع الصورة عبر ImgBB بنجاح', 'success');
    } catch (error) {
      const message = String(error?.message || 'فشل رفع الصورة. حاول مرة أخرى.');
      setImageUploadState({
        isUploading: false,
        progress: 0,
        error: message,
        success: '',
      });
      showToast(message, 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleCreateCoupon = (event) => {
    event.preventDefault();

    const code = normalizeCouponCode(couponForm.code);
    const discount = clampDiscount(couponForm.discount);
    const maxUses = clampUses(couponForm.maxUses);
    const expiresAt = couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : '';

    if (!code || discount <= 0) {
      showToast('أدخل كود كوبون ونسبة خصم صحيحة', 'error');
      return;
    }

    if (adminCoupons.some((coupon) => normalizeCouponCode(coupon.code) === code)) {
      showToast('هذا الكود موجود مسبقاً', 'error');
      return;
    }

    setSiteConfig({
      ...siteConfig,
      coupons: [
        {
          id: String(Date.now()) + '-' + code,
          code,
          discount,
          maxUses,
          usedCount: 0,
          expiresAt,
        },
        ...adminCoupons,
      ],
    });

    setCouponForm({ code: '', discount: 10, maxUses: 100, expiresAt: '' });
    showToast('تم إنشاء الكوبون بنجاح', 'success');
  };

  const handleDeleteCoupon = (couponId) => {
    setSiteConfig({
      ...siteConfig,
      coupons: adminCoupons.filter((coupon) => coupon.id !== couponId),
    });
    showToast('تم حذف الكوبون', 'error');
  };

  const handleOrderStatusChange = (orderId, nextStatus) => {
    setOrders(
      orders.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order)),
    );
    showToast('تم تحديث حالة الطلب');
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={PAGE_TRANSITION}
      className={`admin-cms ${isDarkMode ? 'admin-theme-dark' : 'bg-gradient-to-br from-slate-100 via-white to-emerald-50/60'} pb-24 md:pb-10 min-h-screen`}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
        body { font-family: 'Tajawal', sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        input, select, button { -webkit-tap-highlight-color: transparent; }
        @keyframes cart-shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          75% { transform: translateX(-1px); }
          100% { transform: translateX(0); }
        }
        .animate-cart-shake { animation: cart-shake 0.38s ease-in-out; }
        @keyframes skeleton-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          animation: skeleton-shimmer 1.2s infinite;
        }
      `}</style>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${isDarkMode ? "border-slate-700/70 bg-slate-900/80" : "border-slate-200/70 bg-white/90"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black admin-title flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" /> لوحة التحكم المركزية
            </h1>
            <p className={`text-xs font-bold mt-1 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} dir="ltr">{adminUser?.email || 'admin'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                siteConfig.isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-orange-50 text-orange-700 border-orange-200'
              }`}
            >
              {siteConfig.isOnline ? 'المتجر مفتوح' : 'وضع الصيانة'}
            </span>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                syncStatus === 'online'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {syncStatus === 'online' ? 'Firebase متصل' : syncStatus === 'syncing' ? 'جاري المزامنة' : 'وضع محلي'}
            </span>
            <div className={`inline-flex items-center rounded-xl border p-1 ${isDarkMode ? 'admin-soft' : 'bg-white border-slate-200'}`}>
              <button
                onClick={() => setAdminTheme('dark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black inline-flex items-center gap-1 transition ${
                  isDarkMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MoonStar size={14} /> وضع ليل
              </button>
              <button
                onClick={() => setAdminTheme('light')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black inline-flex items-center gap-1 transition ${
                  !isDarkMode ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <SunMedium size={14} /> وضع صباح
              </button>
            </div>
            <button
              onClick={() => onLogout()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 transition"
              title="خروج"
            >
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row mt-6 md:mt-8 px-4 md:px-6 gap-6 md:gap-8">
        <aside className="lg:w-72 shrink-0">
          <div className="rounded-3xl border border-slate-200 bg-white/95 backdrop-blur p-3 shadow-sm">
            <div className="rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 text-white p-4 mb-3">
              <div className="flex items-center gap-2 font-black text-sm">
                <Sparkles size={16} /> Dashboard Modern
              </div>
              <p className="text-[11px] text-emerald-50 mt-1">تنقل سريع بين الأقسام الأساسية</p>
            </div>

            <div className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl whitespace-nowrap transition-colors font-bold ${
                  activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard size={18} /> نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl whitespace-nowrap transition-colors font-bold ${
                  activeTab === 'orders' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShoppingCart size={18} /> الطلبات
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl whitespace-nowrap transition-colors font-bold ${
                  activeTab === 'products' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Store size={18} /> المنتجات
              </button>
              <button
                onClick={() => setActiveTab('marketing')}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl whitespace-nowrap transition-colors font-bold ${
                  activeTab === 'marketing' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Megaphone size={18} /> التسويق
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl whitespace-nowrap transition-colors font-bold ${
                  activeTab === 'settings' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings size={18} /> الإعدادات
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 w-full overflow-hidden">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-black text-slate-900 mb-6">الإحصائيات الرئيسية</h2>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-50 p-5 rounded-3xl border border-gray-100">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                    <Package size={20} />
                  </div>
                  <p className="text-sm font-bold text-gray-500 mb-1">الطلبات</p>
                  <p className="text-2xl font-black">{orders.length}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-gray-100">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center mb-3">
                    <ShoppingCart size={20} />
                  </div>
                  <p className="text-sm font-bold text-gray-500 mb-1">قيد المعالجة</p>
                  <p className="text-2xl font-black">{pendingOrdersCount}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-gray-100">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mb-3">
                    <CheckCircle size={20} />
                  </div>
                  <p className="text-sm font-bold text-gray-500 mb-1">تم التسليم</p>
                  <p className="text-2xl font-black">{deliveredOrdersCount}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-gray-100">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                    <CreditCard size={20} />
                  </div>
                  <p className="text-sm font-bold text-gray-500 mb-1">الإيرادات</p>
                  <p className="text-xl font-black text-emerald-600">{revenue} د.ج</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-gray-100">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-3">
                    <AlertTriangle size={20} />
                  </div>
                  <p className="text-sm font-bold text-gray-500 mb-1">مخزون منخفض</p>
                  <p className="text-2xl font-black">{lowStockProducts.length}</p>
                </div>
              </div>
              <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <p className="font-black text-slate-900 mb-2">عرض الطلبات أصبح في قسم مستقل</p>
                <p className="text-sm font-bold text-gray-500 mb-4">اضغط على تبويب "الطلبات" لإدارة جميع الطلبات بالتفصيل.</p>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-black"
                >
                  <ShoppingCart size={16} /> فتح قسم الطلبات
                </button>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2"><CalendarDays size={22} />{'\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0637\u0644\u0628\u064a\u0627\u062a'}</h2>
                <div className="text-sm font-bold text-gray-500">{filteredOrders.length} طلب</div>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {ORDER_PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setOrderPeriodFilter(option.key)}
                    className={
                      'px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition ' +
                      (orderPeriodFilter === option.key
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50')
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {orderPeriodFilter === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{'\u0645\u0646 \u062a\u0627\u0631\u064a\u062e'}</label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(event) => setCustomDateFrom(event.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{'\u0625\u0644\u0649 \u062a\u0627\u0631\u064a\u062e'}</label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(event) => setCustomDateTo(event.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder={'\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0647\u0627\u062a\u0641 \u0623\u0648 \u0627\u0644\u0648\u0644\u0627\u064a\u0629'}
                    className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-4 py-3 font-bold outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <div className="relative">
                  <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={orderStatusFilter}
                    onChange={(event) => setOrderStatusFilter(event.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-3 py-3 font-bold outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="all">{'\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a'}</option>
                    {ORDER_STATUSES.map((status) => (
                      <option value={status.key} key={status.key}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">{'\u0639\u062f\u062f \u0627\u0644\u0637\u0644\u0628\u064a\u0627\u062a'}</p>
                  <p className="text-xl font-black text-slate-900">{filteredOrders.length}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold text-amber-700">{'\u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629'}</p>
                  <p className="text-xl font-black text-amber-800">{filteredOrdersPending}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 col-span-2">
                  <p className="text-xs font-bold text-emerald-700">{'\u0642\u064a\u0645\u0629 \u0627\u0644\u0637\u0644\u0628\u064a\u0627\u062a'}</p>
                  <p className="text-xl font-black text-emerald-800">{formatMoney(filteredOrdersRevenue)}</p>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 font-bold">
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900 text-lg">{order.customer.name}</p>
                          <p className="text-sm text-gray-500 font-bold">{order.customer.wilaya_name || order.customer.wilaya} • {order.customer.commune_name || order.customer.commune || order.customer.city}</p>
                          <p className="text-sm text-gray-500 font-bold">{order.customer.phone}</p>
                          <p className="text-xs text-gray-400 mt-1">#{String(order.id).slice(-6)} • {formatOrderDate(order.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(event) => handleOrderStatusChange(order.id, event.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold outline-none"
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status.key} value={status.key}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                          <OrderStatusPill status={order.status} getOrderStatusMeta={getOrderStatusMeta} />
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                        <p className="text-xs font-black text-gray-500 mb-2">المنتجات</p>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={`${order.id}-${item.cartKey || buildCartItemKey(item)}`} className="flex items-center justify-between text-sm font-bold text-slate-700">
                              <span>
                                {item.name}
                                {(item.selectedSize || item.selectedColor) && (
                                  <span className="text-[10px] text-slate-500 mr-2">
                                    {item.selectedSize ? 'مقاس: ' + item.selectedSize : ''}
                                    {item.selectedSize && item.selectedColor ? ' | ' : ''}
                                    {item.selectedColor ? 'لون: ' + item.selectedColor : ''}
                                  </span>
                                )}
                              </span>
                              <span>x{item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
                        <span className="text-gray-500">فرعي: {order.subtotal} د.ج</span>
                        {order.discount > 0 && <span className="text-emerald-600">خصم: -{order.discount} د.ج</span>}
                        {order.couponCode && <span className="text-gray-500" dir="ltr">{order.couponCode}</span>}
                        <span className="text-slate-900">الإجمالي: {order.totalPrice} د.ج</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900">إدارة المنتجات والمخزون</h2>
                <button
                  onClick={() => {
                    setProductForm({
                      name: '',
                      price: '',
                      oldPrice: '',
                      category: CATEGORIES[1],
                      image: '',
                      stock: 10,
                      variants: { ...DEFAULT_PRODUCT_VARIANTS },
                    });
                    setEditingProduct(null);
                    setImageUploadState({ isUploading: false, progress: 0, error: '', success: '' });
                                setShowProductForm(true);
                  }}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"
                >
                  <Plus size={18} /> إضافة منتج
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder={'\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c...'}
                  className="md:col-span-2 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <select
                  value={productCategoryFilter}
                  onChange={(event) => setProductCategoryFilter(event.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {showProductForm ? (                <form onSubmit={handleSaveProduct} className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-gray-200">
                  <h3 className="font-black text-xl mb-6">{editingProduct ? 'تعديل المنتج' : 'نشر منتج جديد'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold mb-2">اسم المنتج</label>
                      <input
                        required
                        type="text"
                        value={productForm.name}
                        onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">القسم</label>
                      <select
                        required
                        value={productForm.category}
                        onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                      >
                        {CATEGORIES.filter((category) => category !== 'الكل').map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-bold mb-2">السعر الحالي (د.ج)</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={productForm.price}
                        onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">السعر قبل الخصم (اختياري)</label>
                      <input
                        type="number"
                        min="0"
                        value={productForm.oldPrice}
                        onChange={(event) => setProductForm({ ...productForm, oldPrice: event.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">المخزون</label>
                      <input
                        required
                        type="number"
                        min="0"
                        value={productForm.stock}
                        onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-bold mb-2">رابط الصورة (URL)</label>
                      <input
                        required
                        type="url"
                        dir="ltr"
                        value={productForm.image}
                        onChange={(event) => setProductForm({ ...productForm, image: event.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                      />
                      <label className="block text-xs font-bold text-gray-500 mt-3 mb-2">أو ارفع صورة مباشرة عبر ImgBB</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadProductImage}
                        disabled={imageUploadState.isUploading}
                        className="w-full p-2 rounded-xl border border-dashed border-gray-300 bg-white text-xs font-bold"
                      />
                      <p className="text-[11px] text-slate-500 font-bold mt-1">
                        يتطلب المتغير `VITE_IMGBB_API_KEY` في `.env` (الحد الأقصى 8MB).
                      </p>
                      {imageUploadState.isUploading && (
                        <div className="mt-2">
                          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${imageUploadState.progress}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] font-black text-emerald-700">
                            جاري الرفع... {imageUploadState.progress}%
                          </p>
                        </div>
                      )}
                      {imageUploadState.error && (
                        <p className="mt-1 text-[11px] font-black text-red-600">{imageUploadState.error}</p>
                      )}
                      {imageUploadState.success && !imageUploadState.isUploading && (
                        <p className="mt-1 text-[11px] font-black text-emerald-600">{imageUploadState.success}</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
                      <p className="font-black text-sm">السمات الديناميكية</p>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold inline-flex items-center gap-1"><Ruler size={14} /> تفعيل المقاسات</label>
                        <input
                          type="checkbox"
                          checked={productForm.variants.enableSizes}
                          onChange={(event) => {
                            const enabled = event.target.checked;
                            setProductForm({
                              ...productForm,
                              variants: {
                                ...productForm.variants,
                                enableSizes: enabled,
                                sizes: enabled ? productForm.variants.sizes : [],
                              },
                            });
                          }}
                          className="w-5 h-5 accent-emerald-500"
                        />
                      </div>

                      {productForm.variants.enableSizes && (
                        <div className="space-y-2">
                          <select
                            value={productForm.variants.sizeType}
                            onChange={(event) =>
                              setProductForm({
                                ...productForm,
                                variants: {
                                  ...productForm.variants,
                                  sizeType: event.target.value,
                                  sizes: [],
                                },
                              })
                            }
                            className="w-full p-2 rounded-lg border border-gray-300 text-sm font-bold"
                          >
                            <option value="clothing">مقاسات ملابس (S-XXL)</option>
                            <option value="shoes">مقاسات أحذية (37-45)</option>
                          </select>

                          <div className="flex flex-wrap gap-2">
                            {sizeOptions.map((size) => {
                              const isActive = productForm.variants.sizes.includes(size);
                              return (
                                <button
                                  type="button"
                                  key={size}
                                  onClick={() => {
                                    const nextSizes = isActive
                                      ? productForm.variants.sizes.filter((entry) => entry !== size)
                                      : [...productForm.variants.sizes, size];
                                    setProductForm({
                                      ...productForm,
                                      variants: { ...productForm.variants, sizes: nextSizes },
                                    });
                                  }}
                                  className={`px-2 py-1 rounded-md border text-xs font-black ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300'}`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold inline-flex items-center gap-1"><Palette size={14} /> تفعيل الألوان</label>
                        <input
                          type="checkbox"
                          checked={productForm.variants.enableColors}
                          onChange={(event) => {
                            const enabled = event.target.checked;
                            setProductForm({
                              ...productForm,
                              variants: {
                                ...productForm.variants,
                                enableColors: enabled,
                                colors: enabled ? productForm.variants.colors : [],
                              },
                            });
                          }}
                          className="w-5 h-5 accent-emerald-500"
                        />
                      </div>

                      {productForm.variants.enableColors && (
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map((colorEntry) => {
                            const isActive = productForm.variants.colors.includes(colorEntry.name);
                            return (
                              <button
                                type="button"
                                key={colorEntry.name}
                                onClick={() => {
                                  const nextColors = isActive
                                    ? productForm.variants.colors.filter((entry) => entry !== colorEntry.name)
                                    : [...productForm.variants.colors, colorEntry.name];
                                  setProductForm({
                                    ...productForm,
                                    variants: { ...productForm.variants, colors: nextColors },
                                  });
                                }}
                                className={`px-2 py-1 rounded-md border text-xs font-black inline-flex items-center gap-1 ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300'}`}
                              >
                                <span className="w-3 h-3 rounded-full border border-white/50" style={{ backgroundColor: colorEntry.hex }} />
                                {colorEntry.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-xl shadow-md">
                      {editingProduct ? 'حفظ التعديلات' : 'نشر المنتج'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="px-6 bg-white border border-gray-300 text-gray-600 font-bold rounded-xl"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => {
                    const stock = clampStock(product.stock);
                    return (
                      <div key={product.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm group">
                        <img src={product.image} loading="lazy" decoding="async" className="w-full h-40 object-cover bg-gray-50" alt={product.name} />
                        <div className="p-4">
                          <p className="font-bold text-sm truncate mb-1">{product.name}</p>
                          <p className="font-black text-emerald-600 mb-1">{product.price} د.ج</p>
                          <p
                            className={`text-xs font-black mb-4 ${
                              stock === 0 ? 'text-red-600' : stock <= 3 ? 'text-orange-600' : 'text-gray-500'
                            }`}
                          >
                            المخزون: {stock}
                          </p>
                          <div className="mb-3 flex flex-wrap gap-1">
                            {normalizeProductVariants(product.variants).enableSizes && (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-black">مقاسات</span>
                            )}
                            {normalizeProductVariants(product.variants).enableColors && (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-black">ألوان</span>
                            )}
                            {isProductOnSale(product) && (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-rose-50 text-rose-700 font-black">خصم {getDiscountPercent(product)}%</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setProductForm({
                                  ...product,
                                  stock: clampStock(product.stock),
                                  oldPrice: Number(product.oldPrice) > 0 ? product.oldPrice : '',
                                  variants: normalizeProductVariants(product.variants),
                                });
                                setEditingProduct(product);
                                setImageUploadState({ isUploading: false, progress: 0, error: '', success: '' });
                                setShowProductForm(true);
                              }}
                              className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <Edit3 size={14} /> تعديل
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="bg-red-50 text-red-600 p-2 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in max-w-2xl">
              <h2 className="text-2xl font-black text-slate-900 mb-6">{'\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629'}</h2>

              <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-[2rem] space-y-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{'\u0627\u0633\u0645 \u0627\u0644\u0645\u062a\u062c\u0631'}</label>
                  <input
                    type="text"
                    value={siteConfig.name}
                    onChange={(event) => setSiteConfig({ ...siteConfig, name: event.target.value })}
                    className="w-full p-4 rounded-xl border border-gray-300 font-black text-lg outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{'\u0631\u0642\u0645 \u0648\u0627\u062a\u0633\u0627\u0628 \u0627\u0644\u0645\u062a\u062c\u0631'}</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={siteConfig.whatsappNumber || ''}
                    onChange={(event) => setSiteConfig({ ...siteConfig, whatsappNumber: event.target.value })}
                    placeholder="213555000000"
                    className="w-full p-4 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                  />
                  <p className="text-xs font-bold text-gray-500 mt-2">{'\u0633\u064a\u0638\u0647\u0631 \u0641\u064a \u0627\u0644\u0632\u0631 \u0627\u0644\u0639\u0627\u0626\u0645 \u0644\u0644\u062a\u0648\u0627\u0635\u0644 \u0639\u0628\u0631 \u0648\u0627\u062a\u0633\u0627\u0628.'}</p>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700">{'\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u062a\u062c\u0631 (\u0625\u063a\u0644\u0627\u0642 / \u0641\u062a\u062d)'}</label>
                    <span className={
                      'px-3 py-1 rounded-full text-xs font-bold ' +
                      (siteConfig.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700')
                    }>
                      {siteConfig.isOnline ? '\u0646\u0634\u0637 \u0627\u0644\u0622\u0646' : '\u0645\u063a\u0644\u0642 \u0644\u0644\u0635\u064a\u0627\u0646\u0629'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSiteConfig({ ...siteConfig, isOnline: !siteConfig.isOnline });
                      showToast(siteConfig.isOnline ? '\u062a\u0645 \u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0645\u062a\u062c\u0631 \u0644\u0644\u0632\u0628\u0627\u0626\u0646' : '\u062a\u0645 \u0641\u062a\u062d \u0627\u0644\u0645\u062a\u062c\u0631 \u0644\u0644\u0632\u0628\u0627\u0626\u0646');
                    }}
                    className={
                      'w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all ' +
                      (siteConfig.isOnline
                        ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
                        : 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600')
                    }
                  >
                    <Power size={20} /> {siteConfig.isOnline ? '\u062a\u0641\u0639\u064a\u0644 \u0648\u0636\u0639 \u0627\u0644\u0635\u064a\u0627\u0646\u0629' : '\u0641\u062a\u062d \u0627\u0644\u0645\u062a\u062c\u0631'}
                  </button>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{'\u0625\u0638\u0647\u0627\u0631 \u062d\u0642\u0644 \u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u0644\u0644\u0639\u0645\u064a\u0644'}</p>
                      <p className="text-xs font-bold text-gray-500 mt-1">{'\u064a\u0645\u0643\u0646\u0643 \u0625\u062e\u0641\u0627\u0621 \u062d\u0642\u0644 \u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u0645\u0624\u0642\u062a\u0627\u064b \u0645\u0639 \u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0628\u0627\u0644\u0645\u0646\u0637\u0642 \u0627\u0644\u062f\u0627\u062e\u0644\u064a.'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSiteConfig({ ...siteConfig, showCouponInput: !siteConfig.showCouponInput })}
                      className={
                        'px-3 py-2 rounded-xl text-xs font-black border transition ' +
                        (siteConfig.showCouponInput
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200')
                      }
                    >
                      {siteConfig.showCouponInput ? '\u0638\u0627\u0647\u0631 \u062d\u0627\u0644\u064a\u0627\u064b' : '\u0645\u062e\u0641\u064a \u062d\u0627\u0644\u064a\u0627\u064b'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-6 animate-in fade-in max-w-3xl">
              <h2 className="text-2xl font-black text-slate-900 mb-6">التسويق والإعلانات</h2>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2rem] text-white shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Megaphone size={32} className="text-emerald-100" />
                  <h3 className="text-xl font-black">شريط الإعلانات العلوي</h3>
                </div>

                <input
                  type="text"
                  value={siteConfig.announcement}
                  onChange={(event) => setSiteConfig({ ...siteConfig, announcement: event.target.value })}
                  placeholder="مثال: توصيل مجاني هذا الأسبوع"
                  className="w-full p-4 rounded-xl bg-white/20 border border-white/30 text-white placeholder-emerald-200 font-bold outline-none focus:bg-white/30 transition-all mb-4"
                />

                <div className="flex gap-3">
                  <button onClick={() => showToast('تم تحديث شريط الإعلانات')} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black shadow-lg">
                    حفظ الإعلان
                  </button>
                  <button
                    onClick={() => {
                      setSiteConfig({ ...siteConfig, announcement: '' });
                      showToast('تم إخفاء الإعلان');
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all border border-white/20"
                  >
                    إخفاء الإعلان
                  </button>
                </div>
              </div>

                            <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-[2rem] space-y-6">
                <h3 className="text-xl font-black text-slate-900">كوبونات الخصم المتقدمة</h3>

                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">رمز الكوبون</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={couponForm.code}
                      onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })}
                      placeholder="WELCOME10"
                      className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نسبة الخصم %</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={couponForm.discount}
                      onChange={(event) => setCouponForm({ ...couponForm, discount: clampDiscount(event.target.value) })}
                      className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">عدد الاستخدامات المسموحة</label>
                    <input
                      type="number"
                      min="1"
                      value={couponForm.maxUses}
                      onChange={(event) => setCouponForm({ ...couponForm, maxUses: clampUses(event.target.value) })}
                      className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الانتهاء (اختياري)</label>
                    <input
                      type="date"
                      value={couponForm.expiresAt}
                      onChange={(event) => setCouponForm({ ...couponForm, expiresAt: event.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-300 font-bold outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-3">
                    <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black shadow-lg">
                      إنشاء كوبون
                    </button>
                    <button
                      type="button"
                      onClick={() => setCouponForm({ code: '', discount: 10, maxUses: 100, expiresAt: '' })}
                      className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold"
                    >
                      تفريغ الحقول
                    </button>
                  </div>
                </form>

                {adminCoupons.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm font-bold text-gray-400">
                    لا توجد كوبونات مضافة حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adminCoupons.map((coupon) => {
                      const expired = isCouponExpired(coupon);
                      const exhausted = isCouponExhausted(coupon);
                      return (
                        <div key={coupon.id} className="rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-black text-slate-900" dir="ltr">{coupon.code}</p>
                            <p className="text-xs font-bold text-gray-500">خصم {coupon.discount}% • الاستخدام {coupon.usedCount}/{coupon.maxUses}</p>
                            {coupon.expiresAt && (
                              <p className="text-xs font-bold text-gray-500">ينتهي: {new Date(coupon.expiresAt).toLocaleDateString('ar-DZ')}</p>
                            )}
                            <p className={`text-xs font-black ${expired || exhausted ? 'text-red-600' : 'text-emerald-600'}`}>
                              {expired ? 'منتهي الصلاحية' : exhausted ? 'نفد الاستخدام' : 'فعّال'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold"
                          >
                            حذف
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Motion.div>
  );
};
export default AdminCMS;


