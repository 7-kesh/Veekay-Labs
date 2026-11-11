export async function render(params, el) {
  el.innerHTML = `
    <div class="head"><div><h1>Intraday</h1><p class="muted">Your intraday trading workspace.</p></div></div>
    <div class="cols">
      <section class="card"><h2>Equity intraday journal</h2>
        <p>Record entries, exits, risk, setups, execution quality, screenshots and post-trade reviews.</p>
        <a class="btn primary" href="#/scalp">Open intraday trades</a>
      </section>
      <section class="card"><h2>Intraday trade plans</h2>
        <p>Keep advanced instrument planning, risk metrics and trade Greeks in the same Intraday workspace.</p>
        <a class="btn primary" href="#/options">Open trade plans</a>
      </section>
    </div>
  `;
}
