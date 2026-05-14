import { BusinessType } from '@/types';

export const BUSINESS_TYPES: BusinessType[] = [
  // Food & Drink
  { label: 'Restaurant', category: 'Food & Drink', query: 'restaurant' },
  { label: 'Cafe / Coffee Shop', category: 'Food & Drink', query: 'cafe coffee shop' },
  { label: 'Bar / Pub', category: 'Food & Drink', query: 'bar pub' },
  { label: 'Pizza Shop', category: 'Food & Drink', query: 'pizza' },
  { label: 'Fast Food', category: 'Food & Drink', query: 'fast food' },
  { label: 'Burger Joint', category: 'Food & Drink', query: 'burger' },
  { label: 'Bakery', category: 'Food & Drink', query: 'bakery' },
  { label: 'Ice Cream Shop', category: 'Food & Drink', query: 'ice cream shop' },
  { label: 'Sushi Restaurant', category: 'Food & Drink', query: 'sushi' },
  { label: 'Indian Restaurant', category: 'Food & Drink', query: 'indian restaurant' },
  { label: 'Chinese Restaurant', category: 'Food & Drink', query: 'chinese restaurant' },
  { label: 'Mexican Restaurant', category: 'Food & Drink', query: 'mexican restaurant' },
  { label: 'Italian Restaurant', category: 'Food & Drink', query: 'italian restaurant' },
  { label: 'Thai Restaurant', category: 'Food & Drink', query: 'thai restaurant' },

  // Health & Medical
  { label: 'Dentist', category: 'Health & Medical', query: 'dentist dental clinic' },
  { label: 'Doctor / GP', category: 'Health & Medical', query: 'doctor general practitioner' },
  { label: 'Optician', category: 'Health & Medical', query: 'optician eye care' },
  { label: 'Physiotherapist', category: 'Health & Medical', query: 'physiotherapist physical therapy' },
  { label: 'Chiropractor', category: 'Health & Medical', query: 'chiropractor' },
  { label: 'Pharmacy', category: 'Health & Medical', query: 'pharmacy chemist' },
  { label: 'Veterinarian', category: 'Health & Medical', query: 'veterinarian vet clinic' },
  { label: 'Mental Health Clinic', category: 'Health & Medical', query: 'mental health therapist counselor' },
  { label: 'Plastic Surgeon', category: 'Health & Medical', query: 'plastic surgery cosmetic surgeon' },

  // Beauty & Wellness
  { label: 'Hair Salon', category: 'Beauty & Wellness', query: 'hair salon' },
  { label: 'Barbershop', category: 'Beauty & Wellness', query: 'barbershop barber' },
  { label: 'Beauty Salon', category: 'Beauty & Wellness', query: 'beauty salon' },
  { label: 'Nail Salon', category: 'Beauty & Wellness', query: 'nail salon' },
  { label: 'Spa', category: 'Beauty & Wellness', query: 'spa wellness center' },
  { label: 'Gym / Fitness', category: 'Beauty & Wellness', query: 'gym fitness center' },
  { label: 'Yoga Studio', category: 'Beauty & Wellness', query: 'yoga studio' },
  { label: 'Tattoo Shop', category: 'Beauty & Wellness', query: 'tattoo shop' },
  { label: 'Massage Therapy', category: 'Beauty & Wellness', query: 'massage therapy' },
  { label: 'Tanning Salon', category: 'Beauty & Wellness', query: 'tanning salon' },

  // Automotive
  { label: 'Auto Repair Shop', category: 'Automotive', query: 'auto repair mechanic' },
  { label: 'Car Dealership', category: 'Automotive', query: 'car dealership' },
  { label: 'Car Wash', category: 'Automotive', query: 'car wash detailing' },
  { label: 'Tire Shop', category: 'Automotive', query: 'tire shop' },
  { label: 'Auto Body Shop', category: 'Automotive', query: 'auto body shop collision repair' },
  { label: 'Oil Change', category: 'Automotive', query: 'oil change' },
  { label: 'Towing Service', category: 'Automotive', query: 'towing service' },

  // Home Services
  { label: 'Plumber', category: 'Home Services', query: 'plumber plumbing' },
  { label: 'Electrician', category: 'Home Services', query: 'electrician electrical' },
  { label: 'Roofer', category: 'Home Services', query: 'roofing contractor' },
  { label: 'Painter', category: 'Home Services', query: 'house painter painting' },
  { label: 'Landscaper', category: 'Home Services', query: 'landscaper lawn care' },
  { label: 'Cleaning Service', category: 'Home Services', query: 'cleaning service house cleaning' },
  { label: 'HVAC', category: 'Home Services', query: 'hvac heating cooling air conditioning' },
  { label: 'Flooring', category: 'Home Services', query: 'flooring installation' },
  { label: 'Pest Control', category: 'Home Services', query: 'pest control exterminator' },
  { label: 'Window & Door', category: 'Home Services', query: 'window door installation' },
  { label: 'Locksmith', category: 'Home Services', query: 'locksmith' },
  { label: 'Pool Service', category: 'Home Services', query: 'pool service swimming pool' },
  { label: 'Moving Company', category: 'Home Services', query: 'moving company movers' },
  { label: 'Handyman', category: 'Home Services', query: 'handyman home repair' },

  // Professional Services
  { label: 'Law Firm', category: 'Professional Services', query: 'law firm attorney lawyer' },
  { label: 'Accounting Firm', category: 'Professional Services', query: 'accounting firm accountant cpa' },
  { label: 'Insurance Agency', category: 'Professional Services', query: 'insurance agency' },
  { label: 'Real Estate Agency', category: 'Professional Services', query: 'real estate agency realtor' },
  { label: 'Financial Advisor', category: 'Professional Services', query: 'financial advisor planner' },
  { label: 'Marketing Agency', category: 'Professional Services', query: 'marketing agency' },
  { label: 'Consulting Firm', category: 'Professional Services', query: 'consulting firm business consulting' },
  { label: 'Architect', category: 'Professional Services', query: 'architect architecture firm' },
  { label: 'Interior Designer', category: 'Professional Services', query: 'interior designer' },
  { label: 'Photography Studio', category: 'Professional Services', query: 'photography studio photographer' },
  { label: 'Printing Shop', category: 'Professional Services', query: 'printing shop print shop' },
  { label: 'Recruitment Agency', category: 'Professional Services', query: 'recruitment agency staffing' },

  // Retail
  { label: 'Clothing Store', category: 'Retail', query: 'clothing store boutique' },
  { label: 'Electronics Store', category: 'Retail', query: 'electronics store' },
  { label: 'Furniture Store', category: 'Retail', query: 'furniture store' },
  { label: 'Jewelry Store', category: 'Retail', query: 'jewelry store jeweler' },
  { label: 'Bookstore', category: 'Retail', query: 'bookstore books' },
  { label: 'Sports Store', category: 'Retail', query: 'sports store sporting goods' },
  { label: 'Hardware Store', category: 'Retail', query: 'hardware store' },
  { label: 'Gift Shop', category: 'Retail', query: 'gift shop' },
  { label: 'Toy Store', category: 'Retail', query: 'toy store toys' },
  { label: 'Flower Shop', category: 'Retail', query: 'flower shop florist' },
  { label: 'Shoe Store', category: 'Retail', query: 'shoe store footwear' },
  { label: 'Pet Shop', category: 'Retail', query: 'pet shop pet store' },
  { label: 'Pharmacy / Drug Store', category: 'Retail', query: 'pharmacy drug store' },

  // Education
  { label: 'Tutoring Center', category: 'Education', query: 'tutoring center learning center' },
  { label: 'Driving School', category: 'Education', query: 'driving school' },
  { label: 'Music School', category: 'Education', query: 'music school lessons' },
  { label: 'Dance Studio', category: 'Education', query: 'dance studio' },
  { label: 'Language School', category: 'Education', query: 'language school' },
  { label: 'Martial Arts', category: 'Education', query: 'martial arts karate mma' },
  { label: 'Daycare / Childcare', category: 'Education', query: 'daycare childcare' },

  // Hospitality
  { label: 'Hotel', category: 'Hospitality', query: 'hotel' },
  { label: 'Motel', category: 'Hospitality', query: 'motel' },
  { label: 'Bed & Breakfast', category: 'Hospitality', query: 'bed and breakfast b&b' },
  { label: 'Short-term Rentals', category: 'Hospitality', query: 'vacation rental' },
  { label: 'Event Venue', category: 'Hospitality', query: 'event venue hall' },
  { label: 'Wedding Venue', category: 'Hospitality', query: 'wedding venue' },

  // Construction
  { label: 'General Contractor', category: 'Construction', query: 'general contractor construction' },
  { label: 'Concrete / Masonry', category: 'Construction', query: 'concrete masonry contractor' },
  { label: 'Fence Company', category: 'Construction', query: 'fence company fencing' },
  { label: 'Deck Builder', category: 'Construction', query: 'deck builder patio contractor' },
  { label: 'Solar Installation', category: 'Construction', query: 'solar installation solar panels' },
  { label: 'Kitchen Remodeling', category: 'Construction', query: 'kitchen remodeling renovation' },
  { label: 'Bathroom Remodeling', category: 'Construction', query: 'bathroom remodeling renovation' },

  // Pet Services
  { label: 'Pet Grooming', category: 'Pet Services', query: 'pet grooming dog groomer' },
  { label: 'Dog Walker', category: 'Pet Services', query: 'dog walker dog walking' },
  { label: 'Pet Boarding', category: 'Pet Services', query: 'pet boarding kennels' },
  { label: 'Pet Training', category: 'Pet Services', query: 'dog training obedience' },

  // Laundry & Cleaning
  { label: 'Laundry / Laundromat', category: 'Laundry & Cleaning', query: 'laundry laundromat' },
  { label: 'Dry Cleaning', category: 'Laundry & Cleaning', query: 'dry cleaning dry cleaner' },

  // Entertainment
  { label: 'Gym / CrossFit', category: 'Entertainment', query: 'crossfit gym' },
  { label: 'Escape Room', category: 'Entertainment', query: 'escape room' },
  { label: 'Bowling Alley', category: 'Entertainment', query: 'bowling alley' },
  { label: 'Arcade', category: 'Entertainment', query: 'arcade game center' },
  { label: 'Movie Theater', category: 'Entertainment', query: 'movie theater cinema' },

  // Financial
  { label: 'Bank', category: 'Financial', query: 'bank' },
  { label: 'Credit Union', category: 'Financial', query: 'credit union' },
  { label: 'Mortgage Broker', category: 'Financial', query: 'mortgage broker' },
  { label: 'Tax Preparation', category: 'Financial', query: 'tax preparation services' },
  { label: 'Payday Loan', category: 'Financial', query: 'payday loan cash advance' },
];

export const CATEGORIES = [...new Set(BUSINESS_TYPES.map(b => b.category))];

export function getBusinessTypesByCategory(category: string): BusinessType[] {
  return BUSINESS_TYPES.filter(b => b.category === category);
}
