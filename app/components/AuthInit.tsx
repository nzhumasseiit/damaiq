"use client";

import { useEffect } from "react";

import { ensureAnonymousSession } from "@/lib/auth";
import { seedLeaderboardIfEmpty } from "@/lib/leaderboard/local";

export default function AuthInit() {
  useEffect(() => {
    seedLeaderboardIfEmpty();
    void ensureAnonymousSession();
  }, []);

  return null;
}
