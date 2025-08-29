// ================= CHI TIẾT SỰ KIỆN =================

async function apiGetEventTicketClasses(eventId) {
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${apiBase}/events/${eventId}/ticketclasses/`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw new Error(`Lỗi khi lấy danh sách vé: ${res.status}`);

        const json = await res.json();

        if (json.statusCode === 200 && Array.isArray(json.data)) {
            return json.data;
        } else {
            console.warn("API trả về dữ liệu không đúng định dạng", json);
            return [];
        }
    } catch (err) {
        console.error("apiGetEventTicketClasses error:", err);
        return [];
    }
}

async function getLowestTicketPrice(eventId) {
    const tickets = await apiGetEventTicketClasses(eventId);
    if (!tickets.length) return null;

    return tickets.reduce((min, ticket) => {
        const price = Number(ticket.price);
        return price < min ? price : min;
    }, Number(tickets[0].price));
}

async function fetchEventDetail(eventId) {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${apiBase}/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Lỗi khi lấy dữ liệu sự kiện");
    const ev = await res.json();
    return ev;
}

async function renderEventDetail(ev) {
    // Xử lý hiển thị địa chỉ
    let displayAddress = ev.location;
    try {
        const urlObj = new URL(ev.location);
        if (urlObj.searchParams.has('query')) {
            displayAddress = decodeURIComponent(
                urlObj.searchParams.get('query').replace(/\+/g, ' ')
            );
        }
    } catch (e) {
        // Không phải URL hợp lệ, bỏ qua
    }

    // Lấy giá thấp nhất
    const lowestPrice = await getLowestTicketPrice(ev.id);

    // Helper để cập nhật textContent an toàn
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // Helper cập nhật innerHTML an toàn
    function setHTML(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    // Helper cập nhật src an toàn
    function setSrc(id, src) {
        const el = document.getElementById(id);
        if (el && el.tagName === 'IMG') el.src = src;
    }

    setText('event-price', lowestPrice ? lowestPrice.toLocaleString('vi-VN') + ' đ' : 'Liên hệ');
    setText('event-title', ev.name);
    setText('event-date', `${new Date(ev.start_time).toLocaleString('vi-VN')} - ${new Date(ev.end_time).toLocaleString('vi-VN')}`);
    setHTML('event-location', `${displayAddress} (<a href="${ev.location}" target="_blank">Xem bản đồ</a>)`);
    setSrc('event-image', ev.image?.startsWith('http') ? ev.image : `${cloudinaryBase}/` + ev.image);
    setText('event-description', ev.description || '');

    // Render danh sách vé
    const tickets = await apiGetEventTicketClasses(ev.id);
    const ticketList = document.getElementById('ticket-list');
    if (ticketList) {
        ticketList.innerHTML = '';
        tickets.forEach(ticket => {
            const div = document.createElement('div');
            div.classList.add('ticket-item');
            div.innerHTML = `
                <span>${ticket.name} (${ticket.type})</span>
                <span class="price">${Number(ticket.price).toLocaleString('vi-VN')} đ</span>
                <span class="available">Còn ${ticket.total_available} vé</span>
            `;
            ticketList.appendChild(div);
        });
    }

    // Thông tin tổ chức
    if (ev.user) {
        const organizer = await apiGetUser(ev.user);
        if (organizer) {
            setSrc('organizer-logo',
                organizer.avatar?.startsWith('http') ? organizer.avatar :
                (organizer.avatar ? '${cloudinaryBase}/' + organizer.avatar : '')
            );
            setText('organizer-name', organizer.username || '');

            if (organizer.email) {
                const emailContainer = document.getElementById('organizer-email');
                if (emailContainer) {
                    // Clear cũ nếu có
                    emailContainer.innerHTML = '';
                    const emailEl = document.createElement('p');
                    emailEl.textContent = organizer.email;
                    emailContainer.appendChild(emailEl);
                }
            }
        }
    }
}

async function loadAndRenderEventDetail() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    if (!eventId) {
        const titleEl = document.getElementById('event-title');
        if (titleEl) titleEl.textContent = "Không tìm thấy sự kiện.";
        return;
    }

    try {
        const ev = await fetchEventDetail(eventId);
        await renderEventDetail(ev);
    } catch (err) {
        console.error(err);
        const titleEl = document.getElementById('event-title');
        if (titleEl) titleEl.textContent = "Không thể tải sự kiện.";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra nếu là trang event-detail.html thì gọi loadAndRenderEventDetail
    if (window.location.pathname.endsWith('event-detail.html')) {
        loadAndRenderEventDetail();
    } else {
        // Nếu không phải trang detail, lấy eventId và fetch dữ liệu (ví dụ, bạn có thể dùng để preload, hoặc log)
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('id');
        if (eventId) {
            fetchEventDetail(eventId)
                .then(ev => {
                    console.log('Dữ liệu sự kiện:', ev);
                    // Bạn có thể xử lý thêm nếu cần
                })
                .catch(err => console.error(err));
        }
    }

    // Gắn sự kiện cho nút "Mua vé ngay"
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (eventId) {
                window.location.href = `booking.html?id=${eventId}`;
            } else {
                alert("Không tìm thấy ID sự kiện");
            }
        });
    });
});
