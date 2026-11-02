/**
 * Illustrative homepage testimonials, visibly labeled as samples.
 * Replace these with customer-approved feedback before presenting them as genuine reviews.
 */
export interface Testimonial {
  quote: string;
  /** First name and area, as agreed with the customer, for example "Priya, Leeds". */
  author: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "A lovely way to discover beauty offers without spending my evening searching every shop.",
    author: "Sophie · Sample shopper",
  },
  {
    quote: "I like having the offer details in one place. It makes planning my next skincare restock feel simple.",
    author: "Amira · Sample shopper",
  },
  {
    quote: "The seasonal edits are just the inspiration I need when I’m looking for a little beauty gift.",
    author: "Charlotte · Sample shopper",
  },
];
