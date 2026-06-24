const colors = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
};

const dots = {
  blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500',
  amber: 'bg-amber-500', purple: 'bg-purple-500', teal: 'bg-teal-500',
  gray: 'bg-gray-500', indigo: 'bg-indigo-500', pink: 'bg-pink-500',
};

export default function Badge({ children, color = 'gray', className = '', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[color] || dots.gray}`} />}
      {children}
    </span>
  );
}
