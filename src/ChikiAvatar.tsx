import type { ShopItem } from "./shopCatalog";
import "./ChikiAvatar.css";

type ChikiAvatarProps = {
  items: Record<string, ShopItem | undefined>;
  variant?: "room" | "profile" | "celebration";
  barking?: boolean;
  celebrating?: boolean;
  onTap?: () => void;
  alt?: string;
};

const WearableLayer = ({ item }: { item: ShopItem }) => (
  <span
    className={`avatar-wearable avatar-${item.slot} avatar-piece-${item.id}`}
    aria-hidden="true"
  />
);

const AvatarBody = ({
  items,
  alt,
}: {
  items: Record<string, ShopItem | undefined>;
  alt: string;
}) => (
  <>
    <img className="chiki-avatar-base" src="/chiki-character.webp" alt={alt} />
    {items.outfit && items.outfit.id !== "outfit_classic" && <WearableLayer item={items.outfit} />}
    {items.collar && <WearableLayer item={items.collar} />}
    {items.glasses && <WearableLayer item={items.glasses} />}
    {items.hat && <WearableLayer item={items.hat} />}
    <span className="chiki-avatar-sparkles" aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  </>
);

export default function ChikiAvatar({
  items,
  variant = "room",
  barking = false,
  celebrating = false,
  onTap,
  alt = "Chiki",
}: ChikiAvatarProps) {
  const className = `chiki-avatar chiki-avatar-${variant} ${barking ? "is-barking" : ""} ${celebrating ? "is-celebrating" : ""}`;

  if (onTap) {
    return (
      <button type="button" className={className} onClick={onTap} aria-label="Gioca con Chiki">
        <AvatarBody items={items} alt={alt} />
      </button>
    );
  }

  return (
    <div className={className}>
      <AvatarBody items={items} alt={alt} />
    </div>
  );
}
