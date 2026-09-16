#!/usr/bin/env bash
# Source this before any node/pnpm/anchor/solana command in this repo.
# The default PATH here points at the Salesforce CLI's bundled node; this repoints it.
export NVM_DIR="$HOME/.nvm"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
