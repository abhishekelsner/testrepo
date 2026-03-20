/**
 * ElsnerQwilr logo (EQ + pen nib). Use on auth pages and in app header.
 */
function Logo({ className = '', size = 'medium', ...props }) {
  const sizes = {
    small: { height: 32, width: 'auto' },
    medium: { height: 48, width: 'auto' },
    large: { height: 64, width: 'auto' },
  };
  const style = sizes[size] || sizes.medium;
  return (
    <img
      src="/logo.png"
      alt="ElsnerQwilr"
      className={className}
      style={{ ...style, objectFit: 'contain', display: 'block' }}
      {...props}
    />
  );
}

export default Logo;
