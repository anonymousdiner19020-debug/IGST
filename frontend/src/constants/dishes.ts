export type Ingredient = {
  id: string;
  emoji: string;
  color: string;
};

// Master ingredient library with cartoon emoji icons + tile colors
export const INGREDIENTS: Record<string, Ingredient> = {
  steak: { id: "steak", emoji: "🥩", color: "#C0392B" },
  onion: { id: "onion", emoji: "🧅", color: "#E9C46A" },
  cheese: { id: "cheese", emoji: "🧀", color: "#F4A261" },
  roll: { id: "roll", emoji: "🥖", color: "#D4A373" },
  dough: { id: "dough", emoji: "🍞", color: "#E9DCC9" },
  salt: { id: "salt", emoji: "🧂", color: "#FDFBF7" },
  mustard: { id: "mustard", emoji: "🌭", color: "#FFB703" },
  ice: { id: "ice", emoji: "🧊", color: "#B8E0FF" },
  cherry: { id: "cherry", emoji: "🍒", color: "#E63946" },
  lemon: { id: "lemon", emoji: "🍋", color: "#FFEB99" },
  ham: { id: "ham", emoji: "🥓", color: "#F4A6A6" },
  lettuce: { id: "lettuce", emoji: "🥬", color: "#A8D5A2" },
  pork: { id: "pork", emoji: "🍖", color: "#B96A5C" },
  broccoli: { id: "broccoli", emoji: "🥦", color: "#4C956C" },
  provolone: { id: "provolone", emoji: "🧀", color: "#FFF3B0" },
  tomato: { id: "tomato", emoji: "🍅", color: "#E63946" },
  basil: { id: "basil", emoji: "🌿", color: "#4C956C" },
  cornmeal: { id: "cornmeal", emoji: "🌽", color: "#F4C430" },
  sage: { id: "sage", emoji: "🍃", color: "#7BAE7F" },
  egg: { id: "egg", emoji: "🥚", color: "#FFF3B0" },
  flour: { id: "flour", emoji: "🌾", color: "#F0E5D3" },
  sugar: { id: "sugar", emoji: "🍬", color: "#FFE4E1" },
  chocolate: { id: "chocolate", emoji: "🍫", color: "#6B4226" },
  cream: { id: "cream", emoji: "🍦", color: "#FFF8E7" },
};

export type Dish = {
  id: string;
  name: string;
  emoji: string;
  unlock_level: number;
  recipe: Record<string, number>;
  reward_coins: number;
  moves: number;
};

export const FALLBACK_DISHES: Dish[] = [
  {
    id: "cheesesteak",
    name: "Philly Cheesesteak",
    emoji: "🥩",
    unlock_level: 1,
    recipe: { steak: 4, onion: 3, cheese: 3, roll: 2 },
    reward_coins: 50,
    moves: 22,
  },
  {
    id: "soft_pretzel",
    name: "Soft Pretzel",
    emoji: "🥨",
    unlock_level: 2,
    recipe: { dough: 4, salt: 3, mustard: 2 },
    reward_coins: 60,
    moves: 20,
  },
  {
    id: "water_ice",
    name: "Water Ice",
    emoji: "🍧",
    unlock_level: 3,
    recipe: { ice: 5, cherry: 3, lemon: 3 },
    reward_coins: 70,
    moves: 20,
  },
  {
    id: "hoagie",
    name: "Italian Hoagie",
    emoji: "🥖",
    unlock_level: 4,
    recipe: { roll: 3, ham: 3, cheese: 3, lettuce: 2 },
    reward_coins: 80,
    moves: 22,
  },
  {
    id: "roast_pork",
    name: "Roast Pork Sandwich",
    emoji: "🥓",
    unlock_level: 5,
    recipe: { pork: 4, broccoli: 3, provolone: 3, roll: 3 },
    reward_coins: 100,
    moves: 24,
  },
  {
    id: "tomato_pie",
    name: "Tomato Pie",
    emoji: "🍕",
    unlock_level: 6,
    recipe: { dough: 4, tomato: 4, basil: 3, cheese: 3 },
    reward_coins: 110,
    moves: 24,
  },
  {
    id: "scrapple",
    name: "Scrapple",
    emoji: "🍳",
    unlock_level: 7,
    recipe: { pork: 4, cornmeal: 4, sage: 3, egg: 3 },
    reward_coins: 130,
    moves: 26,
  },
  {
    id: "tastykake",
    name: "Tastykake",
    emoji: "🧁",
    unlock_level: 8,
    recipe: { flour: 4, sugar: 4, chocolate: 4, cream: 3 },
    reward_coins: 150,
    moves: 26,
  },
];

export const CUSTOMER_AVATARS = ["👩‍🦰", "🧑‍🦱", "👨‍🦳", "🧑‍🎤", "👵", "🧑‍🚒", "👷", "🧑‍🎓"];
