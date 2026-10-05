import LegalPage, { LEGAL } from '../components/legal/LegalPage';

// Public Privacy Policy (linked from the Intuit app listing for the QuickBooks connection).
export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`${LEGAL.appName} is a private tool used by the team at ${LEGAL.operator} to survey and track commercial lighting jobs. It is not offered to the public. This policy explains what information the app handles and how.`}
      sections={[
        {
          heading: 'Information the app stores',
          body: [
            'Team member details: name, initials, colour, role and notification preferences. PINs are stored only as one-way (hashed) values on the server and are never shown or sent to devices.',
            'Job information entered by the team: job names, locations, areas, light counts and types, sensors and photocells, notes, install progress, issues, and photos taken on site.',
            'A device push notification token, if a team member turns on notifications.',
          ],
        },
        {
          heading: 'QuickBooks data',
          body: [
            `When an owner connects QuickBooks Online, ${LEGAL.appName} reads only the company's non-inventory product list: each item's name (product code), sales description, active status and QuickBooks item ID. These are used to keep the app's list of LED light types up to date.`,
            `${LEGAL.appName} does not read or store customers, invoices, payments, bank or financial data, and it never creates, changes or deletes anything in QuickBooks.`,
            'Access tokens for the connection are kept on the server only and are never sent to devices. An owner can disconnect at any time from Settings in the app, or by removing LED Pro from the connected apps in QuickBooks; disconnecting revokes the app\'s access.',
          ],
        },
        {
          heading: 'Where information is kept',
          body: [
            'Data is stored with Supabase (database, file storage and server functions) and the web version is hosted by Expo. Access is limited to logged-in team members; photos are private. Phones also keep a copy of downloaded job data so the app works without signal.',
          ],
        },
        {
          heading: 'Sharing',
          body: [
            `Information is used only to run ${LEGAL.appName} for ${LEGAL.operator}. It is not sold, rented or shared for advertising. It is shared only with the service providers above as needed to operate the app, or if required by law.`,
          ],
        },
        {
          heading: 'Keeping and removing information',
          body: [
            'Information is kept while it is needed for the business. Removed team members can no longer log in; their name remains on past work records. To ask for information to be corrected or removed, contact us using the address below.',
          ],
        },
        {
          heading: 'Changes',
          body: ['If this policy changes, the updated version will be posted on this page with a new effective date.'],
        },
      ]}
    />
  );
}
