export function LogoMark({
  width = 22,
  height = 28,
  fill = "currentColor",
}: {
  width?: number;
  height?: number;
  fill?: string;
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 100 130" aria-hidden="true">
      <path fill={fill} d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" />
    </svg>
  );
}
