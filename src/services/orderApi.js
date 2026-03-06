const sendOrderNotification = async (order) => {
  const response = await fetch('/api/send-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'تعذر إرسال إشعار الطلب.');
  }

  return payload;
};

export { sendOrderNotification };
