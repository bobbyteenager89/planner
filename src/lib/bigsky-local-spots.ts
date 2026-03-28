export interface LocalSpot {
  name: string;
  category: string;
  address: string;
  note: string;
  driveMinutes?: number;
}

export const LOCAL_SPOTS: LocalSpot[] = [
  { name: "Hungry Moose Market & Deli", category: "☕ Coffee & Breakfast", address: "Big Sky Town Center, Big Sky, MT", note: "Best coffee in town. Also has grab-and-go breakfast burritos and pastries.", driveMinutes: 5 },
  { name: "Blue Moon Bakery", category: "☕ Coffee & Breakfast", address: "Big Sky Town Center, Big Sky, MT", note: "Fresh-baked pastries, breakfast sandwiches, good espresso.", driveMinutes: 5 },
  { name: "Caliber Coffee", category: "☕ Coffee & Breakfast", address: "Big Sky Town Center, Big Sky, MT", note: "Specialty coffee, smaller spot, worth the stop.", driveMinutes: 5 },
  { name: "Hungry Moose Market", category: "🛒 Groceries", address: "Big Sky Town Center, Big Sky, MT", note: "Your main grocery store. Small but stocked. Get snacks, drinks, sunscreen here.", driveMinutes: 5 },
  { name: "Roxy's Market", category: "🛒 Groceries", address: "Meadow Village, Big Sky, MT", note: "Smaller market, good for quick grabs. Closer to the Mountain Village side.", driveMinutes: 8 },
  { name: "Town & Country Foods", category: "🛒 Groceries", address: "Bozeman, MT", note: "Full-size grocery store. Stock up on the drive in from the airport.", driveMinutes: 50 },
  { name: "Conoco Big Sky", category: "⛽ Gas Stations", address: "US-191 & Lone Mountain Trail, Big Sky, MT", note: "Only gas station in Big Sky. Fill up here — next station is 30 min away.", driveMinutes: 5 },
  { name: "Sweet Peaks", category: "🍦 Ice Cream & Treats", address: "Big Sky Town Center, Big Sky, MT", note: "Montana-made ice cream. Huckleberry is the move. The kids will ask to come back.", driveMinutes: 5 },
  { name: "The Lotus Pad", category: "🍦 Ice Cream & Treats", address: "Big Sky Town Center, Big Sky, MT", note: "Thai food + bubble tea. Great for an afternoon pick-me-up.", driveMinutes: 5 },
  { name: "Beehive Basin Brewery", category: "🍕 Quick Eats", address: "Big Sky Town Center, Big Sky, MT", note: "Wood-fired pizza + local brews. Kid-friendly patio. Great for a casual night.", driveMinutes: 5 },
  { name: "Lone Peak Brewery", category: "🍕 Quick Eats", address: "Meadow Village, Big Sky, MT", note: "Burgers, wings, pasta. Solid pub food. TVs for sports.", driveMinutes: 7 },
  { name: "By Word of Mouth", category: "🍕 Quick Eats", address: "Meadow Village, Big Sky, MT", note: "Sandwiches, wraps, soups. Good lunch spot between activities.", driveMinutes: 7 },
  { name: "Big Sky Pharmacy", category: "💊 Pharmacy & Essentials", address: "Meadow Village, Big Sky, MT", note: "Prescriptions, first aid, sunscreen, bug spray. Small but has basics.", driveMinutes: 7 },
  { name: "Bozeman Costco", category: "💊 Pharmacy & Essentials", address: "Bozeman, MT", note: "Hit this on the airport drive if you need bulk snacks, drinks, or supplies.", driveMinutes: 50 },
  { name: "Grizzly Outfitters", category: "🎿 Outdoor Gear", address: "Big Sky Town Center, Big Sky, MT", note: "Rent bikes, buy fishing gear, get trail maps. Staff knows every trail.", driveMinutes: 5 },
  { name: "Gallatin Alpine Sports", category: "🎿 Outdoor Gear", address: "Meadow Village, Big Sky, MT", note: "Gear rental, repair, trail advice. Good for last-minute equipment.", driveMinutes: 7 },
];

export const SPOT_CATEGORIES = [...new Set(LOCAL_SPOTS.map((s) => s.category))];
