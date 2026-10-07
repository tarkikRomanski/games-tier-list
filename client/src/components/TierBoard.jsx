import { useState } from 'react';
import GameTile from './GameTile.jsx';
import GameDetailsModal from './GameDetailsModal.jsx';
import { inkFor, tierLabelSize } from '../util.js';
import { useI18n } from '../i18n/index.jsx';

/** Read-only rendering of a tier list. Clicking a game opens its details. */
export default function TierBoard({ data }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(null); // { item, tier }

  const tile = (item, tier = null) => (
    <GameTile
      key={item.id}
      as="button"
      type="button"
      item={item}
      className="tile-button"
      onClick={() => setSelected({ item, tier })}
      aria-haspopup="dialog"
      aria-label={t('board.openGame', { name: item.name })}
    />
  );

  return (
    <div className="board">
      {data.tiers.map((tier) => (
        <div className="tier-row" key={tier.id}>
          <div className={`tier-label ${tierLabelSize(tier.label)}`} title={tier.label} style={{ background: tier.color, color: inkFor(tier.color) }}>
            <span>{tier.label}</span>
          </div>
          <div className="tier-items">{tier.items.map((item) => tile(item, tier))}</div>
        </div>
      ))}
      {data.pool.length > 0 && (
        <div className="pool">
          <h4>{t('board.notRanked')}</h4>
          <div className="tier-items">{data.pool.map((item) => tile(item))}</div>
        </div>
      )}
      {selected && <GameDetailsModal key={selected.item.id} item={selected.item} tier={selected.tier} onClose={() => setSelected(null)} />}
    </div>
  );
}
