/* File Overview: frontend/js/compare.js — compare for frontend UI behavior. */
const COMPARE_KEY = 'fixio-compare-services';
const COMPARE_SNAPSHOT_KEY = 'fixio-compare-snapshot';

window.addEventListener('DOMContentLoaded', initComparePage);

async function initComparePage() {
  const serviceIds = getSelectedIds();
  if (serviceIds.length < 2) {
    document.getElementById('compare-root').innerHTML = `
      <div class="card">
        <h3>Select at least two services to compare</h3>
        <p>Add services from the home page comparison buttons, then come back here.</p>
        <button class="btn-primary" onclick="window.location.href='/'">Go Home</button>
      </div>
    `;
    return;
  }

  const results = await Promise.all(serviceIds.map((serviceId) => getServiceById(serviceId).catch(() => ({ success: false }))));
  const apiServices = results.filter((result) => result.success).map((result) => result.service);

  const snapshotById = new Map(getCompareSnapshot().map((item) => [String(item._id), item]));
  const mergedServices = serviceIds
    .map((serviceId) => {
      const apiItem = apiServices.find((item) => String(item._id) === String(serviceId));
      return apiItem || snapshotById.get(String(serviceId));
    })
    .filter(Boolean);

  const services = mergedServices;

  if (services.length < 2) {
    document.getElementById('compare-root').innerHTML = `
      <div class="card">
        <h3>Could not load enough services</h3>
        <p>One or more selected services are unavailable.</p>
        <button class="btn-primary" onclick="window.location.href='/'">Back Home</button>
      </div>
    `;
    return;
  }

  renderComparison(services);
}

function getCompareSnapshot() {
  return JSON.parse(localStorage.getItem(COMPARE_SNAPSHOT_KEY) || '[]')
    .map((item) => item || {})
    .filter((item) => item && item._id);
}

function getSelectedIds() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('ids');
  if (raw) {
    return raw.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3);
  }

  return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]').filter(Boolean).slice(0, 3);
}

function clearCompareSelection() {
  localStorage.removeItem(COMPARE_KEY);
  window.location.href = '/';
}

function renderComparison(services) {
  const compareRoot = document.getElementById('compare-root');
  const bestPrice = Math.min(...services.map((service) => Number(service.price || 0)));
  const bestRating = Math.max(...services.map((service) => Number(service.rating || 0)));

  compareRoot.innerHTML = `
    <div class="grid two">
      ${services.map((service) => `
        <article class="card" style="display:grid; gap:12px;">
          <img src="${getServiceImage(service)}" alt="${service.name}" style="width:100%; height:220px; object-fit:cover; border-radius:10px;" />
          <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; align-items:center;">
            <h3 style="margin:0;">${service.name}</h3>
            <span class="chip">${service.category || 'General'}</span>
          </div>
          <p style="margin:0; color:#b5c8e7;">${service.description}</p>
          <div style="display:grid; gap:8px;">
            <p><strong>Price:</strong> $${service.price} ${Number(service.price || 0) === bestPrice ? '<span class="chip">Best price</span>' : ''}</p>
            <p><strong>Rating:</strong> ${Number(service.rating || 0).toFixed(1)} ${Number(service.rating || 0) === bestRating ? '<span class="chip">Top rated</span>' : ''}</p>
            <p><strong>ETA:</strong> ${service.eta}</p>
            <p><strong>Provider:</strong> ${service.providerName || 'FIXIO network'}</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-primary" onclick="window.location.href='/service?id=${service._id}'">Open service</button>
            <button class="btn-ghost" onclick="window.location.href='/'">Compare more</button>
          </div>
        </article>
      `).join('')}
    </div>

    <div class="card" style="margin-top:16px;">
      <h3 style="margin-top:0;">Quick summary</h3>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Metric</th>
              ${services.map((service) => `<th>${service.name}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Price</td>
              ${services.map((service) => `<td>$${service.price}</td>`).join('')}
            </tr>
            <tr>
              <td>Rating</td>
              ${services.map((service) => `<td>${Number(service.rating || 0).toFixed(1)}</td>`).join('')}
            </tr>
            <tr>
              <td>ETA</td>
              ${services.map((service) => `<td>${service.eta}</td>`).join('')}
            </tr>
            <tr>
              <td>Category</td>
              ${services.map((service) => `<td>${service.category || 'General'}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}
