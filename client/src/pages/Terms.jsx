import { Link } from 'react-router-dom';
import LegalPage from '../components/LegalPage.jsx';
import { LEGAL } from '../legal.js';

const Email = () => <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

const SECTIONS = [
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

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" sections={SECTIONS}>
      These Terms are the rules for using Game Tiers: what you can expect from us, and what we expect from you.
    </LegalPage>
  );
}
