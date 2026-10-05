import LegalPage, { LEGAL } from '../components/legal/LegalPage';

// Public Terms of Use / end-user licence (linked from the Intuit app listing).
export default function TermsOfUse() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={`These terms cover use of ${LEGAL.appName}, a private application provided by ${LEGAL.operator} for its own team. By logging in, you agree to them.`}
      sections={[
        {
          heading: 'Who may use the app',
          body: [
            `${LEGAL.appName} may be used only by people given a login by an owner at ${LEGAL.operator}. Keep your PIN private and do not let others use your login.`,
          ],
        },
        {
          heading: 'Acceptable use',
          body: [
            'Use the app only for the business\'s lighting survey, installation and related work. Do not try to access data or features you have not been given, interfere with the service, or upload unlawful content.',
          ],
        },
        {
          heading: 'QuickBooks connection',
          body: [
            'An owner may connect the business\'s QuickBooks Online company so its non-inventory products appear as light types. The connection reads product information only and can be disconnected at any time. QuickBooks is a product of Intuit Inc.; use of QuickBooks is governed by Intuit\'s own terms.',
          ],
        },
        {
          heading: 'Your content',
          body: [
            `Job data, notes and photos entered in the app belong to ${LEGAL.operator}.`,
          ],
        },
        {
          heading: 'Availability and liability',
          body: [
            `The app is provided "as is" for internal use. We aim to keep it available and accurate but cannot guarantee it will be uninterrupted or error-free. To the extent permitted by law, ${LEGAL.operator} is not liable for indirect or consequential losses arising from use of the app. Check quantities and specifications before ordering or installing.`,
          ],
        },
        {
          heading: 'Ending access',
          body: ['An owner may remove a team member\'s access at any time.'],
        },
        {
          heading: 'Changes',
          body: ['These terms may be updated; the current version is always on this page.'],
        },
      ]}
    />
  );
}
