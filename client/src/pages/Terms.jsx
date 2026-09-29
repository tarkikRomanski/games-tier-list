import { Link } from 'react-router-dom';
import LegalPage from '../components/LegalPage.jsx';
import { LEGAL } from '../legal.js';
import { useI18n } from '../i18n/index.jsx';

const Email = () => <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

const SECTIONS_EN = [
  {
    id: 'agreement',
    title: 'Agreeing to these terms',
    body: (
      <p>
        By creating an account or using Game Tiers, you agree to these Terms and to our{' '}
        <Link to="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the service.
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who can use Game Tiers',
    body: (
      <p>
        You must be at least 13, or at least 16 in the EU and UK. If you&apos;re under the age of majority where you
        live, you need a parent or guardian&apos;s permission.
      </p>
    ),
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: (
      <ul>
        <li>You&apos;re responsible for what happens under your account, so keep your password safe.</li>
        <li>Don&apos;t pick a username that impersonates someone else or is offensive. We may change such usernames.</li>
        <li>
          Tell us at <Email /> if you think someone else has accessed your account.
        </li>
      </ul>
    ),
  },
  {
    id: 'content',
    title: 'Your content',
    body: (
      <>
        <p>
          You own the tier lists, descriptions and comments you create. So that we can run the service, you give us a
          worldwide, non-exclusive, royalty-free licence to store, display and reproduce that content according to the
          visibility you choose. This licence ends when you delete the content, except for copies others have already
          remixed.
        </p>
        <p>
          When a list is <strong>public</strong> or <strong>unlisted</strong>, other users can view it and{' '}
          <strong>remix</strong> it, which saves a copy in their account that they can edit. Remixes keep a link back to
          your list and remain in their account even if you delete yours.
        </p>
        <p>Only post content you have the right to share.</p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'Acceptable use',
    body: (
      <>
        <p>Please don&apos;t:</p>
        <ul>
          <li>post anything illegal, hateful, harassing, sexually explicit, or that threatens or doxxes anyone;</li>
          <li>spam, or use the service to advertise without permission;</li>
          <li>impersonate other people or organisations;</li>
          <li>
            try to break or get around the site&apos;s security, overload it, or scrape it in bulk with automated tools;
          </li>
          <li>use someone else&apos;s account without their permission.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'moderation',
    title: 'Moderation and ending your account',
    body: (
      <p>
        We may remove content or suspend or close accounts that break these Terms, and we&apos;ll try to tell you why
        when we do. You can stop using Game Tiers at any time. To delete your account and its data, email <Email />.
      </p>
    ),
  },
  {
    id: 'games',
    title: 'Game names and artwork',
    body: (
      <p>
        Game titles and cover images come from third-party catalogues (RAWG or FreeToGame). They belong to their
        respective owners and are shown to identify the games you rank. Game Tiers isn&apos;t affiliated with or endorsed
        by any game publisher or developer. If you own rights in something shown here and want it removed, contact us.
      </p>
    ),
  },
  {
    id: 'disclaimer',
    title: 'No warranty',
    body: (
      <p>
        Game Tiers is provided free of charge, &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We don&apos;t
        promise it will always be available, error-free or that content will never be lost, so keep your own copy of
        anything important. Nothing in these Terms limits rights you have under consumer law that can&apos;t be waived.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        As far as the law allows, {LEGAL.operator} isn&apos;t liable for indirect or consequential losses, or for loss of
        data, arising from your use of the service. Nothing in these Terms excludes liability that can&apos;t be excluded
        by law, such as for fraud or for death or personal injury caused by negligence.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        We may update these Terms. We&apos;ll change the date at the top, and for significant changes we&apos;ll post a
        notice on the site before they take effect. If you keep using Game Tiers after that, you accept the new Terms.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <p>
        These Terms are governed by the laws of {LEGAL.jurisdiction}. If you&apos;re a consumer, you also keep the
        protection of the mandatory laws of the country where you live.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Game Tiers is run by {LEGAL.operator}. Questions about these Terms go to <Email />.
      </p>
    ),
  },
];

const SECTIONS_UK = [
  {
    id: 'agreement',
    title: 'Згода з цими умовами',
    body: (
      <p>
        Створюючи обліковий запис або користуючись Game Tiers, ви погоджуєтеся з цими Умовами та нашою{' '}
        <Link to="/privacy">Політикою конфіденційності</Link>. Якщо ви не згодні, будь ласка, не користуйтеся сервісом.
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: 'Хто може користуватися Game Tiers',
    body: (
      <p>
        Вам має бути щонайменше 13 років (у ЄС і Великій Британії — щонайменше 16). Якщо ви не досягли повноліття за
        законами країни проживання, вам потрібен дозвіл батьків або опікуна.
      </p>
    ),
  },
  {
    id: 'accounts',
    title: 'Ваш обліковий запис',
    body: (
      <ul>
        <li>Ви відповідаєте за все, що відбувається у вашому обліковому записі, тож бережіть свій пароль.</li>
        <li>
          Не обирайте ім’я користувача, яке видає вас за іншу особу або є образливим. Ми можемо змінювати такі імена.
        </li>
        <li>
          Повідомте нас на <Email />, якщо вважаєте, що хтось інший отримав доступ до вашого облікового запису.
        </li>
      </ul>
    ),
  },
  {
    id: 'content',
    title: 'Ваш вміст',
    body: (
      <>
        <p>
          Створені вами тір-листи, описи й коментарі належать вам. Щоб ми могли надавати сервіс, ви надаєте нам
          всесвітню, невиключну, безоплатну ліцензію на зберігання, показ і відтворення цього вмісту відповідно до
          обраної вами видимості. Ліцензія припиняється, коли ви видаляєте вміст, за винятком копій, які інші вже
          зробили через ремікс.
        </p>
        <p>
          Коли список <strong>публічний</strong> або <strong>доступний за посиланням</strong>, інші користувачі можуть
          переглядати його та робити <strong>ремікс</strong>, тобто зберігати копію у своєму обліковому записі й
          редагувати її. Ремікси містять посилання на ваш список і залишаються в їхніх облікових записах, навіть якщо ви
          видалите свій.
        </p>
        <p>Публікуйте лише той вміст, яким маєте право ділитися.</p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'Допустиме використання',
    body: (
      <>
        <p>Будь ласка, не:</p>
        <ul>
          <li>
            публікуйте незаконний, ненависницький, образливий чи відверто сексуальний вміст, погрози або чужі особисті
            дані;
          </li>
          <li>розсилайте спам і не використовуйте сервіс для реклами без дозволу;</li>
          <li>видавайте себе за інших людей чи організації;</li>
          <li>
            намагайтеся зламати чи обійти захист сайту, перевантажити його або масово збирати з нього дані
            автоматизованими засобами;
          </li>
          <li>користуйтеся чужим обліковим записом без дозволу власника.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'moderation',
    title: 'Модерація та закриття облікового запису',
    body: (
      <p>
        Ми можемо видаляти вміст, призупиняти або закривати облікові записи, що порушують ці Умови, і намагатимемося
        пояснити причину. Ви можете припинити користуватися Game Tiers будь-коли. Щоб видалити обліковий запис і його
        дані, напишіть на <Email />.
      </p>
    ),
  },
  {
    id: 'games',
    title: 'Назви ігор і зображення',
    body: (
      <p>
        Назви ігор і обкладинки надходять зі сторонніх каталогів (RAWG або FreeToGame). Вони належать своїм власникам і
        показуються, щоб ідентифікувати ігри, які ви оцінюєте. Game Tiers не пов’язаний із жодним видавцем чи
        розробником ігор і не схвалений ними. Якщо вам належать права на щось показане тут і ви хочете це прибрати,
        зв’яжіться з нами.
      </p>
    ),
  },
  {
    id: 'disclaimer',
    title: 'Відсутність гарантій',
    body: (
      <p>
        Game Tiers надається безкоштовно, «як є» і «як доступно». Ми не обіцяємо, що сервіс завжди буде доступний,
        працюватиме без помилок чи що вміст ніколи не буде втрачено, тож зберігайте власні копії важливого. Ніщо в цих
        Умовах не обмежує ваших прав за законодавством про захист прав споживачів, від яких не можна відмовитися.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Обмеження відповідальності',
    body: (
      <p>
        Наскільки це дозволяє закон, {LEGAL.operator} не несе відповідальності за непрямі чи опосередковані збитки або
        втрату даних, що виникли внаслідок користування сервісом. Ніщо в цих Умовах не виключає відповідальності, яку не
        можна виключити за законом, зокрема за шахрайство чи смерть або тілесні ушкодження внаслідок недбалості.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Зміни до цих умов',
    body: (
      <p>
        Ми можемо оновлювати ці Умови. Ми змінимо дату вгорі сторінки, а про суттєві зміни повідомимо на сайті до того,
        як вони наберуть чинності. Якщо ви й надалі користуватиметеся Game Tiers, це означатиме згоду з новими Умовами.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Застосовне право',
    body: (
      <p>
        Ці Умови регулюються законодавством {LEGAL.jurisdiction}. Якщо ви споживач, за вами також зберігається захист
        імперативних норм законодавства країни вашого проживання.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Контакти',
    body: (
      <p>
        Game Tiers керує {LEGAL.operator}. Питання щодо цих Умов надсилайте на <Email />.
      </p>
    ),
  },
];

const CONTENT = {
  en: {
    sections: SECTIONS_EN,
    intro: <>These Terms are the rules for using Game Tiers: what you can expect from us, and what we expect from you.</>,
  },
  uk: {
    sections: SECTIONS_UK,
    intro: <>Ці Умови — правила користування Game Tiers: чого ви можете очікувати від нас і чого ми очікуємо від вас.</>,
  },
};

export default function Terms() {
  const { lang, t } = useI18n();
  const { sections, intro } = CONTENT[lang] ?? CONTENT.en;
  return (
    <LegalPage title={t('footer.terms')} sections={sections}>
      {intro}
    </LegalPage>
  );
}
