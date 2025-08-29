let selectedCategory = '';
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('../header.html');
        const html = await res.text();
        document.body.insertAdjacentHTML('afterbegin', html);

        // Ẩn ô tìm kiếm nếu trang hiện tại là booking.html
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'booking.html') {
            const searchBox = document.querySelector('.search-box');
            if (searchBox) searchBox.style.display = 'none';
        }

        // Lúc này #authLinks chắc chắn có
        if (typeof renderUserInfo === 'function') renderUserInfo();
        if (typeof renderMenuByRole === 'function') renderMenuByRole();

        initHeaderEvents();
    } catch (err) {
        console.error('Không thể load header:', err);
    }
});

// Hàm init sau khi header.html load xong
function initHeaderEvents() {
    const searchBtn = document.getElementById('btnSearch');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // Khi focus vào ô tìm kiếm → hiện dropdown
    const searchInput = document.getElementById('searchInput');
    const dropdown = document.getElementById('searchDropdown');
    if (searchInput && dropdown) {
        searchInput.addEventListener('focus', () => {
            dropdown.classList.remove('hidden');
            loadRecentSearches();
            loadCategorySuggest();
            loadEventSuggest();
        });

        // Click ra ngoài → ẩn dropdown
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== searchInput) {
                dropdown.classList.add('hidden');
            }
        });
    }
}

// Hàm gọi API tìm kiếm
async function handleSearch() {
    const keywordEl = document.getElementById('searchInput');
    const minPriceEl = document.getElementById('minPrice');
    const maxPriceEl = document.getElementById('maxPrice');
    const periodEl = document.getElementById('periodSelect');

    if (!keywordEl) return;

    const keyword = keywordEl.value.trim();
    const minPrice = minPriceEl?.value.trim() || '';
    const maxPrice = maxPriceEl?.value.trim() || '';
    const period = periodEl?.value || '';
    const eventType = selectedCategory; // Gán đúng key cần gửi

    if (!keyword && !minPrice && !maxPrice && !period && !eventType) {
        alert("Vui lòng nhập từ khóa hoặc chọn bộ lọc");
        return;
    }

    if (keyword) saveRecentSearch(keyword);
    if (eventType) saveRecentSearch(eventType);

    const searchParams = new URLSearchParams();
    if (keyword) searchParams.set('name', keyword);
    if (minPrice) searchParams.set('min_price', minPrice);
    if (maxPrice) searchParams.set('max_price', maxPrice);
    if (period) searchParams.set('period', period);
    if (eventType) searchParams.set('event_type', eventType);

    window.location.href = `search.html?${searchParams.toString()}`;
}




// Hiển thị kết quả
function getFullImageUrl(path) {
    if (!path) return 'default.jpg';
    if (path.startsWith('http')) return path;
    return `${cloudinaryBase}/${path}`;
}

/* ====== Lịch sử tìm kiếm ====== */
function loadRecentSearches() {
    const listEl = document.getElementById('recentList');
    if (!listEl) return;
    const recent = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    listEl.innerHTML = recent.map(r => `<li>${r}</li>`).join('');
}

function saveRecentSearch(keyword) {
    let recent = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    recent = [keyword, ...recent.filter(k => k !== keyword)].slice(0, 5);
    localStorage.setItem('recent_searches', JSON.stringify(recent));
}

/* ====== Gợi ý ====== */
async function loadCategorySuggest() {
    const container = document.getElementById('categoryList');
    if (!container) return;

    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${apiBase}/eventtypes/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const types = await res.json();

        container.innerHTML = ''; // Xoá cũ

        types.forEach(t => {
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerText = t.name;

            div.addEventListener('click', () => {
                // Gán giá trị loại sự kiện
                selectedCategory = t.name;

                // Xoá class 'selected' khỏi tất cả
                const allItems = container.querySelectorAll('.category-item');
                allItems.forEach(item => item.classList.remove('selected'));

                // Gán class 'selected' cho item đang click
                div.classList.add('selected');

                // Focus lại vào ô tìm kiếm
                document.getElementById('searchInput')?.focus();
            });

            container.appendChild(div);
        });

    } catch (err) {
        console.error("Lỗi tải loại sự kiện:", err);
    }
}



async function loadEventSuggest() {
    const container = document.getElementById('eventSuggestList');
    if (!container) return;
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${apiBase}/events/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        const events = json.data || [];
    } catch (err) {
        console.error("Lỗi tải sự kiện gợi ý:", err);
    }
}

