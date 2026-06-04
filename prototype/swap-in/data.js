/* Token / chain catalog — mirrors Paper mocks (9F2-0, A46-0) */
window.SwapData = (function () {
  const CHAINS = {
    Arbitrum: { id: 'arbitrum', icon: 'assets/chains/arbitrum.png' },
    Optimism: { id: 'optimism', icon: 'assets/chains/optimism.png' },
    Base: { id: 'base', icon: 'assets/chains/base.png' },
    Polygon: { id: 'polygon', icon: 'assets/chains/polygon.png' },
  };

  const TOKENS = {
    USDC: { symbol: 'USDC', icon: 'assets/tokens/usdc.png', category: 'stables', priceUsd: 1 },
    USDT: { symbol: 'USDT', icon: 'assets/tokens/usdt.png', iconLarge: 'assets/tokens/usdt-success.png', category: 'stables', priceUsd: 1 },
    ETH: { symbol: 'ETH', icon: 'assets/tokens/eth.png', category: 'native', priceUsd: 3010 },
  };

  const SOURCE_ASSETS = [
    {
      id: 'usdc-unified',
      token: 'USDC',
      chain: null,
      unified: true,
      chains: ['Arbitrum', 'Base', 'Optimism'],
      balance: 1019,
      balanceUsd: 1019,
      displayBalance: '1,019 USDC',
      displayUsd: '≈ $1,019',
    },
    {
      id: 'usdc-arb',
      token: 'USDC',
      chain: 'Arbitrum',
      balance: 320,
      balanceUsd: 320,
      displayBalance: '320.00 USDC',
      displayUsd: '≈ $320',
    },
    {
      id: 'eth-op',
      token: 'ETH',
      chain: 'Optimism',
      balance: 0.435,
      balanceUsd: 1302,
      displayBalance: '0.435 ETH',
      displayUsd: '≈ $1,302',
    },
    {
      id: 'usdt-multi',
      token: 'USDT',
      chain: null,
      unified: false,
      chains: ['Arbitrum', 'Base', 'Optimism', 'Polygon'],
      balance: 5842.12,
      balanceUsd: 5842.4,
      displayBalance: '5,842.12 USDT',
      displayUsd: '≈ $5,842.40',
      rowBalanceLabel: '40.55 USDT',
      displayChain: 'Arbitrum',
    },
  ];

  const DEST_ASSETS = [
    {
      id: 'usdc-arb-dest',
      token: 'USDC',
      chain: 'Arbitrum',
      address: '0xaf88d065e77c8cc2239327C5EDb3A432268e5831',
      shortAddress: '0xaf88…8831',
      showContractActions: true,
      balance: 310.15,
      balanceUsd: 310.22,
      displayBalance: '310.15 USDC',
      displayUsd: '$310.22',
      meta: {
        name: 'USD Coin',
        symbol: 'USDC',
        chain: 'Arbitrum',
        decimals: 6,
        contract: '0xaf88d065e77c8cc2239327C5EDb3A432268e5831',
      },
    },
    {
      id: 'usdc-base',
      token: 'USDC',
      chain: 'Base',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      shortAddress: '0x8335…2913',
      balance: 128.98,
      balanceUsd: 129.01,
      displayBalance: '128.98 USDC',
      displayUsd: '$129.01',
    },
    {
      id: 'eth-op-dest',
      token: 'ETH',
      chain: 'Optimism',
      address: '0x4200000000000000000000000000000000000006',
      shortAddress: '0x4200…0006',
      balance: 0.12,
      balanceUsd: 360,
      displayBalance: '0.12 ETH',
      displayUsd: '$360.00',
    },
    {
      id: 'usdt-arb',
      token: 'USDT',
      chain: 'Arbitrum',
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      shortAddress: '0xFd08…Cbb9',
      balance: 499.5,
      balanceUsd: 499.5,
      displayBalance: '499.50 USDT',
      displayUsd: '$499.50',
    },
    {
      id: 'usdt-polygon',
      token: 'USDT',
      chain: 'Polygon',
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      shortAddress: '0xc213…8e8F',
      balance: 892.5,
      balanceUsd: 892.5,
      displayBalance: '892.50 USDT',
      displayUsd: '$892.50',
    },
  ];

  const INFLIGHT_STEPS = [
    { label: 'Verifying intent', sub: 'Confirming on Arbitrum…', duration: 900 },
    { label: 'Signing transaction', sub: 'Waiting for wallet…', duration: 800 },
    { label: 'Broadcasting', sub: 'Sending to network…', duration: 700 },
    { label: 'Confirming deposit', sub: 'Block 284,912,103', duration: 900 },
    { label: 'Executing swap', sub: 'Routing via FastBridge', duration: 850 },
    { label: 'Finalizing', sub: 'Settling on Arbitrum…', duration: 750 },
  ];

  const DEFAULT_SOURCES = [
    { assetId: 'eth-op', amount: 0.05 },
    { assetId: 'usdc-arb', amount: 250 },
    { assetId: 'usdt-multi', amount: 0 },
  ];

  /** First visit — empty swap home (Paper 98V-0) */
  const EMPTY_SOURCES = [{ assetId: null, amount: 0 }];

  const DEFAULT_DEST = 'usdt-arb';
  const ONBOARDING_STORAGE_KEY = 'swap-in-onboarding-v3';

  /* Paper home (8AZ-0) — exact mock values */
  const PAPER_RECEIVE_FIAT = 500.5;
  const PAPER_RECEIVE_AMOUNT = 400.5;

  function getAsset(id, list) {
    return list.find((a) => a.id === id);
  }

  function assetKey(asset) {
    return asset.id || `${asset.token}-${asset.chain || 'unified'}`;
  }

  return {
    CHAINS,
    TOKENS,
    SOURCE_ASSETS,
    DEST_ASSETS,
    INFLIGHT_STEPS,
    DEFAULT_SOURCES,
    EMPTY_SOURCES,
    DEFAULT_DEST,
    ONBOARDING_STORAGE_KEY,
    getAsset,
    assetKey,
    PAPER_RECEIVE_FIAT,
    PAPER_RECEIVE_AMOUNT,
    chainList: () => ['All chains', ...Object.keys(CHAINS)],
    tabs: ['All', 'Native', 'Stables', 'Custom'],
    destTabs: ['All', 'Native', 'Stables'],
  };
})();
