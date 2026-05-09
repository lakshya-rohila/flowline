import { useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import {
  STORE_ITEMS, CATEGORIES, CATEGORY_META, EARN_GUIDE,
  type StoreCategory, type StoreItem,
} from '../data/store';
import {
  getCoins, spendCoins, isOwned, addOwnedItem, equip, getEquippedItem,
} from '../game/storage';
import logoMarkUrl from '../assets/game-assets/flowline-logo-mark.svg';
import neonPanelUrl from '../assets/game-assets/flowline-neon-bg-panel.png';

// ── Coin icon ─────────────────────────────────────────────────────────────────

function CoinIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 20 20" fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="10" cy="10" r="9" fill="#FFD700" stroke="#B8860B" strokeWidth="1.2"/>
      <text x="10" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill="#7B5200">₣</text>
    </svg>
  );
}

// ── Purchase result toast ─────────────────────────────────────────────────────

interface ToastState { msg: string; ok: boolean; id: number }

// ── Item card ─────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: StoreItem;
  coins: number;
  onBuy: (item: StoreItem) => void;
}

function ItemCard({ item, coins, onBuy }: ItemCardProps) {
  const owned    = item.isFree || isOwned(item.id);
  const equipped = !item.isConsumable && getEquippedItem(item.category) === item.id;
  const canAfford = coins >= item.price;

  let actionLabel: string;
  let actionClass: string;
  if (item.isFree && !item.isConsumable) {
    actionLabel = equipped ? 'EQUIPPED' : 'EQUIP';
    actionClass = equipped ? 'store-card__btn--equipped' : 'store-card__btn--equip';
  } else if (owned && !item.isConsumable) {
    actionLabel = equipped ? 'EQUIPPED' : 'EQUIP';
    actionClass = equipped ? 'store-card__btn--equipped' : 'store-card__btn--equip';
  } else if (item.isConsumable) {
    actionLabel = item.isFree ? 'GET FREE' : `${item.price}`;
    actionClass = canAfford ? 'store-card__btn--buy' : 'store-card__btn--broke';
  } else {
    actionLabel = String(item.price);
    actionClass = canAfford ? 'store-card__btn--buy' : 'store-card__btn--broke';
  }

  return (
    <div
      className={`store-card ${equipped ? 'store-card--equipped' : ''}`}
      style={{
        '--card-accent': item.preview.accent,
        '--card-g1': item.preview.gradient[0],
        '--card-g2': item.preview.gradient[1],
      } as CSSProperties}
    >
      {/* Badge */}
      {item.badge && <span className="store-card__badge">{item.badge}</span>}

      {/* Emoji preview */}
      <div className="store-card__emoji" aria-hidden>{item.preview.emoji}</div>

      {/* Text */}
      <div className="store-card__body">
        <p className="store-card__name">{item.name}</p>
        <p className="store-card__desc">{item.description}</p>
        {item.isConsumable && item.quantity && item.quantity < 999 && (
          <p className="store-card__qty">× {item.quantity}</p>
        )}
      </div>

      {/* Action button */}
      <button
        type="button"
        className={`store-card__btn ${actionClass}`}
        onClick={() => onBuy(item)}
        disabled={equipped || (!item.isFree && !item.isConsumable && owned && !equipped ? false : !canAfford && !owned && !item.isFree && item.isConsumable)}
        aria-label={`${item.name}: ${actionLabel}`}
      >
        {!item.isFree && !owned && !item.isConsumable ? (
          <span className="store-card__btn-inner">
            <CoinIcon size={13} />
            {actionLabel}
          </span>
        ) : item.isConsumable && !item.isFree ? (
          <span className="store-card__btn-inner">
            <CoinIcon size={13} />
            {actionLabel}
          </span>
        ) : (
          actionLabel
        )}
      </button>
    </div>
  );
}

// ── Earn guide sheet ──────────────────────────────────────────────────────────

function EarnGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="store-earn-backdrop" onClick={onClose}>
      <div className="store-earn-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="store-earn-handle" aria-hidden />
        <h3 className="store-earn-title">How to Earn Coins</h3>
        <div className="store-earn-rows">
          {EARN_GUIDE.map((g) => (
            <div key={g.label} className="store-earn-row">
              <span className="store-earn-emoji">{g.emoji}</span>
              <span className="store-earn-label">{g.label}</span>
              <span className="store-earn-coins">
                {typeof g.coins === 'number' ? (
                  <span className="store-earn-coin-val">
                    <CoinIcon size={12} /> +{g.coins}
                  </span>
                ) : (
                  <span className="store-earn-coin-val store-earn-coin-val--bonus">{g.coins}</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="store-earn-close" onClick={onClose}>GOT IT</button>
      </div>
    </div>
  );
}

// ── Confirm purchase sheet ────────────────────────────────────────────────────

function ConfirmSheet({
  item,
  coins,
  onConfirm,
  onCancel,
}: {
  item: StoreItem;
  coins: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const canAfford = coins >= item.price;
  return (
    <div className="store-confirm-backdrop" onClick={onCancel}>
      <div className="store-confirm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="store-earn-handle" aria-hidden />
        <div className="store-confirm-emoji">{item.preview.emoji}</div>
        <h3 className="store-confirm-name">{item.name}</h3>
        <p className="store-confirm-desc">{item.description}</p>

        <div className="store-confirm-price">
          <CoinIcon size={20} />
          <span>{item.price} coins</span>
        </div>

        <div className="store-confirm-balance">
          Your balance: <CoinIcon size={13} /> <strong>{coins}</strong>
          {!canAfford && <span className="store-confirm-short"> (short by {item.price - coins})</span>}
        </div>

        <div className="store-confirm-actions">
          <button
            type="button"
            className="store-confirm-btn store-confirm-btn--primary"
            onClick={onConfirm}
            disabled={!canAfford}
          >
            {canAfford ? 'CONFIRM PURCHASE' : 'NOT ENOUGH COINS'}
          </button>
          <button type="button" className="store-confirm-btn store-confirm-btn--ghost" onClick={onCancel}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main StoreScreen ──────────────────────────────────────────────────────────

export interface StoreScreenProps {
  onClose: () => void;
}

export function StoreScreen({ onClose }: StoreScreenProps) {
  const [activeCategory, setActiveCategory] = useState<StoreCategory>('themes');
  const [coins, setCoins] = useState(getCoins);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [showEarnGuide, setShowEarnGuide] = useState(false);
  // Force re-render when ownership/equip changes
  const [, forceUpdate] = useState(0);

  const showToast = useCallback((msg: string, ok: boolean) => {
    const id = Date.now();
    setToast({ msg, ok, id });
    setTimeout(() => setToast((t) => t?.id === id ? null : t), 2800);
  }, []);

  const handleBuy = useCallback((item: StoreItem) => {
    // Free items or equip actions — no confirm needed
    if (item.isFree || isOwned(item.id)) {
      if (!item.isConsumable) {
        equip(item.category, item.id);
        forceUpdate((n) => n + 1);
        showToast(`${item.name} equipped!`, true);
      }
      return;
    }
    // Consumables and purchases: show confirm sheet
    setConfirmItem(item);
  }, [showToast]);

  const handleConfirmPurchase = useCallback(() => {
    if (!confirmItem) return;
    setConfirmItem(null);

    if (confirmItem.isFree) {
      if (!confirmItem.isConsumable) equip(confirmItem.category, confirmItem.id);
      forceUpdate((n) => n + 1);
      showToast(`${confirmItem.name} activated!`, true);
      return;
    }

    const ok = spendCoins(confirmItem.price);
    if (!ok) {
      showToast('Not enough coins!', false);
      return;
    }

    const newBal = getCoins();
    setCoins(newBal);

    if (!confirmItem.isConsumable) {
      addOwnedItem(confirmItem.id);
      equip(confirmItem.category, confirmItem.id);
    }
    forceUpdate((n) => n + 1);

    if (confirmItem.isConsumable) {
      showToast(`+${confirmItem.quantity} ${confirmItem.name} added!`, true);
    } else {
      showToast(`${confirmItem.name} purchased & equipped!`, true);
    }
  }, [confirmItem, showToast]);

  const items = STORE_ITEMS.filter((i) => i.category === activeCategory);

  return (
    <div
      className="store-root"
      style={{ '--store-panel': `url(${neonPanelUrl})` } as CSSProperties}
    >
      {/* ── Header ── */}
      <header className="store-header">
        <button type="button" className="store-back-btn" onClick={onClose} aria-label="Back">
          <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden>
            <path d="M12 4L5 10l7 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="store-brand">
          <img src={logoMarkUrl} alt="" className="store-brand-mark" aria-hidden />
          <span className="store-brand-name">STORE</span>
        </div>

        {/* Coin balance */}
        <button
          type="button"
          className="store-coin-display"
          onClick={() => setShowEarnGuide(true)}
          aria-label={`${coins} coins — tap to learn how to earn`}
        >
          <CoinIcon size={18} />
          <span className="store-coin-count">{coins.toLocaleString()}</span>
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden className="store-coin-info">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="5" r="0.7" fill="currentColor"/>
          </svg>
        </button>
      </header>

      {/* ── Hero banner ── */}
      <div className="store-hero">
        <div className="store-hero-left">
          <p className="store-hero-eyebrow">FLOWLINE STORE</p>
          <h2 className="store-hero-title">Spend Your Coins</h2>
          <p className="store-hero-sub">Earn coins by solving levels. Spend them here.</p>
        </div>
        <button
          type="button"
          className="store-earn-btn"
          onClick={() => setShowEarnGuide(true)}
          aria-label="How to earn coins"
        >
          <CoinIcon size={24} />
          <span className="store-earn-btn-label">HOW TO<br/>EARN</span>
        </button>
      </div>

      {/* ── Category tabs ── */}
      <nav className="store-tabs" role="tablist" aria-label="Store categories">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              className={`store-tab ${activeCategory === cat ? 'store-tab--active' : ''}`}
              style={{ '--tab-accent': meta.accent } as CSSProperties}
              onClick={() => setActiveCategory(cat)}
            >
              <span className="store-tab-emoji">{meta.emoji}</span>
              {meta.label}
            </button>
          );
        })}
      </nav>

      {/* ── Item grid ── */}
      <div className="store-grid" role="list">
        {items.map((item) => (
          <div key={item.id} role="listitem">
            <ItemCard item={item} coins={coins} onBuy={handleBuy} />
          </div>
        ))}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`store-toast ${toast.ok ? 'store-toast--ok' : 'store-toast--err'}`} role="status">
          <span>{toast.ok ? '✓' : '✗'}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Confirm sheet ── */}
      {confirmItem && (
        <ConfirmSheet
          item={confirmItem}
          coins={coins}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setConfirmItem(null)}
        />
      )}

      {/* ── Earn guide sheet ── */}
      {showEarnGuide && <EarnGuide onClose={() => setShowEarnGuide(false)} />}
    </div>
  );
}
