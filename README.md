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

## Туршилтын бүртгэлүүд

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
| FR-AUTH-001 | `pages/Register.jsx`, `pages/journalist/Verification.jsx`, `pages/admin/Verifications.jsx` | Баримт (үнэмлэх / МСНЭ / диплом) хавсаргаж бүртгүүлэх, админ баталгаажуулах/шалтгаантай татгалзах, дахин илгээх |
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

## Анхаарах зүйл

- **Backend:** энэ хувилбарт өгөгдөл браузерын `localStorage`, файлууд `IndexedDB`-д хадгалагдана —
  татаад шууд ажиллахад зориулсан. Багийн Postgres/REST backend бэлэн болоход зөвхөн `src/api/*.js`
  болон `src/lib/files.js`-ийн функцуудыг `fetch` дуудлагаар солиход UI өөрчлөгдөхгүй.
  Мэдэгдэл (INT-003) одоогоор платформ доторх мэдэгдлээр хийгдсэн; и-мэйл/SMS-ийг backend-д нэмнэ.
- **API:** weather.gov.mn, mongolbank.mn нь браузерээс шууд дуудах нээлттэй (CORS) API-гүй тул анхдагчаар
  Open-Meteo болон ExchangeRate-API (open.er-api.com) ашигласан. Админ → API интеграц хэсгээс URL-ийг сольж болно.
- **Нээлттэй асуулт №1, №2:** файлын хязгаарыг санал болгосон утгаар (баримт ≤5MB, зураг ≤5MB, бичлэг ≤50MB)
  тохируулсан (`lib/constants.js`); «Татгалзсан» ноорогийг дахин илгээх боломжгүй гэж үзсэн.
- Өгөгдлийг эхлүүлэх: Админ → Лог ба нөөц → «Жишээ өгөгдөл рүү буцаах».
