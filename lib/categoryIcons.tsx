// Kategori ikonları — mobil Ionicons adlarını web (lucide) bileşenlerine eşler.
// Mobil ile AYNI ikon adı saklanır (constants/categories.ts) → tutarlı sözlük.
import {
  ShoppingCart, Coffee, Car, FileText, Gamepad2, Stethoscope, Shirt,
  UtensilsCrossed, Flame, Home, CreditCard, GraduationCap, Repeat, Wallet,
  Laptop, TrendingUp, Briefcase, Gift, Undo2, PawPrint, Heart, Star, Plane,
  Bus, TrainFront, Bike, Sailboat, Pizza, Beer, Wine, Apple, IceCreamCone,
  Activity, Goal, Volleyball, CircleDot, Target, Music, Headphones, Tv, Camera,
  Film, Book, Library, Newspaper, Scissors, Palette, Brush, Hammer, Wrench,
  Leaf, Flower2, Globe, Droplet, Sun, Moon, Cloud, Snowflake, CloudRain,
  CloudLightning, ShoppingBag, Banknote, Gem, Key, Lock, Shield, Ribbon, Trophy,
  Users, User, PersonStanding, Accessibility, Hand, CarFront, Rocket, Sparkles,
  Lightbulb, Tag, ArrowRightLeft, Smartphone, Dumbbell,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  // Temel kategori ikonları
  cart: ShoppingCart, cafe: Coffee, car: Car, "document-text": FileText,
  "game-controller": Gamepad2, medical: Stethoscope, shirt: Shirt,
  restaurant: UtensilsCrossed, flame: Flame, home: Home, card: CreditCard,
  school: GraduationCap, repeat: Repeat, wallet: Wallet, laptop: Laptop,
  "trending-up": TrendingUp, briefcase: Briefcase, gift: Gift,
  "return-down-back": Undo2, "swap-horizontal": ArrowRightLeft,
  // Özel kategori ikon paleti
  paw: PawPrint, heart: Heart, star: Star, airplane: Plane, bus: Bus,
  train: TrainFront, bicycle: Bike, boat: Sailboat, pizza: Pizza, beer: Beer,
  wine: Wine, nutrition: Apple, "ice-cream": IceCreamCone, fitness: Activity,
  football: Goal, basketball: Volleyball, tennisball: CircleDot, golf: Target,
  "musical-notes": Music, headset: Headphones, tv: Tv,
  "phone-portrait": Smartphone, camera: Camera, film: Film, book: Book,
  library: Library, newspaper: Newspaper, cut: Scissors, "color-palette": Palette,
  brush: Brush, hammer: Hammer, construct: Wrench, leaf: Leaf, flower: Flower2,
  earth: Globe, water: Droplet, sunny: Sun, moon: Moon, cloud: Cloud,
  snow: Snowflake, rainy: CloudRain, thunderstorm: CloudLightning,
  "cart-outline": ShoppingCart, "bag-handle": ShoppingBag, cash: Banknote,
  diamond: Gem, key: Key, "lock-closed": Lock, shield: Shield, ribbon: Ribbon,
  trophy: Trophy, people: Users, person: User, body: PersonStanding,
  accessibility: Accessibility, "hand-left": Hand, "car-sport": CarFront,
  rocket: Rocket, sparkles: Sparkles, bulb: Lightbulb, barbell: Dumbbell,
};

// Özel kategori oluştururken seçilebilir ikonlar (mobil ile aynı sıralama)
export const AVAILABLE_ICONS: string[] = [
  "paw", "heart", "star", "gift", "briefcase",
  "airplane", "bus", "train", "bicycle", "boat",
  "pizza", "beer", "wine", "nutrition", "ice-cream",
  "fitness", "football", "basketball", "tennisball", "golf",
  "musical-notes", "headset", "tv", "laptop", "phone-portrait",
  "camera", "film", "book", "library", "newspaper",
  "cut", "color-palette", "brush", "hammer", "construct",
  "leaf", "flower", "earth", "water", "sunny",
  "moon", "cloud", "snow", "rainy", "thunderstorm",
  "cart-outline", "bag-handle", "wallet", "cash", "diamond",
  "key", "lock-closed", "shield", "ribbon", "trophy",
  "people", "person", "body", "accessibility", "hand-left",
  "car-sport", "rocket", "sparkles", "bulb", "barbell",
];

export function CategoryIcon({
  name,
  size = 18,
  color,
  className,
}: {
  name?: string | null;
  size?: number;
  color?: string;
  className?: string;
}) {
  const Ic = (name && ICON_MAP[name]) || Tag;
  return <Ic size={size} color={color} className={className} />;
}
