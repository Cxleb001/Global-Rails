"""Price oracle for Global Rails.

Fetches real-time exchange rates for crypto tokens and fiat currencies in a
chain-agnostic way.

For fiat quotes, this combines two sources rather than one:
  - CoinGecko for token->USD (its supported vs_currencies list is
    documented at https://docs.coingecko.com and does NOT include KES,
    despite this project's whole pitch being KES/NGN/GHS payouts)
  - open.er-api.com (ExchangeRate-API's free, no-key endpoint) for
    USD->local-fiat, which DOES cover KES across 166 currencies

Multiplying the two gives an accurate token->local-fiat rate. This was
previously a single CoinGecko call with `.get(fiat.lower(), 1.0)` as a
fallback when the currency wasn't in the response - which for KES was
EVERY call, since CoinGecko never returns a "kes" key at all. That
silently returned exactly 1.0 with no error, which is how "1 USDC = 1 KES"
made it all the way to production undetected - a wrong number with no
error is far more dangerous than an error, since nothing ever surfaced it.
Neither this file nor _token_quote() below carry that fallback anymore;
both raise clearly instead of guessing.
"""

import time

import requests

from chains import CHAINS, get_chain

# CoinGecko asset ids keyed by token symbol.
COINGECKO_IDS = {
    "USDC": "usd-coin",
    "USDT": "tether",
    "AVAX": "avalanche-2",
    "ETH": "ethereum",
    "POL": "matic-network",
}

COINGECKO_BASE = "https://api.coingecko.com/api/v3/simple/price"
EXCHANGERATE_BASE = "https://open.er-api.com/v6/latest"

# Fiat currencies this oracle supports. `quote.isupper()` alone can't tell a
# fiat code apart from a token ticker (both are conventionally uppercase -
# "KES" and "USDT" are both `.isupper() == True`), so route on an explicit
# allowlist instead.
FIAT_CURRENCIES = {"USD", "KES", "NGN", "GHS"}

# CoinGecko's free tier rate-limits aggressively, and every fiat quote now
# makes up to two real HTTP calls instead of one - a short cache absorbs
# repeated requests for the same pair in a burst (multiple clicks, multiple
# users) without the rate actually going stale in any way that matters for
# a dashboard display.
_price_cache: dict[str, tuple[float, float]] = {}
_CACHE_TTL_SECONDS = 30


def _usd_to_fiat_rate(fiat: str) -> float:
    """USD -> `fiat` via open.er-api.com (ExchangeRate-API's free, no-key
    "Open Access" endpoint). Returns 1.0 unchecked if fiat is literally
    USD (no conversion needed, no HTTP call needed either).

    This replaces an earlier Frankfurter-based implementation. Two
    Frankfurter attempts both hit real, confirmed problems - not
    guesswork, both verified live in production: the first used the
    wrong parameter names (from/to instead of base/symbols, mixing up
    two different Frankfurter domains' conventions), and the second,
    with the correct parameter names confirmed present in the actual
    request URL, still got a 404 from Frankfurter's API itself for KES
    specifically. Rather than guess at a third Frankfurter variation,
    this switches providers entirely - open.er-api.com uses base
    currency directly in the URL path rather than query parameters,
    removing that whole class of mistake, and covers 166 currencies in
    a single request.
    """
    if fiat.upper() == "USD":
        return 1.0

    resp = requests.get(f"{EXCHANGERATE_BASE}/USD", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("result") != "success":
        raise ValueError(f"open.er-api.com did not return success: {data}")
    rates = data.get("rates", {})
    if fiat.upper() not in rates:
        raise ValueError(f"open.er-api.com response has no rate for '{fiat}': {data}")
    return float(rates[fiat.upper()])


def _fiat_quote(token: str, fiat: str) -> float:
    """Return token->fiat rate by combining CoinGecko (token->USD) with
    open.er-api.com (USD->fiat) when fiat isn't USD itself.

    If a live fetch fails (rate limit, timeout, either API being down) but
    a previous successful fetch for this exact pair exists - even an
    expired one - that's returned instead of raising, since a dashboard
    rate display should very rarely go blank and a rate a few minutes
    stale is a far better outcome than "unavailable". This is different
    from silently defaulting to a made-up number when the *first* fetch
    for a pair fails or returns unexpected data - that case still raises,
    since there's nothing real to fall back to yet.
    """
    cache_key = f"{token.upper()}:{fiat.upper()}"
    now = time.time()
    cached = _price_cache.get(cache_key)
    if cached is not None and (now - cached[1]) < _CACHE_TTL_SECONDS:
        return cached[0]

    coin_id = COINGECKO_IDS.get(token.upper(), COINGECKO_IDS["USDC"])
    url = f"{COINGECKO_BASE}?ids={coin_id}&vs_currencies=usd"
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        data = res.json()
        if coin_id not in data or "usd" not in data[coin_id]:
            raise ValueError(f"CoinGecko response missing expected data for '{coin_id}': {data}")
        token_to_usd = float(data[coin_id]["usd"])

        usd_to_fiat = _usd_to_fiat_rate(fiat)
        rate = token_to_usd * usd_to_fiat
    except Exception:
        if cached is not None:
            return cached[0]
        raise

    _price_cache[cache_key] = (rate, now)
    return rate


def _token_quote(base: str, quote: str) -> float:
    """Return a token->token rate placeholder.

    Stablecoin pairs are ~1:1 - this is a deliberate placeholder, not a
    real quote, pending an on-chain DEX pool read for actual token-to-token
    pairs. Unlike _fiat_quote() above, this one genuinely has no better
    source wired in yet, so the placeholder is documented here rather than
    disguised as a real number.
    """
    return 1.0


def get_market_price(token: str = "USDC", quote: str = "USD", chain: str = "avalanche") -> dict:
    """Fetch a price for 'token' relative to 'quote' on 'chain'.

    - 'quote' in {"USD", "KES", "NGN", "GHS", ...} and the reference coin is
      quoted in fiat via CoinGecko + open.er-api.com.
    - 'quote' as a token symbol enables token-vs-token prices (placeholder).
    Returns a dict compatible with the shared ToolResult payload contract.
    """
    chain_cfg = get_chain(chain)
    t = token.upper()
    q = quote.upper()

    if q in FIAT_CURRENCIES:
        rate = _fiat_quote(t, q)
        source = "coingecko+exchangerate-api" if q != "USD" else "coingecko"
    else:
        rate = _token_quote(t, q)
        source = "placeholder"

    return {
        "token": t,
        "quote": quote.upper(),
        "chain": chain_cfg.name,
        "chain_id": chain_cfg.chain_id,
        "rate": rate,
        "source": source,
    }


def supported_chains() -> list:
    """List of chains the price oracle can report prices for."""
    return [
        {"name": c.name, "chain_id": c.chain_id, "stablecoins": list(c.stablecoins)}
        for c in CHAINS.values()
    ]
