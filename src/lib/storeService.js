import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, hasFirebaseConfig } from './firebase';

const STORE_COLLECTION = 'store_data';
const STORE_DOCS = {
  products: 'products',
  orders: 'orders',
  siteConfig: 'site_config',
};

const normalizeCouponCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

const getStoreDocRef = (docKey) => doc(db, STORE_COLLECTION, docKey);

const readRemotePart = async (docKey, fallback) => {
  if (!hasFirebaseConfig || !db) return fallback;

  try {
    const snapshot = await getDoc(getStoreDocRef(docKey));
    if (!snapshot.exists()) return fallback;

    const payload = snapshot.data()?.value;
    return payload ?? fallback;
  } catch {
    return fallback;
  }
};

const writeRemotePart = async (docKey, value) => {
  if (!hasFirebaseConfig || !db) return;

  await setDoc(
    getStoreDocRef(docKey),
    {
      value,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

const loadStoreBundle = async ({ products, orders, siteConfig }) => {
  const [remoteProducts, remoteOrders, remoteSiteConfig] = await Promise.all([
    readRemotePart(STORE_DOCS.products, products),
    readRemotePart(STORE_DOCS.orders, orders),
    readRemotePart(STORE_DOCS.siteConfig, siteConfig),
  ]);

  return {
    products: remoteProducts,
    orders: remoteOrders,
    siteConfig: remoteSiteConfig,
  };
};

const saveProductsRemote = async (products) => writeRemotePart(STORE_DOCS.products, products);
const saveOrdersRemote = async (orders) => writeRemotePart(STORE_DOCS.orders, orders);
const saveSiteConfigRemote = async (siteConfig) => writeRemotePart(STORE_DOCS.siteConfig, siteConfig);

const verifyCouponFromRemote = async (couponCode) => {
  const normalizedCode = normalizeCouponCode(couponCode);
  if (!normalizedCode || !hasFirebaseConfig || !db) {
    return { ok: false, reason: 'unavailable' };
  }

  const siteConfig = await readRemotePart(STORE_DOCS.siteConfig, {});
  const coupons = Array.isArray(siteConfig?.coupons) ? siteConfig.coupons : [];
  const matchedCoupon = coupons.find((coupon) => normalizeCouponCode(coupon?.code) === normalizedCode);

  if (!matchedCoupon) {
    return { ok: false, reason: 'not_found' };
  }

  const isExpired = Boolean(matchedCoupon?.expiresAt) && new Date(matchedCoupon.expiresAt).getTime() < Date.now();
  if (isExpired) {
    return { ok: false, reason: 'expired', coupon: matchedCoupon };
  }

  const maxUses = Number(matchedCoupon?.maxUses) || 0;
  const usedCount = Number(matchedCoupon?.usedCount) || 0;
  if (maxUses > 0 && usedCount >= maxUses) {
    return { ok: false, reason: 'exhausted', coupon: matchedCoupon };
  }

  return { ok: true, coupon: matchedCoupon };
};

const consumeCouponUsageRemote = async ({ couponCode, couponId }) => {
  if (!hasFirebaseConfig || !db) return { ok: true, skipped: true };

  const normalizedCode = normalizeCouponCode(couponCode);
  if (!normalizedCode && !couponId) return { ok: true, skipped: true };

  const siteConfigRef = getStoreDocRef(STORE_DOCS.siteConfig);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(siteConfigRef);
    const currentValue = snapshot.exists() ? snapshot.data()?.value || {} : {};
    const coupons = Array.isArray(currentValue?.coupons) ? currentValue.coupons : [];

    const couponIndex = coupons.findIndex((coupon) => {
      const byId = couponId && coupon?.id === couponId;
      const byCode = normalizedCode && normalizeCouponCode(coupon?.code) === normalizedCode;
      return byId || byCode;
    });

    if (couponIndex < 0) {
      throw new Error('COUPON_NOT_FOUND');
    }

    const coupon = coupons[couponIndex];
    const isExpired = Boolean(coupon?.expiresAt) && new Date(coupon.expiresAt).getTime() < Date.now();
    if (isExpired) {
      throw new Error('COUPON_EXPIRED');
    }

    const maxUses = Number(coupon?.maxUses) || 0;
    const usedCount = Number(coupon?.usedCount) || 0;
    if (maxUses > 0 && usedCount >= maxUses) {
      throw new Error('COUPON_EXHAUSTED');
    }

    const nextCoupons = [...coupons];
    nextCoupons[couponIndex] = { ...coupon, usedCount: usedCount + 1 };

    transaction.set(
      siteConfigRef,
      {
        value: { ...currentValue, coupons: nextCoupons },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true, coupon: nextCoupons[couponIndex] };
  });
};

const uploadProductImage = async (file) => {
  if (!(file instanceof File)) {
    throw new Error('A valid image file is required');
  }

  const imgbbApiKey = import.meta.env.VITE_IMGBB_API_KEY?.trim();
  if (!imgbbApiKey) {
    throw new Error('ImgBB API key is missing. Set VITE_IMGBB_API_KEY');
  }

  const formData = new FormData();
  formData.append('image', file);
  formData.append('name', `${Date.now()}-${file.name}`.replace(/\s+/g, '-').toLowerCase());

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ImgBB upload failed with status ${response.status}`);
  }

  const payload = await response.json();
  const imageUrl = payload?.data?.url;

  if (!payload?.success || !imageUrl) {
    throw new Error(payload?.error?.message || 'ImgBB did not return image URL');
  }

  return imageUrl;
};

export {
  consumeCouponUsageRemote,
  hasFirebaseConfig,
  loadStoreBundle,
  saveOrdersRemote,
  saveProductsRemote,
  saveSiteConfigRemote,
  uploadProductImage,
  verifyCouponFromRemote,
};
