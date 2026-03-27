/**
 * useMelonCoin — 瓜币余额存储 hook
 *
 * 使用 localStorage 持久化余额，提供加币、扣币和直接设置余额能力。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MelonCoinState } from '../types/market';
import { DEFAULT_MELON_COIN } from '../types/market';

const MELON_COIN_KEY = 'watermelon-coins';

function readInitialMelonCoinState(): MelonCoinState {
  try {
    const raw = localStorage.getItem(MELON_COIN_KEY);
    if (!raw) return DEFAULT_MELON_COIN;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_MELON_COIN;
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.balance !== 'number' || !Number.isFinite(candidate.balance)) {
      return DEFAULT_MELON_COIN;
    }
    return { balance: candidate.balance };
  } catch {
    return DEFAULT_MELON_COIN;
  }
}

export function useMelonCoin() {
  const [state, setState] = useState<MelonCoinState>(() => readInitialMelonCoinState());
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(MELON_COIN_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }, [state]);

  const addCoins = useCallback((amount: number) => {
    if (amount <= 0) return;
    const nextState = { ...stateRef.current, balance: stateRef.current.balance + amount };
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const spendCoins = useCallback((amount: number): boolean => {
    if (amount <= 0) return false;
    const currentState = stateRef.current;
    if (currentState.balance < amount) return false;

    const nextState = { ...currentState, balance: currentState.balance - amount };
    stateRef.current = nextState;
    setState(nextState);
    return true;
  }, []);

  const setBalance = useCallback((balance: number) => {
    const nextState = { balance };
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  return {
    balance: state.balance,
    addCoins,
    spendCoins,
    setBalance,
  };
}
