export default function GameTile({ item, selected, className = '', children, as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`tile ${selected ? 'tile-selected' : ''} ${className}`} title={item.name} {...rest}>
      {item.image ? (
        <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
      ) : (
        <span className="tile-placeholder">{item.name.slice(0, 2).toUpperCase()}</span>
      )}
      <span className="tile-name">{item.name}</span>
      {children}
    </Tag>
  );
}
