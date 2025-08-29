document.addEventListener('DOMContentLoaded', async () => {
    const map = L.map('map').setView([10.7769, 106.7009], 13);
    let marker;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    // Hàm đặt marker và cập nhật form
    async function setMarker(lat, lng) {
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;

        // Gọi API reverse geocoding để lấy địa chỉ
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name) {
                document.getElementById('locationInput').value = data.display_name;
            }
        } catch (err) {
            console.error("Lỗi lấy địa chỉ:", err);
        }

        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map)
            .bindPopup("Vị trí đã chọn").openPopup();
    }

    // Click trên bản đồ
    map.on('click', function(e) {
        setMarker(e.latlng.lat, e.latlng.lng);
    });

    // Nhập địa chỉ và nhấn Enter để tìm
    document.getElementById('locationInput').addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.value.trim();
            if (!query) return;

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
                const results = await res.json();
                if (results.length > 0) {
                    const lat = results[0].lat;
                    const lon = results[0].lon;
                    map.setView([lat, lon], 15);
                    setMarker(lat, lon);
                } else {
                    alert("Không tìm thấy địa điểm!");
                }
            } catch (err) {
                console.error("Lỗi tìm địa điểm:", err);
            }
        }
    });

    // ==== Load loại sự kiện ====
    async function loadEventTypes() {
    try {
        const res = await fetch(`${apiBase}/eventtypes/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        const types = await res.json();
        console.log("Loại sự kiện:", types);

        let html = '<option value="">-- Chọn loại sự kiện --</option>';
        types.forEach(t => {
            html += `<option value="${t.name}">${t.name}</option>`; // ✅ dùng name thay vì id
        });
        document.getElementById('eventTypeSelect').innerHTML = html;
    } catch (err) {
        console.error('Lỗi tải loại sự kiện:', err);
    }
    }

    loadEventTypes();

    // ==== Submit form ====
    document.getElementById('createEventForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        try {
            const res = await fetch(`${apiBase}/events/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: formData
            });
            const result = await res.json();
            console.log(result);
            document.getElementById('message').innerHTML = `<p style="color:green;">${result.message || 'Tạo sự kiện thành công!'}</p>`;
            window.location.href = 'event-management.html'
        } catch (err) {
            console.error('Lỗi tạo sự kiện:', err);
            document.getElementById('message').innerHTML = `<p style="color:red;">Có lỗi xảy ra!</p>`;
        }
    });
});
