import { useGame } from '../store'
import { SHOP_ITEMS, type ShopCategory } from '../../game/economy'

const CATEGORY_LABEL: Record<ShopCategory, string> = {
  food: 'Nourriture',
  accessory: 'Accessoires',
  background: 'Fonds',
}

export function ShopScreen() {
  const save = useGame((s) => s.save)
  const dispatch = useGame((s) => s.dispatch)
  if (!save) return null

  const owned = (id: string, cat: ShopCategory): boolean =>
    cat === 'accessory'
      ? save.inventory.accessories.includes(id)
      : cat === 'background'
        ? save.inventory.backgrounds.includes(id)
        : false

  return (
    <div className="shop">
      {(Object.keys(CATEGORY_LABEL) as ShopCategory[]).map((cat) => (
        <section key={cat}>
          <h3>{CATEGORY_LABEL[cat]}</h3>
          <div className="shop-grid">
            {SHOP_ITEMS.filter((i) => i.category === cat).map((item) => {
              const isOwned = owned(item.id, cat)
              const equipped =
                (cat === 'accessory' && save.equipped.accessory === item.id) ||
                (cat === 'background' && save.equipped.background === item.id)
              return (
                <div key={item.id} className="shop-item" title={item.description}>
                  <img src={`/assets/icons/item-${item.id}.svg`} alt="" width={34} height={34} />
                  <span className="shop-name">{item.name}</span>
                  {cat === 'food' && (save.inventory.food[item.id] ?? 0) > 0 && (
                    <span className="shop-qty">×{save.inventory.food[item.id]}</span>
                  )}
                  {isOwned && cat !== 'food' ? (
                    <button
                      className="shop-buy"
                      onClick={() =>
                        dispatch({
                          type: 'equip',
                          slot: cat === 'accessory' ? 'accessory' : 'background',
                          itemId: equipped ? null : item.id,
                        })
                      }
                    >
                      {equipped ? 'Retirer' : 'Équiper'}
                    </button>
                  ) : (
                    <button
                      className="shop-buy"
                      disabled={save.coins < item.price}
                      onClick={() => dispatch({ type: 'buy', itemId: item.id })}
                    >
                      {item.price} <img src="/assets/icons/coin.svg" alt="pièces" width={12} height={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
