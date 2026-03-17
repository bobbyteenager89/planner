export const BIGSKY_TRIP_ID = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

export interface Activity {
  id: string;
  title: string;
  category: string;
  image: string;
  bullets: string[];
  note?: string;
}

export interface ChefOption {
  id: string;
  name: string;
  style: string;
  description: string;
}

export const ACTIVITIES: Activity[] = [
  {
    id: "fly-fishing",
    title: "Fly Fishing (Gallatin River)",
    category: "Outdoor Adventures",
    image:
      "https://images.unsplash.com/photo-1532015421812-5e7e8c839abb?w=600&h=400&fit=crop",
    bullets: [
      "Guided walk-and-wade trips, all gear included",
      "2-hour pond intro option for kids under 11",
      "Fishing licenses required for ages 12+",
    ],
  },
  {
    id: "horseback",
    title: "Horseback Riding",
    category: "Outdoor Adventures",
    image:
      "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&h=400&fit=crop",
    bullets: [
      "1-3 hour guided trail rides through Gallatin National Forest",
      "All abilities welcome",
      "Minimum age 7 for trails, younger kids may do arena rides",
      "Cowboy cookout combo available",
    ],
  },
  {
    id: "hiking-ousel",
    title: "Hiking — Ousel Falls",
    category: "Outdoor Adventures",
    image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
    bullets: [
      "Easy 1.8-mile round trip to a waterfall",
      "All ages, no booking needed",
      "Near Big Sky Town Center",
    ],
  },
  {
    id: "yellowstone",
    title: "Yellowstone National Park",
    category: "Outdoor Adventures",
    image:
      "https://images.unsplash.com/photo-1565017228079-498b05df3c09?w=600&h=400&fit=crop",
    bullets: [
      "Hot springs, Old Faithful, wildlife spotting",
      "Junior Ranger booklets free at visitor centers",
      "$35/vehicle entrance fee",
    ],
    note: "Full day — ~1 hour drive each way, leave by 7 AM",
  },
  {
    id: "alpaca-farm",
    title: "Alpaca & Llama Farm Tour",
    category: "Animals",
    image:
      "https://images.unsplash.com/photo-1583337130417-13104dec14a7?w=600&h=400&fit=crop",
    bullets: [
      "1.5-hour hands-on tour in Bozeman (~45 min away)",
      "Feed, halter, and bathe alpacas and llamas",
      "Kids 5 and under free",
      "Baby alpacas likely in July!",
    ],
  },
  {
    id: "llama-trek",
    title: "Llama Trekking",
    category: "Animals",
    image:
      "https://images.unsplash.com/photo-1594022078019-1f71d4d76805?w=600&h=400&fit=crop",
    bullets: [
      "Day hikes with llamas carrying your gear",
      "Bozeman area (~45 min away)",
      "Better for older kids and adults",
    ],
  },
  {
    id: "rodeo",
    title: "Tuesday Night Rodeo — July 21",
    category: "Evening & Social",
    image:
      "https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?w=600&h=400&fit=crop",
    bullets: [
      "Lone Mountain Ranch — Big Sky's signature summer event",
      "Barrel racing, bronc rides, roping, live music",
      "Ticket includes cook-out dinner + drinks",
    ],
    note: "One night only — Tuesday July 21",
  },
  {
    id: "farmers-market",
    title: "Wednesday Farmers Market — July 22",
    category: "Evening & Social",
    image:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop",
    bullets: [
      "5-8 PM at Big Sky Town Center",
      "90+ vendors, live music",
      "Huckleberry snow cones",
      "Free, no tickets needed",
    ],
  },
  {
    id: "golf-bigsky",
    title: "Golf — Big Sky Resort",
    category: "Golf",
    image:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=600&h=400&fit=crop",
    bullets: [
      "Arnold Palmer-designed, 18 holes",
      "Lone Peak views, wildlife on course",
      "Club rentals available",
    ],
  },
  {
    id: "golf-headwaters",
    title: "Golf — Headwaters (Value Option)",
    category: "Golf",
    image:
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&h=400&fit=crop",
    bullets: ["9 holes, ~$35/person", "Three Forks (~45 min away)", "Best value option"],
  },
  {
    id: "gondola",
    title: "Scenic Gondola Ride",
    category: "Resort Activities",
    image:
      "https://images.unsplash.com/photo-1483728642387-6b3b4528e414?w=600&h=400&fit=crop",
    bullets: [
      "Ride up the mountain at Big Sky Resort",
      "Panoramic views of Lone Peak",
      "Easy activity for all ages",
    ],
  },
  {
    id: "zipline",
    title: "Zip Line",
    category: "Resort Activities",
    image:
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=400&fit=crop",
    bullets: ["Adventure zip through the trees", "At Big Sky Resort"],
  },
  {
    id: "mini-golf",
    title: "Mini Golf",
    category: "Resort Activities",
    image:
      "https://images.unsplash.com/photo-1622992899683-ae1a3a100856?w=600&h=400&fit=crop",
    bullets: ["Easy afternoon option", "At Big Sky Resort", "Great for all ages"],
  },
];

export const CHEF_OPTIONS: ChefOption[] = [
  {
    id: "wild-chef",
    name: "Wild Chef",
    style: "Fine Dining",
    description: "Michelin-level backgrounds, multi-course tasting menu",
  },
  {
    id: "food-for-thought",
    name: "Food For Thought",
    style: "Montana Flavors",
    description: "Bison, huckleberry, family-style. Min 10 guests.",
  },
  {
    id: "montana-chef",
    name: "Montana Chef",
    style: "Kid-Friendly & Flexible",
    description: "Menus for all ages, casual or formal",
  },
  {
    id: "out-of-bounds",
    name: "Out of Bounds Catering",
    style: "Buffet + Grocery Stocking",
    description: "Buffet or plated dinners, plus they stock the fridge for the week",
  },
];

export const ACTIVITY_CATEGORIES = [
  "Outdoor Adventures",
  "Animals",
  "Evening & Social",
  "Golf",
  "Resort Activities",
] as const;
