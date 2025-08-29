document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || '';
    const min_price = params.get('min_price') || '';
    const max_price = params.get('max_price') || '';
    const period = params.get('period') || '';
    const selectedCategory = params.get('event_type') || ''; // Lấy category từ URL
    const token = localStorage.getItem('access_token');
    let apiUrl = `http://127.0.0.1:8000/events/search/?`

    if (name) apiUrl += `name=${encodeURIComponent(name)}&`;
    if (min_price) apiUrl += `min_price=${min_price}&`;
    if (max_price) apiUrl += `max_price=${max_price}&`;
    if (period) apiUrl += `period=${period}&`;
    if (selectedCategory) apiUrl += `event_type=${selectedCategory}&`;
    try {
        const res = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.statusCode === 200) {
            renderEventGrid(json.data);
        } else {
            document.getElementById('searchResults').innerHTML = `<p>Không tìm thấy sự kiện nào.</p>`;
        }
    } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
    }
});

function renderEventGrid(events) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';

    events.forEach(ev => {
        const card = `
            <div class="event-card">
            <img src="${ev.image?.startsWith('http') ? ev.image : `${cloudinaryBase}/` + ev.image}" alt="${ev.name}">
            <h3>${ev.name}</h3>
            <a href="event-detail.html?id=${ev.id}">Xem chi tiết</a>
            </div>
        `;
        container.innerHTML += card;
    });
}
