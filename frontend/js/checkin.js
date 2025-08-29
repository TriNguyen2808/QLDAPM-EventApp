const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('eventId');

if (eventId) {
  fetch(`${apiBase}/events/${eventId}/`, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("access_token")
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.name) {
        document.getElementById('eventInfo').innerText = `Sự kiện: ${data.name}`;
      } else {
        document.getElementById('eventInfo').innerText = `Không tìm thấy thông tin sự kiện`;
      }
    })
    .catch(error => {
      console.error('Lỗi khi lấy tên sự kiện:', error);
      document.getElementById('eventInfo').innerText = `Lỗi khi lấy tên sự kiện`;
    });
} else {
  document.getElementById('eventInfo').innerText = `Không có eventId trong URL`;
}

// Khởi tạo trình quét QR
const html5QrCode = new Html5Qrcode("reader");

function showMessage(text, isSuccess = true) {
  const resultEl = document.getElementById('result');
  resultEl.innerText = text;
  resultEl.style.color = isSuccess ? 'green' : 'red';
}

function onScanSuccess(decodedText, decodedResult) {
  // Hiển thị mã quét được
  document.getElementById('result').innerText = `Đang kiểm tra mã: ${decodedText}`;

  // Dừng quét để tránh gửi nhiều lần
  html5QrCode.stop().then(() => {
    // Gọi API check-in
    const formData = new FormData();
    formData.append('ticket_code', decodedText);

    fetch(`${apiBase}/tickets/check-in/`, {
      method: 'POST',
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("access_token")
      },
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        showMessage(data.message, data.statusCode === 200);
      })
      .catch(error => {
        console.error('Lỗi kết nối API:', error);
        showMessage('Lỗi kết nối đến máy chủ!', false);
      });
  }).catch(err => {
    console.error('Lỗi dừng quét:', err);
  });
}

// Bắt đầu quét QR
Html5Qrcode.getCameras().then(cameras => {
  if (cameras && cameras.length) {
    html5QrCode.start(
      { facingMode: "environment" }, // Ưu tiên camera sau nếu có
      {
        fps: 10,
        qrbox: 250
      },
      onScanSuccess
    );
  } else {
    showMessage('Không tìm thấy camera', false);
  }
}).catch(err => {
  console.error("Không thể truy cập camera", err);
  showMessage("Không thể truy cập camera", false);
});
