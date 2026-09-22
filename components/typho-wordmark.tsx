const letterPaths = [
  "M12 18H70M41 18V82",
  "M98 18 125 51 152 18M125 51V82",
  "M181 82V18H211L233 29V45L211 56H181",
  "M264 18V82M310 18V82M264 50H310",
  "M357 18H383L400 35V65L383 82H357L340 65V35Z",
];

export function TyphoWordmark() {
  return (
    <svg viewBox="0 0 420 100" role="img" aria-label="Typho">
      <defs>
        <linearGradient id="typho-word-gradient" x1="12" y1="18" x2="400" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="0.52" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <g fill="none" strokeLinecap="square" strokeLinejoin="miter">
        <g stroke="#263252" strokeWidth="10">
          {letterPaths.map((path) => <path key={`base-${path}`} d={path} />)}
        </g>
        <g stroke="url(#typho-word-gradient)" strokeWidth="4.5">
          {letterPaths.map((path) => <path key={`color-${path}`} d={path} />)}
        </g>
      </g>
    </svg>
  );
}
