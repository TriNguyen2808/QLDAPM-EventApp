// Hàm lấy chi tiết event, giữ nguyên API hiện có
async function fetchEventDetail(eventId) {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${apiBase}/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Lỗi khi lấy dữ liệu sự kiện");
    const ev = await res.json();
    return ev;
}

// Hàm lấy danh sách vé (giữ nguyên)
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

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id'); // Lấy ?id=...

if (!eventId) {
    console.error("Không tìm thấy eventId trên URL");
} else {
    apiGetEventTicketClasses(eventId);
}

document.addEventListener("DOMContentLoaded", async () => {
    const ticketListEl = document.getElementById("ticket-list");
    const priceListEl = document.getElementById("price-list");
    const checkoutBtn = document.getElementById("checkout-btn");

    // ==== Thêm phần lấy và hiển thị chi tiết event ====
    try {
        const ev = await fetchEventDetail(eventId);

        // Xử lý hiển thị địa chỉ
        let displayAddress = ev.location;
        try {
            const urlObj = new URL(ev.location);
            if (urlObj.searchParams.has('query')) {
                displayAddress = decodeURIComponent(
                    urlObj.searchParams.get('query').replace(/\+/g, ' ')
                );
            }
        } catch (e) { /* Không phải URL hợp lệ */ }

        // Gán thông tin lên DOM
        document.getElementById('event-title').textContent = ev.name;
        document.getElementById('event-date').textContent =
            `${new Date(ev.start_time).toLocaleString('vi-VN')} - ${new Date(ev.end_time).toLocaleString('vi-VN')}`;
        document.getElementById('event-location').innerHTML =
            `${displayAddress} (<a href="${ev.location}" target="_blank">Xem bản đồ</a>)`;
    } catch (err) {
        console.error("Lỗi khi lấy chi tiết sự kiện:", err);
    }
    // ==== Kết thúc phần hiển thị chi tiết event ====

    let selectedTickets = {};
    let totalAmount = 0;

    const tickets = await apiGetEventTicketClasses(eventId);

    tickets.forEach(ticket => {
    // Cột trái - danh sách vé
    const ticketItem = document.createElement("div");
    ticketItem.classList.add("ticket-item");

    const info = document.createElement("div");
    info.classList.add("ticket-info");
    info.innerHTML = `<span class="ticket-name">${ticket.name}</span>
                      <span class="ticket-price">${ticket.price.toLocaleString()} đ</span>`;

    const controls = document.createElement("div");
    controls.classList.add("ticket-controls");

    if (eventId) {
        const backLink = document.getElementById('back-link');
        if(backLink) backLink.href = `event-detail.html?id=${eventId}`;
    }

    if (ticket.quantity === 0) {
        controls.innerHTML = `<button class="soldout-btn">Hết vé</button>`;
    } else {
        const minusBtn = document.createElement("button");
        minusBtn.textContent = "-";

        // Thay đổi: dùng input number thay vì span
        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.min = 0;
        qtyInput.max = ticket.total_available;  // giới hạn max theo total_available
        qtyInput.value = 0;
        qtyInput.style.width = "50px";

        const plusBtn = document.createElement("button");
        plusBtn.textContent = "+";

        minusBtn.addEventListener("click", () => {
            let qty = parseInt(qtyInput.value);
            if (qty > 0) {
                qty--;
                qtyInput.value = qty;
                selectedTickets[ticket.id] = qty;
                updateSummary();
            }
        });

        plusBtn.addEventListener("click", () => {
            let qty = parseInt(qtyInput.value);
            if (qty < ticket.total_available) {
                qty++;
                qtyInput.value = qty;
                selectedTickets[ticket.id] = qty;
                updateSummary();
            } else {
                alert(`Số lượng vé không được vượt quá ${ticket.total_available}`);
            }
        });

        // Bắt sự kiện khi người dùng nhập trực tiếp
        qtyInput.addEventListener("input", () => {
            let val = qtyInput.value;

            // Loại bỏ các ký tự không phải số
            if (!/^\d*$/.test(val)) {
                qtyInput.value = val.replace(/\D/g, '');
                return;
            }

            let numVal = parseInt(qtyInput.value);
            if (isNaN(numVal)) numVal = 0;

            if (numVal > ticket.total_available) {
                alert(`Số lượng vé không được vượt quá ${ticket.total_available}`);
                qtyInput.value = ticket.total_available;
                numVal = ticket.total_available;
            } else if (numVal < 0) {
                qtyInput.value = 0;
                numVal = 0;
            }

            selectedTickets[ticket.id] = numVal;
            updateSummary();
        });

        controls.appendChild(minusBtn);
        controls.appendChild(qtyInput);
        controls.appendChild(plusBtn);
    }

    ticketItem.appendChild(info);
    ticketItem.appendChild(controls);
    ticketListEl.appendChild(ticketItem);

    // Cột phải - danh sách giá vé
    const priceItem = document.createElement("li");
    priceItem.innerHTML = `<span>${ticket.name}</span><span>${ticket.price.toLocaleString()} đ</span>`;
    priceListEl.appendChild(priceItem);
    });

    function updateSummary() {
        totalAmount = 0;
        let hasTicket = false;

        for (const [ticketId, qty] of Object.entries(selectedTickets)) {
            const ticket = tickets.find(t => t.id == ticketId);
            if (qty > 0) {
                hasTicket = true;
                totalAmount += ticket.price * qty;
            }
        }

        if (hasTicket) {
            checkoutBtn.classList.add("active");
            checkoutBtn.textContent = `Tiếp tục - ${totalAmount.toLocaleString()} đ`;
        } else {
            checkoutBtn.classList.remove("active");
            checkoutBtn.textContent = "Vui lòng chọn vé";
        }
    }
    
    checkoutBtn.addEventListener('click', () => {
  // Kiểm tra đã có vé được chọn chưa
  const hasSelected = Object.values(selectedTickets).some(qty => qty > 0);
  if (!hasSelected) {
    alert("Vui lòng chọn vé trước khi tiếp tục");
    return;
  }

  const selectedTicketsArray = tickets
    .filter(t => selectedTickets[t.id] > 0)
    .map(t => ({
      id: t.id,
      name: t.name,
      price: t.price,
      quantity: selectedTickets[t.id]
    }));

  const bookingData = {
    eventId: eventId,
    tickets: selectedTicketsArray
  };

  localStorage.setItem('bookingData', JSON.stringify(bookingData));

  // Chuyển trang sang xác nhận đặt vé
  window.location.href = `confirm.html?id=${eventId}`;
});
});
