import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, hasFirebaseConfig } from './firebase';

const STORE_COLLECTION = 'store_data';
const STORE_DOCS = {
  products: 'products',
  orders: 'orders',
  siteConfig: 'site_config',
  coupons: 'coupons',
};

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

const normalizeCouponCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

const clampDiscount = (value) => Math.min(90, Math.max(0, Number(value) || 0));
const clampUses = (value) => Math.max(1, Number(value) || 1);

const normalizeCouponsPayload = (coupons) =>
  (Array.isArray(coupons) ? coupons : [])
    .map((coupon, index) => {
      const code = normalizeCouponCode(coupon?.code);
      if (!code) return null;

      const expiresAt = coupon?.expiresAt ? new Date(coupon.expiresAt).toISOString() : '';
      return {
        id: coupon?.id || `${Date.now()}-${index}-${code}`,
        code,
        discount: clampDiscount(coupon?.discount),
        maxUses: clampUses(coupon?.maxUses),
        usedCount: Math.max(0, Number(coupon?.usedCount) || 0),
        expiresAt,
      };
    })
    .filter((coupon) => Boolean(coupon) && coupon.discount > 0);

const isCouponExpired = (coupon) =>
  Boolean(coupon?.expiresAt) && new Date(coupon.expiresAt).getTime() < Date.now();

const isCouponExhausted = (coupon) =>
  (Number(coupon?.usedCount) || 0) >= (Number(coupon?.maxUses) || 0);

const findCouponIndex = (coupons, { couponCode, couponId }) => {
  if (couponId) {
    const byId = coupons.findIndex((coupon) => coupon.id === couponId);
    if (byId >= 0) return byId;
  }

  const normalizedCode = normalizeCouponCode(couponCode);
  return coupons.findIndex((coupon) => normalizeCouponCode(coupon.code) === normalizedCode);
};

const loadStoreBundle = async ({ products, orders, siteConfig, coupons = [] }) => {
  const [remoteProducts, remoteOrders, remoteSiteConfig, remoteCoupons] = await Promise.all([
    readRemotePart(STORE_DOCS.products, products),
    readRemotePart(STORE_DOCS.orders, orders),
    readRemotePart(STORE_DOCS.siteConfig, siteConfig),
    readRemotePart(STORE_DOCS.coupons, coupons),
  ]);

  return {
    products: remoteProducts,
    orders: remoteOrders,
    siteConfig: remoteSiteConfig,
    coupons: remoteCoupons,
  };
};

const saveProductsRemote = async (products) => writeRemotePart(STORE_DOCS.products, products);
const saveOrdersRemote = async (orders) => writeRemotePart(STORE_DOCS.orders, orders);
const saveSiteConfigRemote = async (siteConfig) => writeRemotePart(STORE_DOCS.siteConfig, siteConfig);
const saveCouponsRemote = async (coupons) => writeRemotePart(STORE_DOCS.coupons, normalizeCouponsPayload(coupons));

const validateCouponRemote = async ({ couponCode, couponId = '' }) => {
  if (!hasFirebaseConfig || !db) {
    return { ok: false, reason: 'firestore-unavailable' };
  }

  try {
    const snapshot = await getDoc(getStoreDocRef(STORE_DOCS.coupons));
    if (!snapshot.exists()) {
      return { ok: false, reason: 'coupon-not-found' };
    }

    const coupons = normalizeCouponsPayload(snapshot.data()?.value);
    const couponIndex = findCouponIndex(coupons, { couponCode, couponId });
    if (couponIndex < 0) {
      return { ok: false, reason: 'coupon-not-found' };
    }

    const coupon = coupons[couponIndex];
    if (isCouponExpired(coupon)) {
      return { ok: false, reason: 'coupon-expired', coupon };
    }

    if (isCouponExhausted(coupon)) {
      return { ok: false, reason: 'coupon-exhausted', coupon };
    }

    return { ok: true, coupon };
  } catch {
    return { ok: false, reason: 'coupon-check-failed' };
  }
};

const consumeCouponUsageRemote = async ({ couponCode, couponId = '' }) => {
  if (!hasFirebaseConfig || !db) {
    return { ok: false, reason: 'firestore-unavailable' };
  }

  try {
    const coupon = await runTransaction(db, async (transaction) => {
      const couponDocRef = getStoreDocRef(STORE_DOCS.coupons);
      const snapshot = await transaction.get(couponDocRef);

      if (!snapshot.exists()) {
        throw new Error('coupon-not-found');
      }

      const coupons = normalizeCouponsPayload(snapshot.data()?.value);
      const couponIndex = findCouponIndex(coupons, { couponCode, couponId });
      if (couponIndex < 0) {
        throw new Error('coupon-not-found');
      }

      const targetCoupon = coupons[couponIndex];
      if (isCouponExpired(targetCoupon)) {
        throw new Error('coupon-expired');
      }

      if (isCouponExhausted(targetCoupon)) {
        throw new Error('coupon-exhausted');
      }

      const nextCoupon = {
        ...targetCoupon,
        usedCount: (Number(targetCoupon.usedCount) || 0) + 1,
      };

      coupons[couponIndex] = nextCoupon;
      transaction.set(
        couponDocRef,
        {
          value: coupons,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      return nextCoupon;
    });

    return { ok: true, coupon };
  } catch (error) {
    return { ok: false, reason: error?.message || 'coupon-consume-failed' };
  }
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
  saveCouponsRemote,
  saveOrdersRemote,
  saveProductsRemote,
  saveSiteConfigRemote,
  uploadProductImage,
  validateCouponRemote,
};
