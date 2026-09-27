import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import GameSearch from '../components/GameSearch.jsx';
import GameTile from '../components/GameTile.jsx';
import { TIER_PALETTE, emptyTierData, newId } from '../util.js';

const POOL = '__pool__';

/** Move an item to a container (tier id or POOL), optionally before another item. Returns new data. */
function moveItem(data, itemId, to, beforeId = null) {
  if (itemId === beforeId) return data;
  let moving = null;
  const strip = (items) =>
    items.filter((it) => {
      if (it.id === itemId) moving = it;
      return it.id !== itemId;
    });
  const tiers = data.tiers.map((t) => ({ ...t, items: strip(t.items) }));
  const pool = strip(data.pool);
  if (!moving) return data;
  const insert = (items) => {
    const i = beforeId ? items.findIndex((it) => it.id === beforeId) : -1;
    return i < 0 ? [...items, moving] : [...items.slice(0, i), moving, ...items.slice(i)];
  };
  if (to === POOL) return { tiers, pool: insert(pool) };
  return { pool, tiers: tiers.map((t) => (t.id === to ? { ...t, items: insert(t.items) } : t)) };
}

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [data, setData] = useState(emptyTierData);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/lists/${id}`)
      .then(({ list }) => {
        if (cancelled) return;
        if (!list.isOwner) return navigate(`/lists/${id}`, { replace: true });
        setTitle(list.title);
        setDescription(list.description);
        setVisibility(list.visibility);
        setData(list.data);
        setDirty(false);
      })
      .catch((err) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isNew, navigate]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = useCallback((fn) => {
    setData((d) => fn(d));
    setDirty(true);
  }, []);

  const allIds = useMemo(() => {
    const s = new Set(data.pool.map((it) => it.id));
    data.tiers.forEach((t) => t.items.forEach((it) => s.add(it.id)));
    return s;
  }, [data]);

  const addGame = (item) => {
    if (allIds.has(item.id)) return;
    update((d) => ({ ...d, pool: [...d.pool, item] }));
  };
  const removeItem = (itemId) => {
    update((d) => ({
      tiers: d.tiers.map((t) => ({ ...t, items: t.items.filter((it) => it.id !== itemId) })),
      pool: d.pool.filter((it) => it.id !== itemId),
    }));
    setSelectedId(null);
  };

  // ----- tiers -----
  const editTier = (tierId, patch) =>
    update((d) => ({ ...d, tiers: d.tiers.map((t) => (t.id === tierId ? { ...t, ...patch } : t)) }));
  const moveTier = (index, delta) =>
    update((d) => {
      const tiers = [...d.tiers];
      const j = index + delta;
      if (j < 0 || j >= tiers.length) return d;
      [tiers[index], tiers[j]] = [tiers[j], tiers[index]];
      return { ...d, tiers };
    });
  const deleteTier = (tierId) =>
    update((d) => {
      if (d.tiers.length <= 1) return d;
      const tier = d.tiers.find((t) => t.id === tierId);
      return { tiers: d.tiers.filter((t) => t.id !== tierId), pool: [...d.pool, ...tier.items] };
    });
  const addTier = () =>
    update((d) => ({
      ...d,
      tiers: [...d.tiers, { id: newId(), label: 'New', color: TIER_PALETTE[d.tiers.length % TIER_PALETTE.length], items: [] }],
    }));

  // ----- drag & drop (mouse) and tap-to-move (touch/keyboard) -----
  const handleDrop = (e, container, beforeId = null) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = dragId || e.dataTransfer.getData('text/plain');
    if (itemId) update((d) => moveItem(d, itemId, container, beforeId));
    setDragId(null);
    setDropTarget(null);
  };
  const dropZoneProps = (container) => ({
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dropTarget !== container) setDropTarget(container);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget((t) => (t === container ? null : t));
    },
    onDrop: (e) => handleDrop(e, container),
    onClick: () => {
      if (selectedId) {
        update((d) => moveItem(d, selectedId, container));
        setSelectedId(null);
      }
    },
  });
  const tileProps = (item, container) => ({
    draggable: true,
    selected: selectedId === item.id,
    className: dragId === item.id ? 'tile-dragging' : '',
    onDragStart: (e) => {
      e.dataTransfer.setData('text/plain', item.id);
      e.dataTransfer.effectAllowed = 'move';
      setDragId(item.id);
      setSelectedId(null);
    },
    onDragEnd: () => {
      setDragId(null);
      setDropTarget(null);
    },
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => handleDrop(e, container, item.id),
    onClick: (e) => {
      e.stopPropagation();
      if (!selectedId || selectedId === item.id) {
        setSelectedId(selectedId === item.id ? null : item.id);
      } else {
        update((d) => moveItem(d, selectedId, container, item.id));
        setSelectedId(null);
      }
    },
    tabIndex: 0,
    role: 'button',
    'aria-pressed': selectedId === item.id,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        removeItem(item.id);
      }
    },
  });
  const renderTile = (item, container) => (
    <GameTile key={item.id} item={item} {...tileProps(item, container)}>
      <button
        type="button"
        className="tile-remove"
        aria-label={`Remove ${item.name}`}
        onClick={(e) => {
          e.stopPropagation();
          removeItem(item.id);
        }}
      >
        ×
      </button>
    </GameTile>
  );

  // ----- save -----
  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { title, description, visibility, data };
      const { list } = isNew ? await api.post('/lists', body) : await api.put(`/lists/${id}`, body);
      setDirty(false);
      if (isNew) navigate(`/lists/${list.id}/edit`, { replace: true });
      return list;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };
  const saveAndView = async () => {
    const list = await save();
    if (list) navigate(`/lists/${list.id}`);
  };

  if (loading) return <p className="muted center">Loading…</p>;
  if (loadError) return <div className="empty"><h2>{loadError}</h2><Link to="/my">Back to my lists</Link></div>;

  return (
    <div className="editor">
      <form className="editor-meta" onSubmit={save}>
        <input
          className="input input-title"
          placeholder="Tier list title, e.g. Best RPGs of all time"
          value={title}
          maxLength={100}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          required
        />
        <textarea
          className="input"
          rows={2}
          placeholder="Description (optional)"
          value={description}
          maxLength={1000}
          onChange={(e) => {
            setDescription(e.target.value);
            setDirty(true);
          }}
        />
        <div className="editor-actions">
          <label className="field-inline">
            Visibility
            <select
              className="input"
              value={visibility}
              onChange={(e) => {
                setVisibility(e.target.value);
                setDirty(true);
              }}
            >
              <option value="private">Private — only you</option>
              <option value="unlisted">Unlisted — anyone with the link</option>
              <option value="public">Public — shared with the community</option>
            </select>
          </label>
          <span className="spacer" />
          {dirty && <span className="muted small">Unsaved changes</span>}
          <button className="btn" type="submit" disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-primary" type="button" disabled={saving || !title.trim()} onClick={saveAndView}>
            Save &amp; view
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      <div className="editor-layout">
        <section>
          <p className="muted small hint">
            Drag games between tiers, or tap a game and then tap a tier to move it. Click a tier label to rename it.
          </p>
          <div className="board board-editable">
            {data.tiers.map((tier, i) => (
              <div className={`tier-row ${dropTarget === tier.id ? 'drop-active' : ''}`} key={tier.id}>
                <div className="tier-label" style={{ background: tier.color }}>
                  <input
                    className="tier-label-input"
                    value={tier.label}
                    maxLength={40}
                    aria-label="Tier name"
                    onChange={(e) => editTier(tier.id, { label: e.target.value })}
                  />
                </div>
                <div className={`tier-items ${selectedId ? 'tier-items-target' : ''}`} {...dropZoneProps(tier.id)}>
                  {tier.items.map((item) => renderTile(item, tier.id))}
                </div>
                <div className="tier-controls">
                  <input
                    type="color"
                    value={tier.color}
                    aria-label="Tier color"
                    onChange={(e) => editTier(tier.id, { color: e.target.value })}
                  />
                  <button type="button" className="icon-btn" onClick={() => moveTier(i, -1)} disabled={i === 0} aria-label="Move tier up">
                    ▲
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => moveTier(i, 1)}
                    disabled={i === data.tiers.length - 1}
                    aria-label="Move tier down"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => deleteTier(tier.id)}
                    disabled={data.tiers.length <= 1}
                    aria-label="Delete tier"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm add-tier" onClick={addTier} disabled={data.tiers.length >= 20}>
            + Add tier
          </button>

          <div className={`pool ${dropTarget === POOL ? 'drop-active' : ''}`}>
            <h4>Unranked ({data.pool.length})</h4>
            <div className={`tier-items pool-items ${selectedId ? 'tier-items-target' : ''}`} {...dropZoneProps(POOL)}>
              {data.pool.length === 0 && <p className="muted small">Search for games to add them here, then drag them into tiers.</p>}
              {data.pool.map((item) => renderTile(item, POOL))}
            </div>
          </div>
        </section>

        <GameSearch onAdd={addGame} isAdded={(gameId) => allIds.has(gameId)} />
      </div>
    </div>
  );
}
