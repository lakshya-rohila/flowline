import { useState, useCallback, useEffect, useRef } from 'react';
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
import { StoreIcon } from './StoreIcon';

// ── Coin icon ─────────────────────────────────────────────────────────────────

function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="10" fill="url(#cg)" stroke="#B8860B" strokeWidth="1.2"/>
      <defs>
        <radialGradient id="cg" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFE566"/>
          <stop offset="100%" stopColor="#E6A800"/>
        </radialGradient>
      </defs>
      <text x="11" y="15.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#7B4800">₣</text>
    </svg>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState { msg: string; ok: boolean; id: number }

function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className={`st-toast ${toast.ok ? 'st-toast--ok' : 'st-toast--err'}`} role="status" aria-live="polite">
      <span className="st-toast-icon">
        {toast.ok ? (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <path d="M13 4L6 11 3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </span>
      <span>{toast.msg}</span>
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item, coins, onBuy,
}: { item: StoreItem; coins: number; onBuy: (item: StoreItem) => void }) {
  const owned    = item.isFree || isOwned(item.id);
  const equipped = !item.isConsumable && getEquippedItem(item.category) === item.id;
  const canAfford = coins >= item.price;

  // Button state
  let btnLabel: string;
  let btnVariant: 'equipped' | 'equip' | 'buy' | 'locked' | 'free';
  if (item.isFree && !item.isConsumable) {
    btnLabel   = equipped ? 'EQUIPPED' : 'EQUIP';
    btnVariant = equipped ? 'equipped' : 'equip';
  } else if (owned && !item.isConsumable) {
    btnLabel   = equipped ? 'EQUIPPED' : 'EQUIP';
    btnVariant = equipped ? 'equipped' : 'equip';
  } else if (item.isFree && item.isConsumable) {
    btnLabel   = 'GET FREE';
    btnVariant = 'free';
  } else {
    btnLabel   = canAfford ? `${item.price}` : `${item.price}`;
    btnVariant = canAfford ? 'buy' : 'locked';
  }

  return (
    <button
      type="button"
      className={`st-card ${equipped ? 'st-card--equipped' : ''} ${!canAfford && !owned && !item.isFree ? 'st-card--locked' : ''}`}
      style={{
        '--ca': item.preview.accent,
        '--cg1': item.preview.gradient[0],
        '--cg2': item.preview.gradient[1],
      } as CSSProperties}
      onClick={() => onBuy(item)}
      aria-label={`${item.name} — ${btnLabel}`}
    >
      {/* Badge chip */}
      {item.badge && <span className="st-card-badge">{item.badge}</span>}

      {/* Equipped check */}
      {equipped && (
        <span className="st-card-check" aria-hidden>
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <circle cx="8" cy="8" r="7" fill="rgba(46,204,113,0.2)" stroke="#2ECC71" strokeWidth="1.4"/>
            <path d="M5 8l2.5 2.5L11 5.5" stroke="#2ECC71" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}

      {/* Preview area */}
      <div className="st-card-preview" aria-hidden>
        <StoreIcon name={item.preview.icon} className="st-card-icon" />
        {/* Mini accent dots decoration */}
        <div className="st-card-dots" aria-hidden>
          {[...Array(3)].map((_, i) => (
            <span key={i} className="st-card-dot" style={{ opacity: 0.3 + i * 0.25 }} />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="st-card-info">
        <p className="st-card-name">{item.name}</p>
        <p className="st-card-desc">{item.description}</p>
        {item.isConsumable && item.quantity && item.quantity < 999 && (
          <p className="st-card-qty">× {item.quantity} uses</p>
        )}
      </div>

      {/* Action pill */}
      <div className={`st-card-action st-card-action--${btnVariant}`}>
        {(btnVariant === 'buy' || btnVariant === 'locked') && (
          <CoinIcon size={12} />
        )}
        <span>{btnLabel}</span>
        {btnVariant === 'locked' && (
          <svg viewBox="0 0 12 12" fill="none" width="10" height="10" aria-hidden>
            <rect x="2" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}

// ── Earn guide bottom sheet ───────────────────────────────────────────────────

function EarnGuide({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const close = () => { setVisible(false); setTimeout(onClose, 380); };

  return (
    <>
      <div className={`st-sheet-bg ${visible ? 'st-sheet-bg--in' : ''}`} onClick={close} />
      <div className={`st-sheet st-earn-sheet ${visible ? 'st-sheet--in' : ''}`}>
        <div className="st-sheet-handle" aria-hidden />
        <h3 className="st-sheet-title">
          <CoinIcon size={22} />
          How to Earn Coins
        </h3>
        <div className="st-earn-rows">
          {EARN_GUIDE.map((g) => (
            <div key={g.label} className="st-earn-row">
              <StoreIcon name={g.icon} className="st-earn-icon" />
              <span className="st-earn-label">{g.label}</span>
              <span className="st-earn-amount">
                {typeof g.coins === 'number' ? (
                  <><CoinIcon size={12} /> +{g.coins}</>
                ) : (
                  <span className="st-earn-bonus">{g.coins}</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="st-sheet-cta" onClick={close}>GOT IT</button>
      </div>
    </>
  );
}

// ── Confirm purchase sheet ────────────────────────────────────────────────────

function ConfirmSheet({
  item, coins, onConfirm, onCancel,
}: { item: StoreItem; coins: number; onConfirm: () => void; onCancel: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const canAfford = coins >= item.price;
  const close = () => { setVisible(false); setTimeout(onCancel, 380); };

  return (
    <>
      <div className={`st-sheet-bg ${visible ? 'st-sheet-bg--in' : ''}`} onClick={close} />
      <div
        className={`st-sheet st-confirm-sheet ${visible ? 'st-sheet--in' : ''}`}
        style={{ '--ca': item.preview.accent } as CSSProperties}
      >
        <div className="st-sheet-handle" aria-hidden />

        {/* Item preview */}
        <div className="st-confirm-preview" aria-hidden>
          <StoreIcon name={item.preview.icon} className="st-confirm-icon" />
        </div>

        <h3 className="st-confirm-name">{item.name}</h3>
        <p className="st-confirm-desc">{item.description}</p>

        {/* Price */}
        <div className="st-confirm-price-row">
          <CoinIcon size={24} />
          <span className="st-confirm-price-val">{item.price}</span>
          <span className="st-confirm-price-label">coins</span>
        </div>

        {/* Balance */}
        <div className={`st-confirm-balance ${!canAfford ? 'st-confirm-balance--short' : ''}`}>
          <span>Your balance:</span>
          <span className="st-confirm-bal-val">
            <CoinIcon size={13} /> {coins}
          </span>
          {!canAfford && (
            <span className="st-confirm-short-badge">
              short by {item.price - coins}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="st-confirm-actions">
          <button
            type="button"
            className={`st-confirm-btn st-confirm-btn--primary ${!canAfford ? 'st-confirm-btn--disabled' : ''}`}
            onClick={canAfford ? onConfirm : undefined}
            disabled={!canAfford}
          >
            {canAfford ? (
              <><CoinIcon size={16} /> CONFIRM — {item.price} coins</>
            ) : (
              <>NOT ENOUGH COINS</>
            )}
          </button>
          <button type="button" className="st-confirm-btn st-confirm-btn--ghost" onClick={close}>
            CANCEL
          </button>
        </div>
      </div>
    </>
  );
}

// ── Coin balance hero widget ──────────────────────────────────────────────────

function CoinHero({ coins, onEarnGuide }: { coins: number; onEarnGuide: () => void }) {
  const prevRef = useRef(coins);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (coins !== prevRef.current) {
      setBump(true);
      prevRef.current = coins;
      setTimeout(() => setBump(false), 500);
    }
  }, [coins]);

  return (
    <div className="st-coin-hero">
      <div className={`st-coin-hero-amount ${bump ? 'st-coin-hero-amount--bump' : ''}`}>
        <CoinIcon size={32} />
        <span className="st-coin-hero-num">{coins.toLocaleString()}</span>
      </div>
      <p className="st-coin-hero-label">Your Coins</p>
      <button type="button" className="st-coin-hero-earn" onClick={onEarnGuide}>
        How to earn more →
      </button>
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
  const [, forceUpdate] = useState(0);

  const showToast = useCallback((msg: string, ok: boolean) => {
    const id = Date.now();
    setToast({ msg, ok, id });
    setTimeout(() => setToast((t) => t?.id === id ? null : t), 2800);
  }, []);

  const handleBuy = useCallback((item: StoreItem) => {
    if (item.isFree || isOwned(item.id)) {
      if (!item.isConsumable) {
        equip(item.category, item.id);
        forceUpdate((n) => n + 1);
        showToast(`${item.name} equipped!`, true);
      }
      return;
    }
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
    if (!ok) { showToast('Not enough coins!', false); return; }
    setCoins(getCoins());
    if (!confirmItem.isConsumable) {
      addOwnedItem(confirmItem.id);
      equip(confirmItem.category, confirmItem.id);
    }
    forceUpdate((n) => n + 1);
    showToast(
      confirmItem.isConsumable
        ? `+${confirmItem.quantity} ${confirmItem.name} added!`
        : `${confirmItem.name} purchased & equipped!`,
      true,
    );
  }, [confirmItem, showToast]);

  const items = STORE_ITEMS.filter((i) => i.category === activeCategory);
  const activeMeta = CATEGORY_META[activeCategory];

  return (
    <div
      className="st-root"
      style={{ '--st-panel': `url(${neonPanelUrl})` } as CSSProperties}
    >
      {/* ── Topbar ── */}
      <header className="st-topbar">
        <button type="button" className="st-back" onClick={onClose} aria-label="Back">
          <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden>
            <path d="M13 4L6 10l7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="st-brand">
          <img src={logoMarkUrl} alt="" className="st-brand-mark" aria-hidden />
          <span className="st-brand-name">STORE</span>
        </div>

        <button
          type="button"
          className="st-coin-pill"
          onClick={() => setShowEarnGuide(true)}
          aria-label={`${coins} coins`}
        >
          <CoinIcon size={16} />
          <span>{coins.toLocaleString()}</span>
        </button>
      </header>

      {/* ── Coin hero ── */}
      <CoinHero coins={coins} onEarnGuide={() => setShowEarnGuide(true)} />

      {/* ── Category tabs ── */}
      <nav className="st-tabs" role="tablist" aria-label="Store categories">
        {CATEGORIES.map((cat) => {
          const m = CATEGORY_META[cat];
          const active = cat === activeCategory;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              className={`st-tab ${active ? 'st-tab--active' : ''}`}
              style={{ '--ta': m.accent } as CSSProperties}
              onClick={() => setActiveCategory(cat)}
            >
              <StoreIcon name={m.icon} className="st-tab-icon" />
              <span className="st-tab-label">{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Category heading ── */}
      <div
        className="st-cat-head"
        style={{ '--ca': activeMeta.accent } as CSSProperties}
      >
        <StoreIcon name={activeMeta.icon} className="st-cat-icon" />
        <span className="st-cat-name">{activeMeta.label}</span>
        <span className="st-cat-count">{items.length} items</span>
      </div>

      {/* ── Item grid ── */}
      <div className="st-grid">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} coins={coins} onBuy={handleBuy} />
        ))}
      </div>

      {/* ── Toast ── */}
      {toast && <Toast toast={toast} />}

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
