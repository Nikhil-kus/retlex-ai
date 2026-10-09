// Keep this page factual. Add interviews, pilots and metrics only after verification.
// Set NEXT_PUBLIC_RETLEX_FOUNDER_CONTACT_URL to a verified mailto: or HTTPS profile URL.
const configuredContact = process.env.NEXT_PUBLIC_RETLEX_FOUNDER_CONTACT_URL?.trim() || 'mailto:nikhil@retlex.shop';
export const founderContact = configuredContact && /^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/i.test(configuredContact)
  ? configuredContact : null;

export const founderLinkedIn = 'https://www.linkedin.com/in/nikhil-kushwaha-73140b359';

export const developmentMilestones = [
  { status: 'Working product', title: 'Voice-based billing', description: 'Hindi-friendly product matching, bill creation and inventory updates in the retailer app.' },
  { status: 'Working product', title: 'A digital store catalog', description: 'Product names, pack sizes, prices and stock managed from the shop side.' },
  { status: 'Concept demo', title: 'Nearby product discovery', description: 'An interactive preview of searching local products and comparing stores, using sample data.' },
  { status: 'Next chapter', title: 'Connect the two', description: 'Bring retailer inventory into discovery, with reliable availability and retailer participation.' },
];
