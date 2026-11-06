# تسجيل الدخول بـ Apple (دليل المالك)

> الكود جاهز في الموقع والتطبيق. زر «المتابعة مع Apple» **ما يظهر في الموقع** إلا بعد ما تفعّل Apple في Supabase (الخطوة 3)،
> وفي التطبيق بعد تفعيل `EXPO_PUBLIC_APPLE_SIGN_IN` (الخطوة 5). سوّها لما يجهز حساب Apple Developer للشركة (بعد D-U-N-S).

## 1. معرّف التطبيق (App ID)
في https://developer.apple.com/account ← **Certificates, Identifiers & Profiles** ← **Identifiers**:
- افتح App ID حق التطبيق `link.wsool.app` (أو أنشئه: Explicit، نفس الاسم).
- علّم على **Sign In with Apple** ← Edit ← **Enable as a primary App ID** ← Save.

## 2. معرّف الموقع (Services ID) + المفتاح
1. Identifiers ← زر **+** ← **Services IDs** ← Continue.
   - Description: `Wsool Web`
   - Identifier: `link.wsool.web`
2. افتح `link.wsool.web` ← علّم **Sign In with Apple** ← **Configure**:
   - Primary App ID: `link.wsool.app`
   - Domains and Subdomains: `<project>.supabase.co` (عنوان مشروع Supabase، تلقاه في Supabase ← Project Settings ← API)
   - Return URLs: `https://<project>.supabase.co/auth/v1/callback`
   - Save ← Continue ← Save.
3. **Keys** ← زر **+** ← الاسم `Wsool Sign in with Apple` ← علّم **Sign In with Apple** ← Configure (اختر `link.wsool.app`) ← Register.
   - حمّل ملف المفتاح `.p8` (**ينحمّل مرة وحدة بس**، احفظه في مكان آمن ولا ترسله لأحد).
   - انسخ **Key ID**، وانسخ **Team ID** (فوق يمين الصفحة).

## 3. Supabase
Supabase ← **Authentication** ← **Sign In / Providers** ← **Apple** ← Enable:
- **Client IDs**: `link.wsool.web,link.wsool.app` (الموقع والتطبيق، مفصولة بفاصلة).
- **Secret Key (for OAuth)**: Supabase يطلب «client secret» مولّد من ملف `.p8`. في نفس الصفحة رابط لأداة Supabase تولّده
  (تحط فيها Team ID و Key ID و Services ID و محتوى ملف `.p8`). **ينتهي بعد 6 شهور**: حط تذكير في التقويم تجدده.
- Save. بعد دقايق يظهر الزر في صفحة الدخول تلقائياً.
- تأكد إن `https://wsool.link/api/auth/callback` موجود في **URL Configuration ← Redirect URLs** (موجود من أيام Google).

## 4. «إخفاء بريدي» (Hide My Email)
لما يختار المستخدم إخفاء إيميله، Apple تعطينا إيميل وسيط (`…@privaterelay.appleid.com`). عشان توصله إيميلاتنا:
- developer.apple.com ← Certificates, Identifiers & Profiles ← **Services** ← **Sign in with Apple for Email Communication** ← Configure.
- أضف الدومين `mail.wsool.link` والإيميل `noreply@mail.wsool.link` (وإذا تبي الردود: `support@wsool.link`).
- Apple تتحقق من SPF للدومين (موجود من إعداد Resend).

ملاحظة: الإيميل الوسيط يختلف عن الإيميل الحقيقي، فدعوات الوكالات المرسلة للإيميل الحقيقي ما تتطابق. صفحة الدخول تنبّه
تحت زر Apple: «عندك دعوة من وكالة؟ ادخل بنفس الإيميل اللي وصلتك عليه الدعوة، ولا تختار إخفاء بريدي».

## 5. التطبيق
- expo.dev ← المشروع ← **Environment variables** ← أضف `EXPO_PUBLIC_APPLE_SIGN_IN` = `1` (عادي، مو سري) لبيئة production و preview.
- ابنِ نسخة iOS جديدة. الزر يظهر على الآيفون فقط (Apple ما تطلبه في أندرويد).

## 6. تجربة
1. wsool.link/login ← «المتابعة مع Apple» ← ادخل بحساب Apple ← المفروض تنتقل للوحة التحكم (أو لاختيار الاسم لو حساب جديد).
2. جرّب مرة ثانية بحساب Apple ثاني واختر «إخفاء بريدي»، وتأكد إن إيميل الترحيب أو التنبيهات يوصلك.
3. من التطبيق على الآيفون: نفس الشي.
