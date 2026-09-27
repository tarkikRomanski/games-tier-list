export default function GameTile({ item, selected, className = '', children, ...rest }) {
  return (
    <div className={`tile ${selected ? 'tile-selected' : ''} ${className}`} title={item.name} {...rest}>
      {item.image ? (
        <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
      ) : (
        <div className="tile-placeholder">{item.name.slice(0, 2).toUpperCase()}</div>
      )}
      <span className="tile-name">{item.name}</span>
      {children}
    </div>
  );
}
