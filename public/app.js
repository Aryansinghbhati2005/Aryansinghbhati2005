const formatPercent = value => `${(Number(value) * 100).toFixed(1)}%`;

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response.json();
}

function renderMetrics(metrics) {
  document.getElementById('rows').textContent = Number(metrics.rows).toLocaleString();
  document.getElementById('fraudRate').textContent = formatPercent(metrics.fraud_rate);
  document.getElementById('avgPrecision').textContent = formatPercent(metrics.average_precision);
  document.getElementById('riskScore').textContent = formatPercent(metrics.roc_auc);

  const maxImportance = Math.max(...metrics.top_risk_features.map(item => item.importance));
  document.getElementById('features').innerHTML = metrics.top_risk_features
    .map(item => {
      const width = Math.round((item.importance / maxImportance) * 100);
      return `
        <div class="feature-row">
          <strong>${item.feature.replaceAll('_', ' ')}</strong>
          <div class="bar"><span style="width:${width}%"></span></div>
          <span>${Math.round(item.importance * 100)}%</span>
        </div>
      `;
    })
    .join('');
}

function renderPipeline(pipeline) {
  document.getElementById('pipelineList').innerHTML = pipeline.stages
    .map(stage => `<li>${stage}</li>`)
    .join('');
}

async function init() {
  try {
    const [metrics, pipeline] = await Promise.all([loadJson('/api/metrics'), loadJson('/api/pipeline')]);
    renderMetrics(metrics);
    renderPipeline(pipeline);
  } catch (error) {
    console.error(error);
  }
}

init();
