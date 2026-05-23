import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { POSItem, POSCategory } from '../../types/phase11'
import type { BillLineItem } from '../../types/phase12'
import EmptyState from '@/components/ui/EmptyState'
import { Package } from 'lucide-react'

const CATEGORY_EMOJIS: Record<string, string> = {
  Tea: '🫖',
  Coffee: '☕',
  Snacks: '🥪',
  Bun: '🥐',
  Beverages: '🧃',
  Ladoo: '🍡',
  Combo: '🎁',
}

interface Props {
  items: POSItem[]
  categories: POSCategory[]
  onAddItem: (item: POSItem) => void
  currentBill: BillLineItem[]
}

export default function ItemGrid({ items, categories, onAddItem, currentBill }: Props) {
  const { i18n } = useTranslation()
  const isTamil = i18n.language === 'ta'
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)

  // Distinct prices from active items (excluding Combo category)
  const comboCategoryIds = useMemo(
    () => categories.filter((c) => c.name_en === 'Combo').map((c) => c.id),
    [categories]
  )
  const distinctPrices = useMemo(() => {
    const nonComboItems = items.filter((i) => !comboCategoryIds.includes(i.category_id ?? ''))
    const prices = [...new Set(nonComboItems.map((i) => i.selling_price))].sort((a, b) => a - b)
    return prices
  }, [items, comboCategoryIds])

  // Active categories with at least one item
  const activeCategories = useMemo(() => {
    const catIds = new Set(items.map((i) => i.category_id).filter(Boolean))
    return categories.filter((c) => c.active && catIds.has(c.id))
  }, [items, categories])

  // Filtered items
  const filteredItems = useMemo(() => {
    let filtered = items
    if (selectedCategoryId) filtered = filtered.filter((i) => i.category_id === selectedCategoryId)
    if (selectedPrice !== null) filtered = filtered.filter((i) => i.selling_price === selectedPrice)
    return filtered
  }, [items, selectedCategoryId, selectedPrice])

  // Current quantities in bill
  const billQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    currentBill.forEach((li) => {
      map[li.itemId] = li.quantity
    })
    return map
  }, [currentBill])

  const filterBtnBase: React.CSSProperties = {
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-full)',
    padding: '4px 12px',
    fontSize: 'var(--text-xs)',
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast)',
    minHeight: '32px',
  }

  const filterBtnActive: React.CSSProperties = {
    ...filterBtnBase,
    background: 'var(--brand-primary)',
    borderColor: 'var(--brand-primary)',
    color: '#fff',
  }

  const filterBtnInactive: React.CSSProperties = {
    ...filterBtnBase,
    background: 'var(--brand-surface)',
    color: 'var(--gray-700)',
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      data-testid="item-grid"
    >
      {/* Rate filter banner */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: 'var(--border-default)',
          background: 'var(--brand-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
          }}
          data-testid="rate-filter-bar"
        >
          <button
            style={selectedPrice === null ? filterBtnActive : filterBtnInactive}
            onClick={() => setSelectedPrice(null)}
          >
            All
          </button>
          {distinctPrices.map((price) => (
            <button
              key={price}
              style={selectedPrice === price ? filterBtnActive : filterBtnInactive}
              onClick={() => setSelectedPrice(selectedPrice === price ? null : price)}
            >
              ₹{price}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: 'var(--border-default)',
          background: 'var(--brand-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
          }}
          data-testid="category-filter-bar"
        >
          <button
            style={selectedCategoryId === null ? filterBtnActive : filterBtnInactive}
            onClick={() => setSelectedCategoryId(null)}
          >
            All
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              style={selectedCategoryId === cat.id ? filterBtnActive : filterBtnInactive}
              onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
              data-testid={`cat-filter-${cat.name_en}`}
            >
              {CATEGORY_EMOJIS[cat.name_en] ?? '•'}{' '}
              {isTamil && cat.name_ta ? cat.name_ta : cat.name_en}
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items"
            description="No items match the selected filters."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '8px',
            }}
          >
            {filteredItems.map((item) => {
              const qty = billQtyMap[item.id] ?? 0
              return (
                <button
                  key={item.id}
                  onClick={() => onAddItem(item)}
                  data-testid={`item-card-${item.id}`}
                  style={{
                    background: qty > 0 ? 'var(--brand-primary-subtle)' : 'var(--brand-surface)',
                    border:
                      qty > 0 ? '2px solid var(--brand-primary)' : '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '10px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    position: 'relative',
                    transition: 'all var(--transition-fast)',
                    boxShadow: qty > 0 ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {qty > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'var(--brand-primary)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {qty}
                    </div>
                  )}
                  {/* Category emoji fallback since no image upload yet */}
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name_en}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '22px', lineHeight: 1 }}>
                      {CATEGORY_EMOJIS[
                        categories.find((c) => c.id === item.category_id)?.name_en ?? ''
                      ] ?? '☕'}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--gray-900)',
                      lineHeight: 1.2,
                      wordBreak: 'break-word',
                    }}
                  >
                    {isTamil && item.name_ta ? item.name_ta : item.name_en}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: qty > 0 ? 'var(--brand-primary)' : 'var(--gray-600)',
                      fontWeight: 600,
                    }}
                  >
                    ₹{item.selling_price}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
