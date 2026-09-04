export type ShopKind = "chiki" | "room";
export type ShopRarity = "Comune" | "Raro" | "Epico";

export type ShopItem = {
  id: string;
  kind: ShopKind;
  category: string;
  slot: string;
  name: string;
  icon: string;
  price: number;
  requiredLevel: number;
  rarity: ShopRarity;
};

export const shopItems: ShopItem[] = [
  { id: "outfit_classic", kind: "chiki", category: "Vestiti", slot: "outfit", name: "Naturale", icon: "✨", price: 0, requiredLevel: 1, rarity: "Comune" },
  { id: "outfit_sport", kind: "chiki", category: "Vestiti", slot: "outfit", name: "Sportiva", icon: "👚", price: 350, requiredLevel: 3, rarity: "Comune" },
  { id: "outfit_rain", kind: "chiki", category: "Vestiti", slot: "outfit", name: "Impermeabile chic", icon: "🧥", price: 700, requiredLevel: 8, rarity: "Comune" },
  { id: "outfit_sailor", kind: "chiki", category: "Vestiti", slot: "outfit", name: "Marinara", icon: "⚓", price: 950, requiredLevel: 14, rarity: "Raro" },
  { id: "outfit_royal", kind: "chiki", category: "Vestiti", slot: "outfit", name: "Principessina", icon: "👗", price: 3200, requiredLevel: 35, rarity: "Epico" },
  { id: "outfit_wizard", kind: "chiki", category: "Vestiti", slot: "outfit", name: "Fatina", icon: "🧚‍♀️", price: 4200, requiredLevel: 55, rarity: "Epico" },
  { id: "outfit_explorer", kind: "chiki", category: "Vestiti", slot: "outfit", name: "Esploratrice", icon: "🧭", price: 1800, requiredLevel: 25, rarity: "Raro" },
  { id: "outfit_winter", kind: "chiki", category: "Vestiti", slot: "outfit", name: "Invernale", icon: "🧣", price: 1500, requiredLevel: 21, rarity: "Raro" },
  { id: "hat_cap", kind: "chiki", category: "Accessori testa", slot: "hat", name: "Fiocco lilla", icon: "🎀", price: 300, requiredLevel: 2, rarity: "Comune" },
  { id: "hat_cowboy", kind: "chiki", category: "Accessori testa", slot: "hat", name: "Cappello country", icon: "👒", price: 850, requiredLevel: 12, rarity: "Raro" },
  { id: "hat_top", kind: "chiki", category: "Accessori testa", slot: "hat", name: "Fascinator elegante", icon: "🌸", price: 1200, requiredLevel: 18, rarity: "Raro" },
  { id: "hat_crown", kind: "chiki", category: "Accessori testa", slot: "hat", name: "Tiara dorata", icon: "👑", price: 3000, requiredLevel: 40, rarity: "Epico" },
  { id: "hat_party", kind: "chiki", category: "Accessori testa", slot: "hat", name: "Cerchietto stelline", icon: "✨", price: 600, requiredLevel: 7, rarity: "Comune" },
  { id: "hat_chef", kind: "chiki", category: "Accessori testa", slot: "hat", name: "Cappello pasticcera", icon: "🧁", price: 1100, requiredLevel: 16, rarity: "Raro" },
  { id: "glasses_sun", kind: "chiki", category: "Occhiali", slot: "glasses", name: "Occhiali diva", icon: "🕶️", price: 550, requiredLevel: 6, rarity: "Comune" },
  { id: "glasses_star", kind: "chiki", category: "Occhiali", slot: "glasses", name: "Occhiali stellina", icon: "🤩", price: 1600, requiredLevel: 28, rarity: "Raro" },
  { id: "collar_red", kind: "chiki", category: "Collari", slot: "collar", name: "Collare cuore", icon: "❤️", price: 400, requiredLevel: 4, rarity: "Comune" },
  { id: "collar_blue", kind: "chiki", category: "Collari", slot: "collar", name: "Collare lilla", icon: "💜", price: 450, requiredLevel: 5, rarity: "Comune" },
  { id: "collar_gold", kind: "chiki", category: "Collari", slot: "collar", name: "Collare gioiello", icon: "💎", price: 2400, requiredLevel: 32, rarity: "Epico" },
  { id: "toy_ball", kind: "chiki", category: "Giochi", slot: "toy", name: "Pallina", icon: "🎾", price: 250, requiredLevel: 1, rarity: "Comune" },
  { id: "toy_bone", kind: "chiki", category: "Giochi", slot: "toy", name: "Osso gigante", icon: "🦴", price: 500, requiredLevel: 5, rarity: "Comune" },
  { id: "toy_duck", kind: "chiki", category: "Giochi", slot: "toy", name: "Paperella", icon: "🦆", price: 900, requiredLevel: 15, rarity: "Raro" },
  { id: "bed_basic", kind: "room", category: "Cucce", slot: "bed", name: "Cuccia morbida", icon: "🛏️", price: 0, requiredLevel: 1, rarity: "Comune" },
  { id: "bed_blue", kind: "room", category: "Cucce", slot: "bed", name: "Cuccia cielo", icon: "🛏️", price: 900, requiredLevel: 10, rarity: "Comune" },
  { id: "bed_wood", kind: "room", category: "Cucce", slot: "bed", name: "Cuccia chalet", icon: "🏠", price: 1800, requiredLevel: 24, rarity: "Raro" },
  { id: "bed_royal", kind: "room", category: "Cucce", slot: "bed", name: "Cuccia reale", icon: "🏰", price: 5000, requiredLevel: 60, rarity: "Epico" },
  { id: "bowl_basic", kind: "room", category: "Ciotole", slot: "bowl", name: "Ciotola classica", icon: "🥣", price: 0, requiredLevel: 1, rarity: "Comune" },
  { id: "bowl_blue", kind: "room", category: "Ciotole", slot: "bowl", name: "Ciotola blu", icon: "🥣", price: 450, requiredLevel: 5, rarity: "Comune" },
  { id: "bowl_gold", kind: "room", category: "Ciotole", slot: "bowl", name: "Ciotola dorata", icon: "🏆", price: 2200, requiredLevel: 36, rarity: "Epico" },
  { id: "rug_paw", kind: "room", category: "Tappeti", slot: "rug", name: "Tappeto zampa", icon: "🐾", price: 650, requiredLevel: 8, rarity: "Comune" },
  { id: "rug_star", kind: "room", category: "Tappeti", slot: "rug", name: "Tappeto stelle", icon: "⭐", price: 1400, requiredLevel: 22, rarity: "Raro" },
  { id: "rug_royal", kind: "room", category: "Tappeti", slot: "rug", name: "Tappeto reale", icon: "👑", price: 3000, requiredLevel: 48, rarity: "Epico" },
  { id: "lamp_cloud", kind: "room", category: "Lampade", slot: "lamp", name: "Lampada nuvola", icon: "☁️", price: 800, requiredLevel: 12, rarity: "Comune" },
  { id: "lamp_moon", kind: "room", category: "Lampade", slot: "lamp", name: "Lampada luna", icon: "🌙", price: 1600, requiredLevel: 26, rarity: "Raro" },
  { id: "lamp_crystal", kind: "room", category: "Lampade", slot: "lamp", name: "Lampada cristallo", icon: "💎", price: 3600, requiredLevel: 52, rarity: "Epico" },
  { id: "wall_sky", kind: "room", category: "Pareti", slot: "wall", name: "Cielo azzurro", icon: "🌤️", price: 0, requiredLevel: 1, rarity: "Comune" },
  { id: "wall_garden", kind: "room", category: "Pareti", slot: "wall", name: "Giardino", icon: "🌼", price: 900, requiredLevel: 11, rarity: "Comune" },
  { id: "wall_ice", kind: "room", category: "Pareti", slot: "wall", name: "Ghiaccio", icon: "❄️", price: 1700, requiredLevel: 25, rarity: "Raro" },
  { id: "wall_castle", kind: "room", category: "Pareti", slot: "wall", name: "Castello", icon: "🏰", price: 3200, requiredLevel: 45, rarity: "Epico" },
  { id: "floor_wood", kind: "room", category: "Pavimenti", slot: "floor", name: "Legno chiaro", icon: "🪵", price: 0, requiredLevel: 1, rarity: "Comune" },
  { id: "floor_carpet", kind: "room", category: "Pavimenti", slot: "floor", name: "Moquette", icon: "🟫", price: 750, requiredLevel: 9, rarity: "Comune" },
  { id: "floor_marble", kind: "room", category: "Pavimenti", slot: "floor", name: "Marmo reale", icon: "◻️", price: 2800, requiredLevel: 42, rarity: "Epico" },
  { id: "decor_plant", kind: "room", category: "Decorazioni", slot: "decor", name: "Pianta", icon: "🪴", price: 500, requiredLevel: 5, rarity: "Comune" },
  { id: "decor_trophy", kind: "room", category: "Decorazioni", slot: "decor", name: "Trofeo", icon: "🏆", price: 1900, requiredLevel: 30, rarity: "Raro" },
  { id: "decor_fireplace", kind: "room", category: "Decorazioni", slot: "decor", name: "Caminetto", icon: "🔥", price: 3400, requiredLevel: 50, rarity: "Epico" },
];

export const shopItemById = (id?: string) => shopItems.find((item) => item.id === id);
