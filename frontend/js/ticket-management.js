const token = localStorage.getItem('access_token');
const userInfo = JSON.parse(localStorage.getItem('user_info'));
const userRole = userInfo.role;
const eventContainer = document.getElementById('eventContainer');
const searchEvent = document.getElementById('searchEvent');
let currentPage = 1;
const paginationContainer = document.createElement('div');
paginationContainer.id = 'pagination';
eventContainer.after(paginationContainer);
searchEvent.addEventListener('input', () => renderEvents());

async function fetchEvents(page = 1) {
  const url = userRole === 1
    ? `${apiBase}/events/?page=${page}`
    : `${apiBase}/users/events/?page=${page}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  return {
    events: userRole === 1 ? data.results : data.results.data,
    next: data.next,
    previous: data.previous,
    count: data.count,
  };
}


async function fetchTickets(eventId) {
  try {
    const response = await fetch(`${apiBase}/events/${eventId}/tickets`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách vé:', error);
    return [];
  }
}

async function renderEvents() {
  const keyword = searchEvent.value.toLowerCase();
  eventContainer.innerHTML = '';
  paginationContainer.innerHTML = ''; // reset nút trang

  const { events, next, previous } = await fetchEvents(currentPage);

  for (const event of events) {
    if (!event.name.toLowerCase().includes(keyword)) continue;

    const tickets = await fetchTickets(event.id);
    const box = document.createElement('div');
    box.className = 'event-box';

    const infoRow = document.createElement('div');
    infoRow.className = 'event-header';

    // Giải mã địa chỉ
    let address = '';
    try {
    const locUrl = new URL(event.location);
    const params = new URLSearchParams(locUrl.search);
    address = decodeURIComponent(params.get('query')) || event.location;
    } catch {
    address = event.location;
    }

    // Tạo nút Check-in
    const checkinBtn = document.createElement('button');
    checkinBtn.className = 'checkin-button';
    checkinBtn.textContent = 'Check-in';
    checkinBtn.onclick = () => {
    window.location.href = `checkin.html?eventId=${event.id}`;
    };

    infoRow.innerHTML = `
    <span class="col-name">${event.name}</span>
    <span class="col-time">${new Date(event.start_time).toLocaleString()}</span>
    <span class="col-location">${address}</span>
    `;
    infoRow.appendChild(checkinBtn);

    const ticketWrapper = document.createElement('div');
    ticketWrapper.className = 'ticket-table-wrapper';
    ticketWrapper.style.display = 'none';

    const table = document.createElement('table');
    table.className = 'ticket-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Mã vé</th>
          <th>Các hạng vé</th>
          <th>Người đặt</th>
          <th>Check-in</th>
        </tr>
      </thead>
      <tbody>
        ${tickets.map(ticket => `
          <tr>
            <td>${ticket.ticket_code}</td>
            <td>${ticket.ticket_classes.join(', ')}</td>
            <td>${ticket.user}</td>
            <td>${ticket.is_checked_in}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    ticketWrapper.appendChild(table);
    infoRow.addEventListener('click', () => {
      ticketWrapper.style.display = ticketWrapper.style.display === 'none' ? 'block' : 'none';
    });

    box.appendChild(infoRow);
    box.appendChild(ticketWrapper);
    eventContainer.appendChild(box);
  }

  // Tạo nút phân trang
  if (previous) {
    const prevBtn = document.createElement('button');
    prevBtn.innerText = '← Trang trước';
    prevBtn.onclick = () => {
      currentPage--;
      renderEvents();
    };
    paginationContainer.appendChild(prevBtn);
  }

  const pageDisplay = document.createElement('span');
  pageDisplay.innerText = `Trang ${currentPage}`;
  pageDisplay.style.margin = '0 10px';
  paginationContainer.appendChild(pageDisplay);

  if (next) {
    const nextBtn = document.createElement('button');
    nextBtn.innerText = 'Trang sau →';
    nextBtn.onclick = () => {
      currentPage++;
      renderEvents();
    };
    paginationContainer.appendChild(nextBtn);
  }
}


async function handleCheckIn(ticketCode) {
  alert(`Check-in cho vé: ${ticketCode}`);
  // Có thể thêm API call check-in tại đây nếu có
}

renderEvents();
