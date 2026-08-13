export type Ingredient = {
  id: string;
  emoji: string;
  color: string;
  label: string;
};

export const INGREDIENTS: Record<string, Ingredient> = {
  // Pretzel + sauces
  dough: { id: "dough", emoji: "🥨", color: "#D4A373", label: "Dough" },
  salt: { id: "salt", emoji: "🧂", color: "#FDFBF7", label: "Salt" },
  cheese_sauce: { id: "cheese_sauce", emoji: "🧀", color: "#FFD166", label: "Cheese Sauce" },
  mustard: { id: "mustard", emoji: "🟨", color: "#FFB703", label: "Mustard" },
  cinnamon_sauce: { id: "cinnamon_sauce", emoji: "🟫", color: "#8B4513", label: "Cinnamon" },
  chocolate_sauce: { id: "chocolate_sauce", emoji: "🍫", color: "#6B4226", label: "Chocolate" },
  pizza_sauce: { id: "pizza_sauce", emoji: "🍅", color: "#C0392B", label: "Pizza Sauce" },
  american: { id: "american", emoji: "🧀", color: "#FFCF48", label: "American" },
  spicy: { id: "spicy", emoji: "🌶️", color: "#E63946", label: "Spicy" },

  // Happy Cakes
  pb_cake: { id: "pb_cake", emoji: "🍩", color: "#7B4A2A", label: "PB Cake" },
  butterscotch_cake: { id: "butterscotch_cake", emoji: "🟨", color: "#E0A030", label: "Butterscotch" },
  chocolate_cake: { id: "chocolate_cake", emoji: "🍫", color: "#5C3418", label: "Choc Cake" },
  mini_pie: { id: "mini_pie", emoji: "🥧", color: "#D4A373", label: "Mini Pie" },

  // Water Ice
  cup: { id: "cup", emoji: "🥤", color: "#B8E0FF", label: "Cup" },
  cherry: { id: "cherry", emoji: "🍒", color: "#E63946", label: "Cherry" },
  rootbeer: { id: "rootbeer", emoji: "🟤", color: "#6B4226", label: "Root Beer" },
  lemon: { id: "lemon", emoji: "🍋", color: "#FFEB99", label: "Lemon" },
  blueberry: { id: "blueberry", emoji: "🫐", color: "#4A6FA5", label: "Blueberry" },
  ice_cream: { id: "ice_cream", emoji: "🍦", color: "#FFF8E7", label: "Ice Cream" },
  sprinkles: { id: "sprinkles", emoji: "✨", color: "#FF69B4", label: "Sprinkles" },

  // Hoagie meats & veg
  roll: { id: "roll", emoji: "🥖", color: "#D4A373", label: "Roll" },
  lettuce: { id: "lettuce", emoji: "🥬", color: "#A8D5A2", label: "Lettuce" },
  tomato: { id: "tomato", emoji: "🍅", color: "#E63946", label: "Tomato" },
  onion: { id: "onion", emoji: "🧅", color: "#E9C46A", label: "Onions" },
  mayo: { id: "mayo", emoji: "⚪", color: "#FDFBF7", label: "Mayo" },
  oil: { id: "oil", emoji: "🫒", color: "#4C956C", label: "Oil & Vinegar" },
  ham: { id: "ham", emoji: "🥓", color: "#F4A6A6", label: "Ham" },
  cheese: { id: "cheese", emoji: "🧀", color: "#F4A261", label: "Cheese" },
  bologna: { id: "bologna", emoji: "🔴", color: "#D98A8A", label: "Bologna" },
  salami: { id: "salami", emoji: "🍖", color: "#B96A5C", label: "Salami" },
  provolone: { id: "provolone", emoji: "⚪", color: "#FFF3B0", label: "Provolone" },
  capicola: { id: "capicola", emoji: "🥓", color: "#B5645C", label: "Capicola" },
  pepperoni: { id: "pepperoni", emoji: "🔴", color: "#B03A2E", label: "Pepperoni" },

  // Cheesesteak
  steak: { id: "steak", emoji: "🥩", color: "#C0392B", label: "Chopped Steak" },
  mushroom: { id: "mushroom", emoji: "🍄", color: "#B08968", label: "Mushrooms" },
  hot_pepper: { id: "hot_pepper", emoji: "🌶️", color: "#E63946", label: "Long Hots" },
  whiz: { id: "whiz", emoji: "🟡", color: "#FFD166", label: "Cheese Whiz" },

  // Roast Pork
  pork: { id: "pork", emoji: "🍖", color: "#B96A5C", label: "Roast Pork" },
  broccoli: { id: "broccoli", emoji: "🥦", color: "#4C956C", label: "Broccoli Rabe" },
  spinach: { id: "spinach", emoji: "🥬", color: "#4C956C", label: "Spinach" },

  // Scrapple / Pork Roll breakfast
  scrapple: { id: "scrapple", emoji: "🟫", color: "#7A4A2B", label: "Scrapple" },
  egg: { id: "egg", emoji: "🍳", color: "#FFE7A0", label: "Egg" },
  long_roll: { id: "long_roll", emoji: "🥖", color: "#D4A373", label: "Long Roll" },
  round_roll: { id: "round_roll", emoji: "🍞", color: "#E4B980", label: "Round Roll" },
  salt_pepper: { id: "salt_pepper", emoji: "🧂", color: "#C9C4B5", label: "Salt & Pepper" },
  ketchup: { id: "ketchup", emoji: "🥫", color: "#C0392B", label: "Ketchup" },
  porkroll: { id: "porkroll", emoji: "🥓", color: "#D98A8A", label: "Pork Roll" },

  // Seasoned Fries
  potato: { id: "potato", emoji: "🍟", color: "#F2C14E", label: "Fries" },
  american_melt: { id: "american_melt", emoji: "🧀", color: "#FFCF48", label: "American" },
  cheddar_melt: { id: "cheddar_melt", emoji: "🧀", color: "#E8871E", label: "Cheddar" },
  small_cup: { id: "small_cup", emoji: "🥤", color: "#B8E0FF", label: "Cup" },
  seasoning: { id: "seasoning", emoji: "🫙", color: "#B5651D", label: "Seasoning" },

  // Tomato Pie
  olive_oil: { id: "olive_oil", emoji: "🫒", color: "#7BA05B", label: "Olive Oil" },
  basil: { id: "basil", emoji: "🌿", color: "#4C956C", label: "Basil" },

  // Donuts
  vanilla_donut: { id: "vanilla_donut", emoji: "🍩", color: "#F5E6C8", label: "Vanilla Donut" },
  chocolate_donut: { id: "chocolate_donut", emoji: "🍩", color: "#6B4226", label: "Chocolate Donut" },
  strawberry_donut: { id: "strawberry_donut", emoji: "🍩", color: "#F7A8B8", label: "Strawberry Donut" },
};

export type Dish = {
  id: string;
  name: string;
  emoji: string;
  unlock_level: number;
  base_recipe: Record<string, number>;
  topping_options: string[];
  verb: string;
  reward_coins: number;
  moves: number;
  customers_per_level: number;
};

export const FALLBACK_DISHES: Dish[] = [
  {
    id: "soft_pretzel",
    name: "Soft Pretzel",
    emoji: "🥨",
    unlock_level: 1,
    base_recipe: { dough: 2, salt: 2, cheese_sauce: 2, mustard: 2, pizza_sauce: 2 },
    topping_options: ["spicy", "cinnamon_sauce", "chocolate_sauce", "american"],
    verb: "twist",
    reward_coins: 40,
    moves: 30,
    customers_per_level: 10,
  },
  {
    id: "happy_cakes",
    name: "Happy Cakes",
    emoji: "🧁",
    unlock_level: 2,
    base_recipe: { pb_cake: 2, chocolate_cake: 2, butterscotch_cake: 2, mini_pie: 2, sprinkles: 2 },
    topping_options: ["chocolate_sauce", "cherry"],
    verb: "box",
    reward_coins: 55,
    moves: 30,
    customers_per_level: 10,
  },
  {
    id: "water_ice",
    name: "Water Ice",
    emoji: "🍧",
    unlock_level: 3,
    base_recipe: { cup: 2, cherry: 2, rootbeer: 2, lemon: 2, blueberry: 2 },
    topping_options: ["ice_cream", "sprinkles"],
    verb: "scoop",
    reward_coins: 65,
    moves: 30,
    customers_per_level: 10,
  },
  {
    id: "american_hoagie",
    name: "American Hoagie",
    emoji: "🥖",
    unlock_level: 5,
    base_recipe: { roll: 2, ham: 2, cheese: 2, lettuce: 2, onion: 2 },
    topping_options: ["tomato", "mayo", "oil", "bologna", "salami"],
    verb: "build",
    reward_coins: 80,
    moves: 32,
    customers_per_level: 10,
  },
  {
    id: "italian_hoagie",
    name: "Italian Hoagie",
    emoji: "🥖",
    unlock_level: 6,
    base_recipe: { roll: 2, salami: 2, provolone: 2, capicola: 2, pepperoni: 2 },
    topping_options: ["lettuce", "tomato", "onion", "mayo", "oil"],
    verb: "build",
    reward_coins: 95,
    moves: 32,
    customers_per_level: 10,
  },
  {
    id: "cheesesteak",
    name: "Cheesesteak",
    emoji: "🥪",
    unlock_level: 7,
    base_recipe: { steak: 2, roll: 2, onion: 2, american: 2, mushroom: 2 },
    topping_options: ["hot_pepper", "provolone", "whiz"],
    verb: "grill",
    reward_coins: 110,
    moves: 32,
    customers_per_level: 10,
  },
  {
    id: "roast_pork",
    name: "Roast Pork",
    emoji: "🥓",
    unlock_level: 8,
    base_recipe: { pork: 2, roll: 2, broccoli: 2, spinach: 2, provolone: 2 },
    topping_options: ["american", "hot_pepper"],
    verb: "roast",
    reward_coins: 130,
    moves: 34,
    customers_per_level: 10,
  },
  {
    id: "scrapple_ec",
    name: "Scrapple, Egg & Cheese",
    emoji: "🍳",
    unlock_level: 9,
    base_recipe: { scrapple: 2, egg: 2, american: 2, long_roll: 2, round_roll: 2 },
    topping_options: ["salt_pepper", "ketchup"],
    verb: "grill",
    reward_coins: 150,
    moves: 34,
    customers_per_level: 10,
  },
  {
    id: "seasoned_fries",
    name: "Seasoned Fries",
    emoji: "🍟",
    unlock_level: 10,
    base_recipe: { potato: 2, small_cup: 2, seasoning: 2, american_melt: 2, cheddar_melt: 2 },
    topping_options: ["american_melt", "cheddar_melt", "seasoning"],
    verb: "fry",
    reward_coins: 165,
    moves: 34,
    customers_per_level: 10,
  },
  {
    id: "tomato_pie",
    name: "Tomato Pie",
    emoji: "🍕",
    unlock_level: 11,
    base_recipe: { dough: 2, tomato: 2, olive_oil: 2, pepperoni: 2, basil: 2 },
    topping_options: ["pepperoni", "basil", "olive_oil"],
    verb: "bake",
    reward_coins: 180,
    moves: 36,
    customers_per_level: 10,
  },
  {
    id: "porkroll_ec",
    name: "Pork Roll, Egg & Cheese",
    emoji: "🥪",
    unlock_level: 12,
    base_recipe: { porkroll: 2, egg: 2, cheese: 2, round_roll: 2, long_roll: 2 },
    topping_options: ["salt_pepper"],
    verb: "grill",
    reward_coins: 195,
    moves: 36,
    customers_per_level: 10,
  },
  {
    id: "donuts",
    name: "Donuts",
    emoji: "🍩",
    unlock_level: 4,
    base_recipe: { vanilla_donut: 2, chocolate_donut: 2, strawberry_donut: 2, sprinkles: 2 },
    topping_options: ["sprinkles"],
    verb: "glaze",
    reward_coins: 210,
    moves: 36,
    customers_per_level: 10,
  },
];

export const CUSTOMER_AVATARS = ["👩‍🦰", "🧑‍🦱", "👨‍🦳", "🧑‍🎤", "👵", "🧑‍🚒", "👷", "🧑‍🎓", "🧑‍🌾", "🧑‍🎨", "👨‍⚕️", "🧕"];

// Bread/cup base carriers — collected in the match phase, not offered as a
// tap-to-add serving option.
const CARRIERS = new Set(["dough", "roll", "cup", "long_roll", "round_roll", "small_cup"]);

// Every ingredient a customer can request in the serving phase: the dish's
// flavour base items plus its toppings (minus the bread/cup carrier).
export function serveOptions(dish: Dish): string[] {
  const all = [...Object.keys(dish.base_recipe), ...dish.topping_options];
  return [...new Set(all)].filter((id) => !CARRIERS.has(id));
}

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
