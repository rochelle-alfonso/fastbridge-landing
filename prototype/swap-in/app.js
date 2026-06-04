(function () {
  function showBootError(msg) {
    const el = document.getElementById('boot-error');
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = msg;
  }

  if (!window.SwapData) {
    showBootError(
      'Could not load <code>data.js</code>. Serve this folder over HTTP from the repo root:<br><br>' +
      '<code>cd fastbridge-landing && python3 -m http.server 8790</code><br><br>' +
      'Then open <code>http://localhost:8790/prototype/swap-in/</code> (not a <code>file://</code> link).'
    );
    return;
  }

  const D = window.SwapData;
  const SCREENS = ['home', 'source', 'dest', 'confirm', 'inflight', 'success'];
  const STEP_MAP = { 1: 'home', 2: 'source', 3: 'dest', 4: 'confirm', 5: 'inflight', 6: 'success' };

  const ONBOARDING_STEPS = [
    {
      screen: 'home',
      target: '#btn-add-asset',
      step: '1 of 5',
      title: 'Send from multiple assets',
      body: 'In Swap, each source in Send is its own row. Tap <strong>Add asset</strong> to combine tokens or chains in one swap.',
      primary: 'Next',
      ringRadius: 8,
      showNext: true,
      showExample: true,
      coachWidth: 304,
    },
    {
      screen: 'source',
      target: '#source-list',
      step: '2 of 5',
      title: 'Pick what to send',
      body: 'Choose a token and chain, then tap <strong>Done</strong> to add it to your swap.',
      primary: 'Next',
      ringRadius: 14,
      showNext: false,
    },
    {
      screen: 'home',
      target: '#btn-receive-token',
      step: '3 of 5',
      title: 'Choose what to receive',
      body: 'Tap the receive token to pick what you want on the destination chain.',
      primary: 'Next',
      ringRadius: 18,
      showNext: true,
    },
    {
      screen: 'dest',
      target: '#dest-list',
      step: '4 of 5',
      title: 'Pick a destination',
      body: 'Select the token and chain you want to receive, then tap <strong>Done</strong>.',
      primary: 'Next',
      ringRadius: 14,
      showNext: false,
    },
    {
      screen: 'confirm',
      target: '#btn-swap-now',
      step: '5 of 5',
      title: 'Review before you swap',
      body: 'Check amounts, fees, and destination. Tap <strong>Swap now</strong> when you are ready.',
      primary: 'Got it',
      ringRadius: 12,
      showNext: true,
    },
  ];

  const params = new URLSearchParams(location.search);

  function isOnboardingComplete() {
    if (params.get('reset-onboarding') === '1') return false;
    return localStorage.getItem(D.ONBOARDING_STORAGE_KEY) === '1';
  }

  function isEmptyHome() {
    return state.sources.every((s) => !s.assetId && !s.amount);
  }

  function getOnboardingStepConfig() {
    return ONBOARDING_STEPS[state.onboardingStep - 1];
  }

  function shouldShowOnboarding() {
    if (isOnboardingComplete() || !state.onboardingStep) return false;
    const step = getOnboardingStepConfig();
    return Boolean(step && state.screen === step.screen);
  }

  const state = {
    screen: 'home',
    sources: D.DEFAULT_SOURCES.map((s) => ({ ...s })),
    destinationId: D.DEFAULT_DEST,
    onboardingStep: null,
    recipient: '0xF3a1…9b2E',
    sourcePickerSelected: 'usdc-arb',
    destPickerSelected: D.DEFAULT_DEST,
    sourceTab: 'All',
    destTab: 'All',
    sourceChain: 'All chains',
    destChain: 'All chains',
    sourceQuery: '',
    destQuery: '',
    editingRecipient: false,
    focusedRowIdx: null,
    activePctRow: null,
    rowPctChip: {},
    pctLabels: ['20%', '75%', 'Max'],
    inflightStep: 0,
    inflightExpanded: false,
    inflightTimer: null,
    dotAnim: null,
    confettiAnim: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function fmtUsd(n) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtNum(n, decimals = 2) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  }

  function tokenMarkHtml(token, chain, size = 26, opts = {}) {
    const t = D.TOKENS[token];
    const icon = opts.large && t?.iconLarge ? t.iconLarge : (t ? t.icon : '');
    let chainBadge = '';
    if (chain && D.CHAINS[chain]) {
      chainBadge = `<span class="chain-badge" style="background-image:url('${D.CHAINS[chain].icon}')"></span>`;
    }
    return `<img class="token-mark" src="${icon}" alt="" width="${size}" height="${size}">${chainBadge}`;
  }

  function derive() {
    const sources = state.sources
      .map((s) => {
        const asset = D.getAsset(s.assetId, D.SOURCE_ASSETS);
        if (!asset) return null;
        const token = D.TOKENS[asset.token];
        const usd = (s.amount || 0) * (token ? token.priceUsd : 1);
        return { ...s, asset, usd };
      })
      .filter(Boolean);

    const sendUsd = sources.reduce((sum, s) => sum + s.usd, 0);
    const activeSources = sources.filter((s) => s.amount > 0);
    const dest = state.destinationId ? D.getAsset(state.destinationId, D.DEST_ASSETS) : null;
    const receiveAmount = sendUsd > 0 ? D.PAPER_RECEIVE_AMOUNT : 0;
    const receiveUsd = sendUsd > 0 ? D.PAPER_RECEIVE_FIAT : 0;
    const tokensLabel = activeSources.map((s) => s.asset.token).join(', ') || '—';
    const assetCount = sources.length;

    return {
      sources,
      activeSources,
      sendUsd,
      receiveAmount,
      receiveUsd,
      dest,
      tokensLabel,
      assetCount,
      minReceived: Math.max(0, receiveAmount - 0.32).toFixed(2),
    };
  }

  function tokenIconHtml(token, chain, size = 26, opts = {}) {
    return `<span class="token-pill__icon" style="width:${size}px;height:${size}px;position:relative">${tokenMarkHtml(token, chain, size, opts)}</span>`;
  }

  function navigate(screen, { skipTransition } = {}) {
    if (!SCREENS.includes(screen)) return;
    state.screen = screen;

    const apply = () => {
      $$('.screen').forEach((el) => {
        el.classList.toggle('is-active', el.dataset.screen === screen);
      });
      $$('#devbar button').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.screen === screen);
      });
      if (screen === 'inflight') startInflight();
      else stopInflight();
      if (screen === 'success') startConfetti();
      else stopConfetti();
      render();
    };

    apply();
  }

  function goToOnboardingStep(stepNum, { navigateToStepScreen = true } = {}) {
    state.onboardingStep = stepNum;
    const step = getOnboardingStepConfig();
    if (navigateToStepScreen && step && step.screen !== state.screen) {
      navigate(step.screen);
      if (step.screen === 'source') renderSourceList();
      if (step.screen === 'dest') renderDestList();
      return;
    }
    render();
  }

  function advanceOnboarding() {
    if (state.onboardingStep >= ONBOARDING_STEPS.length) {
      completeOnboarding();
      return;
    }

    const nextStep = state.onboardingStep + 1;
    if (nextStep === 2 || nextStep === 4) {
      goToOnboardingStep(nextStep);
      return;
    }
    goToOnboardingStep(nextStep);
  }

  function applyOnboardingSourceSelection() {
    const assetId = state.sourcePickerSelected || 'usdc-arb';
    state.sources = [{ assetId, amount: 0 }];
    if (!state.destinationId) state.destinationId = D.DEFAULT_DEST;
    const asset = D.getAsset(assetId, D.SOURCE_ASSETS);
    const token = asset ? D.TOKENS[asset.token] : null;
    if (token) state.sources[0].amount = 100 / token.priceUsd;
  }

  function pctChipsHtml(idx) {
    const chip = state.rowPctChip[idx] || 'Max';
    return state.pctLabels.map((label) => {
      const active = chip === label ? ' is-active' : '';
      return `<button type="button" class="pct-bar__chip${active}" data-pct="${label}" data-idx="${idx}">${label}</button>`;
    }).join('');
  }

  function updatePctChipsForRow(row, idx) {
    if (!row) return;
    const chip = state.rowPctChip[idx] || 'Max';
    row.querySelectorAll('[data-pct]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.pct === chip);
    });
  }

  function syncFocusedRowUi() {
    const rows = $('#home-send-rows');
    if (!rows) return;
    const idx = state.focusedRowIdx;
    rows.querySelectorAll('.asset-row').forEach((row, i) => {
      const focused = i === idx;
      row.classList.toggle('asset-row--focused', focused);
      const remove = row.querySelector('.asset-row__remove');
      if (remove) remove.hidden = !focused || state.sources.length <= 2;
      const input = row.querySelector('.asset-row__amount');
      if (input) {
        const src = state.sources[i];
        const empty = !src?.amount;
        input.classList.toggle('asset-row__amount--empty', focused && empty);
      }
      updatePctChipsForRow(row, i);
    });
  }

  function setFocusedRow(idx) {
    if (idx === null) {
      clearFocusedRow();
      return;
    }
    state.focusedRowIdx = idx;
    state.activePctRow = idx;
    if (!state.rowPctChip[idx]) state.rowPctChip[idx] = 'Max';
    syncFocusedRowUi();
  }

  function clearFocusedRow() {
    state.focusedRowIdx = null;
    state.activePctRow = null;
    syncFocusedRowUi();
  }

  function render() {
    const d = derive();
    renderHome(d);
    renderOnboarding();
    renderConfirm(d);
    renderInflight(d);
    renderSuccess(d);
  }

  function completeOnboarding() {
    localStorage.setItem(D.ONBOARDING_STORAGE_KEY, '1');
    state.onboardingStep = null;
    $('#frame')?.classList.remove('is-onboarding');
    renderOnboarding();
  }

  function resetOnboarding() {
    localStorage.removeItem(D.ONBOARDING_STORAGE_KEY);
    state.sources = D.EMPTY_SOURCES.map((s) => ({ ...s }));
    state.destinationId = null;
    state.onboardingStep = 1;
    state.focusedRowIdx = null;
    navigate('home', { skipTransition: true });
  }

  function syncOnboardingLayerBounds() {
    const frame = $('#frame');
    const panel = $(`#screen-${state.screen}`);
    const layer = $('#onboarding-layer');
    if (!frame || !panel || !layer) return;

    const frameRect = frame.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    layer.style.top = `${panelRect.top - frameRect.top}px`;
    layer.style.left = `${panelRect.left - frameRect.left}px`;
    layer.style.width = `${panelRect.width}px`;
    layer.style.height = `${panelRect.height}px`;
  }

  function positionOnboardingCutout(targetEl, ringRadius, coachWidth = 280) {
    syncOnboardingLayerBounds();
    const panel = $(`#screen-${state.screen}`);
    const cutout = $('#onboarding-cutout');
    const ring = $('#onboarding-ring');
    if (!panel || !cutout || !targetEl || !ring) return;

    const pad = 4;
    const panelRect = panel.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const holeTop = Math.max(0, targetRect.top - panelRect.top - pad);
    const holeLeft = Math.max(0, targetRect.left - panelRect.left - pad);
    const holeWidth = targetRect.width + pad * 2;
    const holeHeight = targetRect.height + pad * 2;
    const panelW = panelRect.width;
    const panelH = panelRect.height;
    const halfCoach = coachWidth / 2;
    const coachReserve = coachWidth > 280 ? 280 : 180;

    const top = cutout.querySelector('.onboarding-cutout__panel--top');
    const bottom = cutout.querySelector('.onboarding-cutout__panel--bottom');
    const left = cutout.querySelector('.onboarding-cutout__panel--left');
    const right = cutout.querySelector('.onboarding-cutout__panel--right');

    if (top) top.style.cssText = `position:absolute;left:0;top:0;width:${panelW}px;height:${holeTop}px;background:rgba(22,22,21,0.45);`;
    if (bottom) bottom.style.cssText = `position:absolute;left:0;top:${holeTop + holeHeight}px;width:${panelW}px;height:${Math.max(0, panelH - holeTop - holeHeight)}px;background:rgba(22,22,21,0.45);`;
    if (left) left.style.cssText = `position:absolute;left:0;top:${holeTop}px;width:${holeLeft}px;height:${holeHeight}px;background:rgba(22,22,21,0.45);`;
    if (right) right.style.cssText = `position:absolute;left:${holeLeft + holeWidth}px;top:${holeTop}px;width:${Math.max(0, panelW - holeLeft - holeWidth)}px;height:${holeHeight}px;background:rgba(22,22,21,0.45);`;

    ring.style.top = `${holeTop}px`;
    ring.style.left = `${holeLeft}px`;
    ring.style.width = `${holeWidth}px`;
    ring.style.height = `${holeHeight}px`;
    ring.style.borderRadius = `${ringRadius}px`;
    ring.classList.toggle('onboarding-cutout__ring--send-card', ringRadius >= 14);

    const coach = $('#coach-mark');
    const arrow = $('#coach-mark-arrow');
    if (coach) {
      const coachLeft = Math.min(Math.max(16, holeLeft + holeWidth / 2 - halfCoach), panelW - coachWidth - 16);
      const coachTop = Math.min(holeTop + holeHeight + 12, Math.max(16, panelH - coachReserve));
      coach.style.left = `${coachLeft}px`;
      coach.style.top = `${coachTop}px`;
      coach.style.width = `${coachWidth}px`;
      coach.style.right = 'auto';
      if (arrow) {
        const arrowLeft = holeLeft + holeWidth / 2 - coachLeft - 7;
        arrow.style.left = `${Math.max(16, Math.min(coachWidth - 32, arrowLeft))}px`;
      }
    }
  }

  function renderOnboarding() {
    const frame = $('#frame');
    const home = $('#screen-home');
    const layer = $('#onboarding-layer');
    const coach = $('#coach-mark');
    const example = $('#coach-mark-example');
    if (!frame || !home || !layer) return;

    const active = shouldShowOnboarding();
    const step = getOnboardingStepConfig();

    home.classList.toggle('is-empty-home', isEmptyHome());
    home.classList.toggle('is-onboarding', active && state.screen === 'home');
    frame.classList.toggle('is-onboarding', active);
    layer.classList.toggle('hidden', !active);
    layer.setAttribute('aria-hidden', active ? 'false' : 'true');

    if (!active || !step) return;

    $('#coach-mark-step').textContent = step.step;
    $('#coach-mark-title').textContent = step.title;
    $('#coach-mark-body').innerHTML = step.body;
    $('#coach-next').textContent = step.primary;
    $('#coach-next').classList.toggle('hidden', !step.showNext);
    example?.classList.toggle('hidden', !step.showExample);
    coach?.classList.toggle('coach-mark--with-example', Boolean(step.showExample));
    if (coach && !step.showExample) coach.style.width = '';

    requestAnimationFrame(() => {
      const target = $(step.target);
      if (target) positionOnboardingCutout(target, step.ringRadius, step.coachWidth || 280);
    });
  }

  function renderHome(d) {
    const rows = $('#home-send-rows');
    if (!rows) return;

    const sendCard = $('#home-send-card');
    const empty = isEmptyHome();
    sendCard?.classList.toggle('send-card--empty', empty);

    const countEl = $('#home-asset-count');
    if (countEl) countEl.textContent = `${d.assetCount} asset${d.assetCount === 1 ? '' : 's'}`;

    $('#bind-send-total').textContent = `≈ ${fmtUsd(d.sendUsd)}`;
    $('#bind-receive-amount').textContent = d.receiveAmount > 0 ? d.receiveAmount.toFixed(2) : '0';
    $('#bind-receive-usd').textContent = `≈ ${fmtUsd(d.receiveUsd)}`;

    const reviewBtn = $('#btn-review');
    if (reviewBtn) {
      reviewBtn.disabled = d.sendUsd <= 0;
      reviewBtn.textContent = empty ? 'Add assets to send' : 'Review swap';
    }

    const caretIcon = '<svg class="token-pill__caret" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="#8E8E89" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const swapIcon = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2L4 10M4 10L1.5 7.5M4 10L6.5 7.5M8 10L8 2M8 2L10.5 4.5M8 2L5.5 4.5" stroke="#8E8E89" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    if (empty) {
      rows.innerHTML = `
        <div class="asset-row">
          <div class="asset-row__stack">
            <div class="asset-row__line">
              <span class="asset-row__amount asset-row__amount--placeholder">0</span>
              <button type="button" class="token-pill" data-action="pick-source" data-idx="0">
                <span class="token-pill__icon token-pill__icon--placeholder"></span>
                <span>Select asset</span>
                ${caretIcon}
              </button>
            </div>
            <div class="asset-row__sub">
              <span>≈ $0.00</span>
              ${swapIcon}
            </div>
          </div>
        </div>`;

      const receiveSymbol = $('#bind-receive-symbol');
      if (receiveSymbol) receiveSymbol.textContent = 'Select asset';
      $('#home-receive-icon').innerHTML = '<span class="token-pill__icon token-pill__icon--placeholder"></span>';
      const receiveAmount = $('#bind-receive-amount');
      if (receiveAmount) {
        receiveAmount.textContent = '0';
        receiveAmount.classList.add('receive-card__amount--placeholder');
      }
      $('#home-receive-card')?.classList.add('receive-card--empty');
      return;
    }

    $('#home-receive-card')?.classList.remove('receive-card--empty');
    const receiveAmountEl = $('#bind-receive-amount');
    receiveAmountEl?.classList.remove('receive-card__amount--placeholder');
    $('#bind-receive-symbol').textContent = d.dest ? d.dest.token : 'USDT';
    $('#home-receive-icon').innerHTML = d.dest
      ? tokenIconHtml(d.dest.token, d.dest.chain)
      : tokenIconHtml('USDT', 'Arbitrum');

    const focusIdx = state.focusedRowIdx;
    const preserveFocus = document.activeElement?.classList?.contains('asset-row__amount');
    const activeIdx = preserveFocus
      ? Number(document.activeElement.closest('.asset-row')?.dataset?.idx)
      : focusIdx;

    rows.innerHTML = '';
    state.sources.forEach((src, idx) => {
      const asset = D.getAsset(src.assetId, D.SOURCE_ASSETS);
      if (!asset) return;
      const token = D.TOKENS[asset.token];
      const usd = (src.amount || 0) * (token ? token.priceUsd : 1);
      const isFocused = focusIdx === idx;
      const balanceLabel = asset.rowBalanceLabel || asset.displayBalance || '';
      const amountVal = src.amount === 0 && isFocused ? '' : (src.amount || '0');
      const amountEmpty = !src.amount || src.amount === 0;
      const pillBtn = `<button type="button" class="token-pill" data-action="pick-source" data-idx="${idx}">
                ${tokenIconHtml(asset.token, asset.displayChain || asset.chain)}
                <span>${asset.token}</span>
                ${caretIcon}
              </button>`;
      const removeBtn = `<button type="button" class="asset-row__remove" data-action="remove" data-idx="${idx}" aria-label="Remove" hidden><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3L7 7M7 3L3 7" stroke="#8E8E89" stroke-width="1.4" stroke-linecap="round"/></svg></button>`;
      const row = document.createElement('div');
      row.className = `asset-row${isFocused ? ' asset-row--focused' : ''}`;
      row.dataset.idx = String(idx);
      row.innerHTML = `
        <div class="asset-row__grid">
          <div class="asset-row__main">
            <div class="asset-row__amount-wrap">
              <input type="text" inputmode="decimal" class="asset-row__amount${amountEmpty && isFocused ? ' asset-row__amount--empty' : ''}" value="${amountVal}" placeholder="0" aria-label="Amount ${asset.token}">
              <span class="asset-row__caret" aria-hidden="true"></span>
            </div>
            <div class="asset-row__sub">
              <span class="asset-row__usd">≈ ${fmtUsd(usd)}</span>
              ${swapIcon}
            </div>
          </div>
          <div class="asset-row__right">
            <div class="asset-row__rightline">
              ${pillBtn}
              ${removeBtn}
            </div>
            <div class="asset-row__meta">
              <div class="pct-bar pct-bar--compact">${pctChipsHtml(idx)}</div>
              ${balanceLabel ? `<span class="asset-row__balance">Asset Balance · ${balanceLabel}</span>` : '<span class="asset-row__balance"></span>'}
            </div>
          </div>
        </div>`;
      rows.appendChild(row);
    });

    bindSendRowEvents(rows);

    if (focusIdx !== null) syncFocusedRowUi();

    if (activeIdx !== null && !Number.isNaN(activeIdx)) {
      const input = rows.querySelector(`.asset-row[data-idx="${activeIdx}"] .asset-row__amount`);
      if (input) {
        input.focus();
        const len = input.value.length;
        try {
          input.setSelectionRange(len, len);
        } catch (_) { /* noop */ }
      }
    }
  }

  function bindSendRowEvents(rows) {
    if (!rows || rows.dataset.bound === '1') return;
    rows.dataset.bound = '1';

    rows.addEventListener('mousedown', (e) => {
      const input = e.target.closest('.asset-row__amount');
      if (!input) return;
      const idx = Number(input.closest('.asset-row').dataset.idx);
      if (state.focusedRowIdx !== idx) setFocusedRow(idx);
    });

    rows.addEventListener('focusin', (e) => {
      const input = e.target.closest('.asset-row__amount');
      if (!input) return;
      const row = input.closest('.asset-row');
      const idx = Number(row.dataset.idx);
      if (state.focusedRowIdx === idx) return;
      setFocusedRow(idx);
    });

    rows.addEventListener('focusout', (e) => {
      if (!e.target.classList.contains('asset-row__amount')) return;
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active?.closest('#home-send-rows')) return;
        clearFocusedRow();
      });
    });

    rows.addEventListener('input', (e) => {
      if (!e.target.classList.contains('asset-row__amount')) return;
      onAmountInput(e, false);
    });

    rows.addEventListener('click', (e) => {
      const pct = e.target.closest('[data-pct]');
      if (pct) {
        onPctClick(e);
        return;
      }
      const remove = e.target.closest('[data-action="remove"]');
      if (remove) {
        const i = Number(remove.dataset.idx);
        state.sources.splice(i, 1);
        if (state.focusedRowIdx === i) state.focusedRowIdx = null;
        else if (state.focusedRowIdx !== null && state.focusedRowIdx > i) state.focusedRowIdx -= 1;
        render();
        return;
      }
      const row = e.target.closest('.asset-row');
      if (row && !e.target.closest('button')) {
        row.querySelector('.asset-row__amount')?.focus();
      }
    });
  }

  function onAmountInput(e, shouldRender = true) {
    const row = e.target.closest('.asset-row');
    const idx = Number(row.dataset.idx);
    const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
    state.sources[idx].amount = val;
    e.target.classList.toggle('asset-row__amount--empty', !val);
    const usd = row.querySelector('.asset-row__usd');
    if (usd) {
      const asset = D.getAsset(state.sources[idx].assetId, D.SOURCE_ASSETS);
      const token = D.TOKENS[asset?.token];
      const amountUsd = val * (token ? token.priceUsd : 1);
      usd.textContent = `≈ ${fmtUsd(amountUsd)}`;
    }
    $('#bind-send-total').textContent = `≈ ${fmtUsd(derive().sendUsd)}`;
    const reviewBtn = $('#btn-review');
    if (reviewBtn) reviewBtn.disabled = derive().sendUsd <= 0;
    if (shouldRender) render();
  }

  function onPctClick(e) {
    const btn = e.target.closest('[data-pct]');
    if (!btn) return;
    const idx = state.focusedRowIdx ?? Number(btn.dataset.idx);
    const pct = btn.dataset.pct;
    const src = state.sources[idx];
    const asset = D.getAsset(src.assetId, D.SOURCE_ASSETS);
    if (!asset) return;
    state.activePctRow = idx;
    state.rowPctChip[idx] = pct;
    let amount = 0;
    if (pct === 'Max') amount = asset.balance;
    else if (pct === '20%') amount = asset.balance * 0.2;
    else if (pct === '75%') amount = asset.balance * 0.75;
    state.sources[idx].amount = Number(amount.toFixed(asset.token === 'ETH' ? 4 : 2));
    render();
  }

  function renderSourceList() {
    const list = $('#source-list');
    if (!list) return;
    const q = state.sourceQuery.toLowerCase();
    const chain = state.sourceChain;
    const tab = state.sourceTab;

    const items = D.SOURCE_ASSETS.filter((a) => {
      if (chain !== 'All chains' && a.chain && a.chain !== chain) return false;
      if (tab === 'Native' && a.token !== 'ETH') return false;
      if (tab === 'Stables' && a.token !== 'USDC' && a.token !== 'USDT') return false;
      if (tab === 'Custom') return false;
      const hay = `${a.token} ${a.chain || ''} unified`.toLowerCase();
      return !q || hay.includes(q);
    });

    list.innerHTML = items.map((a) => {
      const selected = state.sourcePickerSelected === a.id;
      const t = D.TOKENS[a.token];
      let chainLine = '';
      if (a.unified) {
        const imgs = (a.chains || []).slice(0, 3).map((c) => `<img src="${D.CHAINS[c].icon}" alt="">`).join('');
        chainLine = `<div class="token-list__chainline"><span class="chain-stack">${imgs}</span>${a.chains.length} chains</div>`;
      } else if (a.chain) {
        chainLine = `<div class="token-list__chainline"><img class="chain-mini" src="${D.CHAINS[a.chain].icon}" alt="">${a.chain}</div>`;
      }
      const badge = a.unified ? '<span class="badge badge--row">UNIFIED</span>' : '';
      return `
        <div class="token-list__row${selected ? ' is-selected' : ''}" data-id="${a.id}">
          <span class="token-list__radio"></span>
          <span class="token-list__mark"><img src="${t.icon}" alt=""></span>
          <div class="token-list__main">
            <div class="token-list__nameline"><span class="token-list__name">${a.token}</span>${badge}</div>
            ${chainLine}
          </div>
          <div class="token-list__right">
            <span class="num">${a.displayBalance}</span>
            <span class="sub">${a.displayUsd}</span>
          </div>
        </div>`;
    }).join('');
  }

  function renderDestList() {
    const list = $('#dest-list');
    if (!list) return;
    const q = state.destQuery.toLowerCase();
    const chain = state.destChain;
    const tab = state.destTab;

    const items = D.DEST_ASSETS.filter((a) => {
      if (chain !== 'All chains' && a.chain !== chain) return false;
      if (tab === 'Native' && a.token !== 'ETH') return false;
      if (tab === 'Stables' && a.token !== 'USDC' && a.token !== 'USDT') return false;
      const hay = `${a.token} ${a.chain} ${a.shortAddress || ''}`.toLowerCase();
      return !q || hay.includes(q);
    });

    list.innerHTML = items.map((a) => {
      const selected = state.destPickerSelected === a.id;
      const t = D.TOKENS[a.token];
      const hasMeta = !!a.meta;
      const showActions = a.shortAddress && (a.showContractActions || a.meta);
      const addrLine = a.shortAddress
        ? `<span>${a.shortAddress}</span>
           ${showActions ? `<button type="button" class="copy-btn" data-copy="${a.address}" aria-label="Copy">${COPY_SVG}</button><button type="button" class="info-btn" data-info="${a.id}" aria-label="Token details">${INFO_SVG}</button>` : ''}`
        : `<img class="chain-mini" src="${D.CHAINS[a.chain].icon}" alt=""> on ${a.chain}`;

      const tooltip = hasMeta ? `
        <div class="token-tooltip" id="tooltip-${a.id}">
          <div class="token-tooltip__head">
            <span class="token-list__mark"><img src="${t.icon}" alt=""></span>
            <div><div class="token-tooltip__name">${a.meta.name} on ${a.meta.chain}</div></div>
          </div>
          <dl>
            <dt>Symbol</dt><dd>${a.meta.symbol}</dd>
            <dt>Name</dt><dd>${a.meta.name}</dd>
            <dt>Chain</dt><dd>${a.meta.chain}</dd>
            <dt>Decimals</dt><dd>${a.meta.decimals}</dd>
            <dt>Contract</dt><dd>${a.meta.contract}</dd>
          </dl>
        </div>` : '';

      return `
        <div class="token-list__row${selected ? ' is-selected' : ''}" data-id="${a.id}">
          <span class="token-list__radio"></span>
          <span class="token-list__mark"><img src="${t.icon}" alt=""><span class="chain-badge" style="background-image:url('${D.CHAINS[a.chain].icon}')"></span></span>
          <div class="token-list__main">
            <div class="token-list__name">${a.token}</div>
            <div class="token-list__chainline">${addrLine}</div>
          </div>
          <div class="token-list__right">
            <span class="num">${a.displayBalance}</span>
            <span class="sub">${a.displayUsd}</span>
          </div>
          ${tooltip}
        </div>`;
    }).join('');
  }

  function renderConfirm(d) {
    $('#bind-confirm-send').textContent = fmtNum(d.sendUsd, 2);
    $('#bind-confirm-send-sub').textContent = `${d.activeSources.length} asset${d.activeSources.length === 1 ? '' : 's'}`;
    $('#bind-confirm-receive').textContent = fmtNum(d.receiveAmount, 2);
    $('#bind-confirm-receive-unit').textContent = d.dest ? d.dest.token : 'USDT';
    $('#bind-confirm-receive-sub').textContent = d.dest ? `on ${d.dest.chain}` : '';
    $('#bind-confirm-swap-tokens').textContent = d.tokensLabel;
    $('#bind-confirm-swap-usd').textContent = `${fmtNum(d.sendUsd, 2)} USD`;
    $('#bind-confirm-receive-line').textContent = d.dest ? `${d.dest.token} on ${d.dest.chain}` : '';
    $('#bind-confirm-receive-usd').textContent = `${fmtNum(d.receiveUsd, 2)} USD`;
    $('#bind-confirm-receive-amt').textContent = `${fmtNum(d.receiveAmount, 2)} ${d.dest ? d.dest.token : 'USDT'}`;
    $('#bind-min-received').textContent = `${d.minReceived} ${d.dest ? d.dest.token : 'USDT'}`;

    const details = $('#confirm-swap-details');
    if (details) {
      details.innerHTML = d.activeSources.map((s) => `
        <div class="confirm__send-line">
          <div class="confirm__send-line__left">
            <span class="token-list__mark" style="position:relative">${tokenMarkHtml(s.asset.token, s.asset.chain, 26)}</span>
            <div><div class="confirm__send-line__name">${s.asset.token}</div><div class="confirm__send-line__chain">${s.asset.chain || 'Unified'}</div></div>
          </div>
          <div class="confirm__send-line__right">
            <div class="confirm__send-line__amt">${fmtNum(s.amount, s.asset.token === 'ETH' ? 4 : 2)} ${s.asset.token}</div>
            <div class="confirm__send-line__usd">${fmtUsd(s.usd)}</div>
          </div>
        </div>`).join('');
    }
  }

  function renderInflight(d) {
    $('#bind-inflight-label').textContent = d.tokensLabel;
    $('#bind-inflight-usd').textContent = fmtUsd(d.sendUsd);
    $('#bind-inflight-amount').textContent = fmtNum(d.receiveAmount, 2);
    $('#bind-inflight-chain').textContent = d.dest ? `on ${d.dest.chain}` : '';
    const icon = $('#inflight-token-icon');
    if (icon && d.dest) icon.innerHTML = tokenIconHtml(d.dest.token, d.dest.chain, 34);

    const steps = D.INFLIGHT_STEPS;
    const active = steps[state.inflightStep] || steps[0];
    $('#bind-inflight-step-title').textContent = active.label;
    $('#bind-inflight-step-sub').textContent = active.sub;

    const indicator = $('#inflight-active-indicator');
    if (indicator) {
      indicator.innerHTML = `<svg class="inflight__step__indicator__ring" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" stroke="#E8E8EA" stroke-width="2" fill="none"/><path d="M11 3c4.418 0 8 3.582 8 8" stroke="#3D7BFF" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 11 11" to="360 11 11" dur="1s" repeatCount="indefinite"/></path></svg>`;
    }

    const list = $('#inflight-steps-list');
    if (list) {
      list.innerHTML = steps.map((step, i) => {
        const cls = i < state.inflightStep ? 'is-done' : i === state.inflightStep ? 'is-active' : 'is-pending';
        const ring = i < state.inflightStep
          ? '<div class="inflight__step__indicator__ring--full"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7l3 3 5-6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg></div>'
          : i === state.inflightStep
            ? '<svg class="inflight__step__indicator__ring" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" stroke="#E8E8EA" stroke-width="2" fill="none"/><path d="M11 3c4.418 0 8 3.582 8 8" stroke="#3D7BFF" stroke-width="2" stroke-linecap="round"/></svg>'
            : '<div class="inflight__step__indicator__ring--idle"></div>';
        return `
          <div class="inflight__step ${cls}">
            <div class="inflight__step__indicator">${ring}</div>
            <div><div class="inflight__step__label">${step.label}</div><div class="inflight__step__sub">${step.sub}</div></div>
            <span class="inflight__step__time">${i <= state.inflightStep ? (i < state.inflightStep ? 'Done' : '…') : ''}</span>
          </div>`;
      }).join('');
    }
  }

  function renderSuccess(d) {
    $('#bind-success-amount').textContent = fmtNum(d.receiveAmount, 2);
    $('#bind-success-symbol').textContent = d.dest ? d.dest.token : 'USDT';
    $('#bind-success-usd').textContent = `≈ ${fmtUsd(d.receiveUsd)}`;
    $('#bind-success-meta').textContent = d.dest ? `on ${d.dest.chain} · completed in 12s` : '';
    $('#bind-success-swapped').textContent = `${fmtNum(d.sendUsd, 2)} USD`;
    const icon = $('#success-token-icon');
    if (icon && d.dest) {
      icon.innerHTML = `${tokenIconHtml(d.dest.token, d.dest.chain, 64, { large: true })}<span class="success__check"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 6l2 2 4-4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg></span>`;
    }
  }

  function mountSourceTabs() {
    buildTabs('#source-tabs', D.tabs, state.sourceTab, (tab) => {
      state.sourceTab = tab;
      mountSourceTabs();
      renderSourceList();
    });
  }

  function mountDestTabs() {
    buildTabs('#dest-tabs', D.destTabs, state.destTab, (tab) => {
      state.destTab = tab;
      mountDestTabs();
      renderDestList();
    });
  }

  function mountSourceChains() {
    buildChainMenu('#source-chain-menu', '#source-chain-label', state.sourceChain, (c) => {
      state.sourceChain = c;
      mountSourceChains();
      renderSourceList();
    });
  }

  function mountDestChains() {
    buildChainMenu('#dest-chain-menu', '#dest-chain-label', state.destChain, (c) => {
      state.destChain = c;
      mountDestChains();
      renderDestList();
    });
  }

  function buildTabs(containerId, tabs, active, onSelect) {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = tabs.map((t) => `<button type="button" class="${t === active ? 'is-active' : ''}" data-tab="${t}">${t}</button>`).join('');
    el.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => onSelect(btn.dataset.tab));
    });
  }

  const GLOBE_SVG = '<svg class="chain-select__globe" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5.5" stroke="#161615" stroke-width="1.3"/><ellipse cx="7" cy="7" rx="2.5" ry="5.5" stroke="#161615" stroke-width="1.3"/><path d="M1.5 7h11" stroke="#161615" stroke-width="1.3"/></svg>';
  const COPY_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="#848483" stroke-width="1.2"/><path d="M3.5 9.5V3.5h6" stroke="#848483" stroke-width="1.2" stroke-linecap="round"/></svg>';
  const INFO_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#848483" stroke-width="1.2"/><path d="M7 6.2v3.2M7 4.8h.01" stroke="#848483" stroke-width="1.4" stroke-linecap="round"/></svg>';

  function buildChainMenu(menuId, labelId, current, onSelect) {
    const menu = $(menuId);
    const label = $(labelId);
    if (!menu) return;
    menu.innerHTML = D.chainList().map((c) => {
      const icon = c === 'All chains' ? GLOBE_SVG : `<img src="${D.CHAINS[c]?.icon || ''}" alt="">`;
      return `<div class="chain-select__item${c === current ? ' is-selected' : ''}" data-chain="${c}">${icon}${c}</div>`;
    }).join('');
    if (label) label.textContent = current;
    menu.querySelectorAll('.chain-select__item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(item.dataset.chain);
        item.closest('.chain-select').classList.remove('is-open');
      });
    });
  }

  function startInflight() {
    stopInflight();
    state.inflightStep = 0;
    render();
    startDotGrid();

    const steps = D.INFLIGHT_STEPS;
    function next() {
      if (state.screen !== 'inflight') return;
      if (state.inflightStep >= steps.length) {
        navigate('success');
        return;
      }
      const step = steps[state.inflightStep];
      state.inflightTimer = setTimeout(() => {
        state.inflightStep += 1;
        render();
        next();
      }, step.duration);
    }
    next();
  }

  function stopInflight() {
    if (state.inflightTimer) clearTimeout(state.inflightTimer);
    state.inflightTimer = null;
    stopDotGrid();
  }

  function startDotGrid() {
    const canvas = $('#inflight-canvas');
    if (!canvas) return;
    canvas.classList.add('inflight__dots--canvas');
    canvas.style.display = 'none';
    return;
    /* Paper uses animated GIF; canvas fallback below */
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cols = 28;
    const rows = 12;
    let t = 0;

    function draw() {
      if (state.screen !== 'inflight') return;
      ctx.clearRect(0, 0, w, h);
      const gap = 10;
      const r = 2.5;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = (x + 0.5) * (w / cols);
          const py = (y + 0.5) * (h / rows);
          const nx = (x / cols - 0.5) * 2;
          const ny = (y / rows - 0.5) * 2;
          const dist = Math.sqrt(nx * nx + ny * ny);
          const wave = Math.sin(dist * 4 - t * 2) * 0.5 + 0.5;
          const pulse = Math.max(0, 1 - dist * 1.2) * wave;
          const alpha = 0.12 + pulse * 0.75;
          const green = pulse > 0.35;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = green ? `rgba(27, 197, 122, ${alpha})` : `rgba(200, 210, 224, ${alpha * 0.5})`;
          ctx.fill();
        }
      }
      t += 0.04;
      state.dotAnim = requestAnimationFrame(draw);
    }
    draw();
  }

  function stopDotGrid() {
    if (state.dotAnim) cancelAnimationFrame(state.dotAnim);
    state.dotAnim = null;
  }

  function startConfetti() {
    const canvas = $('#confetti-canvas');
    const panel = $('#screen-success');
    if (!canvas || !panel) return;
    const rect = panel.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    const colors = ['#3D7BFF', '#1BC57A', '#FFD666', '#FF6B6B', '#9B59B6'];
    const pieces = Array.from({ length: 60 }, () => ({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 80,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 10 - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      w: 4 + Math.random() * 4,
      h: 8 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
    }));

    let frame = 0;
    function draw() {
      if (state.screen !== 'success' || frame > 120) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach((p) => {
        if (p.life <= 0) return;
        alive = true;
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.012;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame += 1;
      if (alive) state.confettiAnim = requestAnimationFrame(draw);
    }
    draw();
  }

  function stopConfetti() {
    if (state.confettiAnim) cancelAnimationFrame(state.confettiAnim);
    state.confettiAnim = null;
  }

  function setupConfirmToggles() {
    function toggleRow(rowId, btnId) {
      const row = $(rowId);
      const btn = $(btnId);
      if (!row || !btn) return;
      btn.addEventListener('click', () => {
        const open = row.classList.toggle('is-expanded');
        btn.classList.toggle('is-open', open);
        btn.innerHTML = `${open ? 'Hide' : 'View'} Details <svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
      });
    }
    toggleRow('#confirm-swap-row', '#toggle-swap-details');
    toggleRow('#confirm-fees-row', '#toggle-fees-details');
    toggleRow('#confirm-impact-row', '#toggle-impact-details');
  }

  function setupDevBar() {
    if (params.get('dev') === '1') document.body.classList.add('is-dev');
    const bar = $('#devbar');
    if (!bar) return;
    const screens = SCREENS.map((s, i) => `<button type="button" data-screen="${s}">${i + 1}. ${s}</button>`).join('');
    bar.innerHTML = screens + '<button type="button" id="dev-reset-onboarding">Reset tour</button>';
    bar.querySelectorAll('[data-screen]').forEach((btn) => {
      btn.addEventListener('click', () => navigate(btn.dataset.screen, { skipTransition: true }));
    });
    $('#dev-reset-onboarding')?.addEventListener('click', resetOnboarding);
    const step = params.get('step');
    if (step && STEP_MAP[Number(step)]) navigate(STEP_MAP[Number(step)], { skipTransition: true });
  }

  function bindEvents() {
    $('#coach-skip')?.addEventListener('click', completeOnboarding);
    $('#coach-next')?.addEventListener('click', () => {
      if (state.onboardingStep === ONBOARDING_STEPS.length) {
        completeOnboarding();
        return;
      }
      advanceOnboarding();
    });

    window.addEventListener('resize', () => {
      if (shouldShowOnboarding()) renderOnboarding();
    });

    $('#btn-add-asset')?.addEventListener('click', () => {
      if (state.onboardingStep === 1) {
        goToOnboardingStep(2);
        return;
      }
      navigate('source');
      renderSourceList();
    });
    $('#btn-receive-token')?.addEventListener('click', () => {
      if (state.onboardingStep === 3) {
        goToOnboardingStep(4);
        return;
      }
      navigate('dest');
      renderDestList();
    });
    $('#btn-review')?.addEventListener('click', () => {
      if (state.onboardingStep === 3) {
        const d = derive();
        if (d.sendUsd <= 0 && state.sources[0]?.assetId) {
          const asset = D.getAsset(state.sources[0].assetId, D.SOURCE_ASSETS);
          const token = asset ? D.TOKENS[asset.token] : null;
          if (token) state.sources[0].amount = 100 / token.priceUsd;
        }
        navigate('confirm');
        goToOnboardingStep(5, { navigateToStepScreen: false });
        return;
      }
      navigate('confirm');
    });
    $('#btn-swap-now')?.addEventListener('click', () => navigate('inflight'));
    $('#btn-success-done')?.addEventListener('click', () => {
      state.inflightStep = 0;
      navigate('home', { skipTransition: true });
    });

    $('#source-back')?.addEventListener('click', () => navigate('home'));
    $('#source-close')?.addEventListener('click', () => navigate('home'));
    $('#dest-back')?.addEventListener('click', () => navigate('home'));
    $('#dest-close')?.addEventListener('click', () => navigate('home'));
    $('#confirm-back')?.addEventListener('click', () => navigate('home'));
    $('#confirm-close')?.addEventListener('click', () => navigate('home'));
    $('#success-close')?.addEventListener('click', () => navigate('home'));

    $('#source-done')?.addEventListener('click', () => {
      const wasEmpty = isEmptyHome();
      const exists = state.sources.some((s) => s.assetId === state.sourcePickerSelected);
      if (wasEmpty) {
        applyOnboardingSourceSelection();
      } else if (!exists) {
        state.sources.push({ assetId: state.sourcePickerSelected, amount: 0 });
      }
      if (state.onboardingStep === 2) {
        goToOnboardingStep(3);
        return;
      }
      navigate('home');
    });
    $('#dest-done')?.addEventListener('click', () => {
      state.destinationId = state.destPickerSelected;
      if (state.onboardingStep === 4) {
        const d = derive();
        if (d.sendUsd <= 0 && state.sources[0]?.assetId) {
          const asset = D.getAsset(state.sources[0].assetId, D.SOURCE_ASSETS);
          const token = asset ? D.TOKENS[asset.token] : null;
          if (token) state.sources[0].amount = 100 / token.priceUsd;
        }
        navigate('confirm');
        goToOnboardingStep(5, { navigateToStepScreen: false });
        return;
      }
      navigate('home');
    });

    $('#source-search')?.addEventListener('input', (e) => {
      state.sourceQuery = e.target.value;
      renderSourceList();
    });
    $('#dest-search')?.addEventListener('input', (e) => {
      state.destQuery = e.target.value;
      renderDestList();
    });

    $('#source-list')?.addEventListener('click', (e) => {
      const row = e.target.closest('.token-list__row');
      if (!row) return;
      state.sourcePickerSelected = row.dataset.id;
      renderSourceList();
    });
    $('#dest-list')?.addEventListener('click', (e) => {
      if (e.target.closest('.copy-btn')) {
        const addr = e.target.closest('.copy-btn').dataset.copy;
        navigator.clipboard?.writeText(addr);
        return;
      }
      if (e.target.closest('.info-btn')) {
        const id = e.target.closest('.info-btn').dataset.info;
        const tip = $(`#tooltip-${id}`);
        $$('.token-tooltip').forEach((t) => t.classList.remove('is-open'));
        tip?.classList.add('is-open');
        return;
      }
      const row = e.target.closest('.token-list__row');
      if (!row) return;
      state.destPickerSelected = row.dataset.id;
      renderDestList();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.chain-select')) {
        $$('.chain-select.is-open').forEach((el) => el.classList.remove('is-open'));
      }
      if (!e.target.closest('.info-btn') && !e.target.closest('.token-tooltip')) {
        $$('.token-tooltip').forEach((t) => t.classList.remove('is-open'));
      }
    });

    ['#source-chain-select', '#dest-chain-select'].forEach((sel) => {
      $(sel)?.addEventListener('click', (e) => {
        e.stopPropagation();
        $(sel).classList.toggle('is-open');
      });
    });

    $('#inflight-steps-toggle')?.addEventListener('click', () => {
      state.inflightExpanded = !state.inflightExpanded;
      $('#inflight-steps').classList.toggle('is-open', state.inflightExpanded);
    });

    $('#btn-edit-recipient')?.addEventListener('click', () => {
      const input = $('#recipient-input');
      if (!input) return;
      input.focus();
      input.select();
    });

    $('#home-send-rows')?.addEventListener('click', (e) => {
      const pick = e.target.closest('[data-action="pick-source"]');
      if (pick) {
        state.sourcePickerSelected = state.sources[Number(pick.dataset.idx)]?.assetId || state.sourcePickerSelected;
        navigate('source');
        renderSourceList();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.focusedRowIdx !== null) clearFocusedRow();
    });
  }

  function init() {
    if (params.get('reset-onboarding') === '1') {
      localStorage.removeItem(D.ONBOARDING_STORAGE_KEY);
    }
    if (params.get('demo') === 'paper') {
      state.sources = D.DEFAULT_SOURCES.map((s) => ({ ...s }));
      state.destinationId = D.DEFAULT_DEST;
      state.onboardingStep = null;
    } else if (!isOnboardingComplete()) {
      state.sources = D.EMPTY_SOURCES.map((s) => ({ ...s }));
      state.destinationId = null;
      state.onboardingStep = 1;
    }

    mountSourceTabs();
    mountDestTabs();
    mountSourceChains();
    mountDestChains();

    setupConfirmToggles();
    setupDevBar();
    bindEvents();
    render();
    renderSourceList();
    renderDestList();
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } catch (err) {
    console.error(err);
    showBootError(`Prototype error: ${err.message}. Check the browser console for details.`);
  }
})();
