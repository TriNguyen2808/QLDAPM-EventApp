document.addEventListener("DOMContentLoaded", function () {
  const backBtn = document.getElementById("back-home-btn");

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      // Chuyển hướng về trang chủ
      window.location.href = "index.html";
    });
  }
});


// Lấy ticketId từ query string URL
function getQueryParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
}

const ticketId = getQueryParam('ticketId');

async function fetchPaymentLog() {
    if (!ticketId) {
        showMessage('Không tìm thấy mã vé (ticketId).');
        return;
    }

    try {
        const res = await fetch(`${apiBase}/tickets/${ticketId}/paymentlog/`, {
            method: 'GET',
        });

        if (!res.ok) {
            showMessage(`Lỗi khi lấy dữ liệu: ${res.status} ${res.statusText}`);
            return;
        }

        const data = await res.json();
        displayPaymentLog(data);

    } catch (error) {
        showMessage('Lỗi mạng hoặc server không phản hồi.');
        console.error(error);
    }
}

function displayPaymentLog(data) {
    if (data.ticket_classes && data.ticket_classes.length > 0) {
    const firstClassName = data.ticket_classes[0];
    if (firstClassName.includes('-')) {
        eventShortName = firstClassName.split('-')[1].trim();
    } else {
        eventShortName = firstClassName.trim();
    }
    }
    document.getElementById('ticket-code').textContent = data.ticket || 'Không có';
    document.getElementById('user-name').textContent = data.user || 'Không rõ';
    document.getElementById('event-name').textContent = eventShortName;
    document.getElementById('amount').textContent = Number(data.amount).toLocaleString('vi-VN') + ' đ';
    document.getElementById('transaction-id').textContent = data.transaction_id || 'Không có';

    const statusEl = document.getElementById('status');
    statusEl.textContent = data.status || 'Không rõ';

    statusEl.className = '';
    if (data.status === 'success') {
        statusEl.classList.add('success');
        showMessage('Thanh toán thành công. Cảm ơn bạn đã đặt vé!');
    } else if (data.status === 'failed') {
        statusEl.classList.add('failed');
        showMessage('Thanh toán thất bại hoặc chưa hoàn thành.');
    } else {
        showMessage('Trạng thái thanh toán đang xử lý hoặc chưa xác định.');
    }
}

function showMessage(msg) {
    document.getElementById('message').textContent = msg;
}

// Khi tải trang, tự động gọi API
window.onload = fetchPaymentLog;
