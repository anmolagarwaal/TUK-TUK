export default function NotificationToast({ notifications, onDismiss }) {
  if (notifications.length === 0) return null;

  return (
    <div className="notifications">
      {notifications.map((n) => (
        <div key={n.id} className="notification">
          <span>{n.message}</span>
          <button onClick={() => onDismiss(n.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}
