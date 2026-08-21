"use client";

/**
 * Stellar Wallets Kit v2 is an all-static API: it is configured once and then
 * every call goes through the class. Initialisation touches `window`, so it is
 * deferred to first use rather than run at module scope — this module is only
 * ever reached from a browser event handler or effect, never during render.
 *
 * No network is pinned here. The passphrase a transaction must be signed under
 * comes back from `/api/tx/build` with the envelope itself, so the browser
 * never carries its own idea of which chain this is.
 */
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import {
  FreighterModule,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";

let initialised = false;

export function ensureKit(): typeof StellarWalletsKit {
  if (!initialised) {
    StellarWalletsKit.init({
      selectedWalletId: FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new xBullModule(),
        new LobstrModule(),
        new AlbedoModule(),
        new HanaModule(),
        new RabetModule(),
      ],
    });
    initialised = true;
  }
  return StellarWalletsKit;
}
