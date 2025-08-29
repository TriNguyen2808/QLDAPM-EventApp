const token = localStorage.getItem("access_token");
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get("id");

document.addEventListener("DOMContentLoaded", async () => {
    if (!eventId) {
        alert("Không tìm thấy ID sự kiện");
        return;
    }

    await loadEventDetail();
    await loadTicketClasses();

    document.getElementById("update-btn").addEventListener("click", updateEvent);
    document.getElementById("delete-btn").addEventListener("click", deleteEvent);
    document.getElementById("add-ticket-btn").addEventListener("click", addEmptyTicketRow);
    // document.getElementById("event-image-upload").addEventListener("change", handleImageUpload);

    document.getElementById("event-image-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      document.getElementById("event-image-preview").src = URL.createObjectURL(file);
    }
  });
});

async function loadEventDetail() {
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${apiBase}/events/${eventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Lỗi khi lấy dữ liệu sự kiện");
        const ev = await res.json();

        // Gán thông tin cơ bản
        document.getElementById("event-name").value = ev.name || "";
        document.getElementById("event-description").value = ev.description || "";
        document.getElementById("event-start").value = ev.start_time ? ev.start_time.slice(0, 16) : "";
        document.getElementById("event-end").value = ev.end_time ? ev.end_time.slice(0, 16) : "";
        // document.getElementById("event-image").value = ev.image || "";
        document.getElementById("event-type").innerHTML = `<option>${ev.event_type || ""}</option>`;
        updateImagePreview(ev.image || "");

        // Lấy địa chỉ từ URL Google Maps
        if (ev.location) {
            try {
                const url = new URL(ev.location);
                const queryAddress = decodeURIComponent(url.searchParams.get("query") || "");

                // Gán địa chỉ vào input
                document.getElementById("event-location").value = queryAddress;

                // Hiển thị trên bản đồ
                showOnMap(queryAddress);
            } catch (e) {
                console.warn("Không parse được location:", e);
                document.getElementById("event-location").value = ev.location; // fallback
            }
        }

    } catch (err) {
        console.error(err);
    }
}

// Hàm hiển thị địa chỉ trên bản đồ OpenStreetMap
async function showOnMap(address) {
    async function searchLocation(query) {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        return await res.json();
    }

    try {
        let results = await searchLocation(address);
        let isApproximate = false;

        // Nếu không tìm thấy, thử lại với phần trước dấu phẩy
        if (results.length === 0 && address.includes(',')) {
            const shortAddress = address.split(',')[0];
            results = await searchLocation(shortAddress);
            if (results.length > 0) {
                isApproximate = true;
            }
        }

        if (results.length > 0) {
            const lat = results[0].lat;
            const lon = results[0].lon;

            if (!window.leafletMap) {
                window.leafletMap = L.map('map').setView([lat, lon], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(window.leafletMap);
            } else {
                window.leafletMap.setView([lat, lon], 15);
            }

            if (window.marker) {
                window.leafletMap.removeLayer(window.marker);
            }

            let popupText = address;
            if (isApproximate) {
                popupText = `Không tìm thấy vị trí chính xác trên bản đồ, trên đây là vị trí tương đối: ${address}`;
            }

            window.marker = L.marker([lat, lon]).addTo(window.leafletMap)
                .bindPopup(popupText).openPopup();

        } else {
            console.warn("Không tìm thấy vị trí trên bản đồ:", address);
        }
    } catch (err) {
        console.error("Lỗi hiển thị bản đồ:", err);
    }
}

const eventTypeSelect = document.getElementById("event-type");
let eventTypesLoaded = false;

eventTypeSelect.addEventListener("click", async () => {
    if (eventTypesLoaded) return; // Chỉ tải một lần

    try {
        const res = await fetch(`${apiBase}/eventtypes/`);
        if (!res.ok) throw new Error("Không thể tải loại sự kiện");

        const data = await res.json();

        // Duyệt dữ liệu API và thêm vào select
        data.forEach((type) => {
            const option = document.createElement("option");
            option.value = type.name; // Giá trị là tên loại
            option.textContent = type.name; // Hiển thị tên loại
            eventTypeSelect.appendChild(option);
        });

        eventTypesLoaded = true;
    } catch (err) {
        console.error("Lỗi tải loại sự kiện:", err);
    }
});

function createTicketRow(ticket, isNew = false) {
    const div = document.createElement("div");
    div.className = "ticket-item";
    if (isNew) div.classList.add("new-ticket");
    if (ticket?.id) div.dataset.ticketId = ticket.id;

    div.innerHTML = `
        <input type="text" value="${ticket?.name || ""}" placeholder="Tên loại vé">
        <input type="text" value="${ticket?.type || ""}" placeholder="Loại">
        <input type="number" value="${ticket?.price || ""}" placeholder="Giá">
        <input type="number" value="${ticket?.total_available || ""}" placeholder="Số lượng">
        <button type="button" class="remove-ticket-btn">-</button>
    `;

    // Khi nhấn nút '-' → ẩn vé & đánh dấu ticket-hidden
    div.querySelector(".remove-ticket-btn").addEventListener("click", () => {
        div.classList.add("ticket-hidden");
        div.style.display = "none";
    });

    return div;
}

async function loadTicketClasses() {
    try {
        const res = await fetch(`${apiBase}/events/${eventId}/ticketclasses/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Lỗi khi tải danh sách vé");

        const data = await res.json();
        const tickets = data.data || [];
        const ticketList = document.getElementById("ticket-list");

        ticketList.innerHTML = "";
        tickets.forEach(ticket => {
            ticketList.appendChild(createTicketRow(ticket, false));
        });
    } catch (err) {
        console.error(err);
    }
}

function addEmptyTicketRow() {
    const ticketList = document.getElementById("ticket-list");
    ticketList.appendChild(createTicketRow(null, true));
}


function updateImagePreview(url) {
    const img = document.getElementById("event-image-preview");
    if (url) {
        img.src = `${cloudinaryBase}/` + url;
        img.style.display = "block";
    } else {
        img.style.display = "none";
    }
}

let originalEvent = {}; // sẽ gán dữ liệu khi load trang
const updatedEvent = {};

async function loadEventData() {
    const res = await fetch(`${apiBase}/events/${eventId}/`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Không thể tải dữ liệu sự kiện");
    originalEvent = await res.json();

    // Gán dữ liệu vào form
    document.getElementById("event-name").value = originalEvent.name || "";
    document.getElementById("event-description").value = originalEvent.description || "";
    document.getElementById("event-location").value = originalEvent.location || "";
    document.getElementById("event-start").value = originalEvent.start_time || "";
    document.getElementById("event-end").value = originalEvent.end_time || "";
    document.getElementById("event-type").value = originalEvent.event_type || "";
}

async function updateEvent() {
    try {
        // 1. Kiểm tra và PATCH event
        const fields = [
        { key: "name", id: "event-name" },
        { key: "description", id: "event-description" },
        { key: "location", id: "event-location" },
        { key: "start_time", id: "event-start" },
        { key: "end_time", id: "event-end" },
        { key: "event_type", id: "event-type" }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && element.value !== originalEvent[field.key]) {
            updatedEvent[field.key] = element.value;
        }
    });

    // Xử lý ảnh mới
    const newImageFile = document.getElementById("event-image-upload")?.files[0];
    if (newImageFile) {
        updatedEvent.image = document.getElementById("event-image-upload").value;
    }

    if (Object.keys(updatedEvent).length > 0) {
        const resEvent = await fetch(`${apiBase}/events/${eventId}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(updatedEvent)
        });
        if (!resEvent.ok) throw new Error("Cập nhật sự kiện thất bại");
        alert("Cập nhật sự kiện thành công!");
    } else {
        console.log("Không có thay đổi nào để cập nhật");
    }

        // 2. PATCH ticket cũ
        const ticketRows = document.querySelectorAll("#ticket-list .ticket-item");

        for (const row of ticketRows) {
            const inputs = row.querySelectorAll("input");
            const [name, type, price, total] = [...inputs].map(i => i.value);

            if (row.classList.contains("ticket-hidden")) {
                // Nếu vé bị ẩn và có ticketId → DELETE
                if (row.dataset.ticketId) {
                    await fetch(`${apiBase}/ticketclasses/${row.dataset.ticketId}/`, {
                        method: "DELETE",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                }
                continue; // bỏ qua vé này
            }

            if (row.dataset.ticketId) {
                // Vé cũ → PATCH
                await fetch(`${apiBase}/ticketclasses/${row.dataset.ticketId}/`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        name, 
                        type, 
                        price, 
                        total_available: total 
                    })
                });
            } else {
                // Vé mới → POST
                if (name && type && price && total) {
                    await fetch(`${apiBase}/events/${eventId}/ticketclass/`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ 
                            name, 
                            type, 
                            price, 
                            total_available: total 
                        })
                    });
                }
            }
        }

        alert("Cập nhật loại vé thành công");
        location.reload();
    } catch (err) {
        console.error(err);
        alert("Lỗi khi cập nhật");
    }
}

loadEventData();

async function deleteEvent() {
    if (!confirm("Bạn có chắc muốn xóa sự kiện này?")) return;
    try {
        const res = await fetch(`${apiBase}/events/${eventId}/`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Xóa sự kiện thất bại");
        alert("Đã xóa sự kiện");
        window.location.href = "event-management.html";
    } catch (err) {
        console.error(err);
        alert("Lỗi khi xóa sự kiện");
    }
}
