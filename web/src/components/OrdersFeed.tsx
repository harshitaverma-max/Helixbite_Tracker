import type { OrderRecord } from "../api.js";

const SOURCE_LABEL: Record<OrderRecord["source"], string> = {
  amazon: "Amazon",
  website: "Website",
  whatsapp: "WhatsApp",
};

const SOURCE_COLOR_VAR: Record<OrderRecord["source"], string> = {
  amazon: "--series-1",
  website: "--series-2",
  whatsapp: "--series-3",
};

export function OrdersFeed({ orders }: { orders: OrderRecord[] }) {
  if (orders.length === 0) {
    return <p className="orders-feed__empty">No orders yet.</p>;
  }

  return (
    <table className="orders-feed">
      <thead>
        <tr>
          <th>Source</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Received</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>
              <span className="orders-feed__source">
                <span className="breakdown__swatch" style={{ background: `var(${SOURCE_COLOR_VAR[order.source]})` }} />
                {SOURCE_LABEL[order.source]}
              </span>
            </td>
            <td className="orders-feed__amount">
              {order.currency} {order.amount.toFixed(2)}
            </td>
            <td>{order.status}</td>
            <td>{new Date(order.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
