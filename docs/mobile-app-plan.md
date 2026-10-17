# تطبيق وصول للجوال — الخطة والقرارات (أكتوبر 2026)

> الحالة: المراحل 1 و2 و3 مبنية ومجرّبة (نسخة الويب ضد السيرفر المحلي). الجاية: المرحلة 4 (حساب Expo، الأيقونة، المتاجر، TestFlight).

## قرارات المالك
- **تطبيق أصلي مستقل بـ React Native** (Expo + EAS Build في السحابة، بدون Mac). رفض PWA و Capacitor كبداية.
- **قبل الإطلاق الرسمي.**
- **الناشر في المتاجر = «وصول»** (حساب منظمة، مو اسم شخصي).
- التطبيق **للصناع فقط** (لوحة التحكم). لوحة الإدارة تبقى في الموقع.

## متطلبات على المالك (يبدأ فيها بالتوازي)
1. سجل تجاري (مؤسسة/شركة). وثيقة العمل الحر لا تكفي. اسم الناشر = الاسم المسجّل حرفياً.
2. رقم D-U-N-S (مجاني، 1-2 أسبوع).
3. Apple Developer كمنظمة (99$/سنة) + Google Play كمنظمة (25$ مرة).
4. حساب Expo مجاني (والمفتاح EXPO_TOKEN يكون سر في GitHub/Netlify، لا يُرسل في المحادثة).

## قواعد المتاجر المؤثرة
- لا بيع اشتراك داخل التطبيق (Apple/Google يأخذون 15-30%). التطبيق يعرض الخطة فقط، بدون أزرار شراء أو روابط دفع خارجية (Apple 3.1.3(b)). الاشتراك من الموقع.
- Sign in with Apple إجباري لأن عندنا Google (Apple 4.8) — يضاف للتطبيق والموقع.
- حذف الحساب لازم من داخل التطبيق (Apple 5.1.1(v)).
- التطبيق لازم يكون فيه قيمة جوال حقيقية (إشعارات، كاميرا، مشاركة).

## البنية المقترحة
- API جديد في الموقع: `src/app/api/mobile/v1/*` (route handlers). المصادقة: Supabase JWT في `Authorization: Bearer`، المستخدم من `getClaims` على السيرفر، نفس قواعد الملكية وzod وحدود الخطة. يعيد استخدام `src/lib/*` (لا تكرار للمنطق الموجود في server actions — نقله لدوال مشتركة).
- التطبيق في `mobile/` داخل نفس المستودع: Expo Router، عربي (RTL) + إنجليزي، وضع داكن، نفس ألوان وخط لوحة التحكم (Noto Kufi Arabic).
- إشعارات: Expo Notifications (APNs/FCM)، جدول `push_tokens`، و`notify()` يرسل إشعار بجانب الإيميل.
- البناء: EAS Build عبر GitHub Actions (الحاوية هنا ما تقدر تشغّل آيفون). التجربة على جوال المالك: TestFlight + رابط Android داخلي.

## المراحل
1. الأساس: API + الدخول (كود الإيميل، Google، Apple) + حجز الاسم + هيكل التطبيق + الرئيسية + التنبيهات/الإشعارات.
2. التعديل: الصفحة والصورة، الحسابات والأرقام، الشركات والأعمال، الأسعار، الروابط والخدمات، التواصل، المظهر.
3. الباقي: التوثيق (رفع + قراءة AI)، الإحصائيات، العمولة، الاشتراك (عرض فقط)، حذف الحساب.
4. النشر: أيقونة وشاشة بداية، صور ووصف المتجر بالعربي والإنجليزي، TestFlight، التقديم للمراجعة.

## أجوبة المالك
1. السجل التجاري: لا يوجد للحين، شغال عليه ويرسله لما يجهز (لازم قبل النشر في المتاجر فقط).
2. كل أقسام لوحة التحكم.
3. اسم التطبيق: «وصول».

## ما تم في المرحلة 1
- السيرفر: `src/lib/mobile/api.ts` (Bearer + CORS + `authed`/`withPage`)، `src/app/api/mobile/v1/`: `auth/otp`، `auth/verify`،
  `auth/refresh`، `auth/id-token` (Apple/Google، يشتغل لما المزودين يتفعّلون في Supabase)، `me`، `username`، `onboarding`
  (`claimPage` في `src/lib/onboarding.ts` مشتركة مع الموقع)، `home` (`src/lib/mobile/home.ts`)، `notifications`،
  `notifications/read`، `push-tokens`. جدول `push_tokens` و`sendPush()` (`src/lib/push.ts`, Expo push API) من داخل `notify()`.
- التطبيق `mobile/` (Expo SDK 58، Expo Router في `src/app/`): الدخول بالرمز (+ زر Apple خلف `EXPO_PUBLIC_APPLE_SIGN_IN=1`)،
  حجز الاسم، تبويبات (الرئيسية، التنبيهات مع عداد، المزيد)، الأقسام الباقية «قريباً» مع رابط للموقع (الاشتراك بدون أي رابط
  شراء)، عربي/إنجليزي (RTL بإعادة تشغيل)، فاتح/داكن/حسب الجهاز، خط Noto Kufi، الإشعارات (تسجيل الجهاز + فتح الشاشة عند الضغط).
- ملاحظات تقنية: موقع Expo (docs/api.expo.dev) محجوب في الحاوية: الإصدارات من `node_modules/expo/bundledNativeModules.json`
  و`npm install` بدل `npx expo install`. التجربة: `EXPO_PUBLIC_API_URL=http://localhost:3123 npx expo export -p web` + Playwright.
  Netlify يتجاهل التعديلات اللي في `mobile/` و`docs/` فقط (`ignore` في `netlify.toml`). CI فيه job `mobile` (tsc).
- ناقص قبل التجربة على الجوال: حساب Expo + `eas.json` + `projectId` (الإشعارات تحتاجه)، أيقونة وشاشة بداية حقيقية (المرحلة 4).

## ما تم في المرحلة 2
- السيرفر بدون تكرار منطق: `getCurrentUser()` يقبل `Authorization: Bearer` (`src/lib/mobile/bearer.ts`)، فنفس server actions
  حق لوحة التحكم تشتغل للتطبيق عبر `POST /api/mobile/v1/rpc/<action>` (قائمة مسموحة فقط في `rpc/[action]/route.ts`،
  `saveProfile` يحوّل الكائن لـ FormData). `pageChanged(username)` في `src/lib/public-page.ts` بدل `updateTag` (يرجع لـ
  `expirePage` داخل route handlers). `GET /api/mobile/v1/section/<key>` (`src/lib/mobile/sections.ts`) يعطي بيانات كل قسم.
  تذكرة الرفع فيها `signedUrl` والتطبيق يرفع بـ PUT مباشرة.
- التطبيق: شاشات `src/app/section/{edit,accounts,work,rates,links,contact,appearance}.tsx` (الثابتة تغلب `[key]`)، مكونات
  `src/components/editor.tsx` (SaveBar، Toggle، Chips، ItemTools، PickerSheet، LangTabs)، `src/lib/media.ts` (اختيار وتصغير
  الصور، الفيديو + غلاف، ملفات الترخيص، الرفع)، `src/lib/platforms.ts` مولّد من أيقونات الموقع.
- مجرّب: حفظ كل قسم ووصوله لقاعدة البيانات، رفع صورة، تطبيع واتساب والأرقام العربية، عربي/إنجليزي، فاتح/داكن.

## ما تم في المرحلة 3
- السيرفر: `rpc` يسمح أيضاً بـ `checkScreenshot`, `applyReadFollowers`, `submitVerification`, `cancelVerification`,
  `submitLicense`, `cancelLicense`, `savePayoutSettings`, `requestDeletion`, `undoDeletion` (ولا شيء يشتري أو يجدد اشتراك).
  `section/<key>` صار فيه `verification`, `analytics` (`?range=`), `referrals`, `subscription`.
- التطبيق: `src/app/section/{verification,analytics,referrals,subscription}.tsx`. التوثيق: صورة الشاشة → قراءة AI →
  مطابق/مختلف/ما انقرأ + "استخدم الرقم من الصورة" → إرسال، إلغاء، التراخيص. الإحصائيات: الفترات، الأرقام مع التغيّر،
  الرسم، الدول/المصادر/الأجهزة، أكثر الضغطات. العمولة: الرابط، الأرقام، الرصيد، طريقة الصرف (رصيد/تحويل + IBAN)، العملاء.
  الاشتراك: **عرض فقط** (الخطة، الفترة، الفواتير، بدون أي زر شراء أو رابط دفع)، حذف الحساب بكتابة اسم المستخدم + تراجع.
- مجرّب: طلب توثيق (in_review) وإلغاؤه، حفظ IBAN، عدم وجود زر شراء، الحذف والتراجع.

