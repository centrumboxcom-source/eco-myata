export const integrationDefinitions = [
  {
    id: "NOVA_POSHTA_API_KEY",
    name: "Нова пошта",
    label: "API-ключ",
    description: "Пошук міст, відділень і поштоматів при оформленні.",
    group: "Доставка",
  },
  {
    id: "MONOBANK_TOKEN",
    name: "Monopay",
    label: "Токен еквайрингу",
    description: "Створення рахунків і перевірка повідомлень про оплату.",
    group: "Оплата",
  },
  {
    id: "LIQPAY_PUBLIC_KEY",
    name: "LiqPay · публічний ключ",
    label: "Public key",
    description: "Ідентифікатор мерчанта. Працює разом із приватним ключем.",
    group: "Оплата",
  },
  {
    id: "LIQPAY_PRIVATE_KEY",
    name: "LiqPay · приватний ключ",
    label: "Private key",
    description: "Підпис платежів і перевірка їхнього результату.",
    group: "Оплата",
  },
  {
    id: "TELEGRAM_BOT_TOKEN",
    name: "Telegram",
    label: "Токен бота",
    description:
      "Сповіщення адміністратору. Chat ID налаштовується в розділі «Сповіщення та листи».",
    group: "Сповіщення",
  },
  {
    id: "RESEND_API_KEY",
    name: "Resend",
    label: "API-ключ",
    description:
      "Листи покупцям та адміністратору. Потрібен підтверджений домен відправника.",
    group: "Сповіщення",
  },
] as const;
export type IntegrationId = (typeof integrationDefinitions)[number]["id"];
export const integrationIds = integrationDefinitions.map((v) => v.id) as [
  IntegrationId,
  ...IntegrationId[],
];
