document.addEventListener('DOMContentLoaded', async () => {
    if (location.pathname.includes('tickets.html')) {
        try {
            // Gọi API lấy vé
            const res = await apiGet('/tickets/my/');
            const tickets = res.data || [];

            const container = document.getElementById('ticketList');
            if (Array.isArray(tickets) && tickets.length > 0) {
                container.innerHTML = tickets.map(t => `
                    <div class="ticket-card">
                        <strong>Sự kiện:</strong> ${t.event_name} <br/>
                        <strong>Mã vé:</strong> ${t.ticket_code} <br/>
                        <strong>Ngày đặt:</strong> ${formatDate(t.booked_at)} <br/>
                        <strong>Giá:</strong> ${Number(t.price_paid).toLocaleString()} VND
                    </div>
                    <hr/>
                `).join('');
            } else {
                container.innerHTML = '<p>Bạn chưa có vé nào.</p>';
            }
        } catch (err) {
            console.error('Lỗi khi tải vé:', err);
            document.getElementById('ticketList').innerHTML = '<p>Không thể tải vé.</p>';
        }
    }

    if (location.pathname.includes('event-detail.html')) {
        const id = new URLSearchParams(location.search).get('id');
        if (!id) return;

        try {
            // Lấy chi tiết sự kiện
            const detail = await apiGet(`/events/${id}/`);
            document.getElementById('eventDetail').innerHTML = `
                <h2>${detail.name}</h2>
                <p>${detail.content || ''}</p>
                <p>Thời gian: ${formatDate(detail.start_time)} - ${formatDate(detail.end_time)}</p>
                <p>Địa điểm: ${detail.location}</p>
            `;

            // Nút đặt vé
            document.getElementById('ticketForm').innerHTML = `
                <button onclick="bookTicket(${id})">Đặt vé</button>
            `;

            // Lấy comment
            const commentsRes = await apiGet(`/comments/?event_id=${id}`);
            const comments = commentsRes.data || [];
            document.getElementById('comments').innerHTML = comments.length > 0
                ? comments.map(c => `<div><strong>${c.user_name}</strong>: ${c.text}</div>`).join('')
                : '<p>Chưa có bình luận nào.</p>';
        } catch (err) {
            console.error('Lỗi khi tải chi tiết sự kiện:', err);
            document.getElementById('eventDetail').innerHTML = '<p>Không thể tải thông tin sự kiện.</p>';
        }
    }
});

async function bookTicket(eventId) {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        alert('Bạn cần đăng nhập để đặt vé.');
        return;
    }

    try {
        const res = await fetch(`${apiBase}/tickets/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event: eventId })
        });

        const result = await res.json();
        alert(result.message || 'Đặt vé thành công!');
    } catch (err) {
        console.error('Lỗi đặt vé:', err);
        alert('Không thể đặt vé, vui lòng thử lại.');
    }
}
