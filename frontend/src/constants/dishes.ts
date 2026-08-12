export type Ingredient = {
  id: string;
  emoji: string;
  color: string;
  label: string;
};

export const INGREDIENTS: Record<string, Ingredient> = {
  // Cheesesteak family
  steak: { id: "steak", emoji: "🥩", color: "#C0392B", label: "Steak" },
  onion: { id: "onion", emoji: "🧅", color: "#E9C46A", label: "Onions" },
  cheese: { id: "cheese", emoji: "🧀", color: "#F4A261", label: "American" },
  whiz: { id: "whiz", emoji: "🟡", color: "#FFD166", label: "Cheese Whiz" },
  provolone: { id: "provolone", emoji: "⚪", color: "#FFF3B0", label: "Provolone" },
  mushroom: { id: "mushroom", emoji: "🍄", color: "#B08968", label: "Mushrooms" },
  hot_pepper: { id: "hot_pepper", emoji: "🌶️", color: "#E63946", label: "Hot Peppers" },
  sweet_pepper: { id: "sweet_pepper", emoji: "🫑", color: "#4C956C", label: "Sweet Peppers" },
  ketchup: { id: "ketchup", emoji: "🍅", color: "#E63946", label: "Ketchup" },
  mustard: { id: "mustard", emoji: "🟨", color: "#FFB703", label: "Mustard" },
  mayo: { id: "mayo", emoji: "⚪", color: "#FDFBF7", label: "Mayo" },
  roll: { id: "roll", emoji: "🥖", color: "#D4A373", label: "Roll" },

  // Pretzel
  dough: { id: "dough", emoji: "🥨", color: "#D4A373", label: "Pretzel" },
  salt: { id: "salt", emoji: "🧂", color: "#FDFBF7", label: "Salt" },
  cheese_dip: { id: "cheese_dip", emoji: "🧀", color: "#FFD166", label: "Cheese Dip" },
  mustard_dip: { id: "mustard_dip", emoji: "🟡", color: "#FFB703", label: "Mustard Dip" },
  cinnamon: { id: "cinnamon", emoji: "🟫", color: "#8B4513", label: "Cinnamon" },

  // Water Ice
  ice: { id: "ice", emoji: "🧊", color: "#B8E0FF", label: "Ice" },
  cherry: { id: "cherry", emoji: "🍒", color: "#E63946", label: "Cherry" },
  lemon: { id: "lemon", emoji: "🍋", color: "#FFEB99", label: "Lemon" },
  mango: { id: "mango", emoji: "🥭", color: "#F4A261", label: "Mango" },
  blueberry: { id: "blueberry", emoji: "🫐", color: "#4A6FA5", label: "Blueberry" },

  // Hoagie
  ham: { id: "ham", emoji: "🥓", color: "#F4A6A6", label: "Ham" },
  salami: { id: "salami", emoji: "🍖", color: "#B96A5C", label: "Salami" },
  lettuce: { id: "lettuce", emoji: "🥬", color: "#A8D5A2", label: "Lettuce" },
  tomato: { id: "tomato", emoji: "🍅", color: "#E63946", label: "Tomato" },
  oil: { id: "oil", emoji: "🫒", color: "#4C956C", label: "Oil & Vinegar" },

  // Roast Pork
  pork: { id: "pork", emoji: "🍖", color: "#B96A5C", label: "Roast Pork" },
  broccoli: { id: "broccoli", emoji: "🥦", color: "#4C956C", label: "Broccoli Rabe" },
  garlic: { id: "garlic", emoji: "🧄", color: "#F0E5D3", label: "Garlic" },

  // Tomato Pie
  basil: { id: "basil", emoji: "🌿", color: "#4C956C", label: "Basil" },
  oregano: { id: "oregano", emoji: "🍃", color: "#7BAE7F", label: "Oregano" },
  parm: { id: "parm", emoji: "🧀", color: "#FFF3B0", label: "Parmesan" },

  // Scrapple
  scrapple: { id: "scrapple", emoji: "🟫", color: "#8B4513", label: "Scrapple" },
  egg: { id: "egg", emoji: "🍳", color: "#FFF3B0", label: "Egg" },
  bacon: { id: "bacon", emoji: "🥓", color: "#B96A5C", label: "Bacon" },
  sage: { id: "sage", emoji: "🍃", color: "#7BAE7F", label: "Sage" },
  hash: { id: "hash", emoji: "🥔", color: "#D4A373", label: "Hash Browns" },

  // Tastykake / dessert
  flour: { id: "flour", emoji: "🌾", color: "#F0E5D3", label: "Cake" },
  chocolate: { id: "chocolate", emoji: "🍫", color: "#6B4226", label: "Chocolate" },
  cream: { id: "cream", emoji: "🍦", color: "#FFF8E7", label: "Cream" },
  sprinkle: { id: "sprinkle", emoji: "✨", color: "#FF69B4", label: "Sprinkles" },
  strawberry: { id: "strawberry", emoji: "🍓", color: "#E63946", label: "Strawberry" },
};

export type Dish = {
  id: string;
  name: string;
  emoji: string;
  unlock_level: number;
  // Base items the player MUST match to unlock the storefront serve phase
  base_recipe: Record<string, number>;
  // Optional toppings — collected during match-3, available at serve time
  topping_options: string[];
  // Sample order phrasing verb
  verb: string; // e.g., "cook", "roll", "scoop", "bake", "fry"
  reward_coins: number;
  moves: number;
  customers_per_level: number;
};

export const FALLBACK_DISHES: Dish[] = [
  {
    id: "cheesesteak",
    name: "Cheesesteak",
    emoji: "🥪",
    unlock_level: 1,
    base_recipe: { steak: 4, roll: 2 },
    topping_options: ["onion", "cheese", "whiz", "provolone", "mushroom", "hot_pepper", "sweet_pepper", "ketchup", "mustard"],
    verb: "grill",
    reward_coins: 40,
    moves: 26,
    customers_per_level: 3,
  },
  {
    id: "soft_pretzel",
    name: "Soft Pretzel",
    emoji: "🥨",
    unlock_level: 2,
    base_recipe: { dough: 4, salt: 3 },
    topping_options: ["mustard_dip", "cheese_dip", "cinnamon"],
    verb: "twist",
    reward_coins: 50,
    moves: 26,
    customers_per_level: 3,
  },
  {
    id: "water_ice",
    name: "Water Ice",
    emoji: "🍧",
    unlock_level: 3,
    base_recipe: { ice: 5 },
    topping_options: ["cherry", "lemon", "mango", "blueberry", "strawberry"],
    verb: "scoop",
    reward_coins: 60,
    moves: 24,
    customers_per_level: 3,
  },
  {
    id: "hoagie",
    name: "Italian Hoagie",
    emoji: "🥖",
    unlock_level: 4,
    base_recipe: { roll: 3, ham: 3, salami: 2 },
    topping_options: ["cheese", "provolone", "lettuce", "tomato", "onion", "oil", "hot_pepper", "sweet_pepper", "mayo"],
    verb: "build",
    reward_coins: 75,
    moves: 28,
    customers_per_level: 4,
  },
  {
    id: "roast_pork",
    name: "Roast Pork Sandwich",
    emoji: "🥓",
    unlock_level: 5,
    base_recipe: { pork: 4, roll: 3 },
    topping_options: ["broccoli", "provolone", "garlic", "hot_pepper", "sweet_pepper", "mayo"],
    verb: "roast",
    reward_coins: 95,
    moves: 28,
    customers_per_level: 4,
  },
  {
    id: "tomato_pie",
    name: "Tomato Pie",
    emoji: "🍕",
    unlock_level: 6,
    base_recipe: { dough: 4, tomato: 4 },
    topping_options: ["basil", "oregano", "cheese", "parm", "garlic", "hot_pepper", "mushroom"],
    verb: "bake",
    reward_coins: 110,
    moves: 30,
    customers_per_level: 4,
  },
  {
    id: "scrapple",
    name: "Scrapple Breakfast",
    emoji: "🍳",
    unlock_level: 7,
    base_recipe: { scrapple: 3, egg: 3, roll: 2 },
    topping_options: ["cheese", "bacon", "sage", "hash", "ketchup", "hot_pepper", "mustard"],
    verb: "fry",
    reward_coins: 130,
    moves: 32,
    customers_per_level: 5,
  },
  {
    id: "tastykake",
    name: "Cream Cake",
    emoji: "🧁",
    unlock_level: 8,
    base_recipe: { flour: 4, cream: 3 },
    topping_options: ["chocolate", "strawberry", "sprinkle", "cherry", "blueberry"],
    verb: "bake",
    reward_coins: 160,
    moves: 32,
    customers_per_level: 5,
  },
];

// Remove the accidental filter placeholder from pretzel
FALLBACK_DISHES[1].topping_options = ["mustard_dip", "cheese_dip", "cinnamon"];

export const CUSTOMER_AVATARS = ["👩‍🦰", "🧑‍🦱", "👨‍🦳", "🧑‍🎤", "👵", "🧑‍🚒", "👷", "🧑‍🎓", "🧑‍🌾", "🧑‍🎨", "👨‍⚕️", "🧕"];

// Generate a customer order: pick 1-3 wanted toppings + 0-1 forbidden
export function generateCustomerOrder(dish: Dish, rand: () => number = Math.random): {
  wanted: string[];
  forbidden: string[];
} {
  const pool = [...dish.topping_options];
  const shuffled = pool.sort(() => rand() - 0.5);
  const wantedCount = 1 + Math.floor(rand() * Math.min(3, shuffled.length));
  const wanted = shuffled.slice(0, wantedCount);
  const forbidden: string[] = [];
  if (shuffled.length > wantedCount && rand() > 0.55) {
    forbidden.push(shuffled[wantedCount]);
  }
  return { wanted, forbidden };
}
