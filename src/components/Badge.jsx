export default function Badge({ children, type = 'default' }) {
  const baseClass = 'badge';
  let typeClass = '';
  
  switch(type.toLowerCase()) {
    case 'confirmed':
    case 'success':
      typeClass = 'badge-success';
      break;
    case 'completed':
    case 'info':
      typeClass = 'badge-info';
      break;
    case 'pending':
    case 'watch':
    case 'warning':
      typeClass = 'badge-warning';
      break;
    case 'cancelled':
    case 'critical':
    case 'danger':
      typeClass = 'badge-danger';
      break;
    default:
      typeClass = '';
  }

  return (
    <span className={`${baseClass} ${typeClass}`}>
      {children}
    </span>
  );
}
