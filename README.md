# STORE-DZ (Vite + React + Firebase + ImgBB + Vercel)

متجر إلكتروني باللغة العربية (ملائم للسوق الجزائري) مع لوحة إدارة، حفظ بيانات عبر Firebase Firestore، ورفع صور المنتجات عبر ImgBB.

## أهم النقاط
- **ImgBB محفوظ كما هو** لرفع صور المنتجات (بدون Firebase Storage).
- واجهة مستخدم + واجهة أدمن محسّنة.
- API آمن لإرسال الطلبات إلى Telegram (`/api/send-order`).
- تحميل بيانات الولايات/البلديات بشكل **lazy** (لا تُحمّل مباشرة في الحزمة الأساسية).
- فصل أفضل للكود إلى:
  - `src/pages`
  - `src/components`
  - `src/hooks`
  - `src/services`
  - `src/utils`

## المتطلبات
- Node.js 18+
- حساب Firebase (Firestore + Authentication)
- مفتاح ImgBB API
- Vercel (للنشر + API)

## متغيرات البيئة
أنشئ ملف `.env` محليًا انطلاقًا من المثال:

```bash
cp .env.example .env
```

القيم المطلوبة في `.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_IMGBB_API_KEY=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

ملاحظة:
- متغيرات `TELEGRAM_*` يجب ضبطها في بيئة Vercel للمشروع.
- ملف `.env` غير متعقب في Git.

## التشغيل محليًا
```bash
npm install
npm run dev
```

## فحص الجودة
```bash
npm run lint
npm run build
```

## الأمان في `/api/send-order`
الـ endpoint يتضمن:
- تحقق قوي من payload (العميل/المنتجات/الإجمالي).
- Rate limiting بسيط بالذاكرة لكل IP.
- منع الطلبات الفارغة أو غير الصالحة.
- رسائل خطأ واضحة وآمنة (بدون تسريب تفاصيل حساسة).

## ملاحظات الرفع عبر ImgBB
- يوجد تحقق من نوع الصورة والحجم قبل الرفع.
- دعم progress أثناء الرفع.
- حالات واضحة للنجاح/الفشل داخل لوحة الأدمن.
- الحد الافتراضي لحجم الصورة: `8MB`.

## النشر على Vercel
1. ارفع المشروع إلى GitHub.
2. اربطه بـ Vercel.
3. أضف متغيرات البيئة في إعدادات Vercel.
4. نفّذ Deploy.

