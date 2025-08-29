function getSelectedTickets() {
  const bookingData = JSON.parse(localStorage.getItem('bookingData'));
  if (!bookingData) return null;
  return bookingData;
}

function saveSelectedTickets(data) {
  localStorage.setItem('bookingData', JSON.stringify(data));
}

function clearSelectedTickets() {
  localStorage.removeItem('bookingData');
}

async function fetchEventDetail(eventId) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${apiBase}/events/${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Lỗi khi lấy dữ liệu sự kiện");
  return await res.json();
}

async function fetchDiscountCodes() {
  const res = await fetch(`${apiBase}/users/discountcodes/`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
  });
  if (!res.ok) throw new Error("Lỗi khi tải mã giảm giá");
  const data = await res.json();
  // API trả về { statusCode, message, data: [...] }
  return data.data || [];
}

function startCountdown(expireTimeISO, onExpire) {
  const countdownEl = document.getElementById('countdown');
  const expireTime = new Date(expireTimeISO).getTime();

  function update() {
    const now = Date.now();
    let diff = Math.floor((expireTime - now) / 1000);

    if (diff <= 0) {
      countdownEl.textContent = '00:00';
      onExpire();
      clearInterval(timerId);
      return;
    }

    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    countdownEl.textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  update();
  const timerId = setInterval(update, 1000);
  return timerId;
}

async function checkPaymentStatus(ticketId) {
  try {
    const res = await fetch(`${apiBase}/tickets/${ticketId}/paymentlog/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!res.ok) {
      console.error("Không lấy được thông tin paymentlog:", await res.text());
      return;
    }

    const paymentData = await res.json();
    console.log("Thông tin PaymentLog:", paymentData);

    if (paymentData.status === "success") {
      // Chuyển hướng sang trang ticket.html
      window.location.href = "ticket.html";
    } else {
      console.warn("Thanh toán chưa thành công:", paymentData.status);
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra PaymentLog:", error);
  }
}

async function main() {
  let bookingData = getSelectedTickets();
  if (!bookingData) {
    console.error("Không tìm thấy dữ liệu đặt vé. Vui lòng chọn vé lại.");
    // window.location.href = `booking.html?id=${bookingData?.eventId || ''}`;
    return;
  }

  const eventId = bookingData.eventId;

  if (!bookingData.reservationIds || !bookingData.expireTime) {
    const ticketsForReserve = {};
    bookingData.tickets.forEach(t => {
      if (t.quantity > 0) ticketsForReserve[t.id] = t.quantity;
    });

    try {
      const reserveResult = await apiReserveTickets(eventId, ticketsForReserve);
      bookingData.reservationIds = reserveResult.reservationIds;
      bookingData.expireTime = reserveResult.expireTime;
      saveSelectedTickets(bookingData);
    } catch (e) {
      console.error("Lỗi giữ vé:", e.message);
      clearSelectedTickets();
    //   window.location.href = `booking.html?id=${eventId}`;
      return;
    }
  }

  try {
    const ev = await fetchEventDetail(eventId);
    let displayAddress = ev.location;
    try {
      const urlObj = new URL(ev.location);
      if (urlObj.searchParams.has('query')) {
        displayAddress = decodeURIComponent(
          urlObj.searchParams.get('query').replace(/\+/g, ' ')
        );
      }
    } catch (e) {}
    document.getElementById('event-title').textContent = ev.name;
    document.getElementById('event-time').textContent = `${new Date(ev.start_time).toLocaleString('vi-VN')} - ${new Date(ev.end_time).toLocaleString('vi-VN')}`;
    document.getElementById('event-location').innerHTML =
      `${displayAddress} (<a href="${ev.location}" target="_blank">Xem bản đồ</a>)`;
  } catch (e) {
    console.error("Lỗi tải event:", e);
  }

  const tbody = document.querySelector('#ticket-table tbody');
  tbody.innerHTML = '';

  let discountValue = 0;
  let totalAmount = 0;

    try {
  const codes = await fetchDiscountCodes();
  const selectEl = document.getElementById('discount-select');

  codes.forEach(code => {
    const opt = document.createElement('option');
    opt.value = code.id;

    // Lưu discount_type để khi áp dụng còn tính toán
    opt.dataset.type = code.discount_type;
    opt.dataset.value = code.discount_value;

    let displayText = '';
    if (code.discount_type === 2) {
      // % giảm
      displayText = `${code.code} - Giảm ${parseFloat(code.discount_value)}%`;
    } else {
      // Giảm theo số tiền
      displayText = `${code.code} - Giảm ${Number(code.discount_value).toLocaleString('vi-VN')} đ`;
    }

    opt.textContent = displayText;
    selectEl.appendChild(opt);
  });

  selectEl.addEventListener('change', (e) => {
    const selectedOpt = e.target.selectedOptions[0];
    if (!selectedOpt) {
      discountValue = 0;
    } else {
      const type = Number(selectedOpt.dataset.type);
      const value = parseFloat(selectedOpt.dataset.value);
      if (type === 2) {
        // % giảm
        discountValue = (totalAmount * value) / 100;
      } else {
        // Giảm số tiền
        discountValue = value;
      }
    }
    document.getElementById('discount-amount').textContent =
      `- ${discountValue.toLocaleString('vi-VN')} đ`;
    updateTotalDisplay();
  });
} catch (e) {
  console.error("Không thể tải mã giảm giá:", e);
}

function updateTotalDisplay() {
  document.getElementById('total-amount').textContent =
    (totalAmount - discountValue).toLocaleString('vi-VN') + ' đ';
}

  bookingData.tickets.forEach(ticket => {
    if (ticket.quantity > 0) {
      const row = document.createElement('tr');
      const price = Number(ticket.price);
      const quantity = Number(ticket.quantity);
      const amount = price * quantity;
      totalAmount += amount;

      row.innerHTML = `
        <td>${ticket.name}</td>
        <td>${quantity}</td>
        <td>${price.toLocaleString('vi-VN')} đ</td>
        <td>${amount.toLocaleString('vi-VN')} đ</td>
      `;
      tbody.appendChild(row);
    }
  });

  document.getElementById('total-amount').textContent = totalAmount.toLocaleString('vi-VN') + ' đ';

  let isExpired = false;

  startCountdown(bookingData.expireTime, async () => {
    isExpired = true;
    console.error("Thời gian đặt vé đã hết. Vé giữ đã được trả về.");
    try {
      await apiReleaseReservations(bookingData.reservationIds);
    } catch (e) {
      console.error("Lỗi trả vé khi hết thời gian:", e);
    }
    clearSelectedTickets();
    // window.location.href = `booking.html?id=${eventId}`;
  });

  document.getElementById('back-btn').addEventListener('click', async () => {
    try {
      await apiReleaseReservations(bookingData.reservationIds);
    } catch (e) {
      console.error("Lỗi trả vé khi chọn lại:", e);
    }
    clearSelectedTickets();
    // window.location.href = `booking.html?id=${eventId}`;
  });

  document.getElementById('confirm-btn').addEventListener('click', async () => {
  if (isExpired) {
    console.error("Đã hết thời gian đặt vé.");
    return;
  }

  try {
    const discountCode = document.getElementById('discount-select').value || '';

    // Lấy danh sách ticket_classes từ bookingData
    const ticketClasses = bookingData.tickets
      .filter(ticket => ticket.quantity > 0)
      .map(ticket => ticket.id);

    const payResult = await fetch(`${apiBase}/tickets/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        ticket_classes: ticketClasses,
        discount_code: discountCode
      })
    });

    if (!payResult.ok) {
      const errData = await payResult.json();
      console.error(`Lỗi API: ${payResult.status}`, errData);
      return;
    }

    const data = await payResult.json();
    console.log("Kết quả thanh toán:", data);

    if (data.data?.payment_url) {
      window.location.href = data.data.payment_url;
    } else {
      await apiConfirmBooking(bookingData.reservationIds);
      console.log("Xác nhận đặt vé thành công");
      clearSelectedTickets();
    }

  } catch (error) {
    console.error("Lỗi khi gọi API /tickets/:", error);
  }
});



}

async function apiReserveTickets(eventId, selectedTickets) {
  const ticketsArray = Object.entries(selectedTickets)
    .filter(([_, qty]) => qty > 0)
    .map(([id, quantity]) => ({ id: parseInt(id), quantity }));

  const res = await fetch(`${apiBase}/ticketclasses/reserve/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    },
    body: JSON.stringify({
      eventId,
      tickets: ticketsArray
    })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.message || 'Lỗi giữ vé');
  }
  return res.json();
}

async function apiReleaseReservations(reservationIds) {
  const res = await fetch(`${apiBase}/ticketclasses/release/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    },
    body: JSON.stringify({ reservationIds })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.message || 'Lỗi trả vé');
  }
  return res.json();
}

async function apiConfirmBooking(reservationIds) {
  const res = await fetch(`${apiBase}/tickets/confirm/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    },
    body: JSON.stringify({ reservationIds })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.message || 'Lỗi xác nhận đặt vé');
  }
  return res.json();
}

document.addEventListener('DOMContentLoaded', main);
