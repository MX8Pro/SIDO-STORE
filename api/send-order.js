<<<<<<< HEAD
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const ORDER_MAX_ITEMS = 30;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 80;

const rateLimitStore = globalThis.__sendOrderRateLimitStore || new Map();
globalThis.__sendOrderRateLimitStore = rateLimitStore;

const escapeHtml = (value = '') =>
=======
﻿const escapeHtml = (value = '') =>
>>>>>>> c9163621f80e713064161d4908b8a019f34ed884
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

<<<<<<< HEAD
const sanitizeText = (value, maxLength = 120) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');

const parseRequestBody = (body) => {
  if (!body) return null;

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (typeof body === 'object') {
    return body;
  }

  return null;
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress || 'unknown';
};

const isRateLimited = (ip) => {
  const now = Date.now();
  const key = String(ip || 'unknown');
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const existing = rateLimitStore.get(key) || [];
  const recent = existing.filter((timestamp) => timestamp > windowStart);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(key, recent);
    return true;
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return false;
};

const validateCustomer = (customer) => {
  if (!customer || typeof customer !== 'object') {
    return { ok: false, message: '?????? ?????? ??? ?????' };
  }

  const name = sanitizeText(customer.name, NAME_MAX_LENGTH);
  const phone = normalizePhone(customer.phone);
  const wilaya = sanitizeText(customer.wilaya_name || customer.wilaya, 80);
  const commune = sanitizeText(customer.commune_name || customer.commune || customer.city, 80);

  if (name.length < NAME_MIN_LENGTH) {
    return { ok: false, message: '????? ??? ????' };
  }

  if (!/^(\+?213|0)(5|6|7)\d{8}$/.test(phone)) {
    return { ok: false, message: '??? ?????? ??? ????' };
  }

  if (!wilaya) {
    return { ok: false, message: '??????? ??????' };
  }

  if (!commune) {
    return { ok: false, message: '??????? ??????' };
  }

  return {
    ok: true,
    value: {
      name,
      phone,
      wilaya,
      commune,
    },
  };
};

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: '??? ????? ?????' };
  }

  if (items.length > ORDER_MAX_ITEMS) {
    return { ok: false, message: '??? ???????? ?? ????? ???? ????' };
  }

  const sanitizedItems = [];
  let computedSubtotal = 0;

  for (const item of items) {
    const name = sanitizeText(item?.name, 120);
    const qty = Number(item?.qty);
    const price = Number(item?.price);

    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return { ok: false, message: '?????? ???? ??? ?????' };
    }

    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, message: '??? ???? ??? ????' };
    }

    const lineTotal = qty * price;
    computedSubtotal += lineTotal;

    sanitizedItems.push({
      name,
      qty,
      price,
      selectedSize: sanitizeText(item?.selectedSize, 20),
      selectedColor: sanitizeText(item?.selectedColor, 30),
      lineTotal,
    });
  }

  return {
    ok: true,
    value: {
      items: sanitizedItems,
      computedSubtotal,
    },
  };
};

const validateOrderPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, message: '????? ??? ????? ?? ??? ????' };
  }

  const customerResult = validateCustomer(payload.customer);
  if (!customerResult.ok) return customerResult;

  const itemsResult = validateItems(payload.items);
  if (!itemsResult.ok) return itemsResult;

  const subtotal = Number(payload.subtotal);
  const discount = Number(payload.discount);
  const totalPrice = Number(payload.totalPrice);

  const safeSubtotal = Number.isFinite(subtotal) && subtotal >= 0 ? subtotal : itemsResult.value.computedSubtotal;
  const safeDiscount = Number.isFinite(discount) && discount >= 0 ? discount : 0;
  const safeTotal = Number.isFinite(totalPrice) && totalPrice >= 0 ? totalPrice : safeSubtotal - safeDiscount;

  if (safeDiscount > safeSubtotal) {
    return { ok: false, message: '????? ??? ????' };
  }

  if (safeTotal > safeSubtotal || safeTotal < 0) {
    return { ok: false, message: '???????? ??? ????' };
  }

  const couponCode = sanitizeText(payload.couponCode, 40).toUpperCase();

  return {
    ok: true,
    value: {
      customer: customerResult.value,
      items: itemsResult.value.items,
      subtotal: safeSubtotal,
      discount: safeDiscount,
      totalPrice: safeTotal,
      couponCode,
    },
  };
};

const formatOrderMessage = (order) => {
  const customer = order.customer;
  const itemsText = order.items
    .map((item) => {
      const variantText = [item.selectedSize ? `???? ${item.selectedSize}` : '', item.selectedColor ? `??? ${item.selectedColor}` : '']
        .filter(Boolean)
        .join(' | ');

      return [
        `� ${escapeHtml(item.name)} � ${item.qty}`,
        variantText ? `  - ${escapeHtml(variantText)}` : '',
        `  - ${item.price} ?.?`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return [
    '?? <b>??? ???? ?? ??????</b>',
    '',
    `<b>?????:</b> ${escapeHtml(customer.name)}`,
    `<b>??????:</b> ${escapeHtml(customer.phone)}`,
    `<b>???????:</b> ${escapeHtml(customer.wilaya)}`,
    `<b>???????:</b> ${escapeHtml(customer.commune)}`,
    '',
    '<b>????????:</b>',
    itemsText || '-',
    '',
    `<b>??????? ??????:</b> ${order.subtotal} ?.?`,
    `<b>?????:</b> ${order.discount} ?.?`,
    order.couponCode ? `<b>???????:</b> ${escapeHtml(order.couponCode)}` : '',
    `<b>????????:</b> ${order.totalPrice} ?.?`,
  ]
    .filter(Boolean)
    .join('\n');
=======
const formatOrderMessage = (order) => {
  const customer = order?.customer || {};
  const items = Array.isArray(order?.items) ? order.items : [];

  const itemsText = items
    .map((item) => `• ${escapeHtml(item.name)} × ${item.qty}`)
    .join('\n');

  return [
    '🛒 <b>طلب جديد من المتجر</b>',
    '',
    `<b>الاسم:</b> ${escapeHtml(customer.name || '-')}`,
    `<b>الهاتف:</b> ${escapeHtml(customer.phone || '-')}`,
    `<b>الولاية:</b> ${escapeHtml(customer.wilaya_name || customer.wilaya || '-')}`,
    `<b>البلدية:</b> ${escapeHtml(customer.commune_name || customer.commune || customer.city || '-')}`,
    '',
    '<b>المنتجات:</b>',
    itemsText || '-',
    '',
    `<b>الإجمالي:</b> ${Number(order?.totalPrice || 0)} د.ج`,
  ].join('\n');
>>>>>>> c9163621f80e713064161d4908b8a019f34ed884
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

<<<<<<< HEAD
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests, please retry later' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return res.status(500).json({ error: 'Server configuration is missing' });
  }

  const body = parseRequestBody(req.body);
  if (!body || !body.order) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const validation = validateOrderPayload(body.order);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  try {
    const message = formatOrderMessage(validation.value);
=======
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ error: 'Missing Telegram configuration' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const order = body?.order;

    if (!order) {
      return res.status(400).json({ error: 'Order payload is required' });
    }

    const message = formatOrderMessage(order);

>>>>>>> c9163621f80e713064161d4908b8a019f34ed884
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const telegramResult = await telegramResponse.json();
<<<<<<< HEAD
    if (!telegramResponse.ok || !telegramResult?.ok) {
      console.error('Telegram API error', {
        status: telegramResponse.status,
        description: telegramResult?.description || null,
      });
      return res.status(502).json({ error: 'Failed to deliver order notification' });
=======

    if (!telegramResponse.ok || !telegramResult?.ok) {
      return res.status(502).json({
        error: 'Telegram API failed',
        details: telegramResult,
      });
>>>>>>> c9163621f80e713064161d4908b8a019f34ed884
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
<<<<<<< HEAD
    console.error('send-order failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
=======
    return res.status(500).json({
      error: 'Internal server error',
      details: String(error?.message || error),
    });
  }
}
>>>>>>> c9163621f80e713064161d4908b8a019f34ed884
