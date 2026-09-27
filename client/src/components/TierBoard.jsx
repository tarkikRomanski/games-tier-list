import GameTile from './GameTile.jsx';

/** Read-only rendering of a tier list. */
export default function TierBoard({ data }) {
  return (
    <div className="board">
      {data.tiers.map((tier) => (
        <div className="tier-row" key={tier.id}>
          <div className="tier-label" style={{ background: tier.color }}>
            <span>{tier.label}</span>
          </div>
          <div className="tier-items">
            {tier.items.map((item) => (
              <GameTile key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
      {data.pool.length > 0 && (
        <div className="pool">
          <h4>Not ranked yet</h4>
          <div className="tier-items">
            {data.pool.map((item) => (
              <GameTile key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
