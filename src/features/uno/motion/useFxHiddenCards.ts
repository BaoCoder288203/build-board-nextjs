"use client";

import { useEffect, useState } from "react";
import {
  isCardFxHidden,
  onHiddenCardsChange,
} from "./unoFxBus";

export function useFxHiddenCards() {
  const [, setTick] = useState(0);
  useEffect(() => onHiddenCardsChange(() => setTick((n) => n + 1)), []);
  return isCardFxHidden;
}
