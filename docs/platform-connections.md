# ربط المنصات (تحديث المتابعين والجمهور تلقائياً)

الصانع يربط حسابه بتسجيل الدخول في المنصة نفسها، وبعدها يتحدث عدد المتابعين وبيانات الجمهور كل يوم تلقائياً،
والحساب يتوثّق ما دام مربوط. الكود: `src/lib/connect/` (منصة = ملف مثل `youtube.ts` + سطر في `PROVIDERS`).
زر الربط ما يظهر إلا لما تكون مفاتيح المنصة و `TOKEN_ENCRYPTION_KEY` موجودة في Netlify.

| المنصة | الحالة |
| --- | --- |
| YouTube | منشور. Google Cloud جاهز، الهوية موثّقة، وطلب مراجعة الصلاحيات أُرسل 25 أكتوبر 2026 (قيد المراجعة) |
| Instagram | التالي: يحتاج توثيق نشاط تجاري ومراجعة تطبيق في Meta (ابدأها مبكر) |
| TikTok | منشور (المتابعين فقط). مفاتيح Sandbox في Netlify، وطلب المراجعة أُرسل 25 أكتوبر 2026؛ بعد الموافقة تُبدّل لمفاتيح Production |
| Facebook / Threads | بعده |
| Twitch | مبني (المتابعين فقط، بدون مراجعة). ينتظر تطبيق dev.twitch.tv (الخطوات تحت) |
| Spotify / Telegram / Discord | بعدها |
| Snapchat / X | مؤجلة |
| LinkedIn / Pinterest / Jaco | يدوي |

## تجهيز YouTube (المالك، مرة وحدة)

1. **مفتاح التشفير**: في جهازك (Terminal في الماك) اكتب `openssl rand -base64 32`، وانسخ الناتج إلى Netlify باسم
   `TOKEN_ENCRYPTION_KEY` مع «Contains secret values». لا ترسله في المحادثة ولا تغيّره بعدين (تغييره يفك كل الربوط).
2. **Google Cloud** (console.cloud.google.com، نفس المشروع اللي فيه دخول Google أو مشروع جديد):
   - APIs & Services ← Library: فعّل **YouTube Data API v3** و **YouTube Analytics API**.
   - Google Auth Platform ← Branding: اسم التطبيق «وصول»، إيميل الدعم، الشعار، الصفحة الرئيسية `https://wsool.link`،
     الخصوصية `https://wsool.link/privacy`، الشروط `https://wsool.link/terms`، النطاق المصرّح `wsool.link`.
   - Data Access ← Add scopes: `youtube.readonly` و `yt-analytics.readonly`.
   - Audience: External. وهو في وضع Testing أضف إيميلك كـ Test user.
   - Clients ← Create client ← **Web application**، Authorized redirect URIs:
     `https://wsool.link/api/connect/youtube/callback`
     (وللتجربة على نسخة الفرع: `https://claude-new-session-r5ze7y--graceful-fox-a6c2f5.netlify.app/api/connect/youtube/callback`).
3. **Netlify**: `GOOGLE_OAUTH_CLIENT_ID` و `GOOGLE_OAUTH_CLIENT_SECRET` (الاثنين «Contains secret values»)، ثم انشر.
4. **مراجعة Google** (قبل ما يستخدمه كل الصناع): Audience ← Publish app، ثم Verification:
   توثيق ملكية `wsool.link` في Google Search Console، وفيديو قصير يوضح الربط من الضغط على الزر لين ظهور الأرقام في
   الصفحة، وشرح ليش نحتاج كل صلاحية. تاخذ أيام لأسابيع.
   - قبل الموافقة: يقدر يربط بس الـ Test users (حد 100)، والربط ينتهي بعد 7 أيام (لازم يعيد الربط).

## تجهيز TikTok (المالك، مرة وحدة)

1. **developers.tiktok.com** ← Log in (بحساب TikTok حق وصول) ← **Manage apps** ← **Connect an app**.
2. **App details**: الأيقونة (`mobile/assets/icon.png`، 1024×1024)، الاسم `Wsool`، الوصف، رابط الشروط
   `https://wsool.link/terms` والخصوصية `https://wsool.link/privacy`، Platforms: **Web** ورابطه `https://wsool.link`
   (يطلب إثبات ملكية الرابط: سجل TXT في Cloudflare مثل Google).
3. **Add products** ← **Login Kit**، و Redirect URI (Web):
   `https://wsool.link/api/connect/tiktok/callback`
   (وللتجربة: `https://claude-new-session-r5ze7y--graceful-fox-a6c2f5.netlify.app/api/connect/tiktok/callback`).
4. **Scopes**: `user.info.basic` و `user.info.profile` و `user.info.stats`.
5. **Netlify**: `TIKTOK_CLIENT_KEY` و `TIKTOK_CLIENT_SECRET` («Contains secret values»).
   - قبل الموافقة: التجربة من **Sandbox** (له مفاتيح خاصة فيه، ويُضاف حسابك في Target users).
6. **Submit for review** مع فيديو للربط (مثل فيديو Google) وشرح لكل صلاحية. تاخذ أيام لأسبوعين.

## تجهيز Twitch (المالك، مرة وحدة، بدون مراجعة)

1. فعّل التحقق بخطوتين (2FA) في حساب Twitch (شرط عندهم لتسجيل تطبيق).
2. **dev.twitch.tv/console** ← **Register Your Application**:
   - Name: `Wsool`
   - OAuth Redirect URLs: `https://wsool.link/api/connect/twitch/callback`
     (وللتجربة: `https://claude-new-session-r5ze7y--graceful-fox-a6c2f5.netlify.app/api/connect/twitch/callback`)
   - Category: **Website Integration**، Client Type: **Confidential**.
3. **Manage** ← انسخ **Client ID**، واضغط **New Secret** وانسخ الـ Secret.
4. **Netlify**: `TWITCH_CLIENT_ID` و `TWITCH_CLIENT_SECRET` («Contains secret values»)، ثم انشر.

## ملاحظات تقنية
- مفتاح التحديث (refresh token) محفوظ مشفّر AES-256-GCM (`src/lib/token-box.ts`)، ولا يطلع للمتصفح أو التطبيق أبداً.
- حساب المنصة الواحد يُربط بصفحة وحدة بس (`platform` + `externalId` فريد).
- TikTok: مفتاح التحديث يتغير مع كل تحديث (يُحفظ الجديد أول بأول)، وصلاحيته سنة؛ بعدها «الربط متوقف» + تنبيه لإعادة الربط.
- التحديث: `syncConnections()` في الجوب كل ساعة، كل ربط مرة في اليوم. إذا سحب الصانع الصلاحية: الحالة «متوقف» + تنبيه
  `connection_lost`. فك الربط يسحب الصلاحية من المنصة ويحذف المفتاح، والتوثيق يبقى لين ينتهي.
- سياسة YouTube API: البيانات تتحدث يومياً (الحد 30 يوم)، والخصوصية فيها روابط شروط YouTube وخصوصية Google وصفحة سحب الصلاحية.
- تجربة محلية: `GOOGLE_API_FAKE` يوجّه كل طلبات Google لسيرفر وهمي.
