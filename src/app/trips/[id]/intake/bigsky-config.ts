export const BIGSKY_TRIP_ID = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

export interface Activity {
  id: string;
  title: string;
  category: string;
  image: string;
  bullets: string[];
  link?: { url: string; label: string };
  note?: string;
}

export interface ChefOption {
  id: string;
  name: string;
  style: string;
  description: string;
  link?: string;
}

export interface DinnerSpot {
  id: string;
  name: string;
  vibe: string;
  bullets: string[];
  link?: string;
}

export const ACTIVITIES: Activity[] = [
  {
    id: "fly-fishing",
    title: "Fly Fishing (Gallatin River)",
    category: "Outdoor Adventures",
    image: "https://lirp.cdn-website.com/aae9903b/dms3rep/multi/opt/gallatin-river-guides-guided-fishing-trips-montana-4-1920w.jpg",
    bullets: [
      "Guided walk-and-wade trips on the Gallatin River",
      "All gear included — rods, reels, waders, lunch",
      "2-hour pond intro option for kids under 11",
      "Fishing licenses required for ages 12+ (~$30–40/day)",
      "Half-day and full-day options available",
      "Some of the best trout fishing in the country",
    ],
    link: { url: "https://www.montanaflyfishing.com", label: "montanaflyfishing.com" },
  },
  {
    id: "horseback",
    title: "Horseback Riding",
    category: "Outdoor Adventures",
    image: "https://static.wixstatic.com/media/6ac825_acc2599b119b4b32a27eb303dd383311~mv2.jpg/v1/fill/w_600,h_400,al_c,q_80/6ac825_acc2599b119b4b32a27eb303dd383311~mv2.jpg",
    bullets: [
      "1–3 hour guided trail rides through Gallatin National Forest",
      "All abilities welcome — horses matched to experience level",
      "Minimum age 7 for trails, younger kids may do arena rides",
      "Cowboy cookout combo available (ride + dinner)",
      "Beautiful mountain and meadow scenery",
      "Multiple outfitters to choose from",
    ],
    link: { url: "http://jakeshorses.com", label: "jakeshorses.com" },
  },
  {
    id: "hiking-ousel",
    title: "Hiking — Ousel Falls",
    category: "Outdoor Adventures",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop&q=80",
    bullets: [
      "Easy 1.8-mile round trip to a beautiful waterfall",
      "All ages — stroller-friendly for most of the trail",
      "No booking needed, free to access",
      "Near Big Sky Town Center — easy to combine with lunch",
      "Shaded forest trail, great on a warm day",
    ],
  },
  {
    id: "yellowstone",
    title: "Yellowstone National Park",
    category: "Outdoor Adventures",
    image: "https://www.nps.gov/common/uploads/banner_image/imr/homepage/C0B398B8-B507-4BBC-CA7FF67430274C33.jpg",
    bullets: [
      "Grand Prismatic Spring, Old Faithful, Mammoth Hot Springs",
      "Wildlife spotting — bison, elk, bears, wolves",
      "Free Junior Ranger booklets for kids at any visitor center",
      "$35/vehicle entrance fee — good for 7 days",
      "Pack snacks and lunch — limited food options in the park",
      "Best to leave by 7 AM to beat the crowds",
    ],
    link: { url: "https://www.nps.gov/yell", label: "nps.gov/yell" },
    note: "Full day commitment — ~1 hour drive each way",
  },
  {
    id: "alpaca-farm",
    title: "Alpaca & Llama Farm Tour",
    category: "Animals",
    image: "https://alpacasofmontana.com/cdn/shop/files/5_a5c3a170-4d7b-4ede-8d4f-6d526b12a93b.png?v=1761772517",
    bullets: [
      "1.5-hour hands-on farm tour in Bozeman (~45 min drive)",
      "Feed, halter, brush, and bathe alpacas and llamas",
      "Baby alpacas likely in July — very cute",
      "Kids 5 and under are free",
      "Gift shop with alpaca fiber products",
      "One of the most-reviewed activities in the area",
    ],
    link: { url: "https://alpacasofmontana.com/products/alpaca-and-llama-farm-tours-schedule", label: "alpacasofmontana.com" },
  },
  {
    id: "llama-trek",
    title: "Llama Trekking",
    category: "Animals",
    image: "https://yellowstonellamas.com/wp-content/uploads/2026/01/yankeeLlama600.jpg",
    bullets: [
      "Day hikes with llamas carrying your gear and snacks",
      "Guided backcountry trails near Bozeman (~45 min away)",
      "Better suited for older kids and adults",
      "Llamas are gentle and fun to walk with",
      "Half-day and full-day options",
    ],
  },
  {
    id: "rodeo",
    title: "Tuesday Night Rodeo — July 21",
    category: "Evening & Social",
    image: "https://lonemountainranch.com/wp-content/uploads/2024/03/LoneMountainRodeo_OrangePhotographie-1064.jpg",
    bullets: [
      "Lone Mountain Ranch — Big Sky's signature summer event",
      "Barrel racing, bronc riding, team roping, live music",
      "Ticket includes cookout dinner + beer, wine, and soft drinks",
      "Great for all ages — real Montana experience",
      "Book early — these sell out",
    ],
    link: { url: "https://lonemountainranch.com/rodeo/", label: "lonemountainranch.com/rodeo" },
    note: "One night only — Tuesday July 21",
  },
  {
    id: "farmers-market",
    title: "Wednesday Farmers Market — July 22",
    category: "Evening & Social",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop&q=80",
    bullets: [
      "Every Wednesday 5–8 PM at Big Sky Town Center",
      "90+ vendors — crafts, produce, prepared food, art",
      "Live music and lawn games",
      "Huckleberry everything — snow cones, jam, pie",
      "Free, no tickets needed — just show up",
      "Great casual evening for the whole group",
    ],
  },
  {
    id: "golf-bigsky",
    title: "Golf — Big Sky Resort",
    category: "Golf",
    image: "https://cdn.sanity.io/images/8ts88bij/big-sky/fccb092981141e48961fdc63a313edcfd5a17315-2100x1180.jpg?w=600&h=400&fit=crop",
    bullets: [
      "Arnold Palmer-designed 18-hole championship course",
      "Stunning Lone Peak views from every hole",
      "Wildlife on course — elk, deer, eagles",
      "Club rentals and lessons available",
      "Tee times fill up fast in July",
    ],
    link: { url: "https://www.bigskyresort.com/summer-activities/golf", label: "bigskyresort.com/golf" },
  },
  {
    id: "golf-headwaters",
    title: "Golf — Headwaters (Value Option)",
    category: "Golf",
    image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&h=400&fit=crop&q=80",
    bullets: [
      "9 holes, ~$35/person — best value around",
      "In Three Forks (~45 min from house)",
      "Relaxed pace, less crowded than Big Sky Resort",
      "Good for a chill half-day outing",
    ],
    link: { url: "https://www.headwatersgolfcourse.org", label: "headwatersgolfcourse.org" },
  },
  {
    id: "gondola",
    title: "Scenic Gondola Ride",
    category: "Resort Activities",
    image: "https://cdn.sanity.io/images/8ts88bij/big-sky/a00014380611489e6d4fe3166a057ce251f8a5e6-2100x1401.jpg?w=600&h=400&fit=crop",
    bullets: [
      "Ride to the top of the mountain at Big Sky Resort",
      "Panoramic views of Lone Peak and the Spanish Peaks",
      "Easy activity for all ages — no hiking required",
      "Restaurant and viewing deck at the summit",
      "Can combine with hiking trails at the top",
    ],
    link: { url: "https://www.bigskyresort.com/summer-activities", label: "bigskyresort.com" },
  },
  {
    id: "zipline",
    title: "Zip Line",
    category: "Resort Activities",
    image: "https://cdn.sanity.io/images/8ts88bij/big-sky/162e4a07a876de74c82b941d16280890a2105d92-2100x1397.jpg?w=600&h=400&fit=crop",
    bullets: [
      "Adventure zip line course through the trees",
      "At Big Sky Resort — multiple lines and platforms",
      "Height and weight requirements apply",
      "Thrilling views of the mountains below",
    ],
    link: { url: "https://www.bigskyresort.com/summer-activities", label: "bigskyresort.com" },
  },
  {
    id: "mini-golf",
    title: "Mini Golf",
    category: "Resort Activities",
    image: "https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?w=600&h=400&fit=crop&q=80",
    bullets: [
      "18-hole course at Big Sky Resort",
      "Perfect for an easy afternoon with kids",
      "Great for all ages — no experience needed",
      "Combine with gondola or other resort activities",
    ],
    link: { url: "https://www.bigskyresort.com/summer-activities", label: "bigskyresort.com" },
  },
];

export const CHEF_OPTIONS: ChefOption[] = [
  {
    id: "wild-chef",
    name: "Wild Chef",
    style: "Fine Dining",
    description: "Michelin-trained chefs, multi-course tasting menus with wine pairings. High-end, special-occasion feel.",
    link: "https://www.eatwildchef.com",
  },
  {
    id: "food-for-thought",
    name: "Food For Thought",
    style: "Montana Flavors",
    description: "Bison, huckleberry, local trout — family-style Montana cuisine. Min 10 guests. Great for our group size.",
    link: "https://www.foodforthoughtmt.com/catering-services/in-home/",
  },
  {
    id: "montana-chef",
    name: "Montana Chef",
    style: "Kid-Friendly & Flexible",
    description: "Customizable menus for all ages. Can go casual or upscale. Good if we want something the kids will eat too.",
    link: "https://montanachef.com",
  },
  {
    id: "out-of-bounds",
    name: "Out of Bounds Catering",
    style: "Buffet + Grocery Stocking",
    description: "Buffet or plated dinners at the house, plus they can stock the fridge and pantry for the whole week.",
    link: "https://outofboundscatering.com",
  },
];

export const DINNER_SPOTS: DinnerSpot[] = [
  {
    id: "horn-cantle",
    name: "Horn & Cantle",
    vibe: "Upscale Montana ranch house",
    bullets: [
      "Lone Mountain Ranch — beautiful setting",
      "Elk, bison, fresh trout, craft cocktails",
      "Reservations recommended",
    ],
    link: "https://lonemountainranch.com/dining/horn-and-cantle/",
  },
  {
    id: "olive-bs",
    name: "Olive B's Big Sky Bistro",
    vibe: "Casual fine dining",
    bullets: [
      "Farm-to-table seasonal menu",
      "Local favorite — consistently great reviews",
      "Good wine list, cozy atmosphere",
    ],
    link: "https://www.olivebsbigsky.com",
  },
  {
    id: "corral",
    name: "The Corral Bar & Steakhouse",
    vibe: "Classic Montana roadhouse",
    bullets: [
      "Famous burgers and steaks since 1946",
      "Cash only, very casual",
      "Exactly what you'd hope a Montana bar looks like",
    ],
    link: "https://www.montanacorralbar.com",
  },
  {
    id: "beehive-basin",
    name: "Beehive Basin Brewery",
    vibe: "Craft brewery & pizza",
    bullets: [
      "Wood-fired pizza and local brews",
      "Outdoor patio with mountain views",
      "Super kid-friendly — lawn games, relaxed vibe",
    ],
  },
  {
    id: "hungry-moose",
    name: "Hungry Moose Market & Deli",
    vibe: "Deli & takeout",
    bullets: [
      "Great sandwiches, salads, and grab-and-go meals",
      "Perfect for picnic supplies or a quick lunch",
      "Right in Town Center",
    ],
  },
  {
    id: "lone-peak-brewery",
    name: "Lone Peak Brewery & Taphouse",
    vibe: "Brewery & pub food",
    bullets: [
      "Big menu — burgers, wings, salads, pasta",
      "Kid-friendly with a family section",
      "Lively atmosphere, good for a big group",
    ],
    link: "https://www.lonepeakbrewery.com",
  },
];

export const ACTIVITY_CATEGORIES = [
  "Outdoor Adventures",
  "Animals",
  "Evening & Social",
  "Golf",
  "Resort Activities",
] as const;
