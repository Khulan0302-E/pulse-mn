// Анхны жишээ өгөгдөл. Бүх нэр, мэдээ нь зохиомол жишээ.
import { hashPassword } from './crypto';
import { uploadFile } from './files';
import { CATEGORIES, LOCATIONS } from './constants';

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

function makeSamplePdf(text) {
  const stream = `BT /F1 20 Tf 72 700 Td (${text}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (out += `${String(o).padStart(10, '0')} 00000 n \n`));
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}

export const SAMPLE_ARTICLES = [
  {
    cat: 1, loc: ['Дорнод', 'Хэрлэн'], author: 3, h: 2, views: 412,
    title: 'Аймгийн ИТХ ирэх оны төсвийн төслийг хэлэлцэж эхэллээ',
    source: 'Аймгийн Иргэдийн Төлөөлөгчдийн Хурлын тамгын газрын хэвлэлийн мэдээ',
    content: `Аймгийн Иргэдийн Төлөөлөгчдийн Хурлын ээлжит хуралдаан өнөөдөр эхэлж, ирэх оны орон нутгийн төсвийн төслийг хэлэлцэх асуудлын дарааллын эхэнд оруулав.

Төлөөлөгчид боловсрол, эрүүл мэндийн байгууламжийн засвар, сумдын төвийн гудамжны гэрэлтүүлэгт төсвөөс илүү хөрөнгө хуваарилах саналыг гаргасан байна. Төслийг хэлэлцэх явцад иргэдээс ирүүлсэн саналыг мөн танилцуулна.

Хуралдаан гурван өдөр үргэлжилж, төсвийн эцсийн хувилбарыг баталсны дараа нийтэд нээлттэй мэдээлэхээр төлөвлөжээ.`,
  },
  {
    cat: 1, loc: ['Улаанбаатар', 'Сүхбаатар'], author: 4, h: 20, views: 238,
    title: 'Орон нутгийн засаглалын шинэчлэлийн талаар олон нийтийн хэлэлцүүлэг өрнөв',
    source: 'Хэлэлцүүлэг зохион байгуулагч ТББ-ын албан ёсны мэдэгдэл',
    content: `Иргэний нийгмийн байгууллагуудын санаачилгаар зохион байгуулсан нээлттэй хэлэлцүүлэгт аймаг, сумдаас 120 гаруй төлөөлөгч оролцлоо.

Оролцогчид орон нутгийн төсвийн ил тод байдал, иргэдийн оролцоог нэмэгдүүлэх цахим хэрэгслийн талаар санал солилцов. Хэлэлцүүлгийн дүнгээр бэлтгэсэн зөвлөмжийг холбогдох байгууллагуудад хүргүүлэх юм.

Зохион байгуулагчид дараагийн хэлэлцүүлгийг баруун бүсийн аймгуудад хийхээр төлөвлөж байгаа аж.`,
  },
  {
    cat: 2, loc: ['Өвөрхангай', 'Арвайхээр'], author: 3, h: 5, views: 530,
    title: 'Ноолуурын бэлтгэлийн үнэ өнгөрсөн оныхоос нэмэгдлээ',
    source: 'Аймгийн Хүнс, хөдөө аж ахуйн газрын мэдээлэл; малчдын ярилцлага',
    content: `Энэ улиралд аймгийн төвд үйл ажиллагаа явуулж буй бэлтгэгчид ноолуурын килограмыг өнгөрсөн оныхоос өндөр үнээр худалдан авч байна.

Малчдын хэлж буйгаар чанартай, ангилсан ноолуур илүү өндөр үнэ хүрч байгаа тул самнах, ангилах ажилд анхаарах болжээ. Хоршоогоор нэгдэн борлуулж буй малчид тээврийн зардлаа хэмнэж байгаа юм.

Мэргэжилтнүүд үнийн хэлбэлзлээс хамгаалахын тулд гэрээт нийлүүлэлт, хоршооллыг өргөжүүлэхийг зөвлөж байна.`,
  },
  {
    cat: 2, loc: ['Дархан-Уул', 'Дархан'], author: 4, h: 30, views: 196,
    title: 'Жижиг, дунд үйлдвэрлэл эрхлэгчдэд зориулсан хөнгөлөлттэй зээлийн хөтөлбөр нээгдэнэ',
    source: 'Аймгийн Засаг даргын Тамгын газрын хэвлэлийн хурал',
    content: `Аймгийн хөгжлийн сангаас жижиг, дунд үйлдвэрлэл эрхлэгчдэд зориулсан хөнгөлөлттэй зээлийн шинэ шат ирэх сараас эхлэн хүлээн авна.

Хүнсний үйлдвэрлэл, оёдол, модон эдлэл зэрэг дотоодын түүхий эд ашигладаг салбарт тэргүүн ээлжинд зээл олгох бөгөөд бизнес төлөвлөгөөг сургалтаар дамжуулан бэлтгэхэд дэмжлэг үзүүлнэ.

Хүсэлтийг аймгийн Хөдөлмөр, халамжийн үйлчилгээний газраар дамжуулан цахимаар хүлээн авах юм.`,
  },
  {
    cat: 3, loc: ['Хөвсгөл', 'Мөрөн'], author: 4, h: 8, views: 347,
    title: 'Өвлийн бэлтгэлийн хүрээнд сургуулиудын дулааны шугамыг шинэчиллээ',
    source: 'Аймгийн Боловсролын газар',
    content: `Мөрөн сумын гурван ерөнхий боловсролын сургуулийн дулааны дотор шугамыг бүрэн шинэчилж, хүйтний улиралд бэлэн болгожээ.

Ажлыг зуны амралтын үеэр эхлүүлж, хичээлийн шинэ жилээс өмнө дуусгах төлөвлөгөөтэй байсан ч зарим материал хоцорч ирснээс хугацаа бага зэрэг сунжээ.

Сургуулийн удирдлагууд одоо ангиудын дулаан хэвийн байгааг мэдэгдэж, эцэг эхчүүдэд талархал илэрхийлэв.`,
  },
  {
    cat: 3, loc: ['Улаанбаатар', 'Баянзүрх'], author: 3, h: 50, views: 158,
    title: 'Хорооны иргэдийн санаачилгаар хүүхдийн шинэ тоглоомын талбай ашиглалтад орлоо',
    source: 'Хорооны Засаг даргын мэдээлэл',
    content: `Хорооны иргэд хандив цуглуулж, хувийн хэвшлийн дэмжлэгтэйгээр хүүхдийн тоглоомын талбайг шинэчлэн ашиглалтад орууллаа.

Талбайд аюулгүй зөөлөн хучилт, сүүдрэвч, суудал байрлуулсан бөгөөд орон сууцны хороолол хоорондын явган замыг давхар засварлажээ.

Оршин суугчид талбайн арчилгааг ээлжээр хариуцах журам гаргасан байна.`,
  },
  {
    cat: 4, loc: ['Улаанбаатар', 'Чингэлтэй'], author: 4, h: 12, views: 121,
    title: 'Азийн томоохон хотууд нийтийн тээврээ цахилгаанжуулах ажлыг эрчимжүүлж байна',
    source: 'Олон улсын хэвлэлийн тойм',
    content: `Сүүлийн жилүүдэд Азийн олон хот нийтийн тээврийн автобусаа цахилгаан хөдөлгүүртээр солих хөтөлбөрийг үе шаттайгаар хэрэгжүүлж байна.

Мэргэжилтнүүд агаарын бохирдол, түлшний импортын зардлыг бууруулах давуу талыг онцолж байгаа ч хүйтэн уур амьсгалтай хотуудад батарейн ашиглалтын хугацаа сорилт хэвээр байгааг тэмдэглэжээ.

Хүйтэн бүсийн хотуудын туршлагыг судлах нь манай хотуудад ч ач холбогдолтой гэж үзэж байна.`,
  },
  {
    cat: 4, loc: ['Улаанбаатар', 'Хан-Уул'], author: 3, h: 70, views: 88,
    title: 'Олон улсын шинжлэх ухааны бага хуралд Монголын залуу судлаачид илтгэл тавилаа',
    source: 'Их сургуулийн судалгааны албаны мэдээлэл',
    content: `Олон улсын шинжлэх ухааны бага хуралд Монголын их, дээд сургуулийн залуу судлаачид бэлчээрийн доройтол, усны нөөцийн чиглэлээр илтгэл тавилаа.

Судлаачид хиймэл дагуулын мэдээ болон хээрийн хэмжилтийг хослуулсан аргачлалаа танилцуулж, гадаадын хамтрагчидтай хамтарсан төсөл эхлүүлэх тохиролцоонд хүрчээ.`,
  },
  {
    cat: 5, loc: ['Улаанбаатар', 'Баянгол'], author: 4, h: 3, views: 610,
    title: 'Сагсан бөмбөгийн аварга шалгаруулах тэмцээний хагас шигшээ шатны хуваарь гарлаа',
    source: 'Тэмцээн зохион байгуулагч холбооны мэдээлэл',
    content: `Улсын аварга шалгаруулах сагсан бөмбөгийн тэмцээний хагас шигшээ шатны тоглолтууд энэ долоо хоногийн сүүлээр болно.

Хэсгийн шатанд хамгийн олон оноо цуглуулсан баг хагас шигшээд дөрөвдүгээр байрын багтай тоглох бөгөөд тоглолт бүрийг шууд дамжуулна.

Тасалбарыг цахимаар болон заалны кассаас худалдаалж байна.`,
  },
  {
    cat: 5, loc: ['Завхан', 'Улиастай'], author: 3, h: 26, views: 274,
    title: 'Завханы залуу бөхчүүд бүсийн тэмцээнээс медаль хүртлээ',
    source: 'Аймгийн Биеийн тамир, спортын газар',
    content: `Баруун бүсийн залуучуудын чөлөөт бөхийн тэмцээнд Завхан аймгийн тамирчид хоёр алт, гурван хүрэл медаль хүртлээ.

Дасгалжуулагчийн хэлснээр шинэ спорт заал ашиглалтад орсноор өвлийн улиралд тасралтгүй бэлтгэл хийх боломж бүрдсэн нь амжилтын үндэс болжээ.`,
  },
];

export async function buildSeed() {
  const [adminH, editorH, journalH, citizenH] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('editor123'),
    hashPassword('journal123'),
    hashPassword('citizen123'),
  ]);

  const locations = [];
  Object.entries(LOCATIONS).forEach(([aimag, sums]) =>
    sums.forEach((sum) => locations.push({ id: locations.length + 1, aimag, sum })),
  );
  const loc = (a, s) => locations.find((l) => l.aimag === a && l.sum === s).id;

  const users = [
    { id: 1, fullName: 'Пульс Админ', email: 'admin@pulse.mn', phone: '99110001', passwordHash: adminH, role: 'admin', org: 'Pulse.mn', status: 'active', createdAt: hoursAgo(900) },
    { id: 2, fullName: 'Д. Сарантуяа', email: 'editor@pulse.mn', phone: '99110002', passwordHash: editorH, role: 'editor', org: 'Pulse.mn', status: 'active', createdAt: hoursAgo(880) },
    { id: 3, fullName: 'Б. Батбаяр', email: 'journalist@pulse.mn', phone: '88110003', passwordHash: journalH, role: 'journalist', org: 'Pulse.mn', status: 'active', createdAt: hoursAgo(800) },
    { id: 4, fullName: 'Э. Номин', email: 'nomin@pulse.mn', phone: '88110004', passwordHash: journalH, role: 'journalist', org: 'Хөвсгөл ТВ', status: 'active', createdAt: hoursAgo(700) },
    { id: 5, fullName: 'Г. Тэмүүлэн', email: 'temuulen@pulse.mn', phone: '95110005', passwordHash: journalH, role: 'journalist', org: '', status: 'active', createdAt: hoursAgo(6) },
    { id: 6, fullName: 'О. Анар', email: 'citizen@pulse.mn', phone: '', passwordHash: citizenH, role: 'citizen', org: '', status: 'active', createdAt: hoursAgo(300) },
  ];

  let sampleDoc = null;
  try {
    sampleDoc = await uploadFile(makeSamplePdf('Pulse.mn - sample verification document'));
  } catch {
    /* IndexedDB боломжгүй үед файлгүй үлдэнэ */
  }

  const verifications = [
    { id: 1, userId: 3, docType: 'org_id', fileUrl: null, fileName: 'unemleh.pdf', status: 'approved', reviewerId: 2, decidedAt: hoursAgo(790), reason: '', createdAt: hoursAgo(800) },
    { id: 2, userId: 4, docType: 'msne', fileUrl: null, fileName: 'msne.pdf', status: 'approved', reviewerId: 2, decidedAt: hoursAgo(690), reason: '', createdAt: hoursAgo(700) },
    { id: 3, userId: 5, docType: 'diploma', fileUrl: sampleDoc, fileName: 'diplom.pdf', status: 'pending', reviewerId: null, decidedAt: null, reason: '', createdAt: hoursAgo(6) },
  ];

  const news = [];
  const versions = [];
  const decisions = [];
  SAMPLE_ARTICLES.forEach((a, i) => {
    const id = i + 1;
    const n = {
      id, journalistId: a.author, title: a.title, content: a.content, categoryId: a.cat,
      locationId: loc(...a.loc), status: 'published', version: 1, source: a.source,
      sourceConfidential: false, copyrightConsent: true, createdAt: hoursAgo(a.h + 6),
      submittedAt: hoursAgo(a.h + 5), scheduledAt: null, publishedAt: hoursAgo(a.h),
      updatedAt: hoursAgo(a.h), views: a.views,
    };
    news.push(n);
    versions.push({ id: versions.length + 1, newsId: id, version: 1, userId: a.author, createdAt: n.submittedAt, snapshot: { title: n.title, content: n.content, categoryId: n.categoryId, locationId: n.locationId, source: n.source, media: [] } });
    decisions.push({ id: decisions.length + 1, newsId: id, version: 1, editorId: 2, decision: 'approve', comment: '', createdAt: n.publishedAt });
  });

  // Сэтгүүлч Б. Батбаяр (id 3)-ын янз бүрийн төлөвтэй ноорог
  const drafts = [
    {
      status: 'returned', h: 10, cat: 3, loc: ['Говь-Алтай', 'Есөнбулаг'],
      title: 'Сумын төвийн худгийн усны чанарыг шалгав',
      source: 'Лабораторийн шинжилгээний дүн',
      content: 'Сумын төвийн гурван худгийн уснаас дээж авч шинжлүүлэхэд хоёрт нь эрдэсжилт зөвшөөрөгдөх хэмжээнээс өндөр гарчээ.\n\nОршин суугчид ундны усаа өөр эх үүсвэрээс зөөх болсон байна.',
      decision: { decision: 'return', comment: 'Лабораторийн нэр, шинжилгээ хийсэн огноог тодорхой бичнэ үү. Мөн сумын ЗДТГ-ын тайлбарыг авч оруулбал сайн байна.' },
    },
    {
      status: 'review', h: 4, cat: 2, loc: ['Сэлэнгэ', 'Мандал'],
      title: 'Ургац хураалт дуусах шатандаа орлоо',
      source: 'Сумын хөдөө аж ахуйн мэргэжилтэн',
      content: 'Мандал сумын тариаланчид улаан буудайн ургацын 90 гаруй хувийг хурааж дууссан байна.\n\nЭнэ жил зуны хур тунадас хангалттай байсан тул га-гийн дундаж ургац өмнөх оныхоос дээгүүр гарах төлөвтэй.',
    },
    {
      status: 'rejected', h: 40, cat: 1, loc: ['Төв', 'Зуунмод'],
      title: 'Нэр бүхий албан тушаалтан төсвийн хөрөнгийг завшсан гэх мэдээлэл',
      source: '',
      content: 'Нэрээ нууцлахыг хүссэн эх сурвалжийн хэлснээр...',
      decision: { decision: 'reject', comment: 'Баримтаар нотлогдоогүй, гүтгэлгийн эрсдэлтэй. Албан ёсны баримт бичиггүйгээр нийтлэх боломжгүй.' },
    },
    {
      status: 'draft', h: 1, cat: 3, loc: ['Төв', 'Эрдэнэ'],
      title: 'Өвлийн аялал жуулчлалын улирал эхэлж байна',
      source: '',
      content: 'Тэрэлжийн бүсийн амралтын газрууд өвлийн улирлын бэлтгэлээ хангаж эхэлжээ.',
    },
  ];
  drafts.forEach((d) => {
    const id = news.length + 1;
    const n = {
      id, journalistId: 3, title: d.title, content: d.content, categoryId: d.cat,
      locationId: loc(...d.loc), status: d.status, version: 1, source: d.source,
      sourceConfidential: false, copyrightConsent: d.status !== 'draft', createdAt: hoursAgo(d.h + 2),
      submittedAt: d.status === 'draft' ? null : hoursAgo(d.h + 1), scheduledAt: null, publishedAt: null,
      updatedAt: hoursAgo(d.h), views: 0,
    };
    news.push(n);
    versions.push({ id: versions.length + 1, newsId: id, version: 1, userId: 3, createdAt: n.createdAt, snapshot: { title: n.title, content: n.content, categoryId: n.categoryId, locationId: n.locationId, source: n.source, media: [] } });
    if (d.decision) decisions.push({ id: decisions.length + 1, newsId: id, version: 1, editorId: 2, ...d.decision, createdAt: hoursAgo(d.h) });
  });

  return {
    schema: 1,
    users,
    verifications,
    categories: CATEGORIES.map(({ id, name }) => ({ id, name })),
    locations,
    news,
    media: [],
    decisions,
    versions,
    notifications: [
      { id: 1, userId: 3, newsId: 11, content: 'Редактор таны «Сумын төвийн худгийн усны чанарыг шалгав» ноорогийг буцаалаа.', createdAt: hoursAgo(10), read: false },
      { id: 2, userId: 2, newsId: null, content: 'Шинэ сэтгүүлч Г. Тэмүүлэн баталгаажуулах хүсэлт илгээлээ.', createdAt: hoursAgo(6), read: false },
      { id: 3, userId: 2, newsId: 12, content: 'Шинэ ноорог хянуулахаар ирлээ: «Ургац хураалт дуусах шатандаа орлоо».', createdAt: hoursAgo(5), read: false },
    ],
    external: [],
    settings: {
      weather: {
        url: 'https://api.open-meteo.com/v1/forecast?latitude=47.92&longitude=106.92&current=temperature_2m,weather_code&timezone=Asia%2FUlaanbaatar',
        apiKey: '', intervalMin: 30, city: 'Улаанбаатар', sourceName: 'Open-Meteo',
        lastAttemptAt: null, lastSuccessAt: null, lastError: null, lastErrorAt: null,
      },
      fx: {
        url: 'https://open.er-api.com/v6/latest/USD',
        apiKey: '', intervalMin: 720, currencies: 'USD,EUR,CNY,RUB,KRW,JPY', sourceName: 'ExchangeRate-API',
        lastAttemptAt: null, lastSuccessAt: null, lastError: null, lastErrorAt: null,
      },
    },
    logs: [
      { id: 1, userId: 0, action: 'Систем эхэлсэн', object: 'Жишээ өгөгдөл үүсгэв', createdAt: new Date().toISOString() },
    ],
    seq: {
      users: users.length, verifications: verifications.length, news: news.length, media: 0,
      decisions: decisions.length, versions: versions.length, notifications: 3, external: 0, logs: 1,
    },
  };
}
