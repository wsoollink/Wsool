# ربط المنصات (تحديث المتابعين والجمهور تلقائياً)

الصانع يربط حسابه بتسجيل الدخول في المنصة نفسها، وبعدها يتحدث عدد المتابعين وبيانات الجمهور كل يوم تلقائياً،
والحساب يتوثّق ما دام مربوط. الكود: `src/lib/connect/` (منصة = ملف مثل `youtube.ts` + سطر في `PROVIDERS`).
زر الربط ما يظهر إلا لما تكون مفاتيح المنصة و `TOKEN_ENCRYPTION_KEY` موجودة في Netlify.
**الربط للخطة الاحترافية بس** (والتجربة المجانية تشمله). صفحة نزلت للمجانية: الربط يبقى والأرقام على آخر تحديث، بس
التحديث اليومي يتوقف، ويرجع تلقائياً إذا اشترك (بدون إعادة ربط).

## وش نجيب من كل منصة (آخر تحديث: 27 أكتوبر 2026)

✅ = نجيبه تلقائياً · ⏳ = ممكن نضيفه · ⚠️ = محدود · ❓ = ما نعرف للحين · ❌ = المنصة ما توفره

### مربوطة الحين
| المنصة | المتابعين | توثيق تلقائي | الجمهور (عمر/جنس/دول) | المشاهدات الشهرية | الحالة |
| --- | --- | --- | --- | --- | --- |
| YouTube | ✅ | ✅ | ✅ (والمدن أحياناً) | ✅ | منشور. مراجعة Google قيد الانتظار (أُرسلت 25 أكتوبر) |
| TikTok | ✅ | ✅ | ❌ | ⏳ (مشاهدات الفيديوهات) | منشور بمفاتيح Sandbox؛ بعد موافقة TikTok نبدّل لـ Production |
| X | ✅ | ✅ | ❌ | ⏳ (كل طلب مدفوع) | منشور ومربوط (27 أكتوبر). حد يومي `X_DAILY_SYNC_LIMIT` = 500 |
| Twitch | ✅ | ✅ | ❌ | ❌ | منشور |
| Discord | ✅ (أعضاء السيرفر) | ✅ | ❌ | ❌ | منشور. الصانع لازم يكون مالك أو مدير السيرفر |
| Telegram | ✅ (مشتركين القناة) | ✅ | ❌ | ❌ | منشور. بوت وصول كمشرف في القناة = إثبات الملكية |

### جاية
| المنصة | المتابعين | الجمهور | المشاهدات | ننتظر |
| --- | --- | --- | --- | --- |
| Instagram | ✅ | ✅ (عمر، جنس، دول، مدن؛ من 100 متابع) | ✅ | **مبني** (28 أكتوبر). يشتغل الحين للمختبرين فقط؛ ينتظر مراجعة تطبيق Meta. حساب صانع أو تجاري فقط |
| Threads | ✅ | ✅ | ✅ | نفس Meta |
| Facebook (صفحة) | ✅ | ⚠️ | ✅ | نفس Meta |
| Snapchat | ✅ متوقع | ❓ | ❓ | موافقة Snap: `docs/snapchat-partner-request.md` |
| Pinterest | ✅ | ⚠️ (حسابات تجارية) | ✅ | نتأكد وقت البناء |

### ما نقدر نربطها
| المنصة | السبب | البديل |
| --- | --- | --- |
| Spotify | من فبراير 2026 شال عدد المتابعين من واجهته للتطبيقات الصغيرة (حد 5 مستخدمين، والموسّع فوق 250 ألف مستخدم شهرياً) | يدوي + توثيق بصورة شاشة |
| LinkedIn | بيانات الحساب الشخصي لبرنامج شركاء مغلق | نفس الشي |
| Jaco | ما عندهم API عام | نفس الشي |

أي منصة ما تعطي الجمهور: الصانع يعبّيه من صورة الإحصائيات (قراءة بالذكاء الاصطناعي). Phyllo (`docs/` لاحقاً) ممكن يسد بعض الفراغات.

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

## تجهيز Discord (المالك، مرة وحدة، بدون مراجعة)

1. **discord.com/developers/applications** (بحساب Discord حق وصول) ← **New Application** ← الاسم `Wsool`.
2. **General Information**: الأيقونة، الوصف، Privacy Policy URL `https://wsool.link/privacy`، Terms `https://wsool.link/terms` ← Save.
3. **OAuth2**: انسخ **Client ID**، و **Reset Secret** وانسخ الـ Secret. تحت **Redirects** ← Add Redirect:
   `https://wsool.link/api/connect/discord/callback` ← **Save Changes**.
4. **Netlify**: `DISCORD_CLIENT_ID` و `DISCORD_CLIENT_SECRET` («Contains secret values»)، ثم انشر.

## تجهيز Telegram (المالك، مرة وحدة، بدون مراجعة)

1. في Telegram افتح **@BotFather** ← `/newbot` ← الاسم `Wsool` ← اسم مستخدم ينتهي بـ `bot` (مثل `WsoolLinkBot`).
2. BotFather يعطيك **توكن**: حطه في Netlify باسم `TELEGRAM_BOT_TOKEN` («Contains secret values»)، ولا ترسله لأحد.
3. (اختياري) `/setuserpic` شعار وصول، و `/setdescription` وصف قصير.
4. انشر. الموقع يربط البوت بنفسه (webhook) أول ما أحد يضغط «اربط Telegram» وكل ساعة.

## تجهيز X (المالك، مرة وحدة، بدون مراجعة لكنه مدفوع)

1. **developer.x.com** (بحساب X حق وصول) ← سجّل حساب مطوّر واكتب وصف الاستخدام (قراءة عدد متابعين الصانع بعد موافقته، بدون نشر).
2. **Billing**: أضف بطاقة واشحن رصيد صغير (10-20$). يفضّل بدون شحن تلقائي، أو بحد صغير.
3. أنشئ **App** ← **User authentication settings**:
   - App permissions: **Read**
   - Type of App: **Web App, Automated App or Bot** (Confidential client)
   - Callback URI: `https://wsool.link/api/connect/x/callback`
   - Website: `https://wsool.link`، Terms `https://wsool.link/terms`، Privacy `https://wsool.link/privacy`
4. **Keys and tokens** ← **OAuth 2.0 Client ID and Client Secret**: حطهم في Netlify باسم `X_CLIENT_ID` و `X_CLIENT_SECRET` (secret)، ثم انشر.

## تجهيز Instagram (المالك، تم 28 أكتوبر 2026)

1. **business.facebook.com**: Business portfolio باسم الشركة، الدومين `wsool.link` موثّق (سجل TXT في Cloudflare)، وطلب توثيق النشاط أُرسل.
2. **developers.facebook.com** ← تطبيق **Wsool** (Business) ← Use cases: Instagram API + Threads API.
3. Instagram API ← **API setup with Instagram login** (مو Unified login: تلك لحسابات الشركة نفسها بصلاحيات إعلانات). الصلاحيات المطلوبة في المراجعة: `instagram_business_basic` و `instagram_business_manage_insights` فقط.
4. Business login settings: redirect `https://wsool.link/api/connect/instagram/callback`، deauthorize `https://wsool.link/api/connect/instagram/deauthorize`، data deletion `https://wsool.link/api/connect/instagram/data-deletion`.
5. Netlify: `INSTAGRAM_APP_ID` (Instagram app ID، مو Facebook app ID) و `INSTAGRAM_APP_SECRET` (secret).
6. للتجربة قبل المراجعة: App roles ← Instagram Tester ← الحساب، ثم قبول الدعوة من Instagram (الإعدادات ← Apps and websites ← Tester invites).
7. التالي: فيديو + أوصاف الصلاحيات ← App Review (يحتاج توثيق النشاط).

## ملاحظات تقنية
- مفتاح التحديث (refresh token) محفوظ مشفّر AES-256-GCM (`src/lib/token-box.ts`)، ولا يطلع للمتصفح أو التطبيق أبداً.
- حساب المنصة الواحد يُربط بصفحة وحدة بس (`platform` + `externalId` فريد).
- TikTok: مفتاح التحديث يتغير مع كل تحديث (يُحفظ الجديد أول بأول)، وصلاحيته سنة؛ بعدها «الربط متوقف» + تنبيه لإعادة الربط.
- Discord: الحساب = سيرفر (رابط دعوة). الربط يحوّل رابط الدعوة لرقم السيرفر ويقبله بس إذا الصانع مالكه أو عنده Administrator / Manage Server، والعدد = أعضاء السيرفر. إذا فقد الصلاحية: «الربط متوقف» + تنبيه.
- Telegram: الربط = الصانع يضغط «اربط» (نسجّل الطلب 30 دقيقة) ثم يضيف البوت مشرف في قناته العامة اللي اسمها نفس المعرّف؛ تيليقرام يرسل للبوت (`/api/telegram/webhook`، سر في الهيدر) ونربط. بوت أُضيف بدون طلب يطلع من القناة. حذف البوت = «الربط متوقف» + تنبيه.
- X: OAuth 2.0 + PKCE (الـ verifier مشتق من الـ state الموقّع على السيرفر). نفاد الرصيد (402/429) = إعادة محاولة لاحقاً، مو «ربط متوقف».
- التحديث: `syncConnections()` في الجوب كل ساعة، كل ربط مرة في اليوم. إذا سحب الصانع الصلاحية: الحالة «متوقف» + تنبيه
  `connection_lost`. فك الربط يسحب الصلاحية من المنصة ويحذف المفتاح، والتوثيق يبقى لين ينتهي.
- سياسة YouTube API: البيانات تتحدث يومياً (الحد 30 يوم)، والخصوصية فيها روابط شروط YouTube وخصوصية Google وصفحة سحب الصلاحية.
- تجربة محلية: `GOOGLE_API_FAKE` يوجّه كل طلبات Google لسيرفر وهمي.
