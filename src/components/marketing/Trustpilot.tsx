function Star({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" />
    </svg>
  );
}

/** The "Excellent ★★★★½ Trustpilot" block. `wrapClass` sets the variant
 *  (trust-light / why-trust / foot-trust) defined in marketing.css. */
export function Trustpilot({
  wrapClass,
  star = 18,
}: {
  wrapClass: string;
  star?: number;
}) {
  return (
    <div className={wrapClass}>
      <span className="lab">Excellent</span>
      <span className="tiles">
        {[0, 1, 2, 3].map((i) => (
          <span className="tile" key={i}>
            <Star size={star} />
          </span>
        ))}
        <span className="tile half">
          <Star size={star} />
        </span>
      </span>
      <span className="tp">
        <Star size={Math.max(12, star - 3)} />
        Trustpilot
      </span>
    </div>
  );
}
