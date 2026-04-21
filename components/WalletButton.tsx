"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/lib/utils";

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            aria-hidden={!ready}
            style={{
              opacity: ready ? 1 : 0,
              pointerEvents: ready ? "auto" : "none",
              userSelect: ready ? "auto" : "none",
            }}
            className="flex items-center gap-2"
          >
            {!connected ? (
              <Button onClick={openConnectModal} size="md">
                Connect wallet
              </Button>
            ) : chain.unsupported ? (
              <Button variant="danger" onClick={openChainModal} size="md">
                Wrong network
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openChainModal}
                  className="hidden sm:inline-flex"
                >
                  {chain.hasIcon && chain.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 16x16 chain icon from RainbowKit; dynamic source, no layout shift
                    <img
                      src={chain.iconUrl}
                      alt={chain.name ?? "chain"}
                      className="h-4 w-4 rounded-full"
                    />
                  ) : null}
                  {chain.name}
                </Button>
                <Button variant="secondary" size="sm" onClick={openAccountModal}>
                  <span className="text-numeric">
                    {truncateAddress(account.address)}
                  </span>
                </Button>
              </>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
