import type { AcademyCategory } from "@/lib/academy-shared";

/**
 * Starter articles for Wsool Academy (owner, Nov 2026): added as DRAFTS from admin → Academy → "Add starter articles",
 * for the owner to review, edit and publish. Arabic and English pairs share an address (the page shows the visitor's
 * language). Written in the newsletter format (src/lib/email/markup.ts). No made-up statistics.
 */
type Starter = { lang: "ar" | "en"; slug: string; category: AcademyCategory; title: string; summary: string; body: string };

export const ACADEMY_STARTERS: Starter[] = [
  {
    lang: "ar",
    slug: "how-to-price-your-ads",
    category: "pricing",
    title: "كيف تسعّر إعلانك كصانع محتوى؟",
    summary: "خطوات عملية تساعدك تحط سعر عادل لإعلانك: تحسب قيمتك، تقارن بالسوق، وتعرض أسعارك بشكل يقنع الشركات.",
    body: `أكثر سؤال يحتار فيه صانع المحتوى: «كم أطلب؟». لو طلبت قليل تخسر حقك، ولو طلبت كثير بدون مبرر ممكن الشركة ما ترد. الخبر الزين إن التسعير مو تخمين، له طريقة.

## 1. اعرف أرقامك الحقيقية
قبل أي سعر، اعرف هالأرقام عن كل منصة:
- عدد المتابعين
- متوسط المشاهدات لآخر 10 منشورات (أهم من عدد المتابعين)
- نسبة التفاعل (الإعجابات والتعليقات والمشاركات مقارنة بالمشاهدات)
- من هو جمهورك: الدول، والأعمار، والجنس

[box]
**نصيحة:** الشركات تهتم بالمشاهدات والجمهور أكثر من عدد المتابعين. صانع عنده 20 ألف متابع ومشاهداته عالية ممكن يكون أنفع للشركة من حساب عنده 200 ألف ومشاهداته قليلة.
[/box]

## 2. حدد نوع الإعلان
كل نوع له قيمة مختلفة، فلا تحط سعر واحد لكل شي:
- ستوري واحد أو مجموعة ستوريات
- فيديو قصير (ريلز أو تيك توك)
- فيديو كامل على يوتيوب
- حضور فعالية أو تغطية

وكل ما زاد الجهد (تصوير، مونتاج، أكثر من نسخة) زاد السعر.

## 3. احسب وقتك وتكاليفك
اسأل نفسك: كم ساعة ياخذ الإعلان من فكرة لتصوير لمونتاج؟ وهل فيه تكاليف (مكان، معدات، مساعد)؟ سعرك لازم يغطي هذا كله ويخلي لك ربح.

## 4. قارن بالسوق بدون ما تنسخ
اسأل صناع في نفس مجالك وحجمك، وشوف وش يطلبون. بس لا تنسخ أسعارهم حرفياً: جمهورك وجودة محتواك يفرقون.

## 5. اعرض أسعارك بوضوح
الشركة تحب تشوف السعر بدون مراسلات طويلة. اكتب أسعارك لكل منصة ونوع، وسوّ **باقة** تجمع أكثر من منصة بسعر أقل من مجموعها. هذا يشجع الشركة تاخذ أكثر.

---

## وش تسوي الحين؟
1. اجمع أرقامك لآخر شهر.
2. اكتب سعر لكل نوع إعلان في كل منصة.
3. حط أسعارك في ملفك الإعلامي، وشاركه مع الشركات برابط واحد.

في [وصول](https://wsool.link) تقدر تكتب أسعارك لكل منصة، وتسوي باقة يحسب لك فيها الموقع «بدل كذا، توفّر كذا %» تلقائياً.`,
  },
  {
    lang: "ar",
    slug: "what-to-put-in-your-media-kit",
    category: "content",
    title: "وش تحط في ملفك الإعلامي؟ الدليل الكامل",
    summary: "الملف الإعلامي هو أول شي تشوفه الشركة عنك. هذي الأقسام اللي لازم تكون فيه، وكيف ترتبها عشان تقنع من أول نظرة.",
    body: `الملف الإعلامي (Media Kit) هو «سيرتك الذاتية» كصانع محتوى. الشركة تقرر من خلاله: هل تشتغل معك ولا لا. وغالباً تاخذ قرارها في أقل من دقيقة.

## الأقسام الأساسية

## من أنت
- صورة واضحة واحترافية
- اسمك ومجالك في سطر واحد (مثلاً: «صانع محتوى تقني»)
- نبذة قصيرة: وش تقدم، ولمين

## أرقامك
- إجمالي المتابعين وعدد كل منصة
- المشاهدات الشهرية
- بيانات الجمهور: الدول والأعمار والجنس

[box]
**مهم:** الأرقام اللي ما يقدر أحد يتأكد منها تضعف ثقة الشركة. الأرقام **الموثّقة** أو المربوطة بالمنصة مباشرة تفرق كثير.
[/box]

## شغلك السابق
- شعارات الشركات اللي اشتغلت معها
- أمثلة من إعلاناتك السابقة (فيديو أو رابط المنشور)

## أسعارك
اكتبها بوضوح لكل منصة ونوع إعلان. وإذا ما تبي تعرضها للكل، خلها «عند التواصل» أو أرسلها للشركات المهتمة بس.

## طريقة التواصل
واتساب وإيميل واضحين. لا تخلي الشركة تدوّر عليك.

---

## أخطاء شائعة
- ملف PDF قديم بأرقام من سنة
- صور شاشة كثيرة بدون ترتيب
- لا أسعار ولا طريقة تواصل
- تصميم مزحوم وصعب القراءة

## الخلاصة
ملفك الإعلامي لازم يكون: **واضح، محدّث، موثّق**. وكل ما كان رابط واحد سهل يتفتح من الجوال، كان أحسن.

في [وصول](https://wsool.link) تسوي ملفك الإعلامي برابط واحد، وأرقامك تتحدث تلقائياً من المنصات، ويتحمّل كملف PDF بضغطة.`,
  },
  {
    lang: "ar",
    slug: "why-brands-dont-reply",
    category: "brands",
    title: "7 أسباب تخلي الشركات ما ترد على رسالتك",
    summary: "أرسلت للشركة وما ردّت؟ غالباً السبب واحد من هذي الأخطاء. اعرفها وتجنّبها في رسالتك الجاية.",
    body: `ترسل رسالة لشركة تبي تشتغل معها… وما يجيك رد. قبل ما تقول «ما يبوني»، راجع رسالتك. أغلب الأحيان المشكلة في طريقة التواصل، مو فيك.

## 1. رسالة عامة منسوخة
«مرحبا، أنا صانع محتوى وأبي أتعاون معكم». هذي الرسالة توصلهم عشرات المرات يومياً. اذكر اسم الشركة، ومنتج معيّن، وليش يناسب جمهورك.

## 2. ما فيه رابط لملفك
الشركة ما راح تروح تدوّر حساباتك وحدة وحدة. حط رابط واحد فيه كل شي.

## 3. أرقام بدون دليل
«عندي جمهور كبير ومتفاعل» كلام. الشركة تبي أرقام واضحة، ويفضّل تكون موثّقة.

## 4. ما تعرف وش تبي
اقترح فكرة محددة: «فيديو قصير أجرب فيه المنتج في رحلة، وستوريات معه». الشركة تحب اللي جاي بفكرة.

## 5. أرسلتها للشخص الغلط
ابحث عن المسؤول عن التسويق أو الشراكات، أو استخدم إيميل الشراكات إذا موجود، بدل حساب خدمة العملاء.

## 6. رسالة طويلة جداً
خلها قصيرة: من أنت، ليش هالشركة، وش تقترح، ورابط ملفك. أربع جمل تكفي.

## 7. ما تابعت
لا تزعجهم، بس رسالة متابعة لطيفة بعد أسبوع تفرق كثير.

---

[box]
**قالب رسالة تقدر تبدأ منه:**

السلام عليكم، أنا [اسمك]، صانع محتوى في مجال [مجالك]. جمهوري أغلبه من [الدولة] بأعمار [الفئة]، ويهتم بـ[الاهتمام]. شفت منتجكم [اسم المنتج] وعندي فكرة [الفكرة باختصار]. ملفي الإعلامي فيه أرقامي وأسعاري: [الرابط].
[/box]

جرّب تخلي الرابط في رسالتك رابط ملفك على [وصول](https://wsool.link): كل أرقامك وأعمالك وأسعارك في صفحة وحدة.`,
  },
  {
    lang: "ar",
    slug: "negotiating-with-brands",
    category: "brands",
    title: "كيف تتفاوض مع الشركات على الإعلان بدون ما تخسرها؟",
    summary: "الشركة قالت «السعر غالي»؟ هذي طرق تحافظ فيها على قيمتك وتوصل لاتفاق يرضي الطرفين.",
    body: `التفاوض جزء طبيعي من أي إعلان. الشركة تبي أفضل قيمة، وأنت تبي حقك. والهدف مو إنك «تفوز»، الهدف إنكم تتفقون وترجعون تشتغلون مع بعض.

## قبل التفاوض
- اعرف أقل سعر تقبله، ولا تنزل عنه.
- جهّز أرقامك وأمثلة من شغلك السابق.
- افهم وش تبي الشركة بالضبط: مبيعات؟ انتشار؟ تحميلات تطبيق؟

## لما يقولون «السعر غالي»
بدل ما تنزل السعر مباشرة، غيّر **الشي اللي يدفعون عليه**:
- قلّل عدد الستوريات أو المنشورات
- استبدل الفيديو الكامل بفيديو قصير
- اعرض باقة لأكثر من شهر بسعر أفضل

[box]
**القاعدة الذهبية:** كل تخفيض في السعر يقابله تخفيض في الشغل. كذا تحافظ على قيمتك ولا تعلّم الشركة إن سعرك قابل للنزول دائماً.
[/box]

## اتفقوا على كل شي كتابياً
قبل التصوير، اكتبوا (حتى لو برسالة واتساب واضحة):
- عدد المنشورات ونوعها والمنصات
- مواعيد النشر
- عدد التعديلات المسموحة
- مدة بقاء المنشور
- طريقة الدفع وموعده
- هل تقدر الشركة تستخدم المحتوى في إعلاناتها الممولة؟ (هذا عادة له سعر إضافي)

## التزم بالأنظمة
تأكد إنك توضح للجمهور إن المحتوى إعلان، وإن عندك الترخيص المطلوب في بلدك (مثل رخصة «موثوق» في السعودية).

---

## بعد الإعلان
أرسل للشركة نتائج الإعلان: المشاهدات والتفاعل. هذا يفتح باب لإعلان ثاني، ويخلي تفاوضك الجاي أسهل.`,
  },
  {
    lang: "ar",
    slug: "why-verified-numbers-matter",
    category: "growth",
    title: "ليش الأرقام الموثّقة تفرق مع الشركات؟",
    summary: "الشركات صارت حذرة من الأرقام غير الحقيقية. التوثيق يعطيك ميزة واضحة ويختصر عليك أسئلة كثيرة.",
    body: `الشركات اليوم تدفع مبالغ كبيرة على إعلانات المؤثرين، وصارت حذرة: تبي تتأكد إن الأرقام حقيقية قبل ما تدفع. وهنا يجي دور **التوثيق**.

## المشكلة مع الأرقام العادية
- صور الشاشة ممكن تكون قديمة أو معدّلة
- عدد المتابعين وحده ما يوضح التفاعل الحقيقي
- الشركة تضيع وقت في طلب إثباتات، ويمكن تختار غيرك لأنه أسهل

## وش يعني رقم موثّق؟
يعني إن الرقم جاي من المنصة نفسها أو تمت مراجعته، مو مكتوب باليد. وفيه طريقتين:

1. **الربط المباشر بالمنصة:** تسجّل دخولك في المنصة (مثل يوتيوب أو تيك توك)، والأرقام تنقرأ منها مباشرة وتتحدث كل يوم.
2. **المراجعة:** ترفع صورة لحسابك وفريق مختص يتأكد منها.

[box]
**الفرق عند الشركة:** لما تشوف علامة التوثيق جنب أرقامك، تعرف إن الأرقام حقيقية بدون ما تسأل. وهذا يسرّع قرارها.
[/box]

## مميزات التوثيق لك
- ثقة أكبر من أول نظرة
- أسئلة أقل ومراسلات أقصر
- مبرر واضح لأسعارك
- أرقامك تتحدث تلقائياً بدل ما تحدثها كل شهر

---

في [وصول](https://wsool.link) تقدر تربط حساباتك في YouTube و TikTok و Instagram وغيرها، وتتوثق أرقامك وتتحدث كل يوم تلقائياً.`,
  },
  {
    lang: "en",
    slug: "how-to-price-your-ads",
    category: "pricing",
    title: "How to price your sponsored content as a creator",
    summary: "A practical way to set a fair rate: know your real numbers, price each format, cover your time and show your rates clearly.",
    body: `"How much should I charge?" is the question every creator struggles with. Charge too little and you lose money; charge too much without a reason and brands go quiet. Pricing isn't guesswork, though. It has a method.

## 1. Know your real numbers
Before any rate, know these for each platform:
- Followers
- Average views on your last 10 posts (more important than followers)
- Engagement: likes, comments and shares compared with views
- Your audience: countries, ages and gender

[box]
**Tip:** brands care more about views and audience than follower count. A creator with 20K followers and strong views can be worth more to a brand than an account with 200K followers and weak views.
[/box]

## 2. Price each format separately
- One story or a set of stories
- A short video (Reels or TikTok)
- A full YouTube video
- Attending or covering an event

The more work involved (shooting, editing, several versions), the higher the rate.

## 3. Count your time and costs
How many hours does one ad take, from idea to filming to editing? Any costs, like a location, gear or an assistant? Your rate has to cover all of that and still leave a profit.

## 4. Compare with the market, don't copy it
Ask creators in your niche and size what they charge. Don't copy them exactly: your audience and content quality make the difference.

## 5. Show your rates clearly
Brands like seeing prices without long back-and-forth. List a rate for each platform and format, and offer a **bundle** across platforms for less than the sum. It nudges brands to book more.

---

## Your next steps
1. Gather your numbers for the last month.
2. Write a rate for each format on each platform.
3. Put your rates in your media kit and share it with one link.

On [Wsool](https://wsool.link) you can list rates per platform and build a bundle; the page shows "instead of X, save Y%" for you.`,
  },
  {
    lang: "en",
    slug: "what-to-put-in-your-media-kit",
    category: "content",
    title: "What to put in your media kit: the complete guide",
    summary: "Your media kit is the first thing a brand sees. These are the sections it needs and how to order them so it convinces at first glance.",
    body: `Your media kit is your résumé as a creator. Brands decide from it whether to work with you, often in under a minute.

## The essential sections

## Who you are
- A clear, professional photo
- Your name and niche in one line (for example, "Tech creator")
- A short bio: what you make, and for whom

## Your numbers
- Total followers and the count on each platform
- Monthly views
- Audience data: countries, ages and gender

[box]
**Important:** numbers nobody can check weaken a brand's trust. **Verified** numbers, or numbers linked straight from the platform, make a real difference.
[/box]

## Past work
- Logos of brands you've worked with
- Examples of previous ads (a video or a link to the post)

## Your rates
List them clearly per platform and format. If you'd rather not show them to everyone, mark them "on request" or send them only to interested brands.

## How to reach you
A clear WhatsApp and email. Don't make brands hunt for you.

---

## Common mistakes
- An old PDF with year-old numbers
- A pile of unsorted screenshots
- No rates and no contact details
- A cluttered design that's hard to read

## The bottom line
Your media kit should be **clear, up to date and verified**, and ideally one link that opens nicely on a phone.

On [Wsool](https://wsool.link) your media kit is one link, your numbers update from the platforms automatically, and it downloads as a PDF in one tap.`,
  },
  {
    lang: "en",
    slug: "why-brands-dont-reply",
    category: "brands",
    title: "7 reasons brands don't reply to your pitch",
    summary: "Sent a brand a message and heard nothing? It's usually one of these mistakes. Spot them and fix your next pitch.",
    body: `You message a brand you'd love to work with, and nothing comes back. Before deciding they're not interested, look at the message. Most of the time the problem is the pitch, not you.

## 1. A generic, copy-pasted message
"Hi, I'm a content creator and I'd like to collaborate." Brands get dozens of these a day. Name the brand, a specific product, and why it fits your audience.

## 2. No link to your media kit
Brands won't look up your accounts one by one. Include one link with everything.

## 3. Claims without proof
"I have a large, engaged audience" is just words. Brands want clear numbers, ideally verified.

## 4. No clear idea
Suggest something concrete: "a short video trying the product on a trip, plus a few stories." Brands love creators who come with an idea.

## 5. The wrong person
Find the marketing or partnerships contact, or a partnerships email, instead of customer service.

## 6. Too long
Keep it short: who you are, why this brand, what you propose, and your link. Four sentences are enough.

## 7. No follow-up
Don't spam, but one polite follow-up after a week makes a real difference.

---

[box]
**A template to start from:**

Hi, I'm [your name], a [niche] creator. Most of my audience is in [country], aged [range], and into [interest]. I saw your [product] and have an idea: [idea in one line]. My media kit with my numbers and rates: [link].
[/box]

Try making that link your [Wsool](https://wsool.link) page: your numbers, work and rates on one page.`,
  },
  {
    lang: "en",
    slug: "negotiating-with-brands",
    category: "brands",
    title: "How to negotiate with brands without losing the deal",
    summary: "The brand says your rate is too high? Here's how to protect your value and still reach a deal both sides are happy with.",
    body: `Negotiating is a normal part of any sponsorship. The brand wants the best value; you want a fair rate. The goal isn't to "win", it's to agree and work together again.

## Before you negotiate
- Know your lowest acceptable rate, and don't go below it.
- Have your numbers and examples of past work ready.
- Understand what the brand actually wants: sales, reach, app installs?

## When they say "that's too expensive"
Instead of dropping your price, change **what they're paying for**:
- Fewer stories or posts
- A short video instead of a full one
- A multi-month package at a better rate

[box]
**The golden rule:** every discount comes with less work. You keep your value, and the brand doesn't learn that your rate always comes down.
[/box]

## Put everything in writing
Before filming, agree in writing (a clear WhatsApp message counts):
- Number and type of posts, and the platforms
- Posting dates
- How many revision rounds
- How long the post stays up
- Payment method and date
- Whether the brand may use your content in paid ads (usually extra)

## Follow the rules
Make clear to your audience that the content is an ad, and hold any license your country requires (for example, the "Mawthooq" license in Saudi Arabia).

---

## After the campaign
Send the brand the results: views and engagement. It opens the door to the next deal and makes your next negotiation easier.`,
  },
  {
    lang: "en",
    slug: "why-verified-numbers-matter",
    category: "growth",
    title: "Why verified numbers matter to brands",
    summary: "Brands have grown wary of inflated numbers. Verification gives you a clear edge and saves a lot of back-and-forth.",
    body: `Brands spend serious money on creator campaigns, and they've grown careful: they want to know the numbers are real before they pay. That's where **verification** comes in.

## The trouble with ordinary numbers
- Screenshots can be old or edited
- Follower count alone says nothing about real engagement
- Brands lose time asking for proof, and may pick someone easier

## What a verified number means
It comes from the platform itself or has been checked, not typed by hand. There are two ways:

1. **Linking the platform:** you sign in to the platform (like YouTube or TikTok) and the numbers are read straight from it and updated daily.
2. **Review:** you upload a screenshot of your account and a team checks it.

[box]
**The difference for a brand:** a verified badge next to your numbers tells them they're real without asking. That speeds up their decision.
[/box]

## What verification gives you
- More trust at first glance
- Fewer questions and shorter threads
- A clear reason for your rates
- Numbers that update themselves instead of by hand every month

---

On [Wsool](https://wsool.link) you can link YouTube, TikTok, Instagram and more, so your numbers are verified and updated every day.`,
  },
];
