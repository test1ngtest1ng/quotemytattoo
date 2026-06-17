// City data powering the /tattoo-artists/[city] SEO landing pages.
export type City = {
  slug: string;
  name: string;
  areas: string[];
};

export const CITIES: City[] = [
  { slug: "london", name: "London", areas: ["Shoreditch", "Camden", "Hackney", "Soho", "Brixton", "Islington", "Dalston", "Peckham", "Clapham", "Greenwich", "Notting Hill", "Stratford", "Walthamstow", "Croydon", "Ealing", "Wimbledon"] },
  { slug: "manchester", name: "Manchester", areas: ["Northern Quarter", "Ancoats", "Didsbury", "Chorlton", "Salford", "Deansgate", "Fallowfield", "Withington"] },
  { slug: "birmingham", name: "Birmingham", areas: ["Digbeth", "Jewellery Quarter", "Moseley", "Kings Heath", "Harborne", "Erdington"] },
  { slug: "leeds", name: "Leeds", areas: ["Hyde Park", "Headingley", "Chapel Allerton", "Kirkstall", "Armley", "City Centre"] },
  { slug: "glasgow", name: "Glasgow", areas: ["West End", "Merchant City", "Finnieston", "Shawlands", "Dennistoun", "Partick"] },
  { slug: "bristol", name: "Bristol", areas: ["Stokes Croft", "Gloucester Road", "Bedminster", "Clifton", "Easton", "Old City"] },
  { slug: "liverpool", name: "Liverpool", areas: ["Baltic Triangle", "Ropewalks", "Bold Street", "Allerton", "Smithdown", "City Centre"] },
  { slug: "edinburgh", name: "Edinburgh", areas: ["Leith", "Old Town", "New Town", "Stockbridge", "Tollcross", "Marchmont"] },
  { slug: "cardiff", name: "Cardiff", areas: ["City Centre", "Canton", "Roath", "Cathays", "Pontcanna", "Splott"] },
  { slug: "sheffield", name: "Sheffield", areas: ["Kelham Island", "Ecclesall Road", "City Centre", "Hunters Bar", "Crookes"] },
  { slug: "nottingham", name: "Nottingham", areas: ["Hockley", "Lace Market", "West Bridgford", "Sherwood", "Beeston"] },
  { slug: "brighton", name: "Brighton", areas: ["North Laine", "The Lanes", "Kemptown", "Hove", "Hanover"] },
  { slug: "newcastle", name: "Newcastle", areas: ["Ouseburn", "Jesmond", "City Centre", "Heaton", "Gosforth"] },
];

export function getCity(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function otherCities(slug: string): City[] {
  return CITIES.filter((c) => c.slug !== slug);
}

export function cityFaqs(name: string): { q: string; a: string }[] {
  return [
    { q: `How much does a tattoo cost in ${name}?`, a: `${name} prices vary by artist, style and size. Many studios charge an hourly rate, often around £80 to £150 per hour, with a typical minimum charge for small pieces. Large custom work is usually priced per session or as a full project. Uploading your design and getting quotes is the best way to see real prices for your idea.` },
    { q: `Are tattoo artists in ${name} licensed?`, a: `In the UK, tattoo studios and artists must be registered with their local council and follow strict hygiene and safety standards. Artists self-declare their council registration, insurance and hygiene training on their profile, and you can always ask them to confirm before you book.` },
    { q: `How do I book a tattoo artist in ${name}?`, a: `Upload your design or describe your idea, tell us the placement and rough size, and available ${name} artists will respond with quotes and availability. Review their portfolios and reviews, then choose who to book with. It is free to post.` },
    { q: `How far in advance should I book?`, a: `Popular ${name} artists can have waiting lists of several weeks or months, especially for large custom pieces. Smaller or flash designs are often available sooner. Posting early gives you the best choice of artists and dates.` },
    { q: `Do ${name} studios require a deposit?`, a: `Most studios take a deposit to secure your appointment, which is usually deducted from the final price. The amount and refund terms vary by studio, so check before you confirm your booking.` },
  ];
}
