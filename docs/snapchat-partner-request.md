# طلب الوصول لـ Snap Public Profile API

الواجهة الرسمية اللي تعطي عدد مشتركين الحساب العام في Snapchat (Public Profile API) **بالموافقة فقط (allowlist)**:
ننشئ تطبيق OAuth في Snap Business Manager، ونرسل الـ Client ID لشخص في Snap مع وصف الاستخدام، وهم يفعّلونه.

## الخطوات (المالك)

1. **حساب أعمال:** ادخل `business.snapchat.com` بحساب Snapchat حق وصول، وسوّ **Organization** باسم `Wsool`
   (إذا طلب سجل تجاري حطه لما يجهز).
2. **تطبيق OAuth:** Business Manager ← **Business Details** ← **OAuth Apps** ← **+ OAuth App**:
   - App name: `Wsool`
   - Redirect URI: `https://wsool.link/api/connect/snapchat/callback`
   - انسخ **Client ID** (و Client Secret، يروح Netlify لاحقاً باسم `SNAPCHAT_CLIENT_SECRET`، لا ترسله لأحد).
3. **الطلب:** أرسل الإيميل اللي تحت مع الـ Client ID:
   - إذا عندك شخص تواصل في Snap (مدير حساب إعلاني، فريق Snap في الرياض/دبي) أرسله له.
   - إذا لا: أرسله إلى **dev-support@snap.com** (الإيميل المذكور في مرجع Snap Marketing API لطلبات الوصول). الـ Client ID بس، **بدون الـ Secret**.
4. لما يردون بالموافقة قل لـ Claude، ويبني الربط ويختبره (نفس نظام YouTube).

## نص الإيميل (انسخه)

**Subject:** Public Profile API access request — Wsool (wsool.link)

Hello Snap team,

We run Wsool (https://wsool.link), a media-kit platform for content creators in Saudi Arabia and the Arab world. Each
creator gets a public page with their verified follower numbers, past work and rates, which they share with brands.
Snapchat is one of the most important platforms for our creators.

We would like access to the Public Profile API so creators can connect their own Snapchat Public Profile (OAuth, with
their consent) and show their up-to-date subscriber count on their Wsool page, marked as verified. We would read only
profile metadata and subscriber stats, refresh them once a day, store tokens encrypted, and never post or read private
data. Creators can disconnect at any time.

OAuth Client ID: <paste the Client ID here>
Redirect URI: https://wsool.link/api/connect/snapchat/callback
Privacy policy: https://wsool.link/privacy — Terms: https://wsool.link/terms
Contact: ibrahim@wsool.link

Thank you,
Ibrahim — Wsool
