# Pulse.mn

Аймаг, сумын сэтгүүлчдийн мэдээллийн платформ — React (Vite) дээр бичсэн,
`ISP_Shaardlaga_1.xlsx` шаардлагын баримтын дагуу.

## Ажиллуулах

Шаардлага: **Node.js 18+**

```bash
npm install
npm run dev
```

Браузерт автоматаар **http://localhost:5173** нээгдэнэ.
(Нууц үг хэшлэх Web Crypto нь зөвхөн `localhost` эсвэл `https` дээр ажилладаг тул IP хаягаар бус localhost-оор нээнэ үү.)

Production build: `npm run build` → `dist/` хавтас.

Апп хоёр горимтой:

- **Демо горим** (анхдагч): өгөгдлийг браузерт хадгална, доорх туршилтын бүртгэлүүд ажиллана.
- **Supabase горим**: `.env.local`-д Supabase-ийн хаяг, түлхүүрийг бичихэд автоматаар асна.
  Өгөгдөл бүх хэрэглэгчийн дунд хуваалцагдаж, эрхийг сервер талд шалгана. Доорх «Supabase-тэй холбох» хэсгийг үзнэ үү.

## Туршилтын бүртгэлүүд (демо горим)

| Роль | И-мэйл | Нууц үг |
|---|---|---|
| Сэтгүүлч (баталгаажсан) | journalist@pulse.mn | journal123 |
| Сэтгүүлч (баталгаажаагүй) | temuulen@pulse.mn | journal123 |
| Редактор | editor@pulse.mn | editor123 |
| Админ | admin@pulse.mn | admin123 |
| Иргэн | citizen@pulse.mn | citizen123 |

Нэвтрэх хуудсан дээрх товчоор шууд нэвтэрч болно.

## Шаардлагын хэрэгжилт

| ID | Хаана | Тайлбар |
|---|---|---|
| FR-AUTH-001 | `pages/Register.jsx`, `pages/journalist/Verification.jsx`, `pages/admin/Verifications.jsx` | Иргэн (анхдагч) эсвэл сэтгүүлчээр бүртгүүлэх, и-мэйлийн код (OTP, [docs/email-otp.md](docs/email-otp.md)), сэтгүүлч баримт (үнэмлэх / МСНЭ / диплом) хавсаргаж **Админ** баталгаажуулах/шалтгаантай татгалзах, дахин илгээх |
| FR-CNT-001 | `pages/journalist/DraftEditor.jsx`, `components/NewsForm.jsx` | Зураг/бичлэг, аймаг-сум, зохиогчийн эрхийн зөвшөөрөл, урьдчилсан харагдац |
| FR-CNT-003 | `pages/journalist/Dashboard.jsx`, `DraftDetail.jsx` | Түүх, төлөв/огноогоор шүүх, редакторын шийдвэр, шалтгаан |
| FR-CNT-004 | `DraftEditor.jsx` (resubmit горим) | Буцаагдсан ноорог засаж дахин илгээх, өөрчлөлтгүй бол баталгаажуулалт асууна |
| FR-EDT-004 | `pages/editor/Review.jsx` | Зөвшөөрөх / буцаах / татгалзах (тайлбар заавал), шууд нийтлэх эсвэл товлох |
| FR-PUB-003 | `pages/editor/EditPublished.jsx` | Нийтлэгдсэн мэдээ засах, хувилбарын түүх |
| FR-PUB-004 | `pages/Home.jsx` | Улс төр, Эдийн засаг, Нийгэм, Дэлхий, Спорт ангилал |
| FR-INT-001 | `api/external.js`, `pages/admin/Integrations.jsx` | Цаг агаар, ханш; API унавал сүүлийн өгөгдлийг огноотой харуулж админд мэдэгдэнэ |
| NFR-SEC-006 | `lib/crypto.js` | PBKDF2-SHA256 + давс, ил текст хадгалахгүй |
| NFR-SEC-007 | `api/*` (`assertRole`), `components/Guards.jsx` | Роль бүрийн эрх API болон маршрут түвшинд |
| NFR-SEC-008 | `lib/files.js` | Өргөтгөл, хэмжээ, файлын агуулгын (magic bytes) шалгалт, давхар өргөтгөл хаана |
| NFR-TRN-002 | `components/NewsPreview.jsx`, `api/news.js` | Зохиогч, эх сурвалж заавал; нууцалсан бол тэмдэглэнэ |
| NFR-PERF-002 | `lib/outbox.js`, `DraftEditor.jsx` | Автомат түр хадгалалт, офлайн үед дараалалд хийж холболт сэргэхэд илгээнэ |
| NFR-REL-001/002 | `lib/db.js`, `pages/admin/System.jsx` | 24 цагийн автомат нөөц, JSON нөөц татах/сэргээх, алдаа гарвал өмнөх өгөгдөл хэвээр |
| NFR-DAT-001 | `versions` хүснэгт, `components/History.jsx` | Өөрчлөлт бүрийн огноо, хэрэглэгч, өмнөх агуулга |
| NFR-USF-001/002 | `styles.css` | Sans-serif (Inter), 14px бичвэр, H1 34/26px, H2 26px, H3 19px Bold; бүх UI монгол хэлээр |

## Бүтэц

```
src/
  api/          auth, news, admin, external — бизнес логик, эрхийн шалгалт
  lib/          db (өгөгдөл), crypto, files (FileStorage), seed, outbox, format
  components/   Layout, NewsForm, NewsPreview, History, InfoWidgets, ui
  pages/        нийтийн хуудас + journalist/ editor/ admin/
```

## Supabase-тэй холбох

1. supabase.com дээр шинэ төсөл үүсгэнэ (Region: Singapore эсвэл Tokyo ойр).
2. **SQL Editor → New query** → `supabase/schema.sql`-ийн агуулгыг бүтнээр нь хуулж **Run**.
   Хүснэгт, эрхийн дүрэм (RLS), файл хадгалах bucket, аймаг-сумын жагсаалт үүснэ.
3. И-мэйлийн кодоор (OTP) баталгаажуулах бол [docs/email-otp.md](docs/email-otp.md)-ийн дагуу SMTP тохируулж
   **Confirm email**-ийг асаана. Түр туршихдаа **Authentication → Sign In / Providers → Email → Confirm email**-ийг унтраавал код асуухгүй.
4. **Project Settings → API** (эсвэл **API Keys**) хэсгээс Project URL болон `anon` / `publishable` түлхүүрийг хуулна.
   `.env.example`-г `.env.local` нэрээр хуулаад бөглөнө. `service_role` / `secret` түлхүүрийг хэзээ ч бүү ашигла.
5. `npm install` → `npm run dev`. Сайт дээр админ болох хүнээрээ бүртгүүлнэ.
6. `supabase/make-admin.sql`-д и-мэйлээ бичээд SQL Editor дээр Run → таныг админ болгоно.
   Дахин нэвтэрч **Админ → Лог ба нөөц → Жишээ мэдээ нэмэх** дарж нүүр хуудсыг дүүргэж болно.
   Сэтгүүлчийн баримтыг **Админ → Сэтгүүлч баталгаажуулах** хэсэгт баталгаажуулна. Редакторыг **Админ → Хэрэглэгчид** хэсгээс томилно.
7. (Заавал биш) **Database → Extensions → pg_cron** асаагаад `supabase/cron.sql`-ийг Run —
   товлосон нийтлэл минут тутам автоматаар нийтлэгдэнэ. Үгүй бол редактор сайтад орсон үед нийтлэгдэнэ.
Өмнө нь `schema.sql`-ийг ажиллуулсан төсөлд шинэчлэл бүрийн `supabase/update-*.sql` файлыг SQL Editor дээр Run хийнэ
(`update-2026-11-11.sql`: Админ баталгаажуулах, «Онцлох мэдээ», мэдээ устгах эрх;
`update-2026-11-12.sql`: Сонгууль (нэр дэвшигч, нам), үзэлтийн статистик, зургийн байршил).

8. **Vercel → Project → Settings → Environment Variables**-д `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`-г нэмээд
   **Deployments → Redeploy**.

Эрх (NFR-SEC-007) сервер талд Row Level Security-ээр шалгагдана: жишээ нь сэтгүүлч өөр хүний мэдээг харах,
нийтлэгдсэн мэдээг засах, өөрийгөө админ болгох боломжгүй; буцаах шийдвэр тайлбаргүй бол өгөгдлийн сан хүлээж авахгүй.

## Анхаарах зүйл

- **Backend:** Supabase горимд өгөгдөл Postgres-д (`src/lib/remote.js`), файлууд Supabase Storage-д хадгалагдана.
  Демо горимд `localStorage` болон `IndexedDB` ашиглана.
  Мэдэгдэл (INT-003) одоогоор платформ доторх мэдэгдлээр хийгдсэн; и-мэйл/SMS-ийг дараа нэмнэ.
- `app_settings` хүснэгтийг хэн ч уншиж чадна — API тохиргоонд нууц түлхүүр бүү хадгал.
- **API:** weather.gov.mn, mongolbank.mn нь браузерээс шууд дуудах нээлттэй (CORS) API-гүй тул анхдагчаар
  Open-Meteo болон ExchangeRate-API (open.er-api.com) ашигласан. Админ → API интеграц хэсгээс URL-ийг сольж болно.
- **Нээлттэй асуулт №1, №2:** файлын хязгаарыг санал болгосон утгаар (баримт ≤5MB, зураг ≤5MB, бичлэг ≤50MB)
  тохируулсан (`lib/constants.js`); «Татгалзсан» ноорогийг дахин илгээх боломжгүй гэж үзсэн.
- Өгөгдлийг эхлүүлэх: Админ → Лог ба нөөц → «Жишээ өгөгдөл рүү буцаах».
