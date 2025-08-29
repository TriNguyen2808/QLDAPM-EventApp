document.addEventListener('DOMContentLoaded', async () => {
  const report = document.getElementById('reportData');
  const data = await apiGet('/reports/');
  report.innerHTML = data.map(r => `
    <div>
      <b>${r.event_name}</b>: ${r.total_ticket} vé bán ra - Doanh thu: ${r.total_revenue}đ
    </div>
  `).join('');
});