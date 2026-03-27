/**
 * Thin wrapper around Material Symbols Rounded.
 * Usage: <Icon name="shopping_cart" size={24} fill />
 *
 * Find icons at: https://fonts.google.com/icons
 */
export default function Icon({ name, size = 20, fill = false, className = '', style = {} }) {
  return (
    <span
      className={`material-symbols-rounded${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        ...style,
      }}
    >
      {name}
    </span>
  );
}
