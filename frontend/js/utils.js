const apiBase = 'http://localhost:8000';
const cloudinaryBase = 'http://res.cloudinary.com/dj57tohkn';
// Gọi API GET
async function apiGet(endpoint) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${apiBase}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await res.json();
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN');
}

// Chuyển role dạng số thành chuỗi
function getUserRole() {
  const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
  switch (userInfo.role) {
    case 1: return 'admin';
    case 2: return 'organizer';
    case 3: return 'attendee';
    default: return 'guest';
  }
}

// Ẩn/hiện menu theo quyền
function renderMenuByRole() {
    const role = getUserRole();
    const topMenu = document.querySelector('.top-menu');

    if (!topMenu) return;

    // Thêm nút theo role
    if (role === 'attendee') {
        topMenu.insertAdjacentHTML('afterbegin', `
            <a href="tickets.html" class="btn-green">Vé của tôi</a>
        `);
    }
    else if (role === 'organizer') {
        topMenu.insertAdjacentHTML('afterbegin', `
            <a href="reports.html" class="btn-green">Thống kê</a>
            <a href="ticket-management.html" class="btn-green">Quản lý vé</a>
            <a href="event-management.html" class="btn-green">Quản lý sự kiện</a>
        `);
    }
    else if (role === 'admin') {
        topMenu.insertAdjacentHTML('afterbegin', `
            <a href="reports.html" class="btn-green">Thống kê</a>
            <a href="ticket-management.html" class="btn-green">Quản lý vé</a>
            <a href="event-management.html" class="btn-green">Quản lý sự kiện</a>
            <a href="user-management.html" class="btn-green">Quản lý người dùng</a>
        `);
    }
    else {
        // guest - chỉ để authLinks
    }
}


// Hiển thị thông tin user hoặc link login
async function apiGetUser(userId) {
    const token = localStorage.getItem('access_token');
    if (!userId) {
        console.warn("User ID không hợp lệ");
        return null;
    }
    try {
        const res = await fetch(`${apiBase}/users/search?id=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Không thể lấy thông tin user, status: ${res.status}`);

        const result = await res.json();
        if (result.statusCode !== 200 || !result.data?.data?.length) {
            console.warn("Không tìm thấy user");
            return null;
        }

        // Lấy user đầu tiên từ kết quả
        const user = result.data.data[0];
        return {
            id: userId,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            username: user.username || '',
            email: user.email || '',
            avatar: user.avatar || ''
        };
    } catch (err) {
        console.error("Lỗi khi lấy thông tin user:", err);
        return null;
    }
}

async function renderUserInfo() {
    const topMenu = document.querySelector('.top-menu');
    if (!topMenu) {
        console.warn('Không tìm thấy .top-menu');
        return;
    }

    // Tìm hoặc tạo lại #authLinks
    let authLinks = document.getElementById('authLinks');
    if (!authLinks) {
        authLinks = document.createElement('span');
        authLinks.id = 'authLinks';
        topMenu.appendChild(authLinks);
    }

    const token = localStorage.getItem('access_token');

    if (!token) {
        authLinks.innerHTML = `
            <a href="login.html">Đăng nhập</a> | 
            <a href="register.html">Đăng ký</a>
        `;
        return;
    }

    try {
        let currentUser = JSON.parse(localStorage.getItem('user_info') || '{}');

        if (!currentUser.username) {
            const res = await fetch(`${apiBase}/users/current_user/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            currentUser = json.data || {};
            localStorage.setItem('user_info', JSON.stringify(currentUser));
        }

        authLinks.innerHTML = `
            <span>
                Xin chào, <a href="user-profile.html" class="user-link">${currentUser.username || 'Người dùng'}</a>
            </span>
            <a href="#" onclick="logout()" class="logout-link">Đăng xuất</a>
        `;
    } catch (err) {
        console.error(err);
        authLinks.innerHTML = `
            <a href="login.html">Đăng nhập</a> | 
            <a href="register.html">Đăng ký</a>
        `;
    }
}


function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_info');
  window.location.href = 'index.html';
}

const eventTypeTranslations = {
    CONFERENCE: "Hội nghị",
    MUSIC: "Âm nhạc",
    OTHER: "Khác",
    SPORTS: "Thể thao"
};

async function loadEventsByType(eventType) {
    try {
        const res = await fetch(`${apiBase}/events/search/?event_type=${encodeURIComponent(eventType)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const data = await res.json();
        const events = data.data || [];

        // Hiển thị kết quả tìm được
        renderEventGrid(events);

        // Ẩn phân trang nếu là filter
        document.getElementById('pagination').innerHTML = '';
    } catch (error) {
        console.error('Lỗi tải sự kiện theo loại:', error);
    }
}

