import Image from "next/image";
import Link from "next/link";

type SambaLogoProps = {
  href?: string | null;
  size?: number;
  className?: string;
  priority?: boolean;
};

export function SambaLogo({
  href = "/",
  size = 36,
  className = "",
  priority = false,
}: SambaLogoProps) {
  const mark = (
    <Image
      src="/brand/samba-logo.png"
      alt="Samba"
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );

  if (href === null) return mark;

  return (
    <Link href={href} className="inline-flex items-center" aria-label="Samba home">
      {mark}
    </Link>
  );
}

export function SambaMark({
  size = 40,
  className = "",
  priority = false,
}: Omit<SambaLogoProps, "href">) {
  return (
    <Image
      src="/brand/samba-logo.png"
      alt="Samba"
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
