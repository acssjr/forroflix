type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const cache = new Map<string, RateLimitRecord>();

// Limpeza periódica de registros expirados a cada 10 minutos
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of cache.entries()) {
      if (now > record.resetTime) {
        cache.delete(key);
      }
    }
  }, 10 * 60 * 1000);
  
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = cache.get(key);

  if (!record) {
    cache.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.resetTime,
  };
}
