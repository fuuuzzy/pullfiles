import dns from "node:dns";
import { Agent, setGlobalDispatcher } from "undici";

/**
 * Tuned global HTTP dispatcher for outbound fetches.
 *
 * Two real-world problems this solves:
 *
 * 1. **IPv6 black-hole on Baidu CDN.** Baidu's PCS download endpoints
 *    (e.g. `bjbgp01.baidupcs.com`) return AAAA records (`240e:..`, `2408:..`)
 *    that are not routable from outside-China clients. Node's default
 *    happy-eyeballs tries IPv6 first, blows the connect-timeout budget, and
 *    only *then* falls back to IPv4 — which by that point also surfaces as
 *    `ETIMEDOUT`. Forcing the dispatcher to resolve A records only gets us
 *    straight to a working IPv4 address.
 *
 * 2. **Slow CDN handshakes.** The IPv4 endpoints have ~370 ms RTT with high
 *    packet loss, so the TCP handshake can take several seconds. Default
 *    10s connectTimeout is too tight; bumped to 30s.
 *
 * Body timeout is intentionally 0 — `downloadFile()` enforces its own per
 * chunk 60s idle-timeout, which is finer-grained than undici's monolithic
 * body timeout (which would kill a slow-but-progressing transfer).
 */
export function installLenientHttpDispatcher(): void {
	setGlobalDispatcher(
		new Agent({
			connect: {
				timeout: 30_000,
				lookup: (hostname, opts, cb) => {
					dns.lookup(hostname, { ...opts, family: 4 }, cb);
				},
			},
			headersTimeout: 60_000,
			bodyTimeout: 0,
			keepAliveTimeout: 30_000,
			keepAliveMaxTimeout: 600_000,
		}),
	);
}
