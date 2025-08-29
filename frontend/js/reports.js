document.addEventListener("DOMContentLoaded", () => {
    const monthSelect = document.getElementById("month");
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        monthSelect.appendChild(option);
    }

    const today = new Date();
    monthSelect.value = today.getMonth() + 1;

    loadReport();
});

function loadReport() {
    const year = document.getElementById("year").value;
    const month = document.getElementById("month").value;

    const url = `${apiBase}/reports/monthly/?year=${year}&month=${month}`;
    const token = localStorage.getItem('access_token');
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Gửi token ở đây
        }
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Không có quyền truy cập. Token không hợp lệ hoặc đã hết hạn.");
                }
                throw new Error(`Lỗi: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const stats = data.data.event_statistics;
            const tableBody = document.querySelector("#report-table tbody");
            tableBody.innerHTML = "";

            let totalRevenue = 0;
            let totalTickets = 0;

            stats.forEach((event, index) => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${event.event_name}</td>
                    <td>${event.total_tickets}</td>
                    <td>${formatCurrency(event.total_revenue)}</td>
                `;

                totalRevenue += event.total_revenue;
                totalTickets += event.total_tickets;

                tableBody.appendChild(row);
            });

            document.getElementById("summary").innerHTML =
                `Tổng sự kiện: ${data.data.total_event} | Tổng vé: ${totalTickets} | Tổng doanh thu: ${formatCurrency(totalRevenue)}`;
        })
        .catch(err => {
            console.error("Lỗi khi gọi API:", err);
            alert(err.message);
        });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}