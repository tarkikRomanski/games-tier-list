import { Link } from 'react-router-dom';
import LegalPage from '../components/LegalPage.jsx';
import { LEGAL } from '../legal.js';
import { useI18n } from '../i18n/index.jsx';

const Email = () => <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

const SECTIONS_EN = [
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <>
        <h3>Account details</h3>
        <ul>
          <li>
            <strong>Username and password.</strong> Your password is stored only as a salted scrypt hash. We never see or
            keep it in readable form.
          </li>
          <li>
            <strong>Google sign-in.</strong> If you sign in with Google, we store your Google account ID so we can
            recognise you next time. We use your Google profile name once, to suggest a username. We don&apos;t store your
            email address, profile photo or anything else from your Google account.
          </li>
          <li>
            <strong>Profile details you choose to add:</strong> a display name and a profile image. We keep the image you
            upload, shrunk to a small square, and the date you last changed your username.
          </li>
          <li>
            <strong>Join date</strong>, shown on your profile.
          </li>
        </ul>
        <h3>Content you create</h3>
        <p>Tier lists (titles, descriptions, tiers and the games in them), comments, likes, and remixes of other lists.</p>
        <h3>Technical data</h3>
        <p>
          Your IP address is used in memory to limit repeated login attempts and requests. We don&apos;t save it to our
          database. Our hosting provider may keep standard request logs (IP address, time, requested page) under its own
          policies.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    body: (
      <>
        <p>We use only what the site needs to work. There are no analytics, advertising or tracking cookies.</p>
        <ul>
          <li>
            <code>gtl_session</code>: keeps you logged in. It expires after 30 days or when you log out.
          </li>
          <li>
            <code>gtl_oauth</code>: set for up to 10 minutes while you sign in with Google, to protect the sign-in from
            forgery.
          </li>
          <li>
            <code>theme</code> and <code>lang</code> (browser local storage): remember the theme and language you
            chose. They never leave your browser.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <ul>
        <li>To run your account and show your lists, comments and likes.</li>
        <li>To keep the service secure and prevent abuse, such as spam or password guessing.</li>
        <li>To answer you when you contact us.</li>
      </ul>
    ),
  },
  {
    id: 'public',
    title: 'What other people can see',
    body: (
      <ul>
        <li>Your username, display name, profile image, join date and public tier lists are visible to everyone.</li>
        <li>Unlisted lists are visible to anyone who has the link.</li>
        <li>Private lists are visible only to you.</li>
        <li>Comments are visible to everyone who can see the list they&apos;re on. Like counts are public.</li>
        <li>
          Anyone logged in can <strong>remix</strong> a list they can see, which saves a copy in their own account.
        </li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'Services we rely on',
    body: (
      <>
        <p>We don&apos;t sell your personal data or share it for advertising. These providers process data on our behalf:</p>
        <ul>
          <li>
            <strong>Vercel</strong> hosts the website and API.
          </li>
          <li>
            <strong>Turso</strong> hosts the database.
          </li>
          <li>
            <strong>Google</strong> handles sign-in if you choose Sign in with Google.
          </li>
          <li>
            <strong>RAWG</strong> or <strong>FreeToGame</strong> supply game information. Game searches are sent from our
            server, so they aren&apos;t linked to you. Game cover images load straight from their image servers, which
            therefore see your IP address. We tell your browser not to send them the page you&apos;re on.
          </li>
        </ul>
        <p>We may also disclose data when the law requires it.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <p>
        We keep your account and content until you delete it or ask us to delete your account. Deleting a list removes it
        straight away. Deleting your account removes your lists, comments and likes. Copies other people made with
        Remix belong to their accounts and stay. Login sessions are removed when they expire or when you log out.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Your choices and rights',
    body: (
      <>
        <p>
          You can edit or delete your lists and comments, and change a list&apos;s visibility, at any time. To get a copy
          of your data, correct it, or delete your account, email <Email />. Depending on where you live (for example
          the EU, UK or California), you may have further rights, including the right to complain to your data protection
          authority. We&apos;ll respond within 30 days.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Passwords are hashed, session cookies can&apos;t be read by page scripts, the site is served over HTTPS, and only
        a hash of each session token is stored. No system is perfectly secure, so please use a password you don&apos;t
        use anywhere else.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        Game Tiers isn&apos;t meant for children under 13, or under 16 in the EU and UK. If you believe a child has
        created an account, contact us and we&apos;ll delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we change this policy we&apos;ll update the date at the top. For significant changes we&apos;ll also post a
        notice on the site before they take effect.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Game Tiers is run by {LEGAL.operator}. For privacy questions or requests, email <Email />. See also our{' '}
        <Link to="/terms">Terms of Service</Link>.
      </p>
    ),
  },
];

const SECTIONS_UK = [
  {
    id: 'collect',
    title: 'Що ми збираємо',
    body: (
      <>
        <h3>Дані облікового запису</h3>
        <ul>
          <li>
            <strong>Ім’я користувача та пароль.</strong> Пароль зберігається лише у вигляді «солоного» хешу scrypt. Ми
            ніколи не бачимо й не зберігаємо його в читабельному вигляді.
          </li>
          <li>
            <strong>Вхід через Google.</strong> Якщо ви входите через Google, ми зберігаємо ідентифікатор вашого
            облікового запису Google, щоб упізнати вас наступного разу. Ім’я з профілю Google ми використовуємо один раз,
            щоб запропонувати ім’я користувача. Ми не зберігаємо вашу електронну адресу, фото профілю чи інші дані з
            облікового запису Google.
          </li>
          <li>
            <strong>Дані профілю, які ви додаєте за бажанням:</strong> відображуване ім’я та зображення профілю. Ми
            зберігаємо завантажене зображення, зменшене до невеликого квадрата, і дату останньої зміни імені користувача.
          </li>
          <li>
            <strong>Дата реєстрації</strong>, яка показується у вашому профілі.
          </li>
        </ul>
        <h3>Створений вами вміст</h3>
        <p>Тір-листи (назви, описи, рівні та ігри в них), коментарі, вподобання та ремікси чужих списків.</p>
        <h3>Технічні дані</h3>
        <p>
          Ваша IP-адреса використовується в пам’яті сервера, щоб обмежувати повторні спроби входу та запити. Ми не
          записуємо її до бази даних. Наш хостинг-провайдер може зберігати стандартні журнали запитів (IP-адреса, час,
          запитана сторінка) відповідно до власних правил.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Файли cookie та локальне сховище',
    body: (
      <>
        <p>Ми використовуємо лише те, що потрібно для роботи сайту. Жодних аналітичних, рекламних чи стежувальних cookie.</p>
        <ul>
          <li>
            <code>gtl_session</code>: підтримує ваш вхід. Діє 30 днів або до виходу з облікового запису.
          </li>
          <li>
            <code>gtl_oauth</code>: встановлюється щонайбільше на 10 хвилин під час входу через Google, щоб захистити вхід
            від підробки.
          </li>
          <li>
            <code>theme</code> і <code>lang</code> (локальне сховище браузера): запам’ятовують вибрані тему та мову. Ці
            дані ніколи не залишають ваш браузер.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'use',
    title: 'Як ми це використовуємо',
    body: (
      <ul>
        <li>Щоб підтримувати ваш обліковий запис і показувати ваші списки, коментарі та вподобання.</li>
        <li>Щоб захищати сервіс і запобігати зловживанням, як-от спаму чи підбору паролів.</li>
        <li>Щоб відповідати вам, коли ви до нас звертаєтеся.</li>
      </ul>
    ),
  },
  {
    id: 'public',
    title: 'Що бачать інші люди',
    body: (
      <ul>
        <li>Ваше ім’я користувача, відображуване ім’я, зображення профілю, дата реєстрації та публічні тір-листи видимі всім.</li>
        <li>Списки з доступом за посиланням бачать усі, хто має посилання.</li>
        <li>Приватні списки бачите лише ви.</li>
        <li>Коментарі бачать усі, хто може бачити список, до якого їх залишено. Кількість вподобань публічна.</li>
        <li>
          Будь-який користувач, що увійшов, може зробити <strong>ремікс</strong> доступного йому списку, тобто зберегти
          його копію у своєму обліковому записі.
        </li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'Сервіси, на які ми покладаємося',
    body: (
      <>
        <p>
          Ми не продаємо ваші персональні дані й не передаємо їх для реклами. Ці постачальники обробляють дані від нашого
          імені:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong> — хостинг вебсайту та API.
          </li>
          <li>
            <strong>Turso</strong> — хостинг бази даних.
          </li>
          <li>
            <strong>Google</strong> — вхід, якщо ви обираєте «Увійти через Google».
          </li>
          <li>
            <strong>RAWG</strong> або <strong>FreeToGame</strong> — інформація про ігри. Пошукові запити ігор надсилає
            наш сервер, тому вони не пов’язані з вами. Обкладинки ігор завантажуються безпосередньо з їхніх серверів
            зображень, які тому бачать вашу IP-адресу. Ми просимо ваш браузер не повідомляти їм, на якій сторінці ви
            перебуваєте.
          </li>
        </ul>
        <p>Ми також можемо розкривати дані, коли цього вимагає закон.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Як довго ми це зберігаємо',
    body: (
      <p>
        Ми зберігаємо ваш обліковий запис і вміст, доки ви їх не видалите або не попросите нас видалити обліковий запис.
        Видалений список зникає одразу. Видалення облікового запису видаляє ваші списки, коментарі та вподобання. Копії,
        які інші люди зробили через «Ремікс», належать їхнім обліковим записам і залишаються. Сеанси входу видаляються,
        коли спливає їхній строк або коли ви виходите.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Ваш вибір і права',
    body: (
      <>
        <p>
          Ви будь-коли можете редагувати чи видаляти свої списки й коментарі та змінювати видимість списку. Щоб отримати
          копію своїх даних, виправити їх або видалити обліковий запис, напишіть на <Email />. Залежно від місця
          проживання (наприклад, ЄС, Велика Британія чи Каліфорнія) ви можете мати й інші права, зокрема право поскаржитися
          до органу із захисту даних. Ми відповімо протягом 30 днів.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Безпека',
    body: (
      <p>
        Паролі хешуються, cookie сеансу недоступні для скриптів сторінки, сайт працює через HTTPS, а від кожного токена
        сеансу зберігається лише хеш. Жодна система не є абсолютно захищеною, тож використовуйте пароль, якого більше
        ніде не використовуєте.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Діти',
    body: (
      <p>
        Game Tiers не призначений для дітей молодше 13 років (у ЄС і Великій Британії — молодше 16). Якщо ви вважаєте, що
        обліковий запис створила дитина, зв’яжіться з нами, і ми його видалимо.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Зміни до цієї політики',
    body: (
      <p>
        Якщо ми змінимо цю політику, ми оновимо дату вгорі сторінки. Про суттєві зміни ми також повідомимо на сайті до
        того, як вони наберуть чинності.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Контакти',
    body: (
      <p>
        Game Tiers керує {LEGAL.operator}. З питаннями чи запитами щодо конфіденційності пишіть на <Email />. Див. також
        наші <Link to="/terms">Умови використання</Link>.
      </p>
    ),
  },
];

const CONTENT = {
  en: {
    sections: SECTIONS_EN,
    intro: (
      <>
        This policy explains what Game Tiers collects when you use it, why, and what you can do about it. The short
        version: we collect only what&apos;s needed to run your account and your tier lists, and we don&apos;t sell data
        or use tracking.
      </>
    ),
  },
  uk: {
    sections: SECTIONS_UK,
    intro: (
      <>
        Ця політика пояснює, що Game Tiers збирає, коли ви ним користуєтеся, навіщо і що ви можете з цим зробити. Коротко:
        ми збираємо лише те, що потрібно для роботи вашого облікового запису й тір-листів, не продаємо дані й не стежимо
        за вами.
      </>
    ),
  },
};

export default function Privacy() {
  const { lang, t } = useI18n();
  const { sections, intro } = CONTENT[lang] ?? CONTENT.en;
  return (
    <LegalPage title={t('footer.privacy')} sections={sections}>
      {intro}
    </LegalPage>
  );
}
