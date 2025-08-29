// ======== SỰ KIỆN HOT ========
let hotEvents = [];
let hotPage = 0;
const hotPerPage = 5;

async function loadHotEvents() {
    try {
        const res = await fetch(`${apiBase}/events/hot`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const data = await res.json();
        hotEvents = data.data || [];

        renderHotSlider();

        const showNav = hotEvents.length > hotPerPage;
        document.getElementById('hotPrevBtn').style.display = showNav ? 'block' : 'none';
        document.getElementById('hotNextBtn').style.display = showNav ? 'block' : 'none';
    } catch (err) {
        console.error('Lỗi tải sự kiện hot:', err);
    }
}

function renderHotSlider() {
    const container = document.getElementById('hotSliderContainer');
    container.innerHTML = hotEvents.map(e => `
        <div class="hot-event-card">
            <img src="${e.image?.startsWith('http') ? e.image : `${cloudinaryBase}/` + e.image}" alt="${e.name}">
            <h3>${e.name}</h3>
            <a href="event-detail.html?id=${e.id}">Xem chi tiết</a>
        </div>
    `).join('');
    updateHotSlide();
}

function updateHotSlide() {
    const container = document.getElementById('hotSliderContainer');
    container.style.transform = `translateX(-${hotPage * 100}%)`;
}

function nextHotSlide() {
    if ((hotPage + 1) * hotPerPage < hotEvents.length) {
        hotPage++;
        updateHotSlide();
    }
}

function prevHotSlide() {
    if (hotPage > 0) {
        hotPage--;
        updateHotSlide();
    }
}

// ======== DANH SÁCH SỰ KIỆN ========
let currentPage = 1;
let totalPages = 1;

async function loadEvents(page = 1) {
    try {
        const res = await fetch(`${apiBase}/events/?page=${page}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const data = await res.json();

        const events = data.results || [];
        totalPages = Math.ceil(data.count / 5);
        currentPage = page;

        renderEventGrid(events);
        renderPagination();
    } catch (err) {
        console.error('Lỗi tải sự kiện:', err);
    }
}

function renderEventGrid(events) {
    const grid = document.getElementById('eventList');
    grid.innerHTML = events.map(e => `
        <div class="event-card">
            <img src="${e.image?.startsWith('http') ? e.image : `${cloudinaryBase}/` + e.image}" alt="${e.name}">
            <h3>${e.name}</h3>
            <a href="event-detail.html?id=${e.id}">Xem chi tiết</a>
        </div>
    `).join('');
}

function renderPagination() {
    const container = document.getElementById('pagination');
    container.innerHTML = `
        <button ${currentPage <= 1 ? 'disabled' : ''} onclick="loadEvents(${currentPage - 1})">Trang trước</button>
        <span>Trang ${currentPage} / ${totalPages}</span>
        <button ${currentPage >= totalPages ? 'disabled' : ''} onclick="loadEvents(${currentPage + 1})">Trang sau</button>
    `;
}

// ================= LOẠI SỰ KIỆN =================
async function loadEventTypes() {
    try {
        const res = await fetch(`${apiBase}/eventtypes/`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const eventTypes = await res.json();

    } catch (error) {
        console.error('Lỗi tải loại sự kiện:', error);
    }
}

async function loadEventsByType(eventType) {
    try {
        const res = await fetch(`${apiBase}/events/search/?event_type=${encodeURIComponent(eventType)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const data = await res.json();
        const events = data.results || [];

        renderEventGrid(events);
        document.getElementById('pagination').innerHTML = '';
    } catch (error) {
        console.error('Lỗi tải sự kiện theo loại:', error);
    }
}

