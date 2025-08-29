let currentPage = 1;
const pageSize = 5; // API đang trả mặc định 5 sự kiện mỗi trang

document.addEventListener("DOMContentLoaded", async () => {
    await loadEvents(currentPage);

    const createBtn = document.getElementById("create-event-btn");
    if (createBtn) {
        createBtn.addEventListener("click", () => {
            window.location.href = "create-event.html";
        });
    }
});

async function loadEvents() {
    const token = localStorage.getItem("access_token");
    let allEvents = [];
    let url = `${apiBase}/events/`;
    console.log("Loading events from:", url);
    try {
        while (url) {
            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Lỗi khi lấy danh sách sự kiện");

            const data = await res.json();

            // Gộp dữ liệu sự kiện vào mảng allEvents
            allEvents = allEvents.concat(data.results || []);

            // Cập nhật URL sang trang kế tiếp
            url = data.next; // Nếu API trả về next là null thì vòng lặp dừng
        }

        renderEvents(allEvents);

    } catch (err) {
        console.error(err);
    }
}


function renderEvents(events) {
    const eventList = document.getElementById("event-list");
    if (!eventList) return;

    eventList.innerHTML = "";

    // Mỗi trang là 1 dòng
    const row = document.createElement("div");
    row.className = "event-row";

    events.forEach(ev => {
        const card = document.createElement("div");
        card.className = "event-card";
        card.innerHTML = `
            <img src="${ev.image?.startsWith('http') ? ev.image : `${cloudinaryBase}/` + ev.image}" alt="${ev.name}">
            <h3>${ev.name}</h3>
            <button data-id="${ev.id}" class="detail-btn">Xem chi tiết</button>
        `;
        row.appendChild(card);
    });

    eventList.appendChild(row);

    // Gắn sự kiện cho nút "Xem chi tiết"
    document.querySelectorAll(".detail-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const eventId = btn.getAttribute("data-id");
            if (eventId) {
                window.location.href = `event-update-delete.html?id=${eventId}`;
            }
        });
    });
}

function updatePageInfo(data) {
    const pageInfo = document.getElementById("page-info");
    if (pageInfo) {
        pageInfo.textContent = `Trang ${currentPage}`;
    }
}
