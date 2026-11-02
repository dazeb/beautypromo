/**
 * Shopper feedback shown on the homepage. Add only genuine quotes that the customer has agreed can be published, using their own words.
 * Do not invent or paraphrase quotes. An empty list hides the section.
 */
export interface Testimonial {
  quote: string;
  /** First name and area, as agreed with the customer, for example "Priya, Leeds". */
  author: string;
}

export const TESTIMONIALS: Testimonial[] = [];
