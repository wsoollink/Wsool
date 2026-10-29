# مراجعة تطبيق Meta (Instagram + Threads + Facebook)

> الهدف: نطلب **7 صلاحيات فقط** عشان يقدر أي صانع (مو بس المختبرين) يربط حسابه. لا تطلب أي صلاحية غيرها.
> الشرط: توثيق الشركة (Business Verification) مقبول في business.facebook.com.

## 1. قبل التسجيل والإرسال (مرة وحدة)

### حساب المراجعين
مراجعين Meta ما يقدرون يستقبلون رمز الدخول على الإيميل، فعندنا إيميل ورمز ثابت لهم (نفس حساب مراجعي App Store):
- في Netlify لازم يكون موجود `REVIEW_EMAIL` و `REVIEW_CODE` (8 أرقام). يشتغل في الموقع والتطبيق.
- ادخل مرة بنفسك في https://wsool.link/login بهذا الإيميل والرمز، واحجز اسم مثل `metareview`.
- أضف للحساب حسابات Instagram و Threads و Facebook بأي معرّف، واحفظ.
- اعطه **كود خصم 100% سنوي** من لوحة الإدارة (الربط للاحترافية فقط، والتجربة 14 يوم ممكن تنتهي قبل المراجعة).

### إعدادات التطبيق (App settings ← Basic)
- **App icon:** شعار وصول 1024×1024.
- **Privacy Policy URL:** `https://wsool.link/privacy`
- **Terms of Service URL:** `https://wsool.link/terms`
- **User data deletion:** `https://wsool.link/privacy`
- **Category:** Business and pages (أو Utility).
- **App domains:** `wsool.link`

## 2. الفيديو (Screencast)

سجّل الشاشة (QuickTime على الماك أو أداة التسجيل في ويندوز). **خلّ لغة الموقع إنجليزي** (زر English فوق)، لأن المراجعين يقرون إنجليزي. فيديو لكل منصة، دقيقة إلى دقيقتين:

1. افتح `https://wsool.link/login` وادخل بحساب المراجعين (عشان يشوفون إن نفس الحساب يشتغل).
2. لوحة التحكم ← **Accounts & numbers**.
3. افتح سطر المنصة ← اضغط **Connect Instagram** (أو Threads أو Facebook).
4. **شاشة الموافقة:** وقف عليها ثانيتين عشان تبان الصلاحيات، ثم **Allow**. في Facebook: اختر الصفحة.
5. الرجوع للوحة التحكم: رسالة «connected»، والمتابعين، وعلامة **Linked**.
6. افتح **Audience data** للمنصة (Instagram و Threads)، وأظهر إنها «Auto». وأظهر **Monthly views**.
7. افتح الصفحة العامة `wsool.link/اسمك`، واضغط بطاقة المنصة ← تطلع نافذة الجمهور.
8. ارجع للوحة التحكم وأظهر زر **Disconnect** (بدون ما تضغطه).

## 3. نص كل صلاحية (انسخه كما هو)

### Instagram: `instagram_business_basic`
Wsool (wsool.link) is a media kit platform for content creators. When a creator connects their Instagram professional account, we read their username, name and follower count to show a verified, up-to-date follower number on their own public media kit page (wsool.link/username) and in their PDF media kit. The number is refreshed once a day. We never post, read messages or access anyone else's data, and the creator can disconnect at any time from their dashboard.

### Instagram: `instagram_business_manage_insights`
We read the connected account's follower demographics (gender, age groups, top countries and cities, as aggregated percentages) and the account's monthly views. Creators show this audience breakdown to brands on their own media kit page and PDF, so brands can trust the numbers instead of screenshots. Data is refreshed once a day, shown only on that creator's page, and deleted when they disconnect or request deletion.

### Threads: `threads_basic`
Wsool (wsool.link) is a media kit platform for content creators. When a creator connects their Threads account, we read their username and name to link the account to their media kit page (wsool.link/username). We never post on their behalf, and they can disconnect at any time from their dashboard.

### Threads: `threads_manage_insights`
We read the connected account's follower count, follower demographics (gender, age groups, top countries and cities, as aggregated percentages) and monthly views, to show a verified, up-to-date audience summary on the creator's own media kit page and PDF for brands. Data is refreshed once a day, shown only on that creator's page, and deleted when they disconnect or request deletion.

### Facebook: `pages_show_list`
A creator who connects Facebook picks the Page they want on their Wsool media kit. We use this permission only to list the Pages they manage so the right Page can be linked. We never manage, post to or change any Page.

### Facebook: `pages_read_engagement`
We read the linked Page's name, username and follower count to show a verified, up-to-date follower number on the creator's own media kit page (wsool.link/username) and PDF. The number is refreshed once a day. We never post, read messages or comments, or change the Page, and the creator can disconnect at any time.

### Facebook: `read_insights`
We read the linked Page's monthly views (media views) to show them on the creator's own media kit page next to their follower count, so brands see real reach. Data is refreshed once a day and shown only on that creator's page.

## 4. ملاحظات للمراجعين (App Review ← Testing instructions)

```
Wsool (https://wsool.link) is a media kit platform for content creators (Saudi Arabia, Arabic + English).
Each creator gets a public page with verified follower numbers that brands can trust.

How to test:
1. Open https://wsool.link/login (switch to English at the top if needed).
2. Sign in with the email: <REVIEW_EMAIL> and the code: <REVIEW_CODE> (no email is sent to this address).
3. Go to "Accounts & numbers", open Instagram / Threads / Facebook and press "Connect".
4. Sign in with any Instagram professional account / Threads account / Facebook account that manages a Page,
   and allow the requested permissions.
5. Back on the dashboard you will see the follower count, "Linked", the audience data (Instagram, Threads)
   and monthly views. The public page is at https://wsool.link/<username>.

We only read data; we never post, message, comment or manage anything. Creators can disconnect at any time,
and data deletion requests are handled by our deletion callbacks (Instagram, Threads) and our privacy policy.
```

## 5. الإرسال
1. **App Review** ← **Requests** (أو داخل كل Use case: **Complete app review**).
2. لكل صلاحية من الـ 7: الصق النص من القسم 3، وارفع الفيديو المناسب، ووافق على الشروط.
3. ارجع لأي صلاحية ثانية أضافها Meta تلقائياً (`business_management`، `pages_manage_engagement`، صلاحيات الرسائل والتعليقات)، و**لا تطلبها**.
4. **Submit**. المراجعة غالباً من أيام لأسبوعين.
5. بعد الموافقة: **Publish** ← حوّل التطبيق إلى **Live**.

لو رفضوا: صوّر رسالة الرفض وأرسلها، وغالباً يكون تعديل بسيط في الفيديو أو النص.
