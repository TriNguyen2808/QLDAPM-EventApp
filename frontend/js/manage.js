document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('eventForm');
  const list = document.getElementById('eventList');

  async function loadEvents() {
    const data = await apiGet('/events/?mine=true');
    list.innerHTML = data.map(e => `
      <div>
        <b>${e.name}</b> (${formatDate(e.start_time)})
        <button onclick="deleteEvent(${e.id})">Xóa</button>
      </div>
    `).join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch(`${apiBase}/events/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await loadEvents();
  });

  window.deleteEvent = async (id) => {
    await fetch(`${apiBase}/events/${id}/`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    await loadEvents();
  };

  await loadEvents();
});