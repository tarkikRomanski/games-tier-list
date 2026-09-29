import { Link } from 'react-router-dom';
import LegalPage from '../components/LegalPage.jsx';
import { LEGAL } from '../legal.js';

const Email = () => <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

const SECTIONS = [
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
            <code>theme</code> (browser local storage): remembers whether you chose the light or dark theme. It never
            leaves your browser.
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

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" sections={SECTIONS}>
      This policy explains what Game Tiers collects when you use it, why, and what you can do about it. The short
      version: we collect only what&apos;s needed to run your account and your tier lists, and we don&apos;t sell data or
      use tracking.
    </LegalPage>
  );
}
