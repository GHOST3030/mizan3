export default function PageTransition({ children, className = 'p-6' }) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}
