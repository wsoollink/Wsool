# وصول في Google Play — كل اللي تحتاج تنسخه

> جهّزه Claude (أكتوبر 2026). انسخ كل خانة كما هي في Play Console. الحدود بين القوسين هي حدود Google.
> الوصف الطويل وصور الشاشات نفسها اللي في `docs/app-store.md`. صورة الواجهة (Feature graphic) في `docs/google-play/`.

---

## 1. إنشاء التطبيق (Create app)

| الخانة | الجواب |
| --- | --- |
| App name (30) | وصول - ملفك الإعلامي |
| Default language | Arabic – ar |
| App or game | App |
| Free or paid | Free |
| Declarations | وافق على الاثنين (Developer Program Policies + US export laws) |

اسم الحزمة (يتسجّل تلقائياً مع أول رفع): `link.wsool.app`.

---

## 2. صفحة المتجر (Main store listing)

| الخانة | العربية | English (Add translation → English – en-US) |
| --- | --- | --- |
| App name (30) | وصول - ملفك الإعلامي | Wsool – Creator Media Kit |
| Short description (80) | ملفك الإعلامي برابط واحد: أرقامك الموثّقة وأسعارك وأعمالك للبراندات. | Your media kit in one link: verified numbers, rates and work for brands. |
| Full description (4000) | انسخ «الوصف» العربي من `docs/app-store.md` (القسم 2) | انسخ الوصف الإنجليزي من نفس المكان |

**الصور:**
- **App icon** (512 × 512): `mobile/assets/android-icon-foreground.png` على خلفية بيضاء. أسهل: ارفع `public/brand/icon.png` وPlay Console يصغّرها.
- **Feature graphic** (1024 × 500): `docs/google-play/feature-graphic-ar.png` للعربي و`feature-graphic-en.png` للإنجليزي.
- **Phone screenshots** (2 إلى 8): نفس صور `docs/app-store/screenshots/` (`ar-…` للعربي و`en-…` للإنجليزي). مقبولة لأن نسبتها
  أقل من 1:2.17. بعد أول نسخة على جوالك نقدر نأخذ صور من أندرويد حقيقي.

**بيانات التواصل (Store settings → Store listing contact details):**
- Email: `support@wsool.link`
- Website: `https://wsool.link`
- Category: **Business**، Tags: Business, Productivity.

---

## 3. محتوى التطبيق (Policy → App content)

| القسم | الجواب |
| --- | --- |
| Privacy policy | `https://wsool.link/privacy` |
| App access | **All or some functionality is restricted** → Add instructions: الاسم «Review account»، Username = قيمة `REVIEW_EMAIL`، Password = قيمة `REVIEW_CODE`، والملاحظة تحت |
| Ads | **No**, my app does not contain ads |
| Content rating | ابدأ الاستبيان: الإيميل `support@wsool.link`، Category = **All other app types**، وكل الأسئلة **No** (ما فيه عنف ولا محتوى للبالغين ولا قمار، والمستخدمين ما يتواصلون مع بعض داخل التطبيق) |
| Target audience | **18 وفوق** فقط (ما يجذب الأطفال) |
| News app | No |
| Health apps | ولا شي |
| Financial features | **My app doesn't provide any financial features** |
| Government app | No |
| Data safety | تحت (القسم 4) |
| Account deletion | Delete account URL: `https://wsool.link/privacy` (الخصوصية فيها طريقة الحذف) |

**ملاحظة App access (بالإنجليزي، انسخها كما هي):**
```
Enter the review email in the email field, tap "Send code", then enter the code from the Password field.
(Regular users receive a one-time code by email; this review account uses a fixed code and no email is sent.)
```

---

## 4. أمان البيانات (Data safety)

**Does your app collect or share any of the required user data types? Yes.**
- Is all data encrypted in transit? **Yes**
- Do you provide a way for users to request deletion? **Yes**
- مشاركة مع طرف ثالث (Shared): **No** لكل الأنواع (مزودي الخدمة اللي يشتغلون عنّا ما يعتبرون مشاركة عند Google).

اختر الأنواع هذي فقط. لكل نوع: **Collected**، مو اختياري إلا اللي مكتوب «اختياري»، الغرض **App functionality** (والإيميل كمان
**Account management**)، و**ما ينعالج مؤقتاً (not ephemeral)**:

| النوع في Google | ليش |
| --- | --- |
| Personal info → Name | اسمك في صفحتك |
| Personal info → Email address | تسجيل الدخول والإيميلات |
| Personal info → Phone number (اختياري) | رقم الواتساب في صفحتك |
| Personal info → User IDs | حسابك |
| Financial info → Other financial info (اختياري) | الآيبان لصرف العمولة |
| Photos and videos → Photos، Videos (اختياري) | صورتك وشعارات الشركات وأعمالك |
| App activity → Other user-generated content | النبذة والأسعار والروابط وصور التوثيق |
| Device or other IDs | رمز الإشعارات |

ما نجمع: الموقع، جهات الاتصال، الرسائل، سجل التصفح، بيانات الأعطال من التطبيق، أو الإعلانات.

---

## 5. البناء والرفع

1. expo.dev → المشروع `wsool-app` → **Builds** → **Build from GitHub**: الفرع `main`، المنصة **Android**، الملف `production`
   (يطلع ملف `.aab`). Expo يسوي مفتاح التوقيع تلقائياً ويحفظه (لا تحذفه).
2. **أول مرة فقط، يدوياً:** Play Console → Testing → **Internal testing** → Create new release → ارفع ملف `.aab` (نزّله من صفحة البناء
   في expo.dev) → Save → Review release → Rollout. ضيف إيميلك في **Testers** وافتح رابط الاشتراك من جوالك.
3. بعدها الرفع تلقائي: Google Cloud → حساب خدمة (Service account) بصلاحية Play Console، وملف مفتاحه (JSON) يترفع في expo.dev
   → Credentials → Android → **Google Service Account Key**. بعدها **Auto submit** مع كل بناء يرفعه لـ Internal testing.
4. لما تجرّبه وتعتمده: **Production** → Create new release → اختر نفس البناء → Countries: كل الدول (أو السعودية والخليج كبداية)
   → Send for review. المراجعة الأولى غالباً من يوم إلى 7 أيام.

> حسابات المنظمات (Organization) معفية من شرط «12 مختبر لمدة 14 يوم» اللي على الحسابات الشخصية الجديدة.

---

## 6. إشعارات أندرويد (Firebase، مجاني)

إشعارات أندرويد تمر عن طريق Firebase Cloud Messaging. مرة وحدة:
1. https://console.firebase.google.com → **Add project** → الاسم `Wsool` → بدون Google Analytics.
2. داخل المشروع: **Add app** → Android → Package name ‏`link.wsool.app` → Register → نزّل **google-services.json**
   (تخطّى باقي الخطوات).
3. expo.dev → المشروع → **Environment variables** → Add → Name ‏`GOOGLE_SERVICES_JSON`، Type = **File**، ارفع الملف،
   Environments: production + preview، Visibility: **Secret**. (لا ترسله في المحادثة ولا ترفعه في GitHub.)
4. Firebase → ⚙️ Project settings → **Service accounts** → **Generate new private key** (ملف JSON).
5. expo.dev → Credentials → Android → `link.wsool.app` → **FCM V1 service account key** → ارفع الملف.
6. ابنِ نسخة جديدة (القسم 5): الإشعارات تشتغل.
