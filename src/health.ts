const HEALTH_LOG_INTERVAL_CYCLES = 20;

export interface HealthStats {
  startTime: number;
  cycles: number;
  alertsSent: number;
  errors: {
    juiceswap: number;
    juicedollar: number;
    telegram: number;
  };
  lastSuccessfulPoll: number | null;
}

export function createHealthStats(): HealthStats {
  return {
    startTime: Date.now(),
    cycles: 0,
    alertsSent: 0,
    errors: { juiceswap: 0, juicedollar: 0, telegram: 0 },
    lastSuccessfulPoll: null,
  };
}

export function logHealthIfDue(stats: HealthStats): void {
  stats.cycles++;
  if (stats.cycles % HEALTH_LOG_INTERVAL_CYCLES !== 0) return;

  const uptimeMs = Date.now() - stats.startTime;
  const uptimeH = (uptimeMs / 3_600_000).toFixed(1);
  const lastPoll = stats.lastSuccessfulPoll
    ? `${Math.round((Date.now() - stats.lastSuccessfulPoll) / 1000)}s ago`
    : "never";

  console.log(
    `[health] uptime=${uptimeH}h cycles=${stats.cycles} ` +
    `alerts_sent=${stats.alertsSent} ` +
    `errors=[swap=${stats.errors.juiceswap} dollar=${stats.errors.juicedollar} tg=${stats.errors.telegram}] ` +
    `last_poll=${lastPoll}`
  );
}
