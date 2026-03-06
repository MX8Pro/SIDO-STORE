<<<<<<< HEAD
﻿# STORE-DZ (Vite + React + Firebase + ImgBB + Vercel)

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
=======
﻿# My Store - Production Setup (Firebase + Telegram + Vercel)

هذا المشروع جاهز الآن للعمل بطريقتين:

1. وضع محلي (Local): بدون Firebase، البيانات تُحفظ في المتصفح فقط.
2. وضع سحابي (Cloud): مع Firebase Firestore + Storage + إشعارات تيليجرام.

## 1) إنشاء مشروع Firebase

- ادخل إلى [Firebase Console](https://console.firebase.google.com/).
- أنشئ مشروع جديد.
- فعّل Firestore Database.
- فعّل Storage.
- من Project settings > General > Your apps:
  - أنشئ Web App.
  - انسخ مفاتيح التهيئة.

## 2) إعداد متغيرات البيئة

انسخ الملف:
>>>>>>> c9163621f80e713064161d4908b8a019f34ed884

```bash
cp .env.example .env
```

<<<<<<< HEAD
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
=======
املأ القيم في `.env`:

- `VITE_FIREBASE_*` من إعدادات Firebase Web App.
- `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID` (تُستخدم على Vercel API فقط).

## 3) إنشاء بوت تيليجرام وربطه بالموقع

- أنشئ بوت عبر `@BotFather` وخذ `BOT_TOKEN`.
- احصل على `CHAT_ID` (يمكن عبر `@userinfobot` أو API updates).
- أضف القيم في Vercel Environment Variables (وليس في كود الواجهة).

المشروع يستخدم endpoint آمن:

- `POST /api/send-order`
- التوكن يبقى على السيرفر فقط.

## 4) تشغيل المشروع محليًا

>>>>>>> c9163621f80e713064161d4908b8a019f34ed884
```bash
npm install
npm run dev
```

<<<<<<< HEAD
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

=======
## 5) النشر على Vercel

- ارفع المشروع إلى GitHub.
- اربطه بـ Vercel.
- أضف نفس Environment Variables داخل Vercel.
- نفّذ Deploy.

تم تجهيز `vercel.json` ليدعم React SPA + API routes.

## 6) ربط الدومين

- اشترِ Domain من أي مزود.
- من Vercel > Project > Domains أضف الدومين.
- عدّل DNS records كما يعرض Vercel.

## أمان Firebase (مهم)

### Firestore Rules (مبدئيًا)

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /store_data/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Storage Rules (مبدئيًا)

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

ملاحظة: الأفضل لاحقًا إضافة Firebase Authentication للإدارة بدل كلمة سر ثابتة.
>>>>>>> c9163621f80e713064161d4908b8a019f34ed884
