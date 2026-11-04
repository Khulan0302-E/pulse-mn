export const ROLES = {
  JOURNALIST: 'journalist',
  EDITOR: 'editor',
  ADMIN: 'admin',
  CITIZEN: 'citizen',
};

export const ROLE_LABELS = {
  journalist: 'Сэтгүүлч',
  editor: 'Редактор',
  admin: 'Админ',
  citizen: 'Иргэн',
};

export const USER_STATUS = { ACTIVE: 'active', SUSPENDED: 'suspended' };
export const USER_STATUS_LABELS = { active: 'Идэвхтэй', suspended: 'Түдгэлзсэн' };

// Мэдээний төлөв (Өгөгдөл → Мэдээ.Төлөв)
export const STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  RETURNED: 'returned',
  REJECTED: 'rejected',
  APPROVED: 'approved',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
};

export const STATUS_LABELS = {
  draft: 'Ноорог',
  review: 'Хянагдаж буй',
  returned: 'Буцаагдсан',
  rejected: 'Татгалзсан',
  approved: 'Зөвшөөрсөн',
  scheduled: 'Товлосон',
  published: 'Нийтлэгдсэн',
};

export const STATUS_TONE = {
  draft: 'gray',
  review: 'blue',
  returned: 'amber',
  rejected: 'red',
  approved: 'green',
  scheduled: 'violet',
  published: 'green',
};

// Сэтгүүлчийн баталгаажуулалт (FR-AUTH-001)
export const VERIFY = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };
export const VERIFY_LABELS = { pending: 'Хүлээгдэж буй', approved: 'Баталгаажсан', rejected: 'Татгалзсан' };
export const VERIFY_TONE = { pending: 'amber', approved: 'green', rejected: 'red' };

export const DOC_TYPES = {
  org_id: 'Байгууллагын үнэмлэх',
  msne: 'МСНЭ-ийн гишүүнчлэлийн баримт',
  diploma: 'Мэргэжлийн дипломын хуулбар',
};

// Редакцийн шийдвэр (FR-EDT-004)
export const DECISION = { APPROVE: 'approve', RETURN: 'return', REJECT: 'reject' };
export const DECISION_LABELS = { approve: 'Зөвшөөрсөн', return: 'Буцаасан', reject: 'Татгалзсан' };
export const DECISION_TONE = { approve: 'green', return: 'amber', reject: 'red' };

// Мэдээний төрөл (FR-PUB-004)
export const CATEGORIES = [
  { id: 1, name: 'Улс төр', slug: 'politics', color: '#1d4ed8' },
  { id: 2, name: 'Эдийн засаг', slug: 'economy', color: '#047857' },
  { id: 3, name: 'Нийгэм', slug: 'society', color: '#c2410c' },
  { id: 4, name: 'Дэлхий', slug: 'world', color: '#6d28d9' },
  { id: 5, name: 'Спорт', slug: 'sport', color: '#e11d48' },
];

// Аймаг, сум (хэсэгчилсэн жагсаалт — шаардлагатай бол нэмнэ)
export const LOCATIONS = {
  'Улаанбаатар': ['Баянгол', 'Баянзүрх', 'Сонгинохайрхан', 'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй', 'Налайх', 'Багануур', 'Багахангай'],
  'Архангай': ['Эрдэнэбулган', 'Тариат', 'Цэцэрлэг', 'Батцэнгэл', 'Хотонт'],
  'Баян-Өлгий': ['Өлгий', 'Цэнгэл', 'Улаанхус', 'Толбо', 'Сагсай'],
  'Баянхонгор': ['Баянхонгор', 'Баянлиг', 'Галуут', 'Бууцагаан', 'Өлзийт'],
  'Булган': ['Булган', 'Хутаг-Өндөр', 'Сэлэнгэ', 'Орхон', 'Бугат'],
  'Говь-Алтай': ['Есөнбулаг', 'Алтай', 'Тайшир', 'Бигэр', 'Тонхил'],
  'Говьсүмбэр': ['Сүмбэр', 'Баянтал', 'Шивээговь'],
  'Дархан-Уул': ['Дархан', 'Шарынгол', 'Хонгор', 'Орхон'],
  'Дорноговь': ['Сайншанд', 'Замын-Үүд', 'Даланжаргалан', 'Хатанбулаг', 'Эрдэнэ'],
  'Дорнод': ['Хэрлэн', 'Чойбалсан', 'Баян-Уул', 'Халхгол', 'Матад'],
  'Дундговь': ['Сайнцагаан', 'Говь-Угтаал', 'Гурвансайхан', 'Эрдэнэдалай'],
  'Завхан': ['Улиастай', 'Тосонцэнгэл', 'Их-Уул', 'Тэлмэн'],
  'Орхон': ['Баян-Өндөр', 'Жаргалант'],
  'Өвөрхангай': ['Арвайхээр', 'Хархорин', 'Уянга', 'Бат-Өлзий'],
  'Өмнөговь': ['Даланзадгад', 'Ханбогд', 'Цогтцэций', 'Гурвантэс'],
  'Сүхбаатар': ['Баруун-Урт', 'Эрдэнэцагаан', 'Онгон', 'Мөнххаан'],
  'Сэлэнгэ': ['Сүхбаатар', 'Мандал', 'Алтанбулаг', 'Шаамар', 'Ерөө'],
  'Төв': ['Зуунмод', 'Эрдэнэ', 'Баянчандмань', 'Борнуур'],
  'Увс': ['Улаангом', 'Тариалан', 'Наранбулаг', 'Өмнөговь'],
  'Ховд': ['Жаргалант', 'Мянгад', 'Булган', 'Дөргөн'],
  'Хөвсгөл': ['Мөрөн', 'Хатгал', 'Ханх', 'Цагааннуур', 'Тариалан'],
  'Хэнтий': ['Хэрлэн', 'Дадал', 'Батширээт', 'Өмнөдэлгэр', 'Баян-Адарга'],
};

// Файлын хязгаар (NFR-SEC-008, Нээлттэй асуулт №1 — санал болгосон утга)
export const FILE_RULES = {
  verification: { exts: ['pdf', 'jpg', 'jpeg', 'png'], maxMB: 5, label: 'PDF, JPG, PNG (≤5 MB)' },
  image: { exts: ['jpg', 'jpeg', 'png', 'webp'], maxMB: 5 },
  video: { exts: ['mp4', 'webm'], maxMB: 50 },
};
export const MEDIA_HINT = 'Зураг: JPG, PNG, WEBP (≤5 MB) · Бичлэг: MP4, WEBM (≤50 MB) · дээд тал нь 10 файл';
export const MAX_MEDIA_PER_NEWS = 10;

export const LIMITS = {
  fullName: 100,
  email: 100,
  org: 150,
  title: 200,
  source: 500,
  reason: 500,
  comment: 1000,
};
